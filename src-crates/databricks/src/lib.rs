pub mod codec;
pub mod config;
pub mod error;
pub mod response;
pub mod thrift;
pub mod transport;

use codec::is_null;
use config::Config;
pub use error::{Error, Result};
pub use response::{Column, Response, Value};
use std::sync::Arc;
use thrift::*;
use tokio::time::{Duration, Instant, sleep};
use transport::ThriftHttpTransport;

/// Databricks SQL connection via Thrift protocol.
#[derive(Debug)]
pub struct Connection {
    transport: Arc<ThriftHttpTransport>,
    session_handle: TSessionHandle,
}

impl Drop for Connection {
    fn drop(&mut self) {
        let session_handle = self.session_handle.clone();
        if let Ok(handle) = tokio::runtime::Handle::try_current() {
            let transport = self.transport.clone();
            handle.spawn(async move {
                let req = TCloseSessionReq { session_handle };
                let _: Result<TCloseSessionResp, _> = transport.call("CloseSession", &req).await;
            });
        }
    }
}

impl Connection {
    /// Open a new Databricks Thrift SQL connection.
    pub async fn open_with(mut config: Config) -> Result<Self> {
        let proxy = config.proxy.take();
        let transport = Arc::new(ThriftHttpTransport::new(&config, proxy)?);

        let session_handle = Self::open_session(&transport, &config).await?;

        Ok(Self {
            transport,
            session_handle,
        })
    }

    async fn open_session(
        transport: &ThriftHttpTransport,
        config: &Config,
    ) -> Result<TSessionHandle> {
        let req = TOpenSessionReq {
            client_protocol: TProtocolVersion::SPARK_CLI_SERVICE_PROTOCOL_V8,
            client_protocol_i64: Some(i64::from(TProtocolVersion::SPARK_CLI_SERVICE_PROTOCOL_V8.0)),
            username: None,
            password: None,
            configuration: None,
            initial_namespace: if config.catalog.is_some() || config.schema.is_some() {
                Some(TNamespace {
                    catalog_name: config.catalog.clone(),
                    schema_name: config.schema.clone(),
                })
            } else {
                None
            },
            can_use_multiple_catalogs: Some(true),
        };

        let resp: TOpenSessionResp = transport.call("OpenSession", &req).await?;

        if resp.status.status_code != TStatusCode::SUCCESS_STATUS {
            return Err(Error::Status {
                code: resp.status.status_code.0,
                message: resp.status.error_text("Unknown error"),
            });
        }

        resp.session_handle.ok_or_else(|| {
            Error::InvalidSessionState("OpenSession did not return session handle".into())
        })
    }

