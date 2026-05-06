use duckdb::{Query as DuckQuery, Value as DuckValue};

pub struct Query {
    pub columns: Vec<(String, String)>,
    pub rows: Vec<Vec<Value>>,
    pub rows_affected: u64,
    pub duration: u32,
}

pub enum Value {
    Null,
    Bool(bool),
    I8(i8),
    I16(i16),
    I32(i32),
    I64(i64),
    U8(u8),
    U16(u16),
    U32(u32),
    U64(u64),
    F32(f32),
    F64(f64),
    String(String),
    Bytes(Vec<u8>),
}

pub fn allocated_query(query: DuckQuery) -> Query {
    let columns = query
        .columns
        .into_iter()
        .map(|c| {
            let datatype = c
                .logical_type_alias
                .map(|t| t.to_lowercase())
                .unwrap_or_else(|| c.logical_type.to_string());
            (c.name, datatype)
        })
        .collect::<Vec<_>>();

    let rows = query
        .rows
        .into_iter()
        .map(|row| {
            row.into_iter()
                .map(|val| match val {
                    DuckValue::Null => Value::Null,
                    DuckValue::Boolean(v) => Value::Bool(v),
                    DuckValue::I8(v) => Value::I8(v),
                    DuckValue::I16(v) => Value::I16(v),
                    DuckValue::I32(v) => Value::I32(v),
                    DuckValue::I64(v) => Value::I64(v),
                    DuckValue::U8(v) => Value::U8(v),
                    DuckValue::U16(v) => Value::U16(v),
                    DuckValue::U32(v) => Value::U32(v),
                    DuckValue::U64(v) => Value::U64(v),
                    DuckValue::F32(v) => Value::F32(v),
                    DuckValue::F64(v) => Value::F64(v),
                    DuckValue::Text(v) => Value::String(v),
                    DuckValue::Blob(v) => Value::Bytes(v),
                    val => Value::String(val.to_string()),
                })
                .collect()
        })
        .collect();

    Query {
        columns,
        rows,
        rows_affected: query.rows_affected,
        duration: query.duration.as_millis() as u32,
    }
}
