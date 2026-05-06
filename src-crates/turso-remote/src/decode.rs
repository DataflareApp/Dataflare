use crate::error::{Error, Result};
use crate::protocol::{StatementResult, Value as ProtocolValue};
use base64::{Engine as _, engine::general_purpose::STANDARD_NO_PAD};
use query::{Query, QueryColumn, Value};

pub(crate) fn to_query(result: StatementResult) -> Result<Query> {
    let columns = result
        .cols
        .into_iter()
        .map(|column| QueryColumn {
            name: column.name,
            datatype: column.decltype.unwrap_or_default(),
        })
        .collect();

    let rows = result
        .rows
        .into_iter()
        .map(|row| row.into_iter().map(decode_value).collect())
        .collect::<Result<Vec<_>>>()?;

    Ok(Query {
        columns,
        rows,
        rows_affected: Some(result.affected_row_count),
        duration: result.query_duration_ms.round() as u32,
    })
}

fn decode_value(value: ProtocolValue) -> Result<Value> {
    let value = match value {
        ProtocolValue::Null => Value::Null,
        ProtocolValue::Integer { value } => value
            .parse::<i64>()
            .map(Value::I64)
            .map_err(|err| Error::Protocol(format!("Invalid integer value '{value}': {err}")))?,
        ProtocolValue::Float { value } => Value::F64(value),
        ProtocolValue::Text { value } => Value::String(value),
        ProtocolValue::Blob { base64 } => STANDARD_NO_PAD
            .decode(base64.as_bytes())
            .map(Value::from_bytes)
            .map_err(|err| Error::Protocol(format!("Invalid blob value: {err}")))?,
    };
    Ok(value)
}
