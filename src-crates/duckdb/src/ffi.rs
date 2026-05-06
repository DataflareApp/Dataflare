use dylib::ffi::{BytesRef, ErrorMessage, StringRef, TypedValue};
use std::ffi::c_void;

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
#[allow(dead_code)]
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

pub const CONNECT: &[u8] = b"df_connect";
pub type ConnectFn =
    extern "C" fn(path: StringRef, readonly: bool, error: *mut ErrorMessage) -> *mut c_void;

pub const CLOSE: &[u8] = b"df_close";
pub type CloseFn = extern "C" fn(conn: *mut c_void);

pub const CLONE: &[u8] = b"df_clone";
pub type CloneFn = extern "C" fn(conn: *mut c_void, error: *mut ErrorMessage) -> *mut c_void;

pub const EXECUTE: &[u8] = b"df_execute";
pub type ExecuteFn = extern "C" fn(conn: *mut c_void, sql: StringRef, error: *mut ErrorMessage);

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
