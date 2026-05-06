use crate::tag::*;

pub(crate) struct Encoder {
    bytes: Vec<u8>,
}

impl Encoder {
    pub fn new(capacity: usize) -> Self {
        Self {
            bytes: Vec::with_capacity(capacity),
        }
    }

    pub fn into_bytes(self) -> Vec<u8> {
        self.bytes
    }

    #[inline]
    pub fn put_null(&mut self) {
        self.bytes.push(NULL);
    }

    #[inline]
    pub fn put_bool(&mut self, v: bool) {
        if v {
            self.bytes.push(BOOL_TRUE);
        } else {
            self.bytes.push(BOOL_FALSE);
        }
    }

    #[inline]
    pub fn put_u8(&mut self, v: u8) {
        self.bytes.push(U8);
        self.bytes.push(v);
    }

    #[inline]
    pub fn put_i8(&mut self, v: i8) {
        self.bytes.push(I8);
        self.bytes.push(v as u8);
    }

    #[inline]
    pub fn put_u16(&mut self, v: u16) {
        self.bytes.push(U16);
        self.bytes.extend_from_slice(&v.to_le_bytes());
    }

    #[inline]
    pub fn put_i16(&mut self, v: i16) {
        self.bytes.push(I16);
        self.bytes.extend_from_slice(&v.to_le_bytes());
    }

    #[inline]
    pub fn put_u32(&mut self, v: u32) {
        self.bytes.push(U32);
        self.bytes.extend_from_slice(&v.to_le_bytes());
    }

    #[inline]
    pub fn put_i32(&mut self, v: i32) {
        self.bytes.push(I32);
        self.bytes.extend_from_slice(&v.to_le_bytes());
    }

    #[inline]
    pub fn put_u64(&mut self, v: u64) {
        self.bytes.push(U64);
        self.bytes.extend_from_slice(&v.to_le_bytes());
    }

    #[inline]
    pub fn put_i64(&mut self, v: i64) {
        self.bytes.push(I64);
        self.bytes.extend_from_slice(&v.to_le_bytes());
    }

    #[inline]
    pub fn put_f32(&mut self, v: f32) {
        self.bytes.push(F32);
        self.bytes.extend_from_slice(&v.to_le_bytes());
    }

    #[inline]
    pub fn put_f64(&mut self, v: f64) {
        self.bytes.push(F64);
        self.bytes.extend_from_slice(&v.to_le_bytes());
    }

    #[inline]
    pub fn put_string(&mut self, v: &str) {
        self.put_tag_and_len((STRING_1, STRING_2, STRING_4), v.len());
        self.bytes.extend_from_slice(v.as_bytes());
    }

    #[inline]
    pub fn put_bytes(&mut self, v: &[u8]) {
        self.put_tag_and_len((BYTES_1, BYTES_2, BYTES_4), v.len());
        self.bytes.extend_from_slice(v);
    }

    #[inline]
    pub fn put_array(&mut self, len: usize) {
        self.put_tag_and_len((ARRAY_1, ARRAY_2, ARRAY_4), len);
    }

    #[inline]
    pub fn put_map(&mut self, len: usize) {
        self.put_tag_and_len((MAP_1, MAP_2, MAP_4), len);
    }

    #[inline]
    fn put_tag_and_len(&mut self, tags: (u8, u8, u8), len: usize) {
        match len {
            0..=255 => {
                self.bytes.push(tags.0);
                self.bytes.push(len as u8);
            }
            256..=65535 => {
                self.bytes.push(tags.1);
                self.bytes.extend_from_slice(&(len as u16).to_le_bytes());
            }
            _ => {
                self.bytes.push(tags.2);
                self.bytes.extend_from_slice(&(len as u32).to_le_bytes());
            }
        }
    }
}

#[inline]
pub fn length(len: usize) -> usize {
    match len {
        0..=255 => 1,
        256..=65535 => 2,
        _ => 4,
    }
}