    /// Execute a SQL query and return results.
    pub async fn query<S: AsRef<str>>(&mut self, sql: S) -> Result<Response> {
        const FETCH_CHUNK_ROWS: i64 = 100_000;

        let session_handle = self.session_handle.clone();

        let execute_resp: TExecuteStatementResp = {
            let req = TExecuteStatementReq {
                session_handle: session_handle.clone(),
                statement: sql.as_ref().into(),
                conf_overlay: None,
                run_async: Some(true),
                get_direct_results: Some(TSparkGetDirectResults {
                    max_rows: FETCH_CHUNK_ROWS,
                    max_bytes: None,
                }),
                query_timeout: None,
            };

            self.transport.call("ExecuteStatement", &req).await?
        };

        Self::ensure_success_status(&execute_resp.status, "Execute failed")?;

        let op_handle = execute_resp
            .operation_handle
            .ok_or_else(|| Error::OperationFailed("No operation handle returned".into()))?;
        let mut direct_results = execute_resp.direct_results;

        let (rows_affected, status_has_result_set, duration) = if let Some(status) = direct_results
            .as_ref()
            .and_then(|results| results.operation_status.as_ref())
        {
            Self::ensure_success_status(&status.status, "GetOperationStatus failed")?;

            match status.operation_state {
                Some(state) => match state {
                    TOperationState::FINISHED_STATE => (
                        status.num_modified_rows.map(|n| n as u64),
                        status.has_result_set,
                        Self::compute_duration_ms(
                            status.operation_started,
                            status.operation_completed,
                        ),
                    ),
                    TOperationState::INITIALIZED_STATE
                    | TOperationState::RUNNING_STATE
                    | TOperationState::PENDING_STATE => {
                        self.poll_operation_status(&op_handle).await?
                    }
                    TOperationState::ERROR_STATE => {
                        return Err(Error::OperationFailed(
                            status.error_text("Unknown operation error"),
                        ));
                    }
                    TOperationState::CANCELED_STATE => {
                        return Err(Error::OperationFailed("Operation was canceled".into()));
                    }
                    TOperationState::CLOSED_STATE => {
                        return Err(Error::OperationFailed(
                            "Operation was closed unexpectedly".into(),
                        ));
                    }
                    TOperationState::TIMEDOUT_STATE => {
                        return Err(Error::OperationFailed(
                            "Operation timed out on server".into(),
                        ));
                    }
                    TOperationState::UKNOWN_STATE | _ => {
                        return Err(Error::OperationFailed(format!(
                            "Unexpected operation state: {}",
                            state.0
                        )));
                    }
                },
                None => self.poll_operation_status(&op_handle).await?,
            }
        } else {
            self.poll_operation_status(&op_handle).await?
        };

        let has_result_set = status_has_result_set.unwrap_or(op_handle.has_result_set);
        let closed_by_server = direct_results
            .as_ref()
            .and_then(|results| results.close_operation.as_ref())
            .is_some();

        if !has_result_set {
            if !closed_by_server {
                self.close_operation(op_handle.clone());
            }
            return Ok(Response {
                columns: vec![],
                rows: vec![],
                rows_affected,
                duration,
            });
        }

        let mut metadata = direct_results
            .as_mut()
            .and_then(|results| results.result_set_metadata.take());
        let mut prefetched_fetch = direct_results
            .as_mut()
            .and_then(|results| results.result_set.take());

        if metadata.is_none() {
            if let Some(fetch_resp) = prefetched_fetch.as_mut() {
                metadata = fetch_resp.result_set_metadata.take();
            }
        }

        if metadata.is_none() {
            if prefetched_fetch.is_none() {
                let mut fetch_resp = self
                    .fetch_results_page(
                        &op_handle,
                        TFetchOrientation::FETCH_FIRST,
                        FETCH_CHUNK_ROWS,
                        true,
                    )
                    .await?;
                metadata = fetch_resp.result_set_metadata.take();
                prefetched_fetch = Some(fetch_resp);
            }

            if metadata.is_none() {
                metadata = Some(self.get_result_set_metadata(&op_handle).await?);
            }
        }

        let metadata = metadata
            .ok_or_else(|| Error::OperationFailed("No schema returned from metadata".into()))?;
        Self::ensure_success_status(&metadata.status, "GetResultSetMetadata failed")?;
        Self::ensure_supported_result_format(&metadata)?;

        let schema = metadata
            .schema
            .as_ref()
            .ok_or_else(|| Error::OperationFailed("No schema returned from metadata".into()))?;
        let columns = Self::columns_from_schema(schema);
        let mut all_rows = vec![];
        let mut fetched_any_page = false;

        let mut has_more = false;
        if let Some(fetch_resp) = prefetched_fetch {
            let (rows, next_has_more) = Self::rows_from_fetch_results(schema, fetch_resp)?;
            all_rows.extend(rows);
            has_more = next_has_more;
            fetched_any_page = true;
        }

        let mut orientation = if has_more {
            TFetchOrientation::FETCH_NEXT
        } else {
            TFetchOrientation::FETCH_FIRST
        };

        while has_more || !fetched_any_page {
            let fetch_resp = self
                .fetch_results_page(&op_handle, orientation, FETCH_CHUNK_ROWS, false)
                .await?;
            let (rows, next_has_more) = Self::rows_from_fetch_results(schema, fetch_resp)?;
            all_rows.extend(rows);
            has_more = next_has_more;
            fetched_any_page = true;
            orientation = TFetchOrientation::FETCH_NEXT;
            if !has_more {
                break;
            }
        }

        if !closed_by_server {
            self.close_operation(op_handle);
        }

        Ok(Response {
            columns,
            rows: all_rows,
            rows_affected,
            duration,
        })
    }

