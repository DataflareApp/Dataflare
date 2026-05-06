use std::collections::BTreeMap;

use thrift::protocol::{
    TFieldIdentifier, TInputProtocol, TMapIdentifier, TOutputProtocol, TStructIdentifier, TType,
};

use crate::thrift::*;

/// Implemented by every struct that can be round-tripped through Thrift binary.
/// `write_to_out_protocol` writes the **complete** struct
/// (struct_begin … field_stop … struct_end).
/// `read_from_in_protocol` reads from after the enclosing field_begin and
/// returns before the caller issues field_end.
pub trait ThriftMessage: Sized {
    fn write_to_out_protocol(&self, o: &mut dyn TOutputProtocol) -> thrift::Result<()>;
    fn read_from_in_protocol(i: &mut dyn TInputProtocol) -> thrift::Result<Self>;
}

impl Default for THandleIdentifier {
    fn default() -> Self {
        THandleIdentifier {
            guid: vec![],
            secret: vec![],
        }
    }
}

impl Default for TStatus {
    fn default() -> Self {
        TStatus {
            status_code: TStatusCode::SUCCESS_STATUS,
            info_messages: None,
            sql_state: None,
            error_code: None,
            error_message: None,
            display_message: None,
        }
    }
}

impl Default for TSessionHandle {
    fn default() -> Self {
        TSessionHandle {
            session_id: THandleIdentifier::default(),
        }
    }
}

impl Default for TOperationHandle {
    fn default() -> Self {
        TOperationHandle {
            operation_id: THandleIdentifier::default(),
            operation_type: TOperationType::EXECUTE_STATEMENT,
            has_result_set: false,
            modified_row_count: None,
        }
    }
}

impl ThriftMessage for THandleIdentifier {
    fn write_to_out_protocol(&self, o: &mut dyn TOutputProtocol) -> thrift::Result<()> {
        o.write_struct_begin(&TStructIdentifier::new("THandleIdentifier"))?;
        o.write_field_begin(&TFieldIdentifier::new("guid", TType::String, Some(1i16)))?;
        o.write_bytes(&self.guid)?;
        o.write_field_end()?;
        o.write_field_begin(&TFieldIdentifier::new("secret", TType::String, Some(2i16)))?;
        o.write_bytes(&self.secret)?;
        o.write_field_end()?;
        o.write_field_stop()?;
        o.write_struct_end()
    }

    fn read_from_in_protocol(i: &mut dyn TInputProtocol) -> thrift::Result<Self> {
        let mut guid = vec![];
        let mut secret = vec![];
        i.read_struct_begin()?;
        loop {
            let fi = i.read_field_begin()?;
            if fi.field_type == TType::Stop {
                break;
            }
            match fi.id {
                Some(1) => {
                    guid = i.read_bytes()?;
                    i.read_field_end()?;
                }
                Some(2) => {
                    secret = i.read_bytes()?;
                    i.read_field_end()?;
                }
                _ => {
                    i.skip(fi.field_type)?;
                    i.read_field_end()?;
                }
            }
        }
        i.read_struct_end()?;
        Ok(THandleIdentifier { guid, secret })
    }
}

impl ThriftMessage for TSessionHandle {
    fn write_to_out_protocol(&self, o: &mut dyn TOutputProtocol) -> thrift::Result<()> {
        o.write_struct_begin(&TStructIdentifier::new("TSessionHandle"))?;
        o.write_field_begin(&TFieldIdentifier::new(
            "sessionId",
            TType::Struct,
            Some(1i16),
        ))?;
        self.session_id.write_to_out_protocol(o)?;
        o.write_field_end()?;
        o.write_field_stop()?;
        o.write_struct_end()
    }

    fn read_from_in_protocol(i: &mut dyn TInputProtocol) -> thrift::Result<Self> {
        let mut session_id = THandleIdentifier::default();
        i.read_struct_begin()?;
        loop {
            let fi = i.read_field_begin()?;
            if fi.field_type == TType::Stop {
                break;
            }
            match fi.id {
                Some(1) => {
                    session_id = THandleIdentifier::read_from_in_protocol(i)?;
                    i.read_field_end()?;
                }
                _ => {
                    i.skip(fi.field_type)?;
                    i.read_field_end()?;
                }
            }
        }
        i.read_struct_end()?;
        Ok(TSessionHandle { session_id })
    }
}

impl ThriftMessage for TOperationHandle {
    fn write_to_out_protocol(&self, o: &mut dyn TOutputProtocol) -> thrift::Result<()> {
        o.write_struct_begin(&TStructIdentifier::new("TOperationHandle"))?;
        o.write_field_begin(&TFieldIdentifier::new(
            "operationId",
            TType::Struct,
            Some(1i16),
        ))?;
        self.operation_id.write_to_out_protocol(o)?;
        o.write_field_end()?;
        o.write_field_begin(&TFieldIdentifier::new(
            "operationType",
            TType::I32,
            Some(2i16),
        ))?;
        o.write_i32(self.operation_type.0)?;
        o.write_field_end()?;
        o.write_field_begin(&TFieldIdentifier::new(
            "hasResultSet",
            TType::Bool,
            Some(3i16),
        ))?;
        o.write_bool(self.has_result_set)?;
        o.write_field_end()?;
        if let Some(v) = self.modified_row_count {
            o.write_field_begin(&TFieldIdentifier::new(
                "modifiedRowCount",
                TType::Double,
                Some(4i16),
            ))?;
            o.write_double(v)?;
            o.write_field_end()?;
        }
        o.write_field_stop()?;
        o.write_struct_end()
    }

