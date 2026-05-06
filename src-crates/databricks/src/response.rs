/// A Databricks SQL result column descriptor.
#[derive(Debug)]
pub struct Column {
    pub name: String,
    pub datatype: String,
}

impl Column {
    pub fn new<N: Into<String>, D: Into<String>>(name: N, datatype: D) -> Self {
        Self {
            name: name.into(),
            datatype: datatype.into(),
        }
    }
}

/// A strongly-typed value from a Databricks SQL result cell.
///
/// Covers all Databricks SQL data types listed at
/// <https://docs.databricks.com/aws/en/sql/language-manual/sql-ref-datatypes>.
///
/// Primitive numeric and boolean types have dedicated variants.
/// All other types (temporal, complex, geospatial, semi-structured) are
/// transmitted as strings on the Thrift wire and stored in [`Value::String`].
#[derive(Debug, PartialEq)]
pub enum Value {
    /// https://docs.databricks.com/aws/en/sql/language-manual/data-types/bigint-type
    BigInt(i64),
    /// https://docs.databricks.com/aws/en/sql/language-manual/data-types/binary-type
    Binary(Vec<u8>),
    /// https://docs.databricks.com/aws/en/sql/language-manual/data-types/boolean-type
    Boolean(bool),
    /// https://docs.databricks.com/aws/en/sql/language-manual/data-types/double-type
    Double(f64),
    /// https://docs.databricks.com/aws/en/sql/language-manual/data-types/float-type
    Float(f32),
    /// https://docs.databricks.com/aws/en/sql/language-manual/data-types/int-type
    Int(i32),
    /// VOID — the untyped NULL.
    /// https://docs.databricks.com/aws/en/sql/language-manual/data-types/null-type
    Null,
    /// https://docs.databricks.com/aws/en/sql/language-manual/data-types/smallint-type
    SmallInt(i16),
    /// Carries the string representation for all non-primitive Databricks types:
    /// - STRING        https://docs.databricks.com/aws/en/sql/language-manual/data-types/string-type
    /// - DATE          https://docs.databricks.com/aws/en/sql/language-manual/data-types/date-type
    /// - DECIMAL       https://docs.databricks.com/aws/en/sql/language-manual/data-types/decimal-type
    /// - TIMESTAMP     https://docs.databricks.com/aws/en/sql/language-manual/data-types/timestamp-type
    /// - TIMESTAMP_NTZ https://docs.databricks.com/aws/en/sql/language-manual/data-types/timestamp-ntz-type
    /// - INTERVAL      https://docs.databricks.com/aws/en/sql/language-manual/data-types/interval-type
    /// - ARRAY         https://docs.databricks.com/aws/en/sql/language-manual/data-types/array-type
    /// - MAP           https://docs.databricks.com/aws/en/sql/language-manual/data-types/map-type
    /// - STRUCT        https://docs.databricks.com/aws/en/sql/language-manual/data-types/struct-type
    /// - VARIANT       https://docs.databricks.com/aws/en/sql/language-manual/data-types/variant-type
    /// - OBJECT        https://docs.databricks.com/aws/en/sql/language-manual/data-types/object-type
    /// - GEOGRAPHY     https://docs.databricks.com/aws/en/sql/language-manual/data-types/geography-type
    /// - GEOMETRY      https://docs.databricks.com/aws/en/sql/language-manual/data-types/geometry-type
    String(String),
    /// https://docs.databricks.com/aws/en/sql/language-manual/data-types/tinyint-type
    TinyInt(i8),
}

/// The result of a Databricks SQL query.
#[derive(Debug, Default)]
pub struct Response {
    pub columns: Vec<Column>,
    pub rows: Vec<Vec<Value>>,
    pub rows_affected: Option<u64>,
    /// Execution duration in milliseconds, derived from operationStarted/operationCompleted.
    pub duration: Option<u32>,
}
