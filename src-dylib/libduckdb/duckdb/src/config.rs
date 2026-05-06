use crate::{Error, Result};
use libduckdb_sys::{self as ffi};
use std::ffi::CString;
use std::fmt::Debug;
use std::ptr::null_mut;

/// [DuckDB config](https://github.com/duckdb/duckdb/blob/main/src/main/config.cpp)
pub struct Config {
    pub(crate) config: ffi::duckdb_config,
}

impl Drop for Config {
    fn drop(&mut self) {
        unsafe { ffi::duckdb_destroy_config(&mut self.config) };
    }
}

impl Debug for Config {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "Config {{..}}")
    }
}

#[derive(Debug)]
pub enum AccessMode {
    Automatic,
    ReadOnly,
    ReadWrite,
}

impl Default for Config {
    fn default() -> Self {
        let mut config: ffi::duckdb_config = null_mut();
        let state = unsafe { ffi::duckdb_create_config(&mut config) };
        assert_eq!(state, ffi::DuckDBSuccess, "Create DuckDB config failed");
        Self { config }
    }
}

impl Config {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn set<K: AsRef<str>, V: AsRef<str>>(&mut self, key: K, value: V) -> Result<&mut Self> {
        let state = unsafe {
            ffi::duckdb_set_config(
                self.config,
                CString::new(key.as_ref())?.as_ptr(),
                CString::new(value.as_ref())?.as_ptr(),
            )
        };
        if state != ffi::DuckDBSuccess {
            return Err(Error::Config);
        }
        Ok(self)
    }

    pub fn access_mode(&mut self, mode: AccessMode) -> Result<&mut Self> {
        self.set(
            "access_mode",
            match mode {
                AccessMode::Automatic => "AUTOMATIC",
                AccessMode::ReadOnly => "READ_ONLY",
                AccessMode::ReadWrite => "READ_WRITE",
            },
        )
    }
}
