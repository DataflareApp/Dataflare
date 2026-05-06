pub use fbon::{Bytes, Value};
use {
    serde::Serialize,
    serde_json::{Number as JsonNumber, Value as JsonValue},
};

pub trait QueryValueExt {
    fn from_json_bytes(bytes: Vec<JsonValue>) -> Result<Value, ()>;
    fn from_json_number(val: JsonNumber) -> Value;
    fn pretty_json(val: JsonValue) -> Value;
    fn pretty_json_try_from_str(val: &str) -> Option<Value>;
}

impl QueryValueExt for Value {
    #[allow(clippy::result_unit_err)]
    fn from_json_bytes(bytes: Vec<JsonValue>) -> Result<Self, ()> {
        let mut buf = Vec::with_capacity(bytes.len());
        for n in &bytes {
            match n.as_u64() {
                Some(n) if n < 256 => {
                    buf.push(n as u8);
                }
                _ => return Err(()),
            }
        }
        Ok(Value::from_bytes(buf))
    }

    fn from_json_number(val: JsonNumber) -> Self {
        if let Some(v) = val.as_i64() {
            Self::I64(v)
        } else if let Some(v) = val.as_u64() {
            Self::U64(v)
        } else if let Some(v) = val.as_f64() {
            Self::F64(v)
        } else {
            panic!("JSON number error")
        }
    }

    fn pretty_json(val: JsonValue) -> Self {
        serde_json::to_string_pretty(&val)
            .map(Self::String)
            // NOTE: In fact, this should return an error, but it is unlikely to occur.
            .unwrap()
    }

    fn pretty_json_try_from_str(val: &str) -> Option<Value> {
        serde_json::from_str::<JsonValue>(val)
            .ok()
            .and_then(|a| serde_json::to_string_pretty(&a).ok())
            .map(Self::String)
    }
}

#[derive(Debug, PartialEq, Default, Clone, Serialize)]
pub struct Query {
    pub columns: Vec<QueryColumn>,
    pub rows: Vec<Vec<Value>>,
    pub rows_affected: Option<u64>,
    /// Duration in milliseconds
    pub duration: u32,
}

// impl From<Query> for Value {
//     fn from(value: Query) -> Self {
//         let mut map = HashMap::with_capacity(4);
//         map.insert(
//             "columns".into(),
//             Value::Array(value.columns.into_iter().map(Into::into).collect()),
//         );
//         map.insert("rows".into(), value.rows.into());
//         map.insert(
//             "rows_affected".into(),
//             value.rows_affected.map(Value::U64).unwrap_or_default(),
//         );
//         map.insert("duration".into(), Value::U32(value.duration));
//         Value::Map(map)
//     }
// }

#[derive(Debug, PartialEq, Clone, Serialize)]
pub struct QueryColumn {
    pub name: String,
    pub datatype: String,
}

impl QueryColumn {
    pub fn new<N: Into<String>, D: Into<String>>(name: N, datatype: D) -> Self {
        Self {
            name: name.into(),
            datatype: datatype.into(),
        }
    }
}

// impl From<QueryColumn> for Value {
//     fn from(value: QueryColumn) -> Self {
//         let mut map = HashMap::with_capacity(2);
//         map.insert("name".into(), Value::String(value.name));
//         map.insert("datatype".into(), Value::String(value.datatype));
//         Value::Map(map)
//     }
// }

// impl From<Vec<Vec<Value>>> for Value {
//     fn from(value: Vec<Vec<Value>>) -> Self {
//         Value::Array(value.into_iter().map(Value::Array).collect())
//     }
// }
