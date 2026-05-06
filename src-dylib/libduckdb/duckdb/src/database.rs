use crate::{Config, Connection, Error, Result};
use libduckdb_sys::{self as ffi};
use std::ffi::{CStr, CString, c_void};
use std::fmt::Debug;
use std::ptr::null_mut;
use std::sync::Arc;

#[derive(Clone)]
pub struct Database {
    db: Arc<ffi::duckdb_database>,
}

unsafe impl Send for Database {}
unsafe impl Sync for Database {}

impl Drop for Database {
    fn drop(&mut self) {
        if let Some(db) = Arc::get_mut(&mut self.db) {
            unsafe {
                ffi::duckdb_close(db);
            }
        }
    }
}

impl Debug for Database {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "Database {{..}}")
    }
}

impl Database {
    pub fn open_with_memory(config: Config) -> Result<Self> {
        Self::open_with("", config)
    }

    pub fn open_with<P: AsRef<str>>(path: P, config: Config) -> Result<Self> {
        unsafe {
            let mut db = null_mut();
            let mut err = null_mut();
            let state = ffi::duckdb_open_ext(
                CString::new(path.as_ref())?.as_c_str().as_ptr(),
                &mut db,
                config.config,
                &mut err,
            );
            if state != ffi::DuckDBSuccess {
                let msg = CStr::from_ptr(err).to_string_lossy().to_string();
                ffi::duckdb_free(err as *mut c_void);
                return Err(Error::Database(msg));
            }
            ffi::duckdb_free(err as *mut c_void);
            Ok(Self {
                #[allow(clippy::arc_with_non_send_sync)]
                db: Arc::new(db),
            })
        }
    }

    pub fn connect(&self) -> Result<Connection> {
        Connection::connect_with(self)
    }

    pub(crate) unsafe fn ptr(&self) -> ffi::duckdb_database {
        *self.db
    }
}
