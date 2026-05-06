use std::collections::BTreeMap;

#[derive(Debug, PartialEq, Eq, Clone, Copy)]
pub struct TProtocolVersion(pub i32);

impl TProtocolVersion {
    pub const SPARK_CLI_SERVICE_PROTOCOL_V8: TProtocolVersion = TProtocolVersion(42248);
    pub const SPARK_CLI_SERVICE_PROTOCOL_V9: TProtocolVersion = TProtocolVersion(42249);
}

#[derive(Debug, PartialEq, Eq, Clone, Copy)]
pub struct TStatusCode(pub i32);

impl TStatusCode {
    pub const SUCCESS_STATUS: TStatusCode = TStatusCode(0);
    pub const SUCCESS_WITH_INFO_STATUS: TStatusCode = TStatusCode(1);
    pub const STILL_EXECUTING_STATUS: TStatusCode = TStatusCode(2);
    pub const ERROR_STATUS: TStatusCode = TStatusCode(3);
    pub const INVALID_HANDLE_STATUS: TStatusCode = TStatusCode(4);
}

#[derive(Debug, PartialEq, Eq, Clone, Copy)]
pub struct TOperationState(pub i32);

impl TOperationState {
    pub const INITIALIZED_STATE: TOperationState = TOperationState(0);
    pub const RUNNING_STATE: TOperationState = TOperationState(1);
    pub const FINISHED_STATE: TOperationState = TOperationState(2);
    pub const CANCELED_STATE: TOperationState = TOperationState(3);
    pub const CLOSED_STATE: TOperationState = TOperationState(4);
    pub const ERROR_STATE: TOperationState = TOperationState(5);
    // Matches the TCLIService.thrift spec typo "UKNOWN_STATE"
    pub const UKNOWN_STATE: TOperationState = TOperationState(6);
    pub const PENDING_STATE: TOperationState = TOperationState(7);
    pub const TIMEDOUT_STATE: TOperationState = TOperationState(8);
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct TOperationType(pub i32);

impl TOperationType {
    pub const EXECUTE_STATEMENT: TOperationType = TOperationType(0);
}

/// Result-set format reported in TGetResultSetMetadataResp.
#[derive(Debug, PartialEq, Eq, Clone, Copy)]
pub struct TSparkRowSetType(pub i32);

impl TSparkRowSetType {
    /// Arrow IPC batches inside TRowSet.arrowBatches — NOT supported by this client.
    pub const ARROW_BASED_SET: TSparkRowSetType = TSparkRowSetType(0);
    pub const COLUMN_BASED_SET: TSparkRowSetType = TSparkRowSetType(1);
    pub const ROW_BASED_SET: TSparkRowSetType = TSparkRowSetType(2);
    /// Cloud-fetch presigned URLs — NOT supported by this client.
    pub const URL_BASED_SET: TSparkRowSetType = TSparkRowSetType(3);
}

#[derive(Debug)]
pub struct TStatus {
    pub status_code: TStatusCode,
    pub info_messages: Option<Vec<String>>,
    pub sql_state: Option<String>,
    pub error_code: Option<i32>,
    pub error_message: Option<String>,
    pub display_message: Option<String>,
}

impl TStatus {
    /// Return the best short error text: display_message > error_message > fallback.
    pub fn error_text(&self, fallback: &str) -> String {
        self.display_message
            .clone()
            .or_else(|| self.error_message.clone())
            .unwrap_or_else(|| fallback.into())
    }
}

#[derive(Clone, Debug)]
pub struct THandleIdentifier {
    pub guid: Vec<u8>,
    pub secret: Vec<u8>,
}

#[derive(Clone, Debug)]
pub struct TSessionHandle {
    pub session_id: THandleIdentifier,
}

#[derive(Clone, Debug)]
pub struct TOperationHandle {
    pub operation_id: THandleIdentifier,
    pub operation_type: TOperationType,
    pub has_result_set: bool,
    pub modified_row_count: Option<f64>,
}

#[derive(Clone, Debug)]
pub struct TNamespace {
    pub catalog_name: Option<String>,
    pub schema_name: Option<String>,
}

#[derive(Debug)]
pub struct TOpenSessionReq {
    pub client_protocol: TProtocolVersion,
    pub client_protocol_i64: Option<i64>,
    pub username: Option<String>,
    pub password: Option<String>,
    pub configuration: Option<BTreeMap<String, String>>,
    /// Preferred way to set initial catalog/schema (field 1284 in Thrift schema).
    pub initial_namespace: Option<TNamespace>,
    /// Signals the server that the client supports multi-catalog environments (field 1285).
    pub can_use_multiple_catalogs: Option<bool>,
}

#[derive(Debug)]
pub struct TOpenSessionResp {
    pub status: TStatus,
    pub server_protocol_version: TProtocolVersion,
    pub session_handle: Option<TSessionHandle>,
    pub configuration: Option<BTreeMap<String, String>>,
}

#[derive(Debug)]
pub struct TCloseSessionReq {
    pub session_handle: TSessionHandle,
}

#[derive(Debug)]
pub struct TCloseSessionResp {
    pub status: TStatus,
}

#[derive(Debug)]
pub struct TSparkGetDirectResults {
    pub max_rows: i64,
    pub max_bytes: Option<i64>,
}

#[derive(Debug)]
pub struct TSparkDirectResults {
    pub operation_status: Option<TGetOperationStatusResp>,
    pub result_set_metadata: Option<TGetResultSetMetadataResp>,
    pub result_set: Option<TFetchResultsResp>,
    pub close_operation: Option<TCloseOperationResp>,
}

#[derive(Debug)]
pub struct TExecuteStatementReq {
    pub session_handle: TSessionHandle,
    pub statement: String,
    pub conf_overlay: Option<BTreeMap<String, String>>,
    pub run_async: Option<bool>,
    pub get_direct_results: Option<TSparkGetDirectResults>,
    pub query_timeout: Option<i64>,
}

#[derive(Debug)]
pub struct TExecuteStatementResp {
    pub status: TStatus,
    pub operation_handle: Option<TOperationHandle>,
    pub direct_results: Option<TSparkDirectResults>,
}

#[derive(Debug)]
pub struct TGetOperationStatusReq {
    pub operation_handle: TOperationHandle,
}

#[derive(Debug)]
pub struct TGetOperationStatusResp {
    pub status: TStatus,
    pub operation_state: Option<TOperationState>,
    pub sql_state: Option<String>,
    pub error_code: Option<i32>,
    pub error_message: Option<String>,
    pub has_result_set: Option<bool>,
    /// Operation start time in Unix milliseconds (field 7 in Thrift schema).
    pub operation_started: Option<i64>,
    /// Operation completion time in Unix milliseconds (field 8 in Thrift schema).
    pub operation_completed: Option<i64>,
    /// Number of rows modified by DML statements (field 11 in Thrift schema).
    pub num_modified_rows: Option<i64>,
    /// Short human-readable error message (field 1281). Prefer over error_message.
    pub display_message: Option<String>,
}

impl TGetOperationStatusResp {
    /// Return the best short error text: display_message > error_message > fallback.
    pub fn error_text(&self, fallback: &str) -> String {
        self.display_message
            .clone()
            .or_else(|| self.error_message.clone())
            .unwrap_or_else(|| fallback.into())
    }
}

#[derive(Debug)]
pub struct TGetResultSetMetadataReq {
    pub operation_handle: TOperationHandle,
}

#[derive(Debug)]
pub struct TColumnDesc {
    pub column_name: String,
    pub type_desc: TTypeDesc,
    pub position: i32,
    pub comment: Option<String>,
}

#[derive(Debug)]
pub struct TTypeDesc {
    pub types: Vec<TTypeEntry>,
}

#[derive(Debug)]
pub enum TTypeEntry {
    PrimitiveEntry(TPrimitiveTypeEntry),
    /// Complex type (ARRAY, MAP, STRUCT, UNION, USER_DEFINED). Label is the container type name.
    ComplexEntry(String),
}

#[derive(Debug, Clone, Copy)]
pub struct TPrimitiveTypeEntry {
    pub type_id: TTypeId,
}

#[derive(Debug, PartialEq, Eq, Clone, Copy)]
pub struct TTypeId(pub i32);

impl TTypeId {
    pub const BOOLEAN_TYPE: TTypeId = TTypeId(0);
    pub const TINYINT_TYPE: TTypeId = TTypeId(1);
    pub const SMALLINT_TYPE: TTypeId = TTypeId(2);
    pub const INT_TYPE: TTypeId = TTypeId(3);
    pub const BIGINT_TYPE: TTypeId = TTypeId(4);
    pub const FLOAT_TYPE: TTypeId = TTypeId(5);
    pub const DOUBLE_TYPE: TTypeId = TTypeId(6);
    pub const STRING_TYPE: TTypeId = TTypeId(7);
    pub const TIMESTAMP_TYPE: TTypeId = TTypeId(8);
    pub const BINARY_TYPE: TTypeId = TTypeId(9);
    pub const ARRAY_TYPE: TTypeId = TTypeId(10);
    pub const MAP_TYPE: TTypeId = TTypeId(11);
    pub const STRUCT_TYPE: TTypeId = TTypeId(12);
    pub const UNION_TYPE: TTypeId = TTypeId(13);
    pub const USER_DEFINED_TYPE: TTypeId = TTypeId(14);
    pub const DECIMAL_TYPE: TTypeId = TTypeId(15);
    pub const NULL_TYPE: TTypeId = TTypeId(16);
    pub const DATE_TYPE: TTypeId = TTypeId(17);
    pub const VARCHAR_TYPE: TTypeId = TTypeId(18);
    pub const CHAR_TYPE: TTypeId = TTypeId(19);
    pub const INTERVAL_YEAR_MONTH_TYPE: TTypeId = TTypeId(20);
    pub const INTERVAL_DAY_TIME_TYPE: TTypeId = TTypeId(21);
    // NOTE: The upstream TCLIService.thrift only defines type IDs 0–21.
    // TIMESTAMP_NTZ is sent over the Thrift wire as TIMESTAMP_TYPE (8) — there is
    // no separate official wire ID for it.  Value 22 is NOT in the open-source spec.
    // VARIANT, OBJECT, GEOGRAPHY, GEOMETRY arrive as STRING or USER_DEFINED.

