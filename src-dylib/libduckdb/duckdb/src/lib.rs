mod column;
mod config;
mod connection;
mod database;
mod value;
mod vector;

use std::ffi::NulError;

pub use chrono::{DateTime, NaiveDate, NaiveDateTime, NaiveTime};
pub use column::*;
pub use config::*;
pub use connection::*;
pub use database::*;
pub use num_bigint::BigInt;
pub use rust_decimal::Decimal;
pub use value::*;

type Result<T> = std::result::Result<T, Error>;

#[derive(Debug, Clone, thiserror::Error)]
pub enum Error {
    #[error("Invalid 'CString'")]
    CString(#[from] NulError),
    #[error("Set config error")]
    Config,
    #[error("Unknown type id '{0}'")]
    UnknownTypeId(u32),
    #[error("Invalid internal enum type id '{0}'")]
    InternalEnumTypeId(u32),
    #[error("{0}")]
    Database(String),
    #[error("{0}")]
    Query(String),
}
