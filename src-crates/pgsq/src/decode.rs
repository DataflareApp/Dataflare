use bytes::Bytes;
use hex::FromHexError;
use std::{
    num::{ParseFloatError, ParseIntError},
    str::{Utf8Error, from_utf8},
};

#[derive(thiserror::Error, Debug)]
pub enum DecodeError {
    #[error("Unsupported format: Only support 'text' format")]
    UnsupportedFormat,
    #[error("Invalid uft8: {0}")]
    Uft8(#[from] Utf8Error),
    #[error("Parse int: {0}")]
    ParseInt(#[from] ParseIntError),
    #[error("Parse float: {0}")]
    ParseFloat(#[from] ParseFloatError),
    #[error("Invalid bytes: bytes must start with '\\x'")]
    InvalidBytes,
    #[error("Parse bytes: {0}")]
    ParseBytes(#[from] FromHexError),
    #[error("Invalid bool: '{0}'")]
    InvalidBool(u8),
    #[error("Invalid JSON: {0}")]
    InvalidJson(#[from] serde_json::Error),
}

type Result<T> = std::result::Result<T, DecodeError>;

pub trait Decoder<T> {
    fn decode(&self) -> Result<T>;
}

macro_rules! decoder_int {
    ($t: ty) => {
        impl Decoder<$t> for Bytes {
            fn decode(&self) -> Result<$t> {
                let v = from_utf8(self)?.parse()?; // from_utf8_unchecked(v)
                Ok(v)
            }
        }
    };
}
decoder_int!(i16);
decoder_int!(i32);
decoder_int!(i64);
decoder_int!(u32);
decoder_int!(f32);
decoder_int!(f64);

impl Decoder<Vec<u8>> for Bytes {
    fn decode(&self) -> Result<Vec<u8>> {
        if let Some(v) = from_utf8(self)?.strip_prefix("\\x") {
            return Ok(hex::decode(v)?);
        }
        Err(DecodeError::InvalidBytes)
    }
}

impl Decoder<String> for Bytes {
    fn decode(&self) -> Result<String> {
        let v = String::from_utf8_lossy(self).to_string();
        Ok(v)
    }
}

impl Decoder<bool> for Bytes {
    fn decode(&self) -> Result<bool> {
        let b = match self[0] {
            b't' => true,
            b'f' => false,
            v => return Err(DecodeError::InvalidBool(v)),
        };
        Ok(b)
    }
}

impl Decoder<serde_json::Value> for Bytes {
    fn decode(&self) -> Result<serde_json::Value> {
        let v = serde_json::from_slice(self)?;
        Ok(v)
    }
}

#[cfg(test)]
mod tests {}
