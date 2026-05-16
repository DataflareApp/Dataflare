#[path = "../../../src-crates/dylib/src/ffi.rs"]
mod ffi;

mod connection;

use connection::Connection;
use ffi::{BytesRef, ErrorMessage, StringRef, TypedValue};
use std::ptr::null_mut;
use turso_sdk_kit::rsapi::EncryptionOpts;

type Result<T, E = String> = std::result::Result<T, E>;

trait StringError<T> {
    fn string_err(self) -> Result<T>;
}

impl<T, E> StringError<T> for std::result::Result<T, E>
where
    E: ToString,
{
    fn string_err(self) -> Result<T> {
        self.map_err(|err| err.to_string())
    }
}

#[derive(Debug)]
pub(crate) struct Query {
    pub(crate) columns: Vec<QueryColumn>,
    pub(crate) rows: Vec<Vec<QueryValue>>,
    pub(crate) rows_affected: u64,
}

#[derive(Debug)]
pub(crate) struct QueryColumn {
    pub(crate) name: String,
    pub(crate) datatype: String,
}

#[derive(Debug)]
pub(crate) enum QueryValue {
    Null,
    I64(i64),
    F64(f64),
    Bytes(Vec<u8>),
    String(String),
}

#[repr(C)]
pub struct Meta {
    pub column_count: usize,
    pub row_count: usize,
    pub rows_affected: u64,
}

#[repr(C)]
pub struct Column {
    pub name: StringRef,
    pub datatype: StringRef,
}

#[repr(C)]
#[derive(Debug, PartialEq, Eq)]
pub enum DataKind {
    Null,
    I64,
    F64,
    Bytes,
    String,
}

#[repr(C)]
pub union Data {
    pub null: (),
    pub i64: i64,
    pub f64: f64,
    pub bytes: BytesRef,
    pub string: StringRef,
}

#[repr(C)]
struct ConnectOptions {
    pub path: StringRef,
    pub encryption: *const EncryptionOptions,
}

#[repr(C)]
struct EncryptionOptions {
    pub cipher: StringRef,
    pub hexkey: StringRef,
}

impl ConnectOptions {
    fn path(&self) -> &str {
        let path = self.path.as_str();
        if path.trim().is_empty() {
            ":memory:"
        } else {
            path
        }
    }

    fn encryption(&self) -> Option<&EncryptionOptions> {
        unsafe { self.encryption.as_ref() }
    }
}

#[unsafe(no_mangle)]
extern "C" fn df_connect(options: ConnectOptions, error: *mut ErrorMessage) -> *mut Connection {
    let call = || {
        let mut encryption = None;
        if let Some(opt) = options.encryption() {
            let cipher = opt.cipher.as_str();
            let hexkey = opt.hexkey.as_str();
            encryption = Some(EncryptionOpts {
                cipher: cipher.to_string(),
                hexkey: hexkey.to_string(),
            });
        }
        let conn = Connection::connect(options.path(), encryption).string_err()?;
        Ok(Box::into_raw(Box::new(conn)))
    };
    call()
        .map_err(|err| {
            unsafe { *error = ErrorMessage::new(err) };
        })
        .unwrap_or(null_mut())
}

#[unsafe(no_mangle)]
extern "C" fn df_close(handle: *mut Connection) {
    let _ = unsafe { Box::from_raw(handle) };
}

#[unsafe(no_mangle)]
extern "C" fn df_execute(handle: *mut Connection, sql: StringRef, error: *mut ErrorMessage) {
    let call = || {
        let connection = unsafe { &*handle };
        connection.execute(sql.as_str()).string_err()?;
        Ok(())
    };
    if let Err(err) = call() {
        unsafe { *error = ErrorMessage::new(err) }
    }
}

#[unsafe(no_mangle)]
extern "C" fn df_execute_batch(handle: *mut Connection, sql: StringRef, error: *mut ErrorMessage) {
    let call = || {
        let connection = unsafe { &*handle };
        connection.execute_batch(sql.as_str()).string_err()?;
        Ok(())
    };
    if let Err(err) = call() {
        unsafe { *error = ErrorMessage::new(err) }
    }
}

#[unsafe(no_mangle)]
extern "C" fn df_transaction(
    handle: *mut Connection,
    sqls: *const StringRef,
    sqls_len: usize,
    error: *mut ErrorMessage,
) {
    let sqls = unsafe { std::slice::from_raw_parts(sqls, sqls_len) }
        .iter()
        .map(|s| s.as_str())
        .collect::<Vec<_>>();
    let call = || {
        let connection = unsafe { &mut *handle };
        connection.transaction(&sqls).string_err()?;
        Ok(())
    };
    if let Err(err) = call() {
        unsafe { *error = ErrorMessage::new(err) }
    }
}

