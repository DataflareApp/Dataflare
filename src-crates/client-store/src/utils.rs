use super::Error;
use rusqlite::{Connection, Params, types::FromSql};
use serde::de::DeserializeOwned;
use serde_json::{Map, Value as JsonValue};
use serde_rusqlite::from_rows;
use std::time::{SystemTime, UNIX_EPOCH};
use uuid::Uuid;

pub type Id = String;

pub fn gen_id() -> Id {
    Uuid::new_v4().to_string()
}

pub fn now() -> i64 {
    let a = SystemTime::now().duration_since(UNIX_EPOCH).unwrap();
    a.as_millis() as i64
}

pub trait ConnectionExt {
    fn query_first_cell<T: FromSql>(
        &mut self,
        sql: &str,
        params: impl Params,
    ) -> Result<T, rusqlite::Error>;

    fn query_rows<T>(&self, sql: &str, params: impl Params) -> Result<Vec<T>, Error>
    where
        T: DeserializeOwned;
}

impl ConnectionExt for Connection {
    fn query_first_cell<T: FromSql>(
        &mut self,
        sql: &str,
        params: impl Params,
    ) -> Result<T, rusqlite::Error> {
        let mut stmt = self.prepare(sql)?;
        let v = stmt.query_row(params, |row| row.get(0))?;
        Ok(v)
    }

    fn query_rows<T>(&self, sql: &str, params: impl Params) -> Result<Vec<T>, Error>
    where
        T: DeserializeOwned,
    {
        let mut stmt = self.prepare(sql)?;
        let rows = stmt.query(params)?;
        from_rows(rows)
            .collect::<Result<Vec<_>, _>>()
            .map_err(Error::from)
    }
}

pub type JsonMap = Map<String, JsonValue>;
pub type JsonArray = Vec<JsonValue>;

#[inline]
pub fn json_map(v: JsonMap) -> String {
    JsonValue::from(v).to_string()
}
#[inline]
pub fn json_array(v: JsonArray) -> String {
    JsonValue::from(v).to_string()
}
