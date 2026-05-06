mod encode;
mod ser;

pub use ser::{SerError, to_bytes, to_value};
use std::ops::{Deref, DerefMut};

#[derive(Debug, Default, PartialEq, Clone)]
pub enum Value {
    #[default]
    Null,
    Bool(bool),
    I8(i8),
    U8(u8),
    I16(i16),
    U16(u16),
    I32(i32),
    U32(u32),
    F32(f32),
    I64(i64),
    U64(u64),
    F64(f64),
    String(String),
    Bytes(Bytes),
    Array(Vec<Self>),
    Map(Vec<(String, Self)>),
}

impl Value {
    pub fn from_bytes(bytes: Vec<u8>) -> Self {
        Self::Bytes(Bytes::new(bytes))
    }
}

pub(crate) mod tag {
    pub const NULL: u8 = 0;
    pub const BOOL_TRUE: u8 = 1;
    pub const BOOL_FALSE: u8 = 2;
    pub const I8: u8 = 3;
    pub const U8: u8 = 4;
    pub const I16: u8 = 5;
    pub const U16: u8 = 6;
    pub const I32: u8 = 7;
    pub const U32: u8 = 8;
    pub const F32: u8 = 9;
    pub const I64: u8 = 10;
    pub const U64: u8 = 11;
    pub const F64: u8 = 12;
    pub const STRING_1: u8 = 13;
    pub const STRING_2: u8 = 14;
    pub const STRING_4: u8 = 15;
    pub const BYTES_1: u8 = 16;
    pub const BYTES_2: u8 = 17;
    pub const BYTES_4: u8 = 18;
    pub const ARRAY_1: u8 = 19;
    pub const ARRAY_2: u8 = 20;
    pub const ARRAY_4: u8 = 21;
    pub const MAP_1: u8 = 22;
    pub const MAP_2: u8 = 23;
    pub const MAP_4: u8 = 24;
}

#[derive(Debug, Default, PartialEq, Clone)]
pub struct Bytes(pub Vec<u8>);

impl Bytes {
    pub fn new(bytes: Vec<u8>) -> Self {
        Self(bytes)
    }
}

impl Deref for Bytes {
    type Target = [u8];
    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl DerefMut for Bytes {
    fn deref_mut(&mut self) -> &mut Self::Target {
        &mut self.0
    }
}

impl AsRef<[u8]> for Bytes {
    fn as_ref(&self) -> &[u8] {
        &self.0
    }
}

impl Into<Vec<u8>> for Bytes {
    fn into(self) -> Vec<u8> {
        self.0
    }
}

impl Into<Bytes> for Vec<u8> {
    fn into(self) -> Bytes {
        Bytes(self)
    }
}

impl From<&[u8]> for Bytes {
    fn from(bytes: &[u8]) -> Self {
        Self(bytes.to_vec())
    }
}