#[unsafe(no_mangle)]
extern "C" fn df_query(
    handle: *mut Connection,
    sql: StringRef,
    error: *mut ErrorMessage,
) -> *mut Query {
    let call = || {
        let connection = unsafe { &*handle };
        let query = connection.query(sql.as_str()).string_err()?;
        Ok(query)
    };

    call()
        .map(|query| Box::into_raw(Box::new(query)))
        .map_err(|err| {
            unsafe { *error = ErrorMessage::new(err) };
        })
        .unwrap_or(null_mut())
}

#[unsafe(no_mangle)]
extern "C" fn df_query_meta(query: *mut Query) -> Meta {
    unsafe {
        let query = &*query;
        Meta {
            column_count: query.columns.len(),
            row_count: query.rows.len(),
            rows_affected: query.rows_affected,
        }
    }
}

#[unsafe(no_mangle)]
extern "C" fn df_query_column(query: *mut Query, index: usize) -> Column {
    unsafe {
        let column = &(&*query).columns[index];
        Column {
            name: StringRef::new(&column.name),
            datatype: StringRef::new(&column.datatype),
        }
    }
}

#[unsafe(no_mangle)]
extern "C" fn df_query_value(
    query: *mut Query,
    row: usize,
    col: usize,
) -> TypedValue<DataKind, Data> {
    unsafe {
        match &(&*query).rows[row][col] {
            QueryValue::Null => TypedValue::new(DataKind::Null, Data { null: () }),
            QueryValue::I64(value) => TypedValue::new(DataKind::I64, Data { i64: *value }),
            QueryValue::F64(value) => TypedValue::new(DataKind::F64, Data { f64: *value }),
            QueryValue::Bytes(value) => TypedValue::new(
                DataKind::Bytes,
                Data {
                    bytes: BytesRef::new(value),
                },
            ),
            QueryValue::String(value) => TypedValue::new(
                DataKind::String,
                Data {
                    string: StringRef::new(value),
                },
            ),
        }
    }
}

#[unsafe(no_mangle)]
extern "C" fn df_free_query(query: *mut Query) {
    unsafe {
        let _ = Box::from_raw(query);
    }
}

#[unsafe(no_mangle)]
extern "C" fn df_free_error(error: ErrorMessage) {
    error.free();
}

#[cfg(test)]
mod tests {
    use crate::*;

    fn options(path: &str) -> ConnectOptions {
        ConnectOptions {
            path: StringRef::new(path),
            encryption: null_mut(),
        }
    }

