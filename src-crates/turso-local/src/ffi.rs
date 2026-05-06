use dylib::ffi::{BytesRef, ErrorMessage, StringRef, TypedValue};
use std::ffi::c_void;

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

#[allow(dead_code)]
#[repr(C)]
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
pub struct ConnectOptions {
    pub path: StringRef,
    pub encryption: *const EncryptionOptions,
}

#[repr(C)]
pub struct EncryptionOptions {
    pub cipher: StringRef,
    pub hexkey: StringRef,
}

pub const CONNECT: &[u8] = b"df_connect";
pub type ConnectFn =
    extern "C" fn(options: ConnectOptions, error: *mut ErrorMessage) -> *mut c_void;

pub const CLOSE: &[u8] = b"df_close";
pub type CloseFn = extern "C" fn(conn: *mut c_void);

pub const EXECUTE: &[u8] = b"df_execute";
pub type ExecuteFn = extern "C" fn(conn: *mut c_void, sql: StringRef, error: *mut ErrorMessage);

pub const EXECUTE_BATCH: &[u8] = b"df_execute_batch";
pub type ExecuteBatchFn =
    extern "C" fn(conn: *mut c_void, sql: StringRef, error: *mut ErrorMessage);

pub const TRANSACTION: &[u8] = b"df_transaction";
pub type TransactionFn = extern "C" fn(
    conn: *mut c_void,
    sqls: *const StringRef,
    sqls_len: usize,
    error: *mut ErrorMessage,
);

pub const QUERY: &[u8] = b"df_query";
pub type QueryFn =
    extern "C" fn(conn: *mut c_void, sql: StringRef, error: *mut ErrorMessage) -> *mut c_void;

pub const QUERY_META: &[u8] = b"df_query_meta";
pub type QueryMetaFn = extern "C" fn(query: *mut c_void) -> Meta;

pub const QUERY_COLUMN: &[u8] = b"df_query_column";
pub type QueryColumnFn = extern "C" fn(query: *mut c_void, index: usize) -> Column;

pub const QUERY_VALUE: &[u8] = b"df_query_value";
pub type QueryValueFn =
    extern "C" fn(query: *mut c_void, row: usize, col: usize) -> TypedValue<DataKind, Data>;

pub const FREE_QUERY: &[u8] = b"df_free_query";
pub type FreeQueryFn = extern "C" fn(query: *mut c_void);

pub const FREE_ERROR: &[u8] = b"df_free_error";
pub type FreeErrorFn = extern "C" fn(error: ErrorMessage);