    fn read_from_in_protocol(i: &mut dyn TInputProtocol) -> thrift::Result<Self> {
        let mut op_id = THandleIdentifier::default();
        let mut op_type = TOperationType::EXECUTE_STATEMENT;
        let mut has_result = false;
        let mut mod_rows = None;
        i.read_struct_begin()?;
        loop {
            let fi = i.read_field_begin()?;
            if fi.field_type == TType::Stop {
                break;
            }
            match fi.id {
                Some(1) => {
                    op_id = THandleIdentifier::read_from_in_protocol(i)?;
                    i.read_field_end()?;
                }
                Some(2) => {
                    op_type = TOperationType(i.read_i32()?);
                    i.read_field_end()?;
                }
                Some(3) => {
                    has_result = i.read_bool()?;
                    i.read_field_end()?;
                }
                Some(4) => {
                    mod_rows = Some(i.read_double()?);
                    i.read_field_end()?;
                }
                _ => {
                    i.skip(fi.field_type)?;
                    i.read_field_end()?;
                }
            }
        }
        i.read_struct_end()?;
        Ok(TOperationHandle {
            operation_id: op_id,
            operation_type: op_type,
            has_result_set: has_result,
            modified_row_count: mod_rows,
        })
    }
}

impl ThriftMessage for TStatus {
    fn write_to_out_protocol(&self, o: &mut dyn TOutputProtocol) -> thrift::Result<()> {
        o.write_struct_begin(&TStructIdentifier::new("TStatus"))?;
        o.write_field_begin(&TFieldIdentifier::new("statusCode", TType::I32, Some(1i16)))?;
        o.write_i32(self.status_code.0)?;
        o.write_field_end()?;
        o.write_field_stop()?;
        o.write_struct_end()
    }

    fn read_from_in_protocol(i: &mut dyn TInputProtocol) -> thrift::Result<Self> {
        let mut code = TStatusCode::SUCCESS_STATUS;
        let mut info = None;
        let mut sql_state = None;
        let mut error_code = None;
        let mut error_message = None;
        let mut display_message = None;
        i.read_struct_begin()?;
        loop {
            let fi = i.read_field_begin()?;
            if fi.field_type == TType::Stop {
                break;
            }
            match fi.id {
                Some(1) => {
                    code = TStatusCode(i.read_i32()?);
                    i.read_field_end()?;
                }
                Some(2) => {
                    let li = i.read_list_begin()?;
                    let mut msgs = Vec::with_capacity(li.size as usize);
                    for _ in 0..li.size {
                        msgs.push(i.read_string()?);
                    }
                    i.read_list_end()?;
                    info = Some(msgs);
                    i.read_field_end()?;
                }
                Some(3) => {
                    sql_state = Some(i.read_string()?);
                    i.read_field_end()?;
                }
                Some(4) => {
                    error_code = Some(i.read_i32()?);
                    i.read_field_end()?;
                }
                Some(5) => {
                    error_message = Some(i.read_string()?);
                    i.read_field_end()?;
                }
                Some(6) => {
                    display_message = Some(i.read_string()?);
                    i.read_field_end()?;
                }
                _ => {
                    i.skip(fi.field_type)?;
                    i.read_field_end()?;
                }
            }
        }
        i.read_struct_end()?;
        Ok(TStatus {
            status_code: code,
            info_messages: info,
            sql_state,
            error_code,
            error_message,
            display_message,
        })
    }
}

impl ThriftMessage for TOpenSessionReq {
    fn write_to_out_protocol(&self, o: &mut dyn TOutputProtocol) -> thrift::Result<()> {
        o.write_struct_begin(&TStructIdentifier::new("TOpenSessionReq"))?;
        // Field 1: clientProtocol (required i32)
        o.write_field_begin(&TFieldIdentifier::new(
            "clientProtocol",
            TType::I32,
            Some(1i16),
        ))?;
        o.write_i32(self.client_protocol.0)?;
        o.write_field_end()?;
        // Field 1282: client_protocol_i64 (optional i64)
        if let Some(v) = self.client_protocol_i64 {
            o.write_field_begin(&TFieldIdentifier::new(
                "client_protocol_i64",
                TType::I64,
                Some(1282i16),
            ))?;
            o.write_i64(v)?;
            o.write_field_end()?;
        }
        // Field 2: username (optional string)
        if let Some(ref v) = self.username {
            o.write_field_begin(&TFieldIdentifier::new(
                "username",
                TType::String,
                Some(2i16),
            ))?;
            o.write_string(v)?;
            o.write_field_end()?;
        }
        // Field 3: password (optional string)
        if let Some(ref v) = self.password {
            o.write_field_begin(&TFieldIdentifier::new(
                "password",
                TType::String,
                Some(3i16),
            ))?;
            o.write_string(v)?;
            o.write_field_end()?;
        }
        // Field 4: configuration (optional map)
        if let Some(ref cfg) = self.configuration {
            o.write_field_begin(&TFieldIdentifier::new(
                "configuration",
                TType::Map,
                Some(4i16),
            ))?;
            o.write_map_begin(&TMapIdentifier::new(
                TType::String,
                TType::String,
                cfg.len() as i32,
            ))?;
            for (k, v) in cfg {
                o.write_string(k)?;
                o.write_string(v)?;
            }
            o.write_map_end()?;
            o.write_field_end()?;
        }
        // Field 1284: initialNamespace (optional TNamespace) — preferred over configuration map
        if let Some(ref ns) = self.initial_namespace {
            o.write_field_begin(&TFieldIdentifier::new(
                "initialNamespace",
                TType::Struct,
                Some(1284i16),
            ))?;
            o.write_struct_begin(&TStructIdentifier::new("TNamespace"))?;
            if let Some(ref cat) = ns.catalog_name {
                o.write_field_begin(&TFieldIdentifier::new(
                    "catalogName",
                    TType::String,
                    Some(1i16),
                ))?;
                o.write_string(cat)?;
                o.write_field_end()?;
            }
            if let Some(ref sch) = ns.schema_name {
                o.write_field_begin(&TFieldIdentifier::new(
                    "schemaName",
                    TType::String,
                    Some(2i16),
                ))?;
                o.write_string(sch)?;
                o.write_field_end()?;
            }
            o.write_field_stop()?;
            o.write_struct_end()?;
            o.write_field_end()?;
        }
        // Field 1285: canUseMultipleCatalogs (optional bool)
        if let Some(v) = self.can_use_multiple_catalogs {
            o.write_field_begin(&TFieldIdentifier::new(
                "canUseMultipleCatalogs",
                TType::Bool,
                Some(1285i16),
            ))?;
            o.write_bool(v)?;
            o.write_field_end()?;
        }
        o.write_field_stop()?;
        o.write_struct_end()
    }