    pub fn as_str(&self) -> &'static str {
        match self.0 {
            0 => "BOOLEAN",
            1 => "TINYINT",
            2 => "SMALLINT",
            3 => "INT",
            4 => "BIGINT",
            5 => "FLOAT",
            6 => "DOUBLE",
            7 => "STRING",
            8 => "TIMESTAMP",
            9 => "BINARY",
            10 => "ARRAY",
            11 => "MAP",
            12 => "STRUCT",
            13 => "UNION",
            14 => "USER_DEFINED",
            15 => "DECIMAL",
            16 => "NULL",
            17 => "DATE",
            18 => "VARCHAR",
            19 => "CHAR",
            20 => "INTERVAL YEAR TO MONTH",
            21 => "INTERVAL DAY TO SECOND",
            22 => "TIMESTAMP_NTZ",
            _ => "STRING",
        }
    }
}

#[derive(Debug)]
pub struct TTableSchema {
    pub columns: Vec<TColumnDesc>,
}

#[derive(Debug)]
pub struct TGetResultSetMetadataResp {
    pub status: TStatus,
    pub schema: Option<TTableSchema>,
    /// Wire format of the result set.  None means legacy (column-based).
    pub result_format: Option<TSparkRowSetType>,
}

#[derive(Debug)]
pub struct TRow {
    pub col_vals: Vec<TColumnValue>,
}

