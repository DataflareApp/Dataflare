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

const TURSO_DRIVER_VERSION: &str = "20260420";
#[cfg(all(target_os = "macos", target_arch = "aarch64"))]
const TURSO_SHA256: &str = "5ef445b8950a0fcb3741320f5a74b3a910c7dda623c6e6e0f8d9bc6b2d5b969a";
#[cfg(all(target_os = "macos", target_arch = "x86_64"))]
const TURSO_SHA256: &str = "79c3831fd61d0d1b11632ba4598cce6ac23657a028b755f814b4ccc948743dd1";
#[cfg(all(target_os = "linux", target_arch = "aarch64", target_env = "gnu"))]
const TURSO_SHA256: &str = "f63272482820a66749aa02a8d765b2e885a935d8192e87a9ba2fa3ac3667f17c";
#[cfg(all(target_os = "linux", target_arch = "x86_64", target_env = "gnu"))]
const TURSO_SHA256: &str = "a87887952d4124121ca4f0a5268d55d411309867d90e8b073ef9f9dd8d92b5c7";
#[cfg(all(target_os = "windows", target_arch = "aarch64", target_env = "msvc"))]
const TURSO_SHA256: &str = "d8f9b560462db13b0ec70b6adf90e6843aa1a4787d3da5d2f0bac6b8b509a1bb";
#[cfg(all(target_os = "windows", target_arch = "x86_64", target_env = "msvc"))]
const TURSO_SHA256: &str = "cae14eac4b92aa2a7016acfd951433b4fca8577d381caa099ad926f1b5dcd783";

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

#[derive(Debug, Clone)]
pub struct EncryptionConfig {
    pub cipher: String,
    pub key: String,
}

impl Connection {
    pub async fn connect(path: &str, encryption: Option<EncryptionConfig>) -> Result<Self> {
        let mut error = ErrorMessage::null();
        let dylib = Dylib::try_load("turso", TURSO_DRIVER_VERSION, TURSO_SHA256).await?;
        let enc_opts = encryption.as_ref().map(|e| EncryptionOptions {
            cipher: StringRef::new(&e.cipher),
            hexkey: StringRef::new(&e.key),
        });
        let options = ConnectOptions {
            path: StringRef::new(path),
            encryption: enc_opts
                .as_ref()
                .map(|e| e as *const EncryptionOptions)
                .unwrap_or(std::ptr::null()),
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
        let conn = Connection::connect(":memory:", None).await.unwrap();
        let mut query = conn
            .query(
                "SELECT 1 as int, 3.14 as float, 'hello' as text, x'FF00FF' as blob, NULL as empty, TRUE, FALSE",
            )
            .unwrap();
        let row = query.rows.remove(0);
        assert_eq!(row[0], Value::I64(1));
        assert_eq!(row[1], Value::F64(3.14));
        assert_eq!(row[2], Value::String("hello".into()));
        assert_eq!(row[3], Value::from_bytes(vec![0xFF, 0x00, 0xFF]));
        assert_eq!(row[4], Value::Null);
        assert_eq!(row[5], Value::I64(1));
        assert_eq!(row[6], Value::I64(0));
        assert_eq!(query.rows_affected, Some(0));
    }
}