    fn read_from_in_protocol(_i: &mut dyn TInputProtocol) -> thrift::Result<Self> {
        unimplemented!("TOpenSessionReq is request-only")
    }
}

impl ThriftMessage for TOpenSessionResp {
    fn write_to_out_protocol(&self, _o: &mut dyn TOutputProtocol) -> thrift::Result<()> {
        unimplemented!("TOpenSessionResp is response-only")
    }

    fn read_from_in_protocol(i: &mut dyn TInputProtocol) -> thrift::Result<Self> {
        let mut status = TStatus::default();
        let mut server_proto = TProtocolVersion(0);
        let mut session_handle = None;
        let mut configuration = None;
        i.read_struct_begin()?;
        loop {
            let fi = i.read_field_begin()?;
            if fi.field_type == TType::Stop {
                break;
            }
            match fi.id {
                Some(1) => {
                    status = TStatus::read_from_in_protocol(i)?;
                    i.read_field_end()?;
                }
                Some(2) => {
                    server_proto = TProtocolVersion(i.read_i32()?);
                    i.read_field_end()?;
                }
                Some(3) => {
                    session_handle = Some(TSessionHandle::read_from_in_protocol(i)?);
                    i.read_field_end()?;
                }
                Some(4) => {
                    let mi = i.read_map_begin()?;
                    let mut cfg: BTreeMap<String, String> = BTreeMap::new();
                    for _ in 0..mi.size {
                        cfg.insert(i.read_string()?, i.read_string()?);
                    }
                    i.read_map_end()?;
                    configuration = Some(cfg);
                    i.read_field_end()?;
                }
                _ => {
                    i.skip(fi.field_type)?;
                    i.read_field_end()?;
                }
            }
        }
        i.read_struct_end()?;
        Ok(TOpenSessionResp {
            status,
            server_protocol_version: server_proto,
            session_handle,
            configuration,
        })
    }
}

impl ThriftMessage for TCloseSessionReq {
    fn write_to_out_protocol(&self, o: &mut dyn TOutputProtocol) -> thrift::Result<()> {
        o.write_struct_begin(&TStructIdentifier::new("TCloseSessionReq"))?;
        o.write_field_begin(&TFieldIdentifier::new(
            "sessionHandle",
            TType::Struct,
            Some(1i16),
        ))?;
        self.session_handle.write_to_out_protocol(o)?;
        o.write_field_end()?;
        o.write_field_stop()?;
        o.write_struct_end()
    }

    fn read_from_in_protocol(_i: &mut dyn TInputProtocol) -> thrift::Result<Self> {
        unimplemented!("TCloseSessionReq is request-only")
    }
}

impl ThriftMessage for TCloseSessionResp {
    fn write_to_out_protocol(&self, _o: &mut dyn TOutputProtocol) -> thrift::Result<()> {
        unimplemented!("TCloseSessionResp is response-only")
    }

    fn read_from_in_protocol(i: &mut dyn TInputProtocol) -> thrift::Result<Self> {
        let mut status = TStatus::default();
        i.read_struct_begin()?;
        loop {
            let fi = i.read_field_begin()?;
            if fi.field_type == TType::Stop {
                break;
            }
            match fi.id {
                Some(1) => {
                    status = TStatus::read_from_in_protocol(i)?;
                    i.read_field_end()?;
                }
                _ => {
                    i.skip(fi.field_type)?;
                    i.read_field_end()?;
                }
            }
        }
        i.read_struct_end()?;
        Ok(TCloseSessionResp { status })
    }
}

impl ThriftMessage for TSparkGetDirectResults {
    fn write_to_out_protocol(&self, o: &mut dyn TOutputProtocol) -> thrift::Result<()> {
        o.write_struct_begin(&TStructIdentifier::new("TSparkGetDirectResults"))?;
        o.write_field_begin(&TFieldIdentifier::new("maxRows", TType::I64, Some(1i16)))?;
        o.write_i64(self.max_rows)?;
        o.write_field_end()?;
        if let Some(max_bytes) = self.max_bytes {
            o.write_field_begin(&TFieldIdentifier::new("maxBytes", TType::I64, Some(2i16)))?;
            o.write_i64(max_bytes)?;
            o.write_field_end()?;
        }
        o.write_field_stop()?;
        o.write_struct_end()
    }

    fn read_from_in_protocol(i: &mut dyn TInputProtocol) -> thrift::Result<Self> {
        let mut max_rows = 0i64;
        let mut max_bytes = None;
        i.read_struct_begin()?;
        loop {
            let fi = i.read_field_begin()?;
            if fi.field_type == TType::Stop {
                break;
            }
            match fi.id {
                Some(1) => {
                    max_rows = i.read_i64()?;
                    i.read_field_end()?;
                }
                Some(2) => {
                    max_bytes = Some(i.read_i64()?);
                    i.read_field_end()?;
                }
                _ => {
                    i.skip(fi.field_type)?;
                    i.read_field_end()?;
                }
            }
        }
        i.read_struct_end()?;
        Ok(TSparkGetDirectResults {
            max_rows,
            max_bytes,
        })
    }
}

impl ThriftMessage for TSparkDirectResults {
    fn write_to_out_protocol(&self, _o: &mut dyn TOutputProtocol) -> thrift::Result<()> {
        unimplemented!("TSparkDirectResults is response-only")
    }

