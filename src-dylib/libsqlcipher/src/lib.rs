#[path = "../../../src-crates/dylib/src/ffi.rs"]
mod ffi;

use ffi::{BytesRef, ErrorMessage, StringRef, TypedValue};
use rusqlite::Connection;
use rusqlite::{OpenFlags, types::ValueRef};
use std::ptr::null_mut;
type Result<T, E = String> = std::result::Result<T, E>;

trait StringError<T> {
    fn string_err(self) -> Result<T>;
}

impl<T, E> StringError<T> for Result<T, E>
where
    E: ToString,
{
    fn string_err(self) -> Result<T> {
        self.map_err(|err| err.to_string())
    }
}

struct Query {
    columns: Vec<QueryColumn>,
    rows: Vec<Vec<QueryValue>>,
    rows_affected: u64,
}

struct QueryColumn {
    name: String,
    datatype: String,
}

enum QueryValue {
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
    pub readonly: bool,
    pub key: StringRef,
}

#[unsafe(no_mangle)]
extern "C" fn df_connect(options: ConnectOptions, error: *mut ErrorMessage) -> *mut Connection {
    let call = || {
        let path = options.path.as_str();
        let mut flags = if options.readonly {
            OpenFlags::SQLITE_OPEN_READ_ONLY
        } else {
            OpenFlags::SQLITE_OPEN_READ_WRITE | OpenFlags::SQLITE_OPEN_CREATE
        };
        flags.set(OpenFlags::SQLITE_OPEN_NO_MUTEX, true);
        flags.set(OpenFlags::SQLITE_OPEN_URI, true);

        let conn = Connection::open_with_flags(path, flags).string_err()?;

        // Set SQLCipher password: https://github.com/sqlcipher/sqlcipher?tab=readme-ov-file#encrypting-a-database
        if !options.key.as_str().is_empty() {
            let key_sql = format!(r#"PRAGMA key = "{}";"#, options.key.as_str());
            conn.execute_batch(&key_sql).string_err()?;
        }

        Ok(Box::into_raw(Box::new(conn)))
    };
    call()
        .map_err(|err| {
            unsafe { *error = ErrorMessage::new(err) };
        })
        .unwrap_or(null_mut())
}

#[unsafe(no_mangle)]
extern "C" fn df_close(conn: *mut Connection) {
    let conn = unsafe { Box::from_raw(conn) };
    let _ = conn.close();
}

#[unsafe(no_mangle)]
extern "C" fn df_execute(conn: *mut Connection, sql: StringRef, error: *mut ErrorMessage) {
    let call = || {
        let conn = unsafe { &*conn };
        let _ = conn.execute(sql.as_str(), ()).string_err()?;
        Ok(())
    };
    if let Err(err) = call() {
        unsafe { *error = ErrorMessage::new(err) }
    }
}

#[unsafe(no_mangle)]
extern "C" fn df_execute_batch(conn: *mut Connection, sql: StringRef, error: *mut ErrorMessage) {
    let call = || {
        let conn = unsafe { &*conn };
        conn.execute_batch(sql.as_str()).string_err()?;
        Ok(())
    };
    if let Err(err) = call() {
        unsafe { *error = ErrorMessage::new(err) }
    }
}

#[unsafe(no_mangle)]
extern "C" fn df_transaction(
    conn: *mut Connection,
    sqls: *const StringRef,
    sqls_len: usize,
    error: *mut ErrorMessage,
) {
    let sqls = unsafe { std::slice::from_raw_parts(sqls, sqls_len) };
    let call = || {
        let conn = unsafe { &mut *conn };
        let transaction = conn.transaction().string_err()?;
        for sql in sqls {
            transaction.execute(sql.as_str(), []).string_err()?;
        }
        transaction.commit().string_err()?;
        Ok(())
    };
    if let Err(err) = call() {
        unsafe { *error = ErrorMessage::new(err) }
    }
}

#[unsafe(no_mangle)]
extern "C" fn df_query(
    conn: *mut Connection,
    sql: StringRef,
    error: *mut ErrorMessage,
) -> *mut Query {
    fn to_value(value: ValueRef) -> Result<QueryValue> {
        let v = match value {
            ValueRef::Null => QueryValue::Null,
            ValueRef::Integer(val) => QueryValue::I64(val),
            ValueRef::Real(val) => QueryValue::F64(val),
            ValueRef::Blob(val) => QueryValue::Bytes(val.into()),
            ValueRef::Text(val) => {
                let val = std::str::from_utf8(val)
                    .map(|s| s.to_string())
                    .map_err(|_| "Only UTF-8 'TEXT' is supported")
                    .string_err()?;
                QueryValue::String(val)
            }
        };
        Ok(v)
    }

    let call = || {
        let conn = unsafe { &*conn };
        let mut stmt = conn.prepare(sql.as_str()).string_err()?;

        let columns = stmt
            .columns()
            .into_iter()
            .map(|col| QueryColumn {
                name: col.name().into(),
                datatype: col.decl_type().unwrap_or_default().into(),
            })
            .collect::<Vec<_>>();

        let mut rows = stmt.query(()).string_err()?;
        let mut values = Vec::new();
        while let Some(row) = rows.next().string_err()? {
            let mut vec = Vec::with_capacity(columns.len());
            for i in 0..columns.len() {
                let v = row.get_ref(i).string_err()?;
                vec.push(to_value(v)?)
            }
            values.push(vec);
        }

        Ok(Query {
            columns,
            rows: values,
            rows_affected: conn.changes(),
        })
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
        let q = &(*query);
        Meta {
            column_count: q.columns.len(),
            row_count: q.rows.len(),
            rows_affected: q.rows_affected,
        }
    }
}

#[unsafe(no_mangle)]
extern "C" fn df_query_column(query: *mut Query, index: usize) -> Column {
    unsafe {
        let c = &(&*query).columns[index];
        Column {
            name: StringRef::new(&c.name),
            datatype: StringRef::new(&c.datatype),
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
            QueryValue::I64(val) => TypedValue::new(DataKind::I64, Data { i64: *val }),
            QueryValue::F64(val) => TypedValue::new(DataKind::F64, Data { f64: *val }),
            QueryValue::Bytes(bytes) => TypedValue::new(
                DataKind::Bytes,
                Data {
                    bytes: BytesRef::new(bytes),
                },
            ),
            QueryValue::String(string) => TypedValue::new(
                DataKind::String,
                Data {
                    string: StringRef::new(string),
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

    fn conn() -> *mut Connection {
        let mut error = ErrorMessage::null();
        let options = ConnectOptions {
            path: StringRef::new(":memory:"),
            readonly: false,
            key: StringRef::new("password"),
        };
        let conn = df_connect(options, &mut error);
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
    fn test_connect_error() {
        let mut error = ErrorMessage::null();
        let options = ConnectOptions {
            path: StringRef::new("/a/b/c/"),
            readonly: false,
            key: StringRef::new("password"),
        };
        let conn = df_connect(options, &mut error);
        assert!(conn.is_null());
        assert_eq!(error.as_str(), "unable to open database file: /a/b/c/");
        df_free_error(error);
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

        let sqls = &[StringRef::new("err1"), StringRef::new("err2")];
        let _ = df_transaction(conn, sqls.as_ptr(), sqls.len(), &mut error);
        assert!(!error.is_null());
        df_free_error(error);

        let mut error = ErrorMessage::null();
        let query = df_query(
            conn,
            StringRef::new("select count(*) from test"),
            &mut error,
        );
        assert!(error.is_null());
        assert_eq!(unsafe { df_query_value(query, 0, 0).value.i64 }, 4);

        let sqls = &[StringRef::new("insert into test values (5, 5.5, '.')")];
        df_transaction(conn, sqls.as_ptr(), sqls.len(), &mut error);
        assert!(error.is_null());
        let query = df_query(
            conn,
            StringRef::new("select count(*) from test"),
            &mut error,
        );
        assert!(error.is_null());
        assert_eq!(unsafe { df_query_value(query, 0, 0).value.i64 }, 5);
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
        assert!(
            error.as_str().starts_with(r#"near "error": syntax error"#),
            "unexpected error: {}",
            error.as_str()
        );
        df_free_error(error);
        let query = df_query(
            conn,
            StringRef::new("SELECT count(*) from test"),
            &mut ErrorMessage::null(),
        );
        unsafe {
            assert_eq!(df_query_value(query, 0, 0).value.i64, 2);
        }
        df_free_query(query);

        let mut error = ErrorMessage::null();
        let sqls = &[
            StringRef::new("insert into test values (3, 3.3, '.')"),
            StringRef::new("insert into test values (4, 4.4, '.')"),
        ];
        df_transaction(conn, sqls.as_ptr(), sqls.len(), &mut error);
        assert!(error.is_null());
        let query = df_query(
            conn,
            StringRef::new("SELECT count(*) from test"),
            &mut error,
        );
        unsafe {
            assert_eq!(df_query_value(query, 0, 0).value.i64, 4);
        }

        df_free_query(query);
        df_close(conn);
    }

    #[test]
    fn test_query() {
        let conn = conn();
        let mut error = ErrorMessage::null();

        let query = df_query(
            conn,
            StringRef::new("insert into test values (3, 3.3, '.')"),
            &mut error,
        );
        assert!(!conn.is_null());
        assert!(error.is_null());
        let m = df_query_meta(query);
        assert_eq!(m.column_count, 0);
        assert_eq!(m.row_count, 0);
        assert_eq!(m.rows_affected, 1);
        df_free_query(query);

        let query = df_query(conn, StringRef::new("select * from test"), &mut error);
        assert!(error.is_null());
        assert_eq!(df_query_meta(query).column_count, 3);
        assert_eq!(df_query_meta(query).row_count, 3);
        assert_eq!(df_query_column(query, 0).name.as_str(), "a");
        assert_eq!(df_query_column(query, 0).datatype.as_str(), "INTEGER");
        assert_eq!(df_query_column(query, 1).name.as_str(), "b");
        assert_eq!(df_query_column(query, 1).datatype.as_str(), "REAL");
        assert_eq!(df_query_column(query, 2).name.as_str(), "c");
        assert_eq!(df_query_column(query, 2).datatype.as_str(), "TEXT");

        unsafe {
            assert_eq!({ df_query_value(query, 0, 0).value.i64 }, 1);
            assert_eq!({ df_query_value(query, 0, 1).value.f64 }, 1.1);
            assert_eq!(
                { df_query_value(query, 0, 2).value.string }.as_str(),
                "hello"
            );
            assert_eq!({ df_query_value(query, 0, 0).value.i64 }, 1);
            assert_eq!({ df_query_value(query, 0, 1).value.f64 }, 1.1);
            assert_eq!(
                { df_query_value(query, 0, 2).value.string }.as_str(),
                "hello"
            );

            assert_eq!({ df_query_value(query, 1, 0).value.i64 }, 2);
            assert_eq!({ df_query_value(query, 1, 1).value.f64 }, 2.2);
            assert_eq!(
                { df_query_value(query, 1, 2).value.string }.as_str(),
                "world"
            );

            assert_eq!({ df_query_value(query, 2, 0).value.i64 }, 3);
            assert_eq!({ df_query_value(query, 2, 1).value.f64 }, 3.3);
            assert_eq!({ df_query_value(query, 2, 2).value.string }.as_str(), ".");
        }

        df_free_query(query);
        df_close(conn);
    }

    fn query(sql: &str) -> (*mut Query, *mut Connection) {
        let conn = conn();
        let mut error = ErrorMessage::null();
        let query = df_query(conn, StringRef::new(sql), &mut error);
        assert!(!conn.is_null());
        assert!(error.is_null());
        (query, conn)
    }

    #[test]
    fn test_null() {
        let (query, conn) = query("SELECT NULL, NULL, NULL");
        unsafe {
            assert_eq!(df_query_value(query, 0, 0).kind, DataKind::Null);
            assert_eq!(df_query_value(query, 0, 1).kind, DataKind::Null);
            assert_eq!(df_query_value(query, 0, 0).value.null, ());
            assert_eq!(df_query_value(query, 0, 1).value.null, ());
        }
        df_free_query(query);
        df_close(conn);
    }

    #[test]
    fn test_i64() {
        let (query, conn) = query("select 123, 456");
        unsafe {
            assert_eq!(df_query_value(query, 0, 0).kind, DataKind::I64);
            assert_eq!(df_query_value(query, 0, 0).value.i64, 123);
            assert_eq!(df_query_value(query, 0, 1).kind, DataKind::I64);
            assert_eq!(df_query_value(query, 0, 1).value.i64, 456);
        }
        df_free_query(query);
        df_close(conn);
    }

    #[test]
    fn test_f64() {
        let (query, conn) = query("select 123.456, 789.012");
        unsafe {
            assert_eq!(df_query_value(query, 0, 1).kind, DataKind::F64);
            assert_eq!(df_query_value(query, 0, 0).value.f64, 123.456);
            assert_eq!(df_query_value(query, 0, 1).kind, DataKind::F64);
            assert_eq!(df_query_value(query, 0, 1).value.f64, 789.012);
        }
        df_free_query(query);
        df_close(conn);
    }

    #[test]
    fn test_bytes() {
        let (query, conn) = query("SELECT X'ff', X'00'");
        unsafe {
            assert_eq!(df_query_value(query, 0, 0).kind, DataKind::Bytes);
            assert_eq!(df_query_value(query, 0, 0).value.bytes.as_bytes(), &[255]);
            assert_eq!(df_query_value(query, 0, 1).kind, DataKind::Bytes);
            assert_eq!(df_query_value(query, 0, 1).value.bytes.as_bytes(), &[0]);
        }
        df_free_query(query);
        df_close(conn);
    }

    #[test]
    fn test_string() {
        let (query, conn) = query("select 'hello', 'world'");
        unsafe {
            assert_eq!(df_query_value(query, 0, 0).kind, DataKind::String);
            assert_eq!(df_query_value(query, 0, 0).value.string.as_str(), "hello");
            assert_eq!(df_query_value(query, 0, 1).kind, DataKind::String);
            assert_eq!(df_query_value(query, 0, 1).value.string.as_str(), "world");
        }
        df_free_query(query);
        df_close(conn);
    }
}
