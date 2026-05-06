#[path = "../../../../src-crates/dylib/src/ffi.rs"]
mod ffi;
mod query;

use duckdb::{AccessMode, Config, Connection, Database};
use ffi::*;
use query::{Query, Value, allocated_query};
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

#[repr(C)]
pub struct Meta {
    pub column_count: usize,
    pub row_count: usize,
    pub rows_affected: u64,
    pub duration: u32,
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
    Bool,
    I8,
    I16,
    I32,
    I64,
    U8,
    U16,
    U32,
    U64,
    F32,
    F64,
    String,
    Bytes,
}

#[repr(C)]
pub union Data {
    pub null: (),
    pub bool: bool,
    pub i8: i8,
    pub i16: i16,
    pub i32: i32,
    pub i64: i64,
    pub u8: u8,
    pub u16: u16,
    pub u32: u32,
    pub u64: u64,
    pub f32: f32,
    pub f64: f64,
    pub string: StringRef,
    pub bytes: BytesRef,
}

#[unsafe(no_mangle)]
extern "C" fn df_connect(
    path: StringRef,
    readonly: bool,
    error: *mut ErrorMessage,
) -> *mut Connection {
    let call = || {
        let mut config = Config::new();
        if readonly {
            config.access_mode(AccessMode::ReadOnly).string_err()?;
        }
        let db = Database::open_with(path.as_str(), config).string_err()?;
        let conn = db.connect().string_err()?;
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
    unsafe {
        let _ = Box::from_raw(conn);
    }
}

#[unsafe(no_mangle)]
extern "C" fn df_clone(conn: *mut Connection, error: *mut ErrorMessage) -> *mut Connection {
    let call = || {
        let conn = unsafe { (*conn).try_new().string_err()? };
        Ok(Box::into_raw(Box::new(conn)))
    };
    call()
        .map_err(|err| {
            unsafe { *error = ErrorMessage::new(err) };
        })
        .unwrap_or(null_mut())
}

#[unsafe(no_mangle)]
extern "C" fn df_execute(conn: *mut Connection, sql: StringRef, error: *mut ErrorMessage) {
    let call = || {
        unsafe { (*conn).execute(sql.as_str()).string_err()? };
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
    let call = || {
        let query = unsafe { (*conn).query(sql.as_str()).string_err()? };
        let query = allocated_query(query);
        Ok(Box::into_raw(Box::new(query)))
    };
    call()
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
            duration: q.duration,
        }
    }
}