    fn read_from_in_protocol(i: &mut dyn TInputProtocol) -> thrift::Result<Self> {
        let mut operation_status = None;
        let mut result_set_metadata = None;
        let mut result_set = None;
        let mut close_operation = None;
        i.read_struct_begin()?;
        loop {
            let fi = i.read_field_begin()?;
            if fi.field_type == TType::Stop {
                break;
            }
            match fi.id {
                Some(1) => {
                    operation_status = Some(TGetOperationStatusResp::read_from_in_protocol(i)?);
                    i.read_field_end()?;
                }
                Some(2) => {
                    result_set_metadata =
                        Some(TGetResultSetMetadataResp::read_from_in_protocol(i)?);
                    i.read_field_end()?;
                }
                Some(3) => {
                    result_set = Some(TFetchResultsResp::read_from_in_protocol(i)?);
                    i.read_field_end()?;
                }
                Some(4) => {
                    close_operation = Some(TCloseOperationResp::read_from_in_protocol(i)?);
                    i.read_field_end()?;
                }
                _ => {
                    i.skip(fi.field_type)?;
                    i.read_field_end()?;
                }
            }
        }
        i.read_struct_end()?;
        Ok(TSparkDirectResults {
            operation_status,
            result_set_metadata,
            result_set,
            close_operation,
        })
    }
}

impl ThriftMessage for TExecuteStatementReq {
    fn write_to_out_protocol(&self, o: &mut dyn TOutputProtocol) -> thrift::Result<()> {
        o.write_struct_begin(&TStructIdentifier::new("TExecuteStatementReq"))?;
        o.write_field_begin(&TFieldIdentifier::new(
            "sessionHandle",
            TType::Struct,
            Some(1i16),
        ))?;
        self.session_handle.write_to_out_protocol(o)?;
        o.write_field_end()?;
        o.write_field_begin(&TFieldIdentifier::new(
            "statement",
            TType::String,
            Some(2i16),
        ))?;
        o.write_string(&self.statement)?;
        o.write_field_end()?;
        if let Some(ref cfg) = self.conf_overlay {
            o.write_field_begin(&TFieldIdentifier::new(
                "confOverlay",
                TType::Map,
                Some(3i16),
            ))?;
            o.write_map_begin(&TMapIdentifier::new(
                TType::String,
                TType::String,
                cfg.len() as i32,
            ))?;
            for (k, v) in cfg {
                o.write_string(k)?;
                o.write_string(v)?;
            }
            o.write_map_end()?;
            o.write_field_end()?;
        }
        if let Some(run_async) = self.run_async {
            o.write_field_begin(&TFieldIdentifier::new("runAsync", TType::Bool, Some(4i16)))?;
            o.write_bool(run_async)?;
            o.write_field_end()?;
        }
        if let Some(ref get_direct_results) = self.get_direct_results {
            o.write_field_begin(&TFieldIdentifier::new(
                "getDirectResults",
                TType::Struct,
                Some(1281i16),
            ))?;
            get_direct_results.write_to_out_protocol(o)?;
            o.write_field_end()?;
        }
        if let Some(timeout) = self.query_timeout {
            o.write_field_begin(&TFieldIdentifier::new(
                "queryTimeout",
                TType::I64,
                Some(5i16),
            ))?;
            o.write_i64(timeout)?;
            o.write_field_end()?;
        }
        o.write_field_stop()?;
        o.write_struct_end()
    }

    fn read_from_in_protocol(_i: &mut dyn TInputProtocol) -> thrift::Result<Self> {
        unimplemented!("TExecuteStatementReq is request-only")
    }
}

impl ThriftMessage for TExecuteStatementResp {
    fn write_to_out_protocol(&self, _o: &mut dyn TOutputProtocol) -> thrift::Result<()> {
        unimplemented!("TExecuteStatementResp is response-only")
    }

    fn read_from_in_protocol(i: &mut dyn TInputProtocol) -> thrift::Result<Self> {
        let mut status = TStatus::default();
        let mut op_handle = None;
        let mut direct_results = None;
        i.read_struct_begin()?;
        loop {
            let fi = i.read_field_begin()?;
            if fi.field_type == TType::Stop {
                break;
            }
            match fi.id {
                Some(1) => {
                    status = TStatus::read_from_in_protocol(i)?;
                    i.read_field_end()?;
                }
                Some(2) => {
                    op_handle = Some(TOperationHandle::read_from_in_protocol(i)?);
                    i.read_field_end()?;
                }
                Some(1281) => {
                    direct_results = Some(TSparkDirectResults::read_from_in_protocol(i)?);
                    i.read_field_end()?;
                }
                _ => {
                    i.skip(fi.field_type)?;
                    i.read_field_end()?;
                }
            }
        }
        i.read_struct_end()?;
        Ok(TExecuteStatementResp {
            status,
            operation_handle: op_handle,
            direct_results,
        })
    }
}

impl ThriftMessage for TGetOperationStatusReq {
    fn write_to_out_protocol(&self, o: &mut dyn TOutputProtocol) -> thrift::Result<()> {
        o.write_struct_begin(&TStructIdentifier::new("TGetOperationStatusReq"))?;
        o.write_field_begin(&TFieldIdentifier::new(
            "operationHandle",
            TType::Struct,
            Some(1i16),
        ))?;
        self.operation_handle.write_to_out_protocol(o)?;
        o.write_field_end()?;
        o.write_field_stop()?;
        o.write_struct_end()
    }

    fn read_from_in_protocol(_i: &mut dyn TInputProtocol) -> thrift::Result<Self> {
        unimplemented!("TGetOperationStatusReq is request-only")
    }
}

impl ThriftMessage for TGetOperationStatusResp {
    fn write_to_out_protocol(&self, _o: &mut dyn TOutputProtocol) -> thrift::Result<()> {
        unimplemented!("TGetOperationStatusResp is response-only")
    }