    fn is_success_status(status: &TStatus) -> bool {
        matches!(status.status_code.0, 0 | 1)
    }

    fn compute_duration_ms(started: Option<i64>, completed: Option<i64>) -> Option<u32> {
        match (started, completed) {
            (Some(s), Some(c)) if c >= s => Some(((c - s) as u64).min(u32::MAX as u64) as u32),
            _ => None,
        }
    }
    fn status_error(status: &TStatus, fallback: &str) -> Error {
        Error::Status {
            code: status.status_code.0,
            message: status.error_text(fallback),
        }
    }

    fn ensure_success_status(status: &TStatus, fallback: &str) -> Result<()> {
        if Self::is_success_status(status) {
            Ok(())
        } else {
            Err(Self::status_error(status, fallback))
        }
    }

    fn ensure_supported_result_format(metadata: &TGetResultSetMetadataResp) -> Result<()> {
        if let Some(fmt) = metadata.result_format {
            if fmt == TSparkRowSetType::ARROW_BASED_SET || fmt == TSparkRowSetType::URL_BASED_SET {
                return Err(Error::UnsupportedResultFormat(format!(
                    "result format {} is not supported; disable Arrow results on the cluster",
                    fmt.0
                )));
            }
        }

        Ok(())
    }

    async fn get_result_set_metadata(
        &self,
        op_handle: &TOperationHandle,
    ) -> Result<TGetResultSetMetadataResp> {
        let req = TGetResultSetMetadataReq {
            operation_handle: op_handle.clone(),
        };

        self.transport.call("GetResultSetMetadata", &req).await
    }

    async fn fetch_results_page(
        &self,
        op_handle: &TOperationHandle,
        orientation: TFetchOrientation,
        max_rows: i64,
        include_result_set_metadata: bool,
    ) -> Result<TFetchResultsResp> {
        let req = TFetchResultsReq {
            operation_handle: op_handle.clone(),
            orientation,
            max_rows,
            fetch_type: None,
            include_result_set_metadata: include_result_set_metadata.then_some(true),
        };

        self.transport.call("FetchResults", &req).await
    }

    fn close_operation(&self, op_handle: TOperationHandle) {
        let transport = self.transport.clone();

        tokio::spawn(async move {
            let req = TCloseOperationReq {
                operation_handle: op_handle,
            };

            let _resp: TCloseOperationResp = transport
                .call("CloseOperation", &req)
                .await
                .ok()
                .unwrap_or_else(|| TCloseOperationResp {
                    status: TStatus {
                        status_code: TStatusCode::SUCCESS_STATUS,
                        ..Default::default()
                    },
                });
        });
    }

    fn rows_from_fetch_results(
        schema: &TTableSchema,
        resp: TFetchResultsResp,
    ) -> Result<(Vec<Vec<Value>>, bool)> {
        Self::ensure_success_status(&resp.status, "FetchResults failed")?;

        let has_more = resp.has_more_rows == Some(true);
        let row_set = resp
            .results
            .ok_or_else(|| Error::OperationFailed("No row set returned from fetch".into()))?;
        let query = Self::row_set_to_query(schema, &row_set)?;
        Ok((query.rows, has_more))
    }

