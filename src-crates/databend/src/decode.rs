use crate::Result;
use crate::response::ResponseSchema;
use query::{QueryColumn, Value};

pub fn decode_columns(schema: Vec<ResponseSchema>) -> Vec<QueryColumn> {
    schema
        .into_iter()
        .map(|s| QueryColumn {
            name: s.name,
            datatype: s.r#type.to_lowercase(),
        })
        .collect()
}

pub fn decode_rows(
    out: &mut Vec<Vec<Value>>,
    rows: Vec<Vec<Option<String>>>,
    columns: &[QueryColumn],
) -> Result<()> {
    for row in rows {
        let mut new_row = Vec::with_capacity(row.len());
        for (i, v) in row.into_iter().enumerate() {
            new_row.push(decode_value(columns.get(i), v)?);
        }
        out.push(new_row);
    }
    Ok(())
}

fn decode_value(col: Option<&QueryColumn>, v: Option<String>) -> Result<Value> {
    let Some(v) = v else {
        return Ok(Value::Null);
    };
    let Some(col) = col else {
        return Ok(Value::String(v));
    };
    let value = match col.datatype.as_str() {
        "int8" | "nullable(int8)" => v.parse().map(Value::I8)?,
        "int16" | "nullable(int16)" => v.parse().map(Value::I16)?,
        "int32" | "nullable(int32)" => v.parse().map(Value::I32)?,
        "int64" | "nullable(int64)" => v.parse().map(Value::I64)?,
        "uint8" | "nullable(uint8)" => v.parse().map(Value::U8)?,
        "uint16" | "nullable(uint16)" => v.parse().map(Value::U16)?,
        "uint32" | "nullable(uint32)" => v.parse().map(Value::U32)?,
        "uint64" | "nullable(uint64)" => v.parse().map(Value::U64)?,
        "float32" | "nullable(float32)" => v.parse().map(Value::F32)?,
        "float64" | "nullable(float64)" => v.parse().map(Value::F64)?,
        "boolean" | "nullable(boolean)" => Value::Bool(v == "1" || v.eq_ignore_ascii_case("true")),
        "binary" | "nullable(binary)" => hex::decode(v).map(Value::from_bytes)?,
        _ => Value::String(v),
    };
    Ok(value)
}