    fn read_from_in_protocol(i: &mut dyn TInputProtocol) -> thrift::Result<Self> {
        let mut status = TStatus::default();
        let mut op_state = None;
        let mut sql_state = None;
        let mut error_code = None;
        let mut error_message = None;
        let mut has_result_set = None;
        let mut operation_started = None;
        let mut operation_completed = None;
        let mut num_modified_rows = None;
        let mut display_message = None;
        i.read_struct_begin()?;
        loop {
            let fi = i.read_field_begin()?;
            if fi.field_type == TType::Stop {
                break;
            }
            match fi.id {
                Some(1) => {
                    status = TStatus::read_from_in_protocol(i)?;
                    i.read_field_end()?;
                }
                Some(2) => {
                    op_state = Some(TOperationState(i.read_i32()?));
                    i.read_field_end()?;
                }
                Some(3) => {
                    sql_state = Some(i.read_string()?);
                    i.read_field_end()?;
                }
                Some(4) => {
                    error_code = Some(i.read_i32()?);
                    i.read_field_end()?;
                }
                Some(5) => {
                    error_message = Some(i.read_string()?);
                    i.read_field_end()?;
                }
                Some(7) => {
                    operation_started = Some(i.read_i64()?);
                    i.read_field_end()?;
                }
                Some(8) => {
                    operation_completed = Some(i.read_i64()?);
                    i.read_field_end()?;
                }
                Some(9) => {
                    has_result_set = Some(i.read_bool()?);
                    i.read_field_end()?;
                }
                // Field 11: numModifiedRows (i64) — rows affected by DML
                Some(11) => {
                    num_modified_rows = Some(i.read_i64()?);
                    i.read_field_end()?;
                }
                // Field 1281: displayMessage — short human-readable error message
                Some(1281) => {
                    display_message = Some(i.read_string()?);
                    i.read_field_end()?;
                }
                _ => {
                    i.skip(fi.field_type)?;
                    i.read_field_end()?;
                }
            }
        }
        i.read_struct_end()?;
        Ok(TGetOperationStatusResp {
            status,
            operation_state: op_state,
            sql_state,
            error_code,
            error_message,
            has_result_set,
            operation_started,
            operation_completed,
            num_modified_rows,
            display_message,
        })
    }
}

impl ThriftMessage for TGetResultSetMetadataReq {
    fn write_to_out_protocol(&self, o: &mut dyn TOutputProtocol) -> thrift::Result<()> {
        o.write_struct_begin(&TStructIdentifier::new("TGetResultSetMetadataReq"))?;
        o.write_field_begin(&TFieldIdentifier::new(
            "operationHandle",
            TType::Struct,
            Some(1i16),
        ))?;
        self.operation_handle.write_to_out_protocol(o)?;
        o.write_field_end()?;
        o.write_field_stop()?;
        o.write_struct_end()
    }

    fn read_from_in_protocol(_i: &mut dyn TInputProtocol) -> thrift::Result<Self> {
        unimplemented!("TGetResultSetMetadataReq is request-only")
    }
}

impl ThriftMessage for TGetResultSetMetadataResp {
    fn write_to_out_protocol(&self, _o: &mut dyn TOutputProtocol) -> thrift::Result<()> {
        unimplemented!("TGetResultSetMetadataResp is response-only")
    }

    fn read_from_in_protocol(i: &mut dyn TInputProtocol) -> thrift::Result<Self> {
        let mut status = TStatus::default();
        let mut schema = None;
        let mut result_format = None;
        i.read_struct_begin()?;
        loop {
            let fi = i.read_field_begin()?;
            if fi.field_type == TType::Stop {
                break;
            }
            match fi.id {
                Some(1) => {
                    status = TStatus::read_from_in_protocol(i)?;
                    i.read_field_end()?;
                }
                Some(2) => {
                    schema = Some(read_table_schema(i)?);
                    i.read_field_end()?;
                }
                // Field 3: resultFormat (i32 TSparkRowSetType)
                Some(3) => {
                    result_format = Some(TSparkRowSetType(i.read_i32()?));
                    i.read_field_end()?;
                }
                _ => {
                    i.skip(fi.field_type)?;
                    i.read_field_end()?;
                }
            }
        }
        i.read_struct_end()?;
        Ok(TGetResultSetMetadataResp {
            status,
            schema,
            result_format,
        })
    }
}

fn read_table_schema(i: &mut dyn TInputProtocol) -> thrift::Result<TTableSchema> {
    let mut columns = vec![];
    i.read_struct_begin()?;
    loop {
        let fi = i.read_field_begin()?;
        if fi.field_type == TType::Stop {
            break;
        }
        match fi.id {
            Some(1) => {
                let li = i.read_list_begin()?;
                for _ in 0..li.size {
                    columns.push(read_column_desc(i)?);
                }
                i.read_list_end()?;
                i.read_field_end()?;
            }
            _ => {
                i.skip(fi.field_type)?;
                i.read_field_end()?;
            }
        }
    }
    i.read_struct_end()?;
    Ok(TTableSchema { columns })
}

fn read_column_desc(i: &mut dyn TInputProtocol) -> thrift::Result<TColumnDesc> {
    let mut name = String::new();
    let mut type_desc = TTypeDesc { types: vec![] };
    let mut position = 0i32;
    let mut comment = None;
    i.read_struct_begin()?;
    loop {
        let fi = i.read_field_begin()?;
        if fi.field_type == TType::Stop {
            break;
        }
        match fi.id {
            Some(1) => {
                name = i.read_string()?;
                i.read_field_end()?;
            }
            Some(2) => {
                type_desc = read_type_desc(i)?;
                i.read_field_end()?;
            }
            Some(3) => {
                position = i.read_i32()?;
                i.read_field_end()?;
            }
            Some(4) => {
                comment = Some(i.read_string()?);
                i.read_field_end()?;
            }
            _ => {
                i.skip(fi.field_type)?;
                i.read_field_end()?;
            }
        }
    }
    i.read_struct_end()?;
    Ok(TColumnDesc {
        column_name: name,
        type_desc,
        position,
        comment,
    })
}

fn read_type_desc(i: &mut dyn TInputProtocol) -> thrift::Result<TTypeDesc> {
    let mut types = vec![];
    i.read_struct_begin()?;
    loop {
        let fi = i.read_field_begin()?;
        if fi.field_type == TType::Stop {
            break;
        }
        match fi.id {
            Some(1) => {
                let li = i.read_list_begin()?;
                for _ in 0..li.size {
                    types.push(read_type_entry(i)?);
                }
                i.read_list_end()?;
                i.read_field_end()?;
            }
            _ => {
                i.skip(fi.field_type)?;
                i.read_field_end()?;
            }
        }
    }
    i.read_struct_end()?;
    Ok(TTypeDesc { types })
}