    /// Poll operation status until completion. Returns `(num_modified_rows, has_result_set, duration_ms)` on success.
    ///
    /// Uses exponential backoff: starts at 100 ms, doubles each iteration up to
    /// a 2 s cap. Total wall-clock budget is 10 minutes.
    async fn poll_operation_status(
        &self,
        op_handle: &TOperationHandle,
    ) -> Result<(Option<u64>, Option<bool>, Option<u32>)> {
        const MAX_POLL_DURATION: Duration = Duration::from_secs(600);
        const INITIAL_INTERVAL_MS: u64 = 100;
        const MAX_INTERVAL_MS: u64 = 2_000;

        let deadline = Instant::now() + MAX_POLL_DURATION;
        let mut interval_ms = INITIAL_INTERVAL_MS;

        loop {
            let req = TGetOperationStatusReq {
                operation_handle: op_handle.clone(),
            };

            let resp: TGetOperationStatusResp =
                self.transport.call("GetOperationStatus", &req).await?;

            if let Some(state) = resp.operation_state {
                match state {
                    TOperationState::FINISHED_STATE => {
                        return Ok((
                            resp.num_modified_rows.map(|n| n as u64),
                            resp.has_result_set,
                            Self::compute_duration_ms(
                                resp.operation_started,
                                resp.operation_completed,
                            ),
                        ));
                    }
                    TOperationState::INITIALIZED_STATE
                    | TOperationState::RUNNING_STATE
                    | TOperationState::PENDING_STATE => {}
                    TOperationState::ERROR_STATE => {
                        return Err(Error::OperationFailed(
                            resp.error_text("Unknown operation error"),
                        ));
                    }
                    TOperationState::CANCELED_STATE => {
                        return Err(Error::OperationFailed("Operation was canceled".into()));
                    }
                    TOperationState::CLOSED_STATE => {
                        return Err(Error::OperationFailed(
                            "Operation was closed unexpectedly".into(),
                        ));
                    }
                    TOperationState::TIMEDOUT_STATE => {
                        return Err(Error::OperationFailed(
                            "Operation timed out on server".into(),
                        ));
                    }
                    TOperationState::UKNOWN_STATE | _ => {
                        return Err(Error::OperationFailed(format!(
                            "Unexpected operation state: {}",
                            state.0
                        )));
                    }
                }
            } else if resp.status.status_code != TStatusCode::SUCCESS_STATUS {
                return Err(Error::Status {
                    code: resp.status.status_code.0,
                    message: resp.status.error_text("GetOperationStatus failed"),
                });
            }

            if Instant::now() >= deadline {
                return Err(Error::OperationFailed(
                    "Operation polling timed out after 10 minutes".into(),
                ));
            }

            sleep(Duration::from_millis(interval_ms)).await;
            interval_ms = (interval_ms * 2).min(MAX_INTERVAL_MS);
        }
    }

