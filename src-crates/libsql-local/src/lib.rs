mod ffi;

use dylib::Dylib;
use dylib::driver::{Error, Result};
use dylib::ffi::{ErrorMessage, StringRef};
use ffi::*;
use query::{Query, QueryColumn, Value};
use std::{ffi::c_void, sync::Mutex, time::Instant};

// NOTE:
// Do not update manually
// Use `node ./src-dylib/driver-update.mjs` update the sha256 values.

const LIBSQL_DRIVER_VERSION: &str = "20260506";
#[cfg(all(target_os = "macos", target_arch = "aarch64"))]
const LIBSQL_SHA256: &str = "1842fb3a5111d65911bbd726c9497e93cd75200622709b94af4d880e12619142";
#[cfg(all(target_os = "macos", target_arch = "x86_64"))]
const LIBSQL_SHA256: &str = "cf8a2f1f6b1ec6abb2c34f0043adee519cca6eaaede2c3a8f8fa003018196010";
#[cfg(all(target_os = "linux", target_arch = "aarch64", target_env = "gnu"))]
const LIBSQL_SHA256: &str = "99266368263f8b10df41660573d0da6212899fa0bd7d26016cdc75f71cc26f7f";
#[cfg(all(target_os = "linux", target_arch = "x86_64", target_env = "gnu"))]
const LIBSQL_SHA256: &str = "633a2cdd07c4411c7634a894fac204dfa273ca41f5b5fc8a789bacf66a468e80";
#[cfg(all(target_os = "windows", target_arch = "aarch64", target_env = "msvc"))]
const LIBSQL_SHA256: &str = "630e385590452563024ad7bdb4a5149d648e196cf2edbeee5bbe84efa8536174";
#[cfg(all(target_os = "windows", target_arch = "x86_64", target_env = "msvc"))]
const LIBSQL_SHA256: &str = "c8d68bb3c44ab3dd698950dba7fdb06b320cb62ba1e676c335f8b281af720daa";

#[derive(Debug)]
pub struct Connection {
    conn: Mutex<*mut c_void>,
    dylib: Dylib,
}

unsafe impl Send for Connection {}
unsafe impl Sync for Connection {}

impl Drop for Connection {
    fn drop(&mut self) {
        let _ = self.close();
    }
}

fn free_error(dylib: &Dylib, error: ErrorMessage) -> Result<Option<Error>, Error> {
    if !error.is_null() {
        let msg = error.as_str().to_string();
        dylib.symbol::<FreeErrorFn>(FREE_ERROR)?(error);
        return Ok(Some(Error::Message(msg)));
    }
    Ok(None)
}

impl Connection {
    pub async fn connect(path: &str, readonly: bool) -> Result<Self> {
        let mut error = ErrorMessage::null();
        let dylib = Dylib::try_load("libsql", LIBSQL_DRIVER_VERSION, LIBSQL_SHA256).await?;
        let options = ConnectOptions {
            path: StringRef::new(path),
            readonly,
        };
        let conn = dylib.symbol::<ConnectFn>(CONNECT)?(options, &mut error);
        if let Some(err) = free_error(&dylib, error)? {
            return Err(err);
        }
        Ok(Self {
            conn: Mutex::new(conn),
            dylib,
        })
    }

    fn close(&self) -> Result<(), Error> {
        let conn = self.conn.lock().map_err(|_| Error::Mutex)?;
        self.dylib.symbol::<CloseFn>(CLOSE)?(*conn);
        Ok(())
    }

    pub fn execute(&self, sql: &str) -> Result<(), Error> {
        let conn = self.conn.lock().map_err(|_| Error::Mutex)?;
        let mut error = ErrorMessage::null();
        self.dylib.symbol::<ExecuteFn>(EXECUTE)?(*conn, StringRef::new(sql), &mut error);
        if let Some(err) = free_error(&self.dylib, error)? {
            return Err(err);
        }
        Ok(())
    }