fn read_type_entry(i: &mut dyn TInputProtocol) -> thrift::Result<TTypeEntry> {
    // TTypeEntry is a union; exactly one field will be set.
    // Field IDs: 1=primitive 2=array 3=map 4=struct 5=union 6=userDefined
    let mut result = TTypeEntry::ComplexEntry("UNKNOWN".into());
    i.read_struct_begin()?;
    loop {
        let fi = i.read_field_begin()?;
        if fi.field_type == TType::Stop {
            break;
        }
        match fi.id {
            Some(1) => {
                // TPrimitiveTypeEntry: { 1: type(i32), 2: typeQualifiers(struct, optional) }
                let mut type_id = TTypeId::STRING_TYPE;
                i.read_struct_begin()?;
                loop {
                    let inner = i.read_field_begin()?;
                    if inner.field_type == TType::Stop {
                        break;
                    }
                    match inner.id {
                        Some(1) => {
                            type_id = TTypeId(i.read_i32()?);
                            i.read_field_end()?;
                        }
                        _ => {
                            i.skip(inner.field_type)?;
                            i.read_field_end()?;
                        }
                    }
                }
                i.read_struct_end()?;
                result = TTypeEntry::PrimitiveEntry(TPrimitiveTypeEntry { type_id });
                i.read_field_end()?;
            }
            Some(2) => {
                i.skip(fi.field_type)?;
                result = TTypeEntry::ComplexEntry("ARRAY".into());
                i.read_field_end()?;
            }
            Some(3) => {
                i.skip(fi.field_type)?;
                result = TTypeEntry::ComplexEntry("MAP".into());
                i.read_field_end()?;
            }
            Some(4) => {
                i.skip(fi.field_type)?;
                result = TTypeEntry::ComplexEntry("STRUCT".into());
                i.read_field_end()?;
            }
            Some(5) => {
                i.skip(fi.field_type)?;
                result = TTypeEntry::ComplexEntry("UNION".into());
                i.read_field_end()?;
            }
            Some(6) => {
                i.skip(fi.field_type)?;
                result = TTypeEntry::ComplexEntry("USER_DEFINED".into());
                i.read_field_end()?;
            }
            _ => {
                i.skip(fi.field_type)?;
                i.read_field_end()?;
            }
        }
    }
    i.read_struct_end()?;
    Ok(result)
}

impl ThriftMessage for TFetchResultsReq {
    fn write_to_out_protocol(&self, o: &mut dyn TOutputProtocol) -> thrift::Result<()> {
        o.write_struct_begin(&TStructIdentifier::new("TFetchResultsReq"))?;
        o.write_field_begin(&TFieldIdentifier::new(
            "operationHandle",
            TType::Struct,
            Some(1i16),
        ))?;
        self.operation_handle.write_to_out_protocol(o)?;
        o.write_field_end()?;
        o.write_field_begin(&TFieldIdentifier::new(
            "orientation",
            TType::I32,
            Some(2i16),
        ))?;
        o.write_i32(self.orientation.0)?;
        o.write_field_end()?;
        o.write_field_begin(&TFieldIdentifier::new("maxRows", TType::I64, Some(3i16)))?;
        o.write_i64(self.max_rows)?;
        o.write_field_end()?;
        if let Some(ft) = self.fetch_type {
            o.write_field_begin(&TFieldIdentifier::new("fetchType", TType::I16, Some(4i16)))?;
            o.write_i16(ft)?;
            o.write_field_end()?;
        }
        if let Some(include_result_set_metadata) = self.include_result_set_metadata {
            o.write_field_begin(&TFieldIdentifier::new(
                "includeResultSetMetadata",
                TType::Bool,
                Some(1283i16),
            ))?;
            o.write_bool(include_result_set_metadata)?;
            o.write_field_end()?;
        }
        o.write_field_stop()?;
        o.write_struct_end()
    }

    fn read_from_in_protocol(_i: &mut dyn TInputProtocol) -> thrift::Result<Self> {
        unimplemented!("TFetchResultsReq is request-only")
    }
}

impl ThriftMessage for TFetchResultsResp {
    fn write_to_out_protocol(&self, _o: &mut dyn TOutputProtocol) -> thrift::Result<()> {
        unimplemented!("TFetchResultsResp is response-only")
    }

    fn read_from_in_protocol(i: &mut dyn TInputProtocol) -> thrift::Result<Self> {
        let mut status = TStatus::default();
        let mut has_more = None;
        let mut results = None;
        let mut result_set_metadata = None;
        i.read_struct_begin()?;
        loop {
            let fi = i.read_field_begin()?;
            if fi.field_type == TType::Stop {
                break;
            }
            match fi.id {
                Some(1) => {
                    status = TStatus::read_from_in_protocol(i)?;
                    i.read_field_end()?;
                }
                Some(2) => {
                    has_more = Some(i.read_bool()?);
                    i.read_field_end()?;
                }
                Some(3) => {
                    results = Some(read_row_set(i)?);
                    i.read_field_end()?;
                }
                Some(1281) => {
                    result_set_metadata =
                        Some(TGetResultSetMetadataResp::read_from_in_protocol(i)?);
                    i.read_field_end()?;
                }
                _ => {
                    i.skip(fi.field_type)?;
                    i.read_field_end()?;
                }
            }
        }
        i.read_struct_end()?;
        Ok(TFetchResultsResp {
            status,
            has_more_rows: has_more,
            results,
            result_set_metadata,
        })
    }
}