    /// Convert a Thrift row set to a Response.
    fn row_set_to_query(schema: &TTableSchema, row_set: &TRowSet) -> Result<Response> {
        // Guard: Arrow IPC batches indicate the server chose Arrow format, which we cannot decode.
        if !row_set.arrow_batches.is_empty() {
            return Err(Error::UnsupportedResultFormat(
                "Arrow IPC result format is not supported; disable Arrow results on the cluster"
                    .into(),
            ));
        }

        let columns = Self::columns_from_schema(schema);

        let rows = if let Some(ref cols) = row_set.columns {
            // Columnar format (Databricks default)
            if cols.is_empty() {
                return Ok(Response {
                    columns,
                    rows: vec![],
                    rows_affected: None,
                    duration: None,
                });
            }
            let row_count = col_row_count(&cols[0]);
            let mut rows: Vec<Vec<Value>> = (0..row_count)
                .map(|_| Vec::with_capacity(cols.len()))
                .collect();
            for (col_idx, col) in cols.iter().enumerate() {
                // Use the schema TTypeId to produce the correct Value variant,
                // since the wire TColumn type is coarser than the SQL type
                // (e.g. TINYINT/SMALLINT both arrive as TI32Column; FLOAT as TDoubleColumn).
                let type_id: Option<TTypeId> = schema
                    .columns
                    .get(col_idx)
                    .and_then(|c| c.type_desc.types.first())
                    .and_then(|e| match e {
                        TTypeEntry::PrimitiveEntry(p) => Some(p.type_id),
                        TTypeEntry::ComplexEntry(_) => None,
                    });
                match col {
                    TColumn::BoolVal(c) => {
                        for (idx, row) in rows.iter_mut().enumerate() {
                            row.push(if is_null(&c.nulls, idx) {
                                Value::Null
                            } else {
                                Value::Boolean(c.values[idx])
                            });
                        }
                    }
                    TColumn::I32Val(c) => {
                        for (idx, row) in rows.iter_mut().enumerate() {
                            row.push(if is_null(&c.nulls, idx) {
                                Value::Null
                            } else {
                                match type_id {
                                    Some(t) if t == TTypeId::TINYINT_TYPE => {
                                        Value::TinyInt(c.values[idx] as i8)
                                    }
                                    Some(t) if t == TTypeId::SMALLINT_TYPE => {
                                        Value::SmallInt(c.values[idx] as i16)
                                    }
                                    _ => Value::Int(c.values[idx]),
                                }
                            });
                        }
                    }
                    TColumn::I64Val(c) => {
                        for (idx, row) in rows.iter_mut().enumerate() {
                            row.push(if is_null(&c.nulls, idx) {
                                Value::Null
                            } else {
                                Value::BigInt(c.values[idx])
                            });
                        }
                    }
                    TColumn::DoubleVal(c) => {
                        // FLOAT columns are widened to double on the Thrift wire;
                        // use the schema type to downcast back to f32 when appropriate.
                        for (idx, row) in rows.iter_mut().enumerate() {
                            row.push(if is_null(&c.nulls, idx) {
                                Value::Null
                            } else if type_id == Some(TTypeId::FLOAT_TYPE) {
                                Value::Float(c.values[idx] as f32)
                            } else {
                                Value::Double(c.values[idx])
                            });
                        }
                    }
                    TColumn::StringVal(c) => {
                        for (idx, row) in rows.iter_mut().enumerate() {
                            row.push(if is_null(&c.nulls, idx) {
                                Value::Null
                            } else {
                                Value::String(c.values[idx].clone())
                            });
                        }
                    }
                    TColumn::BinaryVal(c) => {
                        for (idx, row) in rows.iter_mut().enumerate() {
                            row.push(if is_null(&c.nulls, idx) {
                                Value::Null
                            } else {
                                Value::Binary(c.values[idx].clone())
                            });
                        }
                    }
                }
            }
            rows
        } else if !row_set.rows.is_empty() {
            // Row-based fallback
            row_set
                .rows
                .iter()
                .map(|row| row.col_vals.iter().map(col_value_to_value).collect())
                .collect()
        } else {
            vec![]
        };

        Ok(Response {
            columns,
            rows,
            rows_affected: None,
            duration: None,
        })
    }

    fn columns_from_schema(schema: &TTableSchema) -> Vec<Column> {
        schema
            .columns
            .iter()
            .map(|col| Column::new(col.column_name.clone(), col_type_to_string(&col.type_desc)))
            .collect()
    }
}

/// Returns the number of values in any TColumn variant.
fn col_row_count(col: &TColumn) -> usize {
    match col {
        TColumn::BoolVal(c) => c.values.len(),
        TColumn::I32Val(c) => c.values.len(),
        TColumn::I64Val(c) => c.values.len(),
        TColumn::DoubleVal(c) => c.values.len(),
        TColumn::StringVal(c) => c.values.len(),
        TColumn::BinaryVal(c) => c.values.len(),
    }
}

/// Convert Thrift column type descriptor to string representation.
fn col_type_to_string(type_desc: &TTypeDesc) -> String {
    type_desc
        .types
        .first()
        .map(|entry| match entry {
            TTypeEntry::PrimitiveEntry(prim) => prim.type_id.as_str().into(),
            TTypeEntry::ComplexEntry(label) => label.clone(),
        })
        .unwrap_or_else(|| "UNKNOWN".into())
}

/// Convert a Thrift column value to a Value.
fn col_value_to_value(val: &TColumnValue) -> Value {
    match val {
        TColumnValue::BoolVal(Some(b)) => Value::Boolean(*b),
        TColumnValue::ByteVal(Some(b)) => Value::TinyInt(*b),
        TColumnValue::I16Val(Some(i)) => Value::SmallInt(*i),
        TColumnValue::I32Val(Some(i)) => Value::Int(*i),
        TColumnValue::I64Val(Some(i)) => Value::BigInt(*i),
        TColumnValue::DoubleVal(Some(d)) => Value::Double(*d),
        TColumnValue::StringVal(Some(s)) => Value::String(s.clone()),
        TColumnValue::BinaryVal(Some(b)) => Value::Binary(b.clone()),
        _ => Value::Null,
    }
}