    pub fn execute_batch(&self, sql: &str) -> Result<(), Error> {
        let conn = self.conn.lock().map_err(|_| Error::Mutex)?;
        let mut error = ErrorMessage::null();
        self.dylib.symbol::<ExecuteBatchFn>(EXECUTE_BATCH)?(*conn, StringRef::new(sql), &mut error);
        if let Some(err) = free_error(&self.dylib, error)? {
            return Err(err);
        }
        Ok(())
    }

    pub fn transaction(&self, sqls: &[String]) -> Result<(), Error> {
        let conn = self.conn.lock().map_err(|_| Error::Mutex)?;
        let sqls = sqls
            .iter()
            .map(|sql| StringRef::new(sql))
            .collect::<Vec<_>>();
        let mut error = ErrorMessage::null();
        self.dylib.symbol::<TransactionFn>(TRANSACTION)?(
            *conn,
            sqls.as_ptr(),
            sqls.len(),
            &mut error,
        );
        if let Some(err) = free_error(&self.dylib, error)? {
            return Err(err);
        }
        Ok(())
    }

    pub fn query(&self, sql: &str) -> Result<Query, Error> {
        let conn = self.conn.lock().map_err(|_| Error::Mutex)?;
        let now = Instant::now();
        let mut error = ErrorMessage::null();
        let query = self.dylib.symbol::<QueryFn>(QUERY)?(*conn, StringRef::new(sql), &mut error);
        if let Some(err) = free_error(&self.dylib, error)? {
            return Err(err);
        }
        let meta = self.dylib.symbol::<QueryMetaFn>(QUERY_META)?(query);
        let query_column = self.dylib.symbol::<QueryColumnFn>(QUERY_COLUMN)?;
        let query_value = self.dylib.symbol::<QueryValueFn>(QUERY_VALUE)?;
        let columns = (0..meta.column_count)
            .map(|i| {
                let col = query_column(query, i);
                QueryColumn {
                    name: col.name.as_str().to_string(),
                    datatype: col.datatype.as_str().to_string(),
                }
            })
            .collect::<Vec<_>>();
        let mut rows = Vec::with_capacity(meta.row_count);
        for y in 0..meta.row_count {
            let mut row = Vec::with_capacity(meta.column_count);
            for x in 0..meta.column_count {
                let data = query_value(query, y, x);
                row.push(unsafe {
                    match data.kind {
                        DataKind::Null => Value::Null,
                        DataKind::I64 => Value::I64(data.value.i64),
                        DataKind::F64 => Value::F64(data.value.f64),
                        DataKind::Bytes => Value::from_bytes(data.value.bytes.as_bytes().to_vec()),
                        DataKind::String => Value::String(data.value.string.as_str().to_string()),
                    }
                });
            }
            rows.push(row);
        }
        self.dylib.symbol::<FreeQueryFn>(FREE_QUERY)?(query);
        Ok(Query {
            columns,
            rows,
            rows_affected: Some(meta.rows_affected),
            duration: now.elapsed().as_millis() as u32,
        })
    }

    pub fn select(&self, sql: &str) -> Result<Vec<Vec<Value>>, Error> {
        self.query(sql).map(|q| q.rows)
    }
}

#[cfg(test)]
mod tests {
    use crate::*;

    #[tokio::test]
    async fn test_query() {
        let conn = Connection::connect(":memory:", false).await.unwrap();
        let mut query = conn
            .query(
                "SELECT 1 as int, 3.14 as float, 'hello' as text, x'FF00FF' as blob, NULL as empty",
            )
            .unwrap();
        let row = query.rows.remove(0);
        assert_eq!(row[0], Value::I64(1));
        assert_eq!(row[1], Value::F64(3.14));
        assert_eq!(row[2], Value::String("hello".into()));
        assert_eq!(row[3], Value::from_bytes(vec![0xFF, 0x00, 0xFF]));
        assert_eq!(row[4], Value::Null);
        assert_eq!(query.rows_affected, Some(0));
    }
}