fn read_row_set(i: &mut dyn TInputProtocol) -> thrift::Result<TRowSet> {
    let mut start_row = 0i64;
    let mut rows = vec![];
    let mut columns = None;
    let mut arrow_batches = vec![];
    i.read_struct_begin()?;
    loop {
        let fi = i.read_field_begin()?;
        if fi.field_type == TType::Stop {
            break;
        }
        match fi.id {
            Some(1) => {
                start_row = i.read_i64()?;
                i.read_field_end()?;
            }
            Some(2) => {
                // Row-based format: List<TRow>
                let li = i.read_list_begin()?;
                for _ in 0..li.size {
                    rows.push(read_row(i)?);
                }
                i.read_list_end()?;
                i.read_field_end()?;
            }
            Some(3) => {
                // Columnar format: List<TColumn>
                let li = i.read_list_begin()?;
                let mut cols = Vec::with_capacity(li.size as usize);
                for _ in 0..li.size {
                    cols.push(read_column(i)?);
                }
                i.read_list_end()?;
                columns = Some(cols);
                i.read_field_end()?;
            }
            Some(1281) => {
                // arrowBatches: List<TSparkArrowBatch> — decode batch bytes for Arrow detection.
                // We don’t interpret Arrow IPC; just record that batches are present so the
                // caller can surface an UnsupportedResultFormat error.
                let li = i.read_list_begin()?;
                for _ in 0..li.size {
                    // TSparkArrowBatch: { 1: batch(binary), 2: rowCount(i64) }
                    let mut batch_bytes = vec![];
                    i.read_struct_begin()?;
                    loop {
                        let inner = i.read_field_begin()?;
                        if inner.field_type == TType::Stop {
                            break;
                        }
                        match inner.id {
                            Some(1) => {
                                batch_bytes = i.read_bytes()?;
                                i.read_field_end()?;
                            }
                            _ => {
                                i.skip(inner.field_type)?;
                                i.read_field_end()?;
                            }
                        }
                    }
                    i.read_struct_end()?;
                    if !batch_bytes.is_empty() {
                        arrow_batches.push(batch_bytes);
                    }
                }
                i.read_list_end()?;
                i.read_field_end()?;
            }
            _ => {
                i.skip(fi.field_type)?;
                i.read_field_end()?;
            }
        }
    }
    i.read_struct_end()?;
    Ok(TRowSet {
        start_row_offset: start_row,
        rows,
        columns,
        arrow_batches,
    })
}

fn read_row(i: &mut dyn TInputProtocol) -> thrift::Result<TRow> {
    let mut col_vals = vec![];
    i.read_struct_begin()?;
    loop {
        let fi = i.read_field_begin()?;
        if fi.field_type == TType::Stop {
            break;
        }
        match fi.id {
            Some(1) => {
                let li = i.read_list_begin()?;
                for _ in 0..li.size {
                    col_vals.push(read_column_value(i)?);
                }
                i.read_list_end()?;
                i.read_field_end()?;
            }
            _ => {
                i.skip(fi.field_type)?;
                i.read_field_end()?;
            }
        }
    }
    i.read_struct_end()?;
    Ok(TRow { col_vals })
}

/// TColumnValue is a union: exactly one field set.
fn read_column_value(i: &mut dyn TInputProtocol) -> thrift::Result<TColumnValue> {
    let mut result = TColumnValue::StringVal(None);
    i.read_struct_begin()?;
    loop {
        let fi = i.read_field_begin()?;
        if fi.field_type == TType::Stop {
            break;
        }
        match fi.id {
            // TBoolValue → field 1
            Some(1) => {
                let (val, is_null) = read_primitive_value(i, |p| p.read_bool())?;
                result = TColumnValue::BoolVal(if is_null { None } else { Some(val) });
                i.read_field_end()?;
            }
            // TByteValue → field 2 (Thrift i8, maps to SQL TINYINT)
            Some(2) => {
                let (val, is_null) = read_primitive_value(i, |p| p.read_i8())?;
                result = TColumnValue::ByteVal(if is_null { None } else { Some(val) });
                i.read_field_end()?;
            }
            // TI16Value → field 3 (Thrift i16, maps to SQL SMALLINT)
            Some(3) => {
                let (val, is_null) = read_primitive_value(i, |p| p.read_i16())?;
                result = TColumnValue::I16Val(if is_null { None } else { Some(val) });
                i.read_field_end()?;
            }
            // TI32Value → field 4
            Some(4) => {
                let (val, is_null) = read_primitive_value(i, |p| p.read_i32())?;
                result = TColumnValue::I32Val(if is_null { None } else { Some(val) });
                i.read_field_end()?;
            }
            // TI64Value → field 5
            Some(5) => {
                let (val, is_null) = read_primitive_value(i, |p| p.read_i64())?;
                result = TColumnValue::I64Val(if is_null { None } else { Some(val) });
                i.read_field_end()?;
            }
            // TDoubleValue → field 6
            Some(6) => {
                let (val, is_null) = read_primitive_value(i, |p| p.read_double())?;
                result = TColumnValue::DoubleVal(if is_null { None } else { Some(val) });
                i.read_field_end()?;
            }
            // TStringValue → field 7
            Some(7) => {
                let (val, is_null) = read_primitive_value(i, |p| p.read_string())?;
                result = TColumnValue::StringVal(if is_null { None } else { Some(val) });
                i.read_field_end()?;
            }
            _ => {
                i.skip(fi.field_type)?;
                i.read_field_end()?;
            }
        }
    }
    i.read_struct_end()?;
    Ok(result)
}

/// Read a "TXxxValue" wrapper struct (has field 1=value, field 2=isNull bool).
fn read_primitive_value<T, F>(
    i: &mut dyn TInputProtocol,
    mut read_val: F,
) -> thrift::Result<(T, bool)>
where
    F: FnMut(&mut dyn TInputProtocol) -> thrift::Result<T>,
    T: Default,
{
    let mut val = None;
    let mut is_null = false;
    i.read_struct_begin()?;
    loop {
        let fi = i.read_field_begin()?;
        if fi.field_type == TType::Stop {
            break;
        }
        match fi.id {
            Some(1) => {
                val = Some(read_val(i)?);
                i.read_field_end()?;
            }
            Some(2) => {
                is_null = i.read_bool()?;
                i.read_field_end()?;
            }
            _ => {
                i.skip(fi.field_type)?;
                i.read_field_end()?;
            }
        }
    }
    i.read_struct_end()?;
    Ok((val.unwrap_or_default(), is_null))
}

