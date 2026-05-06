use crate::Result;
use crate::response::Column;
use base64::{Engine, engine::general_purpose::STANDARD as BASE64};
use query::{QueryValueExt, Value};
use serde_json::Value as JsonValue;

pub fn decode_rows_values(
    rows: &mut Vec<Vec<Value>>,
    columns: &[Column],
    data: Vec<Vec<JsonValue>>,
) -> Result<()> {
    for row in data {
        let mut values = Vec::with_capacity(row.len());
        for (i, val) in row.into_iter().enumerate() {
            let v = match val {
                JsonValue::Null => Value::Null,
                JsonValue::Bool(b) => Value::Bool(b),
                JsonValue::Number(n) => Value::from_json_number(n),
                JsonValue::String(s) => match columns.get(i) {
                    Some(col) => match col.datatype.as_str() {
                        "varbinary" => Value::from_bytes(BASE64.decode(s)?),
                        _ => Value::String(s),
                    },
                    None => Value::String(s),
                },
                more => Value::pretty_json(more),
            };
            values.push(v);
        }
        rows.push(values);
    }
    Ok(())
}