    fn options_encrypted<'a>(path: &str, encryption: &'a EncryptionOptions) -> ConnectOptions {
        ConnectOptions {
            path: StringRef::new(path),
            encryption: encryption as *const EncryptionOptions,
        }
    }

    fn conn() -> *mut Connection {
        let mut error = ErrorMessage::null();
        let conn = df_connect(options(":memory:"), &mut error);
        assert!(!conn.is_null());
        assert!(error.is_null());

        df_execute(
            conn,
            StringRef::new("create table test (a integer, b real, c text)"),
            &mut error,
        );
        assert!(error.is_null());

        df_execute(
            conn,
            StringRef::new("insert into test values (1, 1.1, 'hello')"),
            &mut error,
        );
        assert!(error.is_null());

        df_execute(
            conn,
            StringRef::new("insert into test values (2, 2.2, 'world')"),
            &mut error,
        );
        assert!(error.is_null());

        conn
    }

    #[test]
    fn test_close() {
        let conn = conn();
        df_close(conn);
    }

    #[test]
    fn test_transaction() {
        let conn = conn();
        let mut error = ErrorMessage::null();

        let sqls = &[
            StringRef::new("insert into test values (3, 3.3, '.')"),
            StringRef::new("insert into test values (4, 4.4, '.')"),
        ];
        df_transaction(conn, sqls.as_ptr(), sqls.len(), &mut error);
        assert!(error.is_null());

        let query = df_query(
            conn,
            StringRef::new("select count(*) from test"),
            &mut error,
        );
        assert!(error.is_null());
        assert_eq!(unsafe { df_query_value(query, 0, 0).value.i64 }, 4);
        df_free_query(query);
        df_close(conn);
    }

    #[test]
    fn test_transaction_fail() {
        let conn = conn();
        let mut error = ErrorMessage::null();

        let sqls = &[
            StringRef::new("insert into test values (3, 3.3, '.')"),
            StringRef::new("insert error"),
        ];
        df_transaction(conn, sqls.as_ptr(), sqls.len(), &mut error);
        assert!(!error.is_null());
        df_free_error(error);

        let mut error = ErrorMessage::null();
        let query = df_query(
            conn,
            StringRef::new("select count(*) from test"),
            &mut error,
        );
        assert!(error.is_null());
        assert_eq!(unsafe { df_query_value(query, 0, 0).value.i64 }, 2);

        df_free_query(query);
        df_close(conn);
    }

    #[test]
    fn test_query_dml_rows_affected() {
        let conn = conn();
        let mut error = ErrorMessage::null();

        let query = df_query(
            conn,
            StringRef::new("insert into test values (3, 3.3, '.')"),
            &mut error,
        );
        assert!(error.is_null());
        let meta = df_query_meta(query);
        assert_eq!(meta.column_count, 0);
        assert_eq!(meta.row_count, 0);
        assert_eq!(meta.rows_affected, 1);
        df_free_query(query);

        let query = df_query(
            conn,
            StringRef::new("insert into test values (4, 4.4, '.'), (5, 5.5, '.'), (6, 6.6, '.')"),
            &mut error,
        );
        assert!(error.is_null());
        let meta = df_query_meta(query);
        assert_eq!(meta.column_count, 0);
        assert_eq!(meta.row_count, 0);
        assert_eq!(meta.rows_affected, 3);
        df_free_query(query);

        let query = df_query(conn, StringRef::new("select random()"), &mut error);
        assert!(error.is_null());
        let meta = df_query_meta(query);
        assert_eq!(meta.rows_affected, 0);
        df_free_query(query);

        df_close(conn);
    }

    #[test]
    fn test_query_select() {
        let conn = conn();
        let mut error = ErrorMessage::null();

        let query = df_query(conn, StringRef::new("select * from test"), &mut error);
        assert!(error.is_null());
        assert_eq!(df_query_meta(query).column_count, 3);
        assert_eq!(df_query_meta(query).row_count, 2);
        assert_eq!(df_query_column(query, 0).name.as_str(), "a");
        assert_eq!(df_query_column(query, 0).datatype.as_str(), "integer");
        assert_eq!(df_query_column(query, 1).name.as_str(), "b");
        assert_eq!(df_query_column(query, 1).datatype.as_str(), "real");
        assert_eq!(df_query_column(query, 2).name.as_str(), "c");
        assert_eq!(df_query_column(query, 2).datatype.as_str(), "text");

        unsafe {
            assert_eq!(df_query_value(query, 0, 0).value.i64, 1);
            assert_eq!(df_query_value(query, 0, 1).value.f64, 1.1);
            assert_eq!(df_query_value(query, 0, 2).value.string.as_str(), "hello");

            assert_eq!(df_query_value(query, 1, 0).value.i64, 2);
            assert_eq!(df_query_value(query, 1, 1).value.f64, 2.2);
            assert_eq!(df_query_value(query, 1, 2).value.string.as_str(), "world");
        }

        df_free_query(query);
        df_close(conn);
    }

    #[test]
    fn test_execute_batch() {
        let conn = conn();
        let mut error = ErrorMessage::null();

        df_execute_batch(
            conn,
            StringRef::new(
                "insert into test values (3, 3.3, '.'); insert into test values (4, 4.4, '.');",
            ),
            &mut error,
        );
        assert!(error.is_null());

        let query = df_query(
            conn,
            StringRef::new("select count(*) from test"),
            &mut error,
        );
        assert!(error.is_null());
        assert_eq!(unsafe { df_query_value(query, 0, 0).value.i64 }, 4);

        df_free_query(query);
        df_close(conn);
    }

    #[test]
    fn test_encryption_connect() {
        const CIPHER: &str = "aes256gcm";
        const HEXKEY: &str = "000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f";

        let encryption = EncryptionOptions {
            cipher: StringRef::new(CIPHER),
            hexkey: StringRef::new(HEXKEY),
        };
        let mut error = ErrorMessage::null();
        let conn = df_connect(options_encrypted(":memory:", &encryption), &mut error);
        assert!(!conn.is_null());
        assert!(error.is_null());
        df_close(conn);
    }

    #[test]
    fn test_encryption_connect_failed() {
        const CIPHER: &str = "error-cipher";
        const HEXKEY: &str = "000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f";

        let encryption = EncryptionOptions {
            cipher: StringRef::new(CIPHER),
            hexkey: StringRef::new(HEXKEY),
        };
        let mut error = ErrorMessage::null();
        let conn = df_connect(options_encrypted(":memory:", &encryption), &mut error);
        assert!(conn.is_null());
        assert_eq!(
            error.as_str(),
            "Invalid argument supplied: Unknown cipher name: error-cipher"
        );
    }

    #[test]
    fn test_vacuum() {
        let path = std::env::temp_dir()
            .join(format!("test_vacuum_{}.db", std::process::id()))
            .display()
            .to_string();

        let mut error = ErrorMessage::null();
        let conn = df_connect(options(&path), &mut error);
        assert!(!conn.is_null());
        assert!(error.is_null());

        df_execute_batch(
            conn,
            StringRef::new(
                r#"create table test (a integer, b real, c text);
            insert into test values (1, 1.1, 'hello');
            insert into test values (2, 2.2, 'world');
            "#,
            ),
            &mut error,
        );
        assert!(error.is_null());

        let mut error = ErrorMessage::null();
        df_execute(conn, StringRef::new("VACUUM"), &mut error);
        assert!(error.is_null());

        df_close(conn);
    }
}