/// TColumn is a union: exactly one field set.
fn read_column(i: &mut dyn TInputProtocol) -> thrift::Result<TColumn> {
    let mut result = TColumn::StringVal(TStringColumn {
        values: vec![],
        nulls: vec![],
    });
    i.read_struct_begin()?;
    loop {
        let fi = i.read_field_begin()?;
        if fi.field_type == TType::Stop {
            break;
        }
        match fi.id {
            Some(1) => {
                result = TColumn::BoolVal(read_bool_column(i)?);
                i.read_field_end()?;
            }
            Some(2) => {
                // TByteColumn (i8)
                let (values, nulls) = read_typed_column(i, |p| p.read_i8().map(|v| v as i32))?;
                result = TColumn::I32Val(TI32Column { values, nulls });
                i.read_field_end()?;
            }
            Some(3) => {
                let (values, nulls) = read_typed_column(i, |p| p.read_i16().map(|v| v as i32))?;
                result = TColumn::I32Val(TI32Column { values, nulls });
                i.read_field_end()?;
            }
            Some(4) => {
                let (values, nulls) = read_typed_column(i, |p| p.read_i32())?;
                result = TColumn::I32Val(TI32Column { values, nulls });
                i.read_field_end()?;
            }
            Some(5) => {
                let (values, nulls) = read_typed_column(i, |p| p.read_i64())?;
                result = TColumn::I64Val(TI64Column { values, nulls });
                i.read_field_end()?;
            }
            Some(6) => {
                let (values, nulls) = read_typed_column(i, |p| p.read_double())?;
                result = TColumn::DoubleVal(TDoubleColumn { values, nulls });
                i.read_field_end()?;
            }
            Some(7) => {
                result = TColumn::StringVal(read_string_column(i)?);
                i.read_field_end()?;
            }
            Some(8) => {
                let (values, nulls) = read_typed_column(i, |p| p.read_bytes())?;
                result = TColumn::BinaryVal(TBinaryColumn { values, nulls });
                i.read_field_end()?;
            }
            _ => {
                i.skip(fi.field_type)?;
                i.read_field_end()?;
            }
        }
    }
    i.read_struct_end()?;
    Ok(result)
}

fn read_bool_column(i: &mut dyn TInputProtocol) -> thrift::Result<TBoolColumn> {
    let (values, nulls) = read_typed_column(i, |p| p.read_bool())?;
    Ok(TBoolColumn { values, nulls })
}

fn read_string_column(i: &mut dyn TInputProtocol) -> thrift::Result<TStringColumn> {
    let (values, nulls) = read_typed_column(i, |p| p.read_string())?;
    Ok(TStringColumn { values, nulls })
}

/// Reads a columnar array struct: { 1: list<T>, 2: binary nulls }.
fn read_typed_column<T, F>(
    i: &mut dyn TInputProtocol,
    mut read_elem: F,
) -> thrift::Result<(Vec<T>, Vec<u8>)>
where
    F: FnMut(&mut dyn TInputProtocol) -> thrift::Result<T>,
{
    let mut values = vec![];
    let mut nulls = vec![];
    i.read_struct_begin()?;
    loop {
        let fi = i.read_field_begin()?;
        if fi.field_type == TType::Stop {
            break;
        }
        match fi.id {
            Some(1) => {
                let li = i.read_list_begin()?;
                values.reserve(li.size as usize);
                for _ in 0..li.size {
                    values.push(read_elem(i)?);
                }
                i.read_list_end()?;
                i.read_field_end()?;
            }
            Some(2) => {
                nulls = i.read_bytes()?;
                i.read_field_end()?;
            }
            _ => {
                i.skip(fi.field_type)?;
                i.read_field_end()?;
            }
        }
    }
    i.read_struct_end()?;
    Ok((values, nulls))
}

/// Returns true if row `index` is null according to the nulls bitmap.
pub fn is_null(nulls: &[u8], index: usize) -> bool {
    let byte = index / 8;
    let bit = index % 8;
    nulls.get(byte).map_or(false, |&b| (b >> bit) & 1 == 1)
}

impl ThriftMessage for TCloseOperationReq {
    fn write_to_out_protocol(&self, o: &mut dyn TOutputProtocol) -> thrift::Result<()> {
        o.write_struct_begin(&TStructIdentifier::new("TCloseOperationReq"))?;
        o.write_field_begin(&TFieldIdentifier::new(
            "operationHandle",
            TType::Struct,
            Some(1i16),
        ))?;
        self.operation_handle.write_to_out_protocol(o)?;
        o.write_field_end()?;
        o.write_field_stop()?;
        o.write_struct_end()
    }

    fn read_from_in_protocol(_i: &mut dyn TInputProtocol) -> thrift::Result<Self> {
        unimplemented!("TCloseOperationReq is request-only")
    }
}

impl ThriftMessage for TCloseOperationResp {
    fn write_to_out_protocol(&self, _o: &mut dyn TOutputProtocol) -> thrift::Result<()> {
        unimplemented!("TCloseOperationResp is response-only")
    }

    fn read_from_in_protocol(i: &mut dyn TInputProtocol) -> thrift::Result<Self> {
        let mut status = TStatus::default();
        i.read_struct_begin()?;
        loop {
            let fi = i.read_field_begin()?;
            if fi.field_type == TType::Stop {
                break;
            }
            match fi.id {
                Some(1) => {
                    status = TStatus::read_from_in_protocol(i)?;
                    i.read_field_end()?;
                }
                _ => {
                    i.skip(fi.field_type)?;
                    i.read_field_end()?;
                }
            }
        }
        i.read_struct_end()?;
        Ok(TCloseOperationResp { status })
    }
}