#[derive(Debug)]
pub enum TColumnValue {
    BoolVal(Option<bool>),
    ByteVal(Option<i8>),
    I16Val(Option<i16>),
    I32Val(Option<i32>),
    I64Val(Option<i64>),
    DoubleVal(Option<f64>),
    StringVal(Option<String>),
    BinaryVal(Option<Vec<u8>>),
}

#[derive(Debug)]
pub struct TRowSet {
    pub start_row_offset: i64,
    pub rows: Vec<TRow>,
    pub columns: Option<Vec<TColumn>>,
    /// Non-empty when the server chose ARROW_BASED_SET format.
    pub arrow_batches: Vec<Vec<u8>>,
}

#[derive(Debug)]
pub enum TColumn {
    BoolVal(TBoolColumn),
    I32Val(TI32Column),
    I64Val(TI64Column),
    DoubleVal(TDoubleColumn),
    StringVal(TStringColumn),
    BinaryVal(TBinaryColumn),
}

#[derive(Debug)]
pub struct TBoolColumn {
    pub values: Vec<bool>,
    pub nulls: Vec<u8>,
}

#[derive(Debug)]
pub struct TI32Column {
    pub values: Vec<i32>,
    pub nulls: Vec<u8>,
}

#[derive(Debug)]
pub struct TI64Column {
    pub values: Vec<i64>,
    pub nulls: Vec<u8>,
}

#[derive(Debug)]
pub struct TDoubleColumn {
    pub values: Vec<f64>,
    pub nulls: Vec<u8>,
}

#[derive(Debug)]
pub struct TStringColumn {
    pub values: Vec<String>,
    pub nulls: Vec<u8>,
}

#[derive(Debug)]
pub struct TBinaryColumn {
    pub values: Vec<Vec<u8>>,
    pub nulls: Vec<u8>,
}

#[derive(Debug)]
pub struct TFetchResultsReq {
    pub operation_handle: TOperationHandle,
    pub orientation: TFetchOrientation,
    pub max_rows: i64,
    pub fetch_type: Option<i16>,
    pub include_result_set_metadata: Option<bool>,
}

#[derive(Debug, Clone, Copy)]
pub struct TFetchOrientation(pub i32);

impl TFetchOrientation {
    pub const FETCH_NEXT: TFetchOrientation = TFetchOrientation(0);
    pub const FETCH_FIRST: TFetchOrientation = TFetchOrientation(4);
}

#[derive(Debug)]
pub struct TFetchResultsResp {
    pub status: TStatus,
    pub has_more_rows: Option<bool>,
    pub results: Option<TRowSet>,
    pub result_set_metadata: Option<TGetResultSetMetadataResp>,
}

#[derive(Debug)]
pub struct TCloseOperationReq {
    pub operation_handle: TOperationHandle,
}

#[derive(Debug)]
pub struct TCloseOperationResp {
    pub status: TStatus,
}