#[unsafe(no_mangle)]
extern "C" fn df_query_column(query: *mut Query, index: usize) -> Column {
    unsafe {
        let (name, datatype) = &(&*query).columns[index];
        Column {
            name: StringRef::new(name),
            datatype: StringRef::new(datatype),
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
            Value::Null => TypedValue::new(DataKind::Null, Data { null: () }),
            Value::Bool(v) => TypedValue::new(DataKind::Bool, Data { bool: *v }),
            Value::I8(v) => TypedValue::new(DataKind::I8, Data { i8: *v }),
            Value::I16(v) => TypedValue::new(DataKind::I16, Data { i16: *v }),
            Value::I32(v) => TypedValue::new(DataKind::I32, Data { i32: *v }),
            Value::I64(v) => TypedValue::new(DataKind::I64, Data { i64: *v }),
            Value::U8(v) => TypedValue::new(DataKind::U8, Data { u8: *v }),
            Value::U16(v) => TypedValue::new(DataKind::U16, Data { u16: *v }),
            Value::U32(v) => TypedValue::new(DataKind::U32, Data { u32: *v }),
            Value::U64(v) => TypedValue::new(DataKind::U64, Data { u64: *v }),
            Value::F32(v) => TypedValue::new(DataKind::F32, Data { f32: *v }),
            Value::F64(v) => TypedValue::new(DataKind::F64, Data { f64: *v }),
            Value::String(v) => TypedValue::new(
                DataKind::String,
                Data {
                    string: StringRef::new(v),
                },
            ),
            Value::Bytes(v) => TypedValue::new(
                DataKind::Bytes,
                Data {
                    bytes: BytesRef::new(v),
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
        let conn = df_connect(StringRef::new(":memory:"), false, &mut error);
        df_execute(
            conn,
            StringRef::new("create table test (i int, b bool, t text)"),
            &mut error,
        );
        assert!(error.is_null());
        assert!(!conn.is_null());
        conn
    }

    #[test]
    fn test_readonly() {
        let mut error = ErrorMessage::null();
        let conn = df_connect(StringRef::new(":memory:"), true, &mut error);
        assert!(conn.is_null());
        assert!(!error.is_null());
        assert!(error.as_str().contains("read-only"));
        df_free_error(error);

        let mut error = ErrorMessage::null();
        let conn = df_connect(StringRef::new("./test.db"), true, &mut error);
        assert!(conn.is_null());
        assert!(!error.is_null());
        assert!(error.as_str().contains("read-only"));
        df_free_error(error);
    }

    #[test]
    fn test_close() {
        let conn = conn();
        df_close(conn);
    }

    #[test]
    fn test_clone() {
        let mut error = ErrorMessage::null();
        let conn = df_clone(conn(), &mut error);
        df_execute(
            conn,
            StringRef::new("insert into test values (0, true, 'hello')"),
            &mut error,
        );
        df_close(conn);
    }

    #[test]
    fn test_error() {
        let mut error = ErrorMessage::null();
        let c = df_connect(StringRef::new("./a/b/c/////"), false, &mut error);
        assert!(c.is_null());
        assert!(!error.is_null());
        assert!(
            error.as_str().starts_with("IO Error: Cannot open file "),
            "actual: {:?}",
            error.as_str()
        );
        df_free_error(error);

        let conn = conn();

        let mut error = ErrorMessage::null();
        df_execute(conn, StringRef::new("error1"), &mut error);
        assert!(!error.is_null());
        assert!(
            error
                .as_str()
                .starts_with(r#"Parser Error: syntax error at or near "error1""#)
        );
        df_free_error(error);

        let mut error = ErrorMessage::null();
        df_query(conn, StringRef::new("insert into error"), &mut error);
        assert!(!error.is_null());
        assert_eq!(
            error.as_str(),
            r#"Parser Error: syntax error at end of input"#
        );
        df_free_error(error);

        df_close(conn);
    }

    #[test]
    fn test_execute() {
        let conn = conn();
        let mut error = ErrorMessage::null();
        for _ in 0..10 {
            df_execute(
                conn,
                StringRef::new("insert into test values (0, true, 'hello')"),
                &mut error,
            );
        }
        let mut error = ErrorMessage::null();
        let q = df_query(
            conn,
            StringRef::new("select count(*) from test"),
            &mut error,
        );
        let v = df_query_value(q, 0, 0);
        assert_eq!(v.kind, DataKind::I64);
        assert_eq!(unsafe { v.value.i64 }, 10);
        df_close(conn);
    }

    #[test]
    fn test_meta() {
        let conn = conn();
        let mut error = ErrorMessage::null();
        let query = df_query(conn, StringRef::new("select * from test"), &mut error);
        assert!(error.is_null());

        let meta = df_query_meta(query);
        assert_eq!(meta.column_count, 3);
        assert_eq!(meta.row_count, 0);
        assert_eq!(meta.rows_affected, 0);
        // assert!(meta.duration);

        df_free_query(query);
        df_close(conn);
    }

    #[test]
    fn test_query() {
        let conn = conn();
        let mut error = ErrorMessage::null();

        df_execute(
            conn,
            StringRef::new("insert into test values (0, true, 'hello')"),
            &mut error,
        );
        df_execute(
            conn,
            StringRef::new("insert into test values (1, false, 'world')"),
            &mut error,
        );
        df_execute(
            conn,
            StringRef::new("insert into test values (null, null, null)"),
            &mut error,
        );
        assert!(error.is_null());

        let query = df_query(conn, StringRef::new("select * from test"), &mut error);
        assert!(error.is_null());

        assert_eq!(df_query_column(query, 0).name.as_str(), "i");
        assert_eq!(df_query_column(query, 0).datatype.as_str(), "int32");
        assert_eq!(df_query_column(query, 1).name.as_str(), "b");
        assert_eq!(df_query_column(query, 1).datatype.as_str(), "boolean");
        assert_eq!(df_query_column(query, 2).name.as_str(), "t");
        assert_eq!(df_query_column(query, 2).datatype.as_str(), "varchar");

        unsafe {
            assert_eq!(df_query_value(query, 0, 0).value.i32, 0);
            assert_eq!(df_query_value(query, 0, 1).value.bool, true);
            assert_eq!(
                { df_query_value(query, 0, 2).value.string }.as_str(),
                "hello"
            );

            assert_eq!(df_query_value(query, 1, 0).value.i32, 1);
            assert_eq!(df_query_value(query, 1, 1).value.bool, false);
            assert_eq!(df_query_value(query, 1, 2).value.string.as_str(), "world");

            assert_eq!(df_query_value(query, 2, 0).kind, DataKind::Null);
            assert_eq!(df_query_value(query, 2, 1).kind, DataKind::Null);
            assert_eq!(df_query_value(query, 2, 2).kind, DataKind::Null);
        }

        df_free_query(query);
        df_close(conn);
    }

    #[test]
    fn test_rows_affected() {
        let conn = conn();
        let mut error = ErrorMessage::null();
        let query = df_query(
            conn,
            StringRef::new("insert into test(i) values (null), (null), (null);"),
            &mut error,
        );
        let meta = df_query_meta(query);
        assert_eq!(meta.rows_affected, 3);
        df_free_query(query);
        df_close(conn);
    }
}
