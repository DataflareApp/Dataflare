use crate::encode::{Encoder, length};
use crate::{Bytes, Value};
use serde::{Serialize, Serializer, ser};
use std::fmt::Display;

type Result<T, E = SerError> = std::result::Result<T, E>;

pub fn to_value<T: Serialize + ?Sized>(value: &T) -> Result<Value> {
    value.serialize(ValueSerializer)
}

fn to_bytes_len<T: Serialize + ?Sized>(value: &T) -> Result<usize> {
    let mut serializer = LengthSerializer { len: 0 };
    value.serialize(&mut serializer)?;
    Ok(serializer.len)
}

pub fn to_bytes<T: Serialize + ?Sized>(value: &T) -> Result<Vec<u8>> {
    let mut serializer = BytesSerializer {
        encoder: Encoder::new(to_bytes_len(value)?),
    };
    value.serialize(&mut serializer)?;
    Ok(serializer.encoder.into_bytes())
}

#[derive(Debug, PartialEq, Eq, Clone)]
pub struct SerError(pub String);

impl Display for SerError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl std::error::Error for SerError {}

impl ser::Error for SerError {
    fn custom<T>(msg: T) -> Self
    where
        T: Display,
    {
        Self(msg.to_string())
    }
}

struct ValueSerializer;

struct LengthSerializer {
    len: usize,
}

struct BytesSerializer {
    encoder: Encoder,
}

impl Serializer for ValueSerializer {
    type Ok = Value;
    type Error = SerError;

    type SerializeSeq = SerializeSeq;
    type SerializeTuple = SerializeSeq;
    type SerializeTupleStruct = SerializeSeq;
    type SerializeTupleVariant = SerializeSeq;
    type SerializeMap = SerializeMap;
    type SerializeStruct = SerializeStruct;
    type SerializeStructVariant = SerializeStruct;

    fn serialize_bool(self, value: bool) -> Result<Self::Ok> {
        Ok(Value::Bool(value))
    }

    fn serialize_i8(self, value: i8) -> Result<Self::Ok> {
        Ok(Value::I8(value))
    }

    fn serialize_u8(self, value: u8) -> Result<Self::Ok> {
        Ok(Value::U8(value))
    }

    fn serialize_i16(self, value: i16) -> Result<Self::Ok> {
        Ok(Value::I16(value))
    }

    fn serialize_u16(self, value: u16) -> Result<Self::Ok> {
        Ok(Value::U16(value))
    }

    fn serialize_i32(self, value: i32) -> Result<Self::Ok> {
        Ok(Value::I32(value))
    }

    fn serialize_u32(self, value: u32) -> Result<Self::Ok> {
        Ok(Value::U32(value))
    }

    fn serialize_f32(self, value: f32) -> Result<Self::Ok> {
        Ok(Value::F32(value))
    }

    fn serialize_i64(self, value: i64) -> Result<Self::Ok> {
        Ok(Value::I64(value))
    }

    fn serialize_u64(self, value: u64) -> Result<Self::Ok> {
        Ok(Value::U64(value))
    }

    fn serialize_f64(self, value: f64) -> Result<Self::Ok> {
        Ok(Value::F64(value))
    }

    fn serialize_char(self, v: char) -> Result<Self::Ok> {
        Ok(Value::String(v.to_string()))
    }

    fn serialize_str(self, value: &str) -> Result<Self::Ok> {
        Ok(Value::String(value.to_string()))
    }

    fn serialize_bytes(self, value: &[u8]) -> Result<Self::Ok> {
        Ok(Value::Bytes(Bytes::from(value)))
    }

    fn serialize_none(self) -> Result<Self::Ok> {
        Ok(Value::Null)
    }

    fn serialize_some<T: ?Sized>(self, value: &T) -> Result<Self::Ok>
    where
        T: Serialize,
    {
        value.serialize(self)
    }

    fn serialize_unit(self) -> Result<Self::Ok> {
        Ok(Value::Null)
    }

    fn serialize_unit_struct(self, _: &'static str) -> Result<Self::Ok> {
        Ok(Value::Null)
    }

    fn serialize_unit_variant(
        self,
        _: &'static str,
        _: u32,
        variant: &'static str,
    ) -> Result<Self::Ok> {
        Ok(Value::String(variant.to_string()))
    }

    fn serialize_newtype_struct<T: ?Sized>(self, _: &'static str, value: &T) -> Result<Self::Ok>
    where
        T: Serialize,
    {
        value.serialize(self)
    }

    fn serialize_newtype_variant<T: ?Sized>(
        self,
        _: &'static str,
        _: u32,
        _: &'static str,
        value: &T,
    ) -> Result<Self::Ok>
    where
        T: Serialize,
    {
        value.serialize(self)
    }

    fn serialize_seq(self, len: Option<usize>) -> Result<Self::SerializeSeq> {
        Ok(SerializeSeq {
            fields: Vec::with_capacity(len.unwrap_or(0)),
        })
    }

    fn serialize_tuple(self, len: usize) -> Result<Self::SerializeTuple> {
        self.serialize_seq(Some(len))
    }

    fn serialize_tuple_struct(
        self,
        _: &'static str,
        len: usize,
    ) -> Result<Self::SerializeTupleStruct> {
        self.serialize_seq(Some(len))
    }

    fn serialize_tuple_variant(
        self,
        _: &'static str,
        _: u32,
        _: &'static str,
        len: usize,
    ) -> Result<Self::SerializeTupleVariant> {
        self.serialize_seq(Some(len))
    }

    fn serialize_map(self, len: Option<usize>) -> Result<Self::SerializeMap> {
        Ok(SerializeMap {
            entries: Vec::with_capacity(len.unwrap_or(0)),
            key: None,
        })
    }

    fn serialize_struct(self, _: &'static str, len: usize) -> Result<Self::SerializeStruct> {
        Ok(SerializeStruct {
            fields: Vec::with_capacity(len),
        })
    }

    fn serialize_struct_variant(
        self,
        _: &'static str,
        _: u32,
        _: &'static str,
        len: usize,
    ) -> Result<Self::SerializeStructVariant> {
        self.serialize_struct("", len)
    }
}

impl<'a> Serializer for &'a mut LengthSerializer {
    type Ok = ();
    type Error = SerError;
    type SerializeSeq = Self;
    type SerializeTuple = Self;
    type SerializeTupleStruct = Self;
    type SerializeTupleVariant = Self;
    type SerializeMap = Self;
    type SerializeStruct = Self;
    type SerializeStructVariant = Self;

    fn serialize_bool(self, _: bool) -> Result<Self::Ok> {
        self.len += 1 + 0;
        Ok(())
    }

    fn serialize_i8(self, _: i8) -> Result<Self::Ok> {
        self.len += 1 + 1;
        Ok(())
    }

    fn serialize_u8(self, _: u8) -> Result<Self::Ok> {
        self.len += 1 + 1;
        Ok(())
    }

    fn serialize_i16(self, _: i16) -> Result<Self::Ok> {
        self.len += 1 + 2;
        Ok(())
    }

    fn serialize_u16(self, _: u16) -> Result<Self::Ok> {
        self.len += 1 + 2;
        Ok(())
    }

    fn serialize_i32(self, _: i32) -> Result<Self::Ok> {
        self.len += 1 + 4;
        Ok(())
    }

    fn serialize_u32(self, _: u32) -> Result<Self::Ok> {
        self.len += 1 + 4;
        Ok(())
    }

    fn serialize_f32(self, _: f32) -> Result<Self::Ok> {
        self.len += 1 + 4;
        Ok(())
    }

    fn serialize_i64(self, _: i64) -> Result<Self::Ok> {
        self.len += 1 + 8;
        Ok(())
    }

    fn serialize_u64(self, _: u64) -> Result<Self::Ok> {
        self.len += 1 + 8;
        Ok(())
    }

    fn serialize_f64(self, _: f64) -> Result<Self::Ok> {
        self.len += 1 + 8;
        Ok(())
    }

    fn serialize_char(self, value: char) -> Result<Self::Ok> {
        let len = value.len_utf8();
        self.len += 1 + length(len) + len;
        Ok(())
    }

    fn serialize_str(self, value: &str) -> Result<Self::Ok> {
        let len = value.len();
        self.len += 1 + length(len) + len;
        Ok(())
    }

    fn serialize_bytes(self, value: &[u8]) -> Result<Self::Ok> {
        let len = value.len();
        self.len += 1 + length(len) + len;
        Ok(())
    }

    fn serialize_none(self) -> Result<Self::Ok> {
        self.len += 1 + 0;
        Ok(())
    }

    fn serialize_some<T: ?Sized>(self, value: &T) -> Result<Self::Ok>
    where
        T: Serialize,
    {
        value.serialize(self)
    }

    fn serialize_unit(self) -> Result<Self::Ok> {
        self.len += 1 + 0;
        Ok(())
    }

    fn serialize_unit_struct(self, _: &'static str) -> Result<Self::Ok> {
        self.len += 1 + 0;
        Ok(())
    }

    fn serialize_unit_variant(
        self,
        _: &'static str,
        _: u32,
        variant: &'static str,
    ) -> Result<Self::Ok> {
        let len = variant.len();
        self.len += 1 + length(len) + len;
        Ok(())
    }

    fn serialize_newtype_struct<T: ?Sized>(self, _: &'static str, value: &T) -> Result<Self::Ok>
    where
        T: Serialize,
    {
        value.serialize(self)
    }

    fn serialize_newtype_variant<T: ?Sized>(
        self,
        _: &'static str,
        _: u32,
        _: &'static str,
        value: &T,
    ) -> Result<Self::Ok>
    where
        T: Serialize,
    {
        value.serialize(self)
    }

    fn serialize_seq(self, len: Option<usize>) -> Result<Self::SerializeSeq> {
        let len =
            len.ok_or_else(|| SerError("The 'serialize_seq' length must be 'Some(usize)'".into()))?;
        self.len += 1 + length(len);
        Ok(self)
    }

    fn serialize_tuple(self, len: usize) -> Result<Self::SerializeTuple> {
        self.serialize_seq(Some(len))
    }

    fn serialize_tuple_struct(
        self,
        _: &'static str,
        len: usize,
    ) -> Result<Self::SerializeTupleStruct> {
        self.serialize_seq(Some(len))
    }

    fn serialize_tuple_variant(
        self,
        _: &'static str,
        _: u32,
        _: &'static str,
        len: usize,
    ) -> Result<Self::SerializeTupleVariant> {
        self.serialize_seq(Some(len))
    }

    fn serialize_map(self, len: Option<usize>) -> Result<Self::SerializeMap> {
        let len =
            len.ok_or_else(|| SerError("The 'serialize_map' length must be 'Some(usize)'".into()))?;
        self.len += 1 + length(len);
        Ok(self)
    }

    fn serialize_struct(self, _: &'static str, len: usize) -> Result<Self::SerializeStruct> {
        self.len += 1 + length(len);
        Ok(self)
    }

    fn serialize_struct_variant(
        self,
        _: &'static str,
        _: u32,
        _: &'static str,
        len: usize,
    ) -> Result<Self::SerializeStructVariant> {
        self.serialize_struct("", len)
    }
}

impl<'a> Serializer for &'a mut BytesSerializer {
    type Ok = ();
    type Error = SerError;
    type SerializeSeq = Self;
    type SerializeTuple = Self;
    type SerializeTupleStruct = Self;
    type SerializeTupleVariant = Self;
    type SerializeMap = Self;
    type SerializeStruct = Self;
    type SerializeStructVariant = Self;

    fn serialize_bool(self, v: bool) -> Result<Self::Ok> {
        self.encoder.put_bool(v);
        Ok(())
    }

    fn serialize_i8(self, v: i8) -> Result<Self::Ok> {
        self.encoder.put_i8(v);
        Ok(())
    }

    fn serialize_u8(self, v: u8) -> Result<Self::Ok> {
        self.encoder.put_u8(v);
        Ok(())
    }

    fn serialize_i16(self, v: i16) -> Result<Self::Ok> {
        self.encoder.put_i16(v);
        Ok(())
    }

    fn serialize_u16(self, v: u16) -> Result<Self::Ok> {
        self.encoder.put_u16(v);
        Ok(())
    }

    fn serialize_i32(self, v: i32) -> Result<Self::Ok> {
        self.encoder.put_i32(v);
        Ok(())
    }

    fn serialize_u32(self, v: u32) -> Result<Self::Ok> {
        self.encoder.put_u32(v);
        Ok(())
    }

    fn serialize_f32(self, v: f32) -> Result<Self::Ok> {
        self.encoder.put_f32(v);
        Ok(())
    }

    fn serialize_i64(self, v: i64) -> Result<Self::Ok> {
        self.encoder.put_i64(v);
        Ok(())
    }

    fn serialize_u64(self, v: u64) -> Result<Self::Ok> {
        self.encoder.put_u64(v);
        Ok(())
    }

    fn serialize_f64(self, v: f64) -> Result<Self::Ok> {
        self.encoder.put_f64(v);
        Ok(())
    }

    fn serialize_char(self, v: char) -> Result<Self::Ok> {
        self.encoder.put_string(&v.to_string());
        Ok(())
    }

    fn serialize_str(self, v: &str) -> Result<Self::Ok> {
        self.encoder.put_string(v);
        Ok(())
    }

    fn serialize_bytes(self, v: &[u8]) -> Result<Self::Ok> {
        self.encoder.put_bytes(v);
        Ok(())
    }

    fn serialize_none(self) -> Result<Self::Ok> {
        self.encoder.put_null();
        Ok(())
    }

    fn serialize_some<T: ?Sized>(self, value: &T) -> Result<Self::Ok>
    where
        T: Serialize,
    {
        value.serialize(self)
    }

    fn serialize_unit(self) -> Result<Self::Ok> {
        self.encoder.put_null();
        Ok(())
    }

    fn serialize_unit_struct(self, _: &'static str) -> Result<Self::Ok> {
        self.encoder.put_null();
        Ok(())
    }

    fn serialize_unit_variant(
        self,
        _: &'static str,
        _: u32,
        variant: &'static str,
    ) -> Result<Self::Ok> {
        self.encoder.put_string(variant);
        Ok(())
    }

    fn serialize_newtype_struct<T: ?Sized>(self, _: &'static str, value: &T) -> Result<Self::Ok>
    where
        T: Serialize,
    {
        value.serialize(self)
    }

    fn serialize_newtype_variant<T: ?Sized>(
        self,
        _: &'static str,
        _: u32,
        _: &'static str,
        value: &T,
    ) -> Result<Self::Ok>
    where
        T: Serialize,
    {
        value.serialize(self)
    }

    fn serialize_seq(self, len: Option<usize>) -> Result<Self::SerializeSeq> {
        let len =
            len.ok_or_else(|| SerError("The 'serialize_seq' length must be 'Some(usize)'".into()))?;
        self.encoder.put_array(len);
        Ok(self)
    }

    fn serialize_tuple(self, len: usize) -> Result<Self::SerializeTuple> {
        self.serialize_seq(Some(len))
    }

    fn serialize_tuple_struct(
        self,
        _: &'static str,
        len: usize,
    ) -> Result<Self::SerializeTupleStruct> {
        self.serialize_seq(Some(len))
    }

    fn serialize_tuple_variant(
        self,
        _: &'static str,
        _: u32,
        _: &'static str,
        len: usize,
    ) -> Result<Self::SerializeTupleVariant> {
        self.serialize_seq(Some(len))
    }

    fn serialize_map(self, len: Option<usize>) -> Result<Self::SerializeMap> {
        let len =
            len.ok_or_else(|| SerError("The 'serialize_map' length must be 'Some(usize)'".into()))?;
        self.encoder.put_map(len);
        Ok(self)
    }

    fn serialize_struct(self, _: &'static str, len: usize) -> Result<Self::SerializeStruct> {
        self.encoder.put_map(len);
        Ok(self)
    }

    fn serialize_struct_variant(
        self,
        _: &'static str,
        _: u32,
        _: &'static str,
        len: usize,
    ) -> Result<Self::SerializeStructVariant> {
        self.serialize_struct("", len)
    }
}

impl Serialize for Value {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        match *self {
            Value::Null => serializer.serialize_unit(),
            Value::Bool(v) => serializer.serialize_bool(v),
            Value::I8(v) => serializer.serialize_i8(v),
            Value::U8(v) => serializer.serialize_u8(v),
            Value::I16(v) => serializer.serialize_i16(v),
            Value::U16(v) => serializer.serialize_u16(v),
            Value::I32(v) => serializer.serialize_i32(v),
            Value::U32(v) => serializer.serialize_u32(v),
            Value::F32(v) => serializer.serialize_f32(v),
            Value::I64(v) => serializer.serialize_i64(v),
            Value::U64(v) => serializer.serialize_u64(v),
            Value::F64(v) => serializer.serialize_f64(v),
            Value::String(ref v) => serializer.serialize_str(v),
            Value::Bytes(ref v) => serializer.serialize_bytes(&v.0),
            Value::Array(ref v) => {
                use serde::ser::SerializeSeq;
                let mut seq = serializer.serialize_seq(Some(v.len()))?;
                for element in v {
                    seq.serialize_element(element)?;
                }
                seq.end()
            }
            Value::Map(ref v) => {
                use serde::ser::SerializeMap;
                let mut map = serializer.serialize_map(Some(v.len()))?;
                for (k, v) in v {
                    map.serialize_entry(k, v)?;
                }
                map.end()
            }
        }
    }
}

impl Serialize for Bytes {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_bytes(&self.0)
    }
}

pub struct SerializeSeq {
    fields: Vec<Value>,
}

impl ser::SerializeSeq for SerializeSeq {
    type Ok = Value;
    type Error = SerError;

    fn serialize_element<T>(&mut self, value: &T) -> Result<()>
    where
        T: ?Sized + Serialize,
    {
        let value = value.serialize(ValueSerializer)?;
        self.fields.push(value);
        Ok(())
    }

    fn end(self) -> Result<Value> {
        Ok(Value::Array(self.fields))
    }
}

impl ser::SerializeTuple for SerializeSeq {
    type Ok = Value;
    type Error = SerError;

    fn serialize_element<T>(&mut self, value: &T) -> Result<()>
    where
        T: ?Sized + Serialize,
    {
        let value = value.serialize(ValueSerializer)?;
        self.fields.push(value);
        Ok(())
    }

    fn end(self) -> Result<Value> {
        Ok(Value::Array(self.fields))
    }
}

impl ser::SerializeTupleStruct for SerializeSeq {
    type Ok = Value;
    type Error = SerError;

    fn serialize_field<T>(&mut self, value: &T) -> Result<()>
    where
        T: ?Sized + Serialize,
    {
        let value = value.serialize(ValueSerializer)?;
        self.fields.push(value);
        Ok(())
    }

    fn end(self) -> Result<Value> {
        Ok(Value::Array(self.fields))
    }
}

impl ser::SerializeTupleVariant for SerializeSeq {
    type Ok = Value;
    type Error = SerError;

    fn serialize_field<T>(&mut self, value: &T) -> Result<()>
    where
        T: ?Sized + Serialize,
    {
        let value = value.serialize(ValueSerializer)?;
        self.fields.push(value);
        Ok(())
    }

    fn end(self) -> Result<Value> {
        Ok(Value::Array(self.fields))
    }
}

pub struct SerializeMap {
    entries: Vec<(String, Value)>,
    key: Option<String>,
}

impl ser::SerializeMap for SerializeMap {
    type Ok = Value;
    type Error = SerError;

    fn serialize_key<T>(&mut self, key: &T) -> Result<()>
    where
        T: ?Sized + Serialize,
    {
        let key = key.serialize(ValueSerializer)?;
        let key = match key {
            Value::String(s) => s,
            _ => return Err(SerError("Key must be a string".into())),
        };
        self.key = Some(key);
        Ok(())
    }

    fn serialize_value<T>(&mut self, value: &T) -> Result<()>
    where
        T: ?Sized + Serialize,
    {
        let key = self
            .key
            .take()
            .expect("serialize_value called before serialize_key");
        let value = value.serialize(ValueSerializer)?;
        self.entries.push((key, value));
        Ok(())
    }

    fn serialize_entry<K, V>(&mut self, key: &K, value: &V) -> Result<()>
    where
        K: ?Sized + Serialize,
        V: ?Sized + Serialize,
    {
        let key = key.serialize(ValueSerializer)?;
        let key = match key {
            Value::String(s) => s,
            _ => return Err(SerError("Key must be a string".into())),
        };
        let value = value.serialize(ValueSerializer)?;
        self.entries.push((key, value));
        Ok(())
    }

    fn end(self) -> Result<Value> {
        Ok(Value::Map(self.entries))
    }
}

pub struct SerializeStruct {
    fields: Vec<(String, Value)>,
}

impl ser::SerializeStruct for SerializeStruct {
    type Ok = Value;
    type Error = SerError;

    fn serialize_field<T>(&mut self, key: &'static str, value: &T) -> Result<()>
    where
        T: ?Sized + Serialize,
    {
        let value = value.serialize(ValueSerializer)?;
        self.fields.push((key.to_string(), value));
        Ok(())
    }

    fn end(self) -> Result<Value> {
        Ok(Value::Map(self.fields))
    }
}

impl ser::SerializeStructVariant for SerializeStruct {
    type Ok = Value;
    type Error = SerError;

    fn serialize_field<T>(&mut self, key: &'static str, value: &T) -> Result<()>
    where
        T: ?Sized + Serialize,
    {
        let value = value.serialize(ValueSerializer)?;
        self.fields.push((key.to_string(), value));
        Ok(())
    }

    fn end(self) -> Result<Value> {
        Ok(Value::Map(self.fields))
    }
}

impl<'a> ser::SerializeSeq for &'a mut LengthSerializer {
    type Ok = ();
    type Error = SerError;

    fn serialize_element<T>(&mut self, value: &T) -> Result<()>
    where
        T: ?Sized + Serialize,
    {
        value.serialize(&mut **self)
    }

    fn end(self) -> Result<()> {
        Ok(())
    }
}

impl ser::SerializeTuple for &'_ mut LengthSerializer {
    type Ok = ();
    type Error = SerError;

    fn serialize_element<T>(&mut self, value: &T) -> Result<()>
    where
        T: ?Sized + Serialize,
    {
        value.serialize(&mut **self)
    }

    fn end(self) -> Result<()> {
        Ok(())
    }
}

impl ser::SerializeTupleStruct for &'_ mut LengthSerializer {
    type Ok = ();
    type Error = SerError;

    fn serialize_field<T>(&mut self, value: &T) -> Result<()>
    where
        T: ?Sized + Serialize,
    {
        value.serialize(&mut **self)
    }

    fn end(self) -> Result<()> {
        Ok(())
    }
}

impl ser::SerializeTupleVariant for &'_ mut LengthSerializer {
    type Ok = ();
    type Error = SerError;

    fn serialize_field<T>(&mut self, value: &T) -> Result<()>
    where
        T: ?Sized + Serialize,
    {
        value.serialize(&mut **self)
    }

    fn end(self) -> Result<()> {
        Ok(())
    }
}

impl ser::SerializeMap for &'_ mut LengthSerializer {
    type Ok = ();
    type Error = SerError;

    fn serialize_key<T>(&mut self, key: &T) -> Result<()>
    where
        T: ?Sized + Serialize,
    {
        key.serialize(&mut **self)
    }

    fn serialize_value<T>(&mut self, value: &T) -> Result<()>
    where
        T: ?Sized + Serialize,
    {
        value.serialize(&mut **self)
    }
    fn end(self) -> Result<()> {
        Ok(())
    }
}

impl ser::SerializeStruct for &'_ mut LengthSerializer {
    type Ok = ();
    type Error = SerError;

    fn serialize_field<T>(&mut self, key: &'static str, value: &T) -> Result<()>
    where
        T: ?Sized + Serialize,
    {
        key.serialize(&mut **self)?;
        value.serialize(&mut **self)?;
        Ok(())
    }

    fn end(self) -> Result<()> {
        Ok(())
    }
}

impl ser::SerializeStructVariant for &'_ mut LengthSerializer {
    type Ok = ();
    type Error = SerError;

    fn serialize_field<T>(&mut self, key: &'static str, value: &T) -> Result<()>
    where
        T: ?Sized + Serialize,
    {
        key.serialize(&mut **self)?;
        value.serialize(&mut **self)?;
        Ok(())
    }

    fn end(self) -> Result<()> {
        Ok(())
    }
}

impl<'a> ser::SerializeSeq for &'a mut BytesSerializer {
    type Ok = ();
    type Error = SerError;

    fn serialize_element<T>(&mut self, value: &T) -> Result<()>
    where
        T: ?Sized + Serialize,
    {
        value.serialize(&mut **self)
    }
    fn end(self) -> Result<()> {
        Ok(())
    }
}

impl ser::SerializeTuple for &'_ mut BytesSerializer {
    type Ok = ();
    type Error = SerError;

    fn serialize_element<T>(&mut self, value: &T) -> Result<()>
    where
        T: ?Sized + Serialize,
    {
        value.serialize(&mut **self)
    }
    fn end(self) -> Result<()> {
        Ok(())
    }
}

impl ser::SerializeTupleStruct for &'_ mut BytesSerializer {
    type Ok = ();
    type Error = SerError;

    fn serialize_field<T>(&mut self, value: &T) -> Result<()>
    where
        T: ?Sized + Serialize,
    {
        value.serialize(&mut **self)
    }
    fn end(self) -> Result<()> {
        Ok(())
    }
}

impl ser::SerializeTupleVariant for &'_ mut BytesSerializer {
    type Ok = ();
    type Error = SerError;

    fn serialize_field<T>(&mut self, value: &T) -> Result<()>
    where
        T: ?Sized + Serialize,
    {
        value.serialize(&mut **self)
    }
    fn end(self) -> Result<()> {
        Ok(())
    }
}

impl ser::SerializeMap for &'_ mut BytesSerializer {
    type Ok = ();
    type Error = SerError;

    fn serialize_key<T>(&mut self, key: &T) -> Result<()>
    where
        T: ?Sized + Serialize,
    {
        key.serialize(&mut **self)?;
        Ok(())
    }

    fn serialize_value<T>(&mut self, value: &T) -> Result<()>
    where
        T: ?Sized + Serialize,
    {
        value.serialize(&mut **self)
    }

    fn end(self) -> Result<()> {
        Ok(())
    }
}

impl ser::SerializeStruct for &'_ mut BytesSerializer {
    type Ok = ();
    type Error = SerError;

    fn serialize_field<T>(&mut self, key: &'static str, value: &T) -> Result<()>
    where
        T: ?Sized + Serialize,
    {
        key.serialize(&mut **self)?;
        value.serialize(&mut **self)?;
        Ok(())
    }

    fn end(self) -> Result<()> {
        Ok(())
    }
}

impl ser::SerializeStructVariant for &'_ mut BytesSerializer {
    type Ok = ();
    type Error = SerError;

    fn serialize_field<T>(&mut self, key: &'static str, value: &T) -> Result<()>
    where
        T: ?Sized + Serialize,
    {
        key.serialize(&mut **self)?;
        value.serialize(&mut **self)?;
        Ok(())
    }

    fn end(self) -> Result<()> {
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use std::collections::BTreeMap;

    use super::*;

    #[test]
    fn test_serialize_basic() {
        assert_eq!(to_value(&()), Ok(Value::Null));
        assert_eq!(to_value(&true), Ok(Value::Bool(true)));
        assert_eq!(to_value(&false), Ok(Value::Bool(false)));
        assert_eq!(to_value(&0_i8), Ok(Value::I8(0)));
        assert_eq!(to_value(&0_u8), Ok(Value::U8(0)));
        assert_eq!(to_value(&0_i16), Ok(Value::I16(0)));
        assert_eq!(to_value(&0_u16), Ok(Value::U16(0)));
        assert_eq!(to_value(&0_i32), Ok(Value::I32(0)));
        assert_eq!(to_value(&0_u32), Ok(Value::U32(0)));
        assert_eq!(to_value(&0_i64), Ok(Value::I64(0)));
        assert_eq!(to_value(&0_u64), Ok(Value::U64(0)));
        assert_eq!(to_value(&0_f32), Ok(Value::F32(0.0)));
        assert_eq!(to_value(&0_f64), Ok(Value::F64(0.0)));
        assert_eq!(to_value(&"123"), Ok(Value::String("123".into())));
        assert_eq!(
            to_value(&Bytes::new(vec![1, 2, 3])),
            Ok(Value::Bytes(Bytes::new(vec![1, 2, 3])))
        );
    }

    #[test]
    fn test_serialize_value() {
        assert_eq!(to_value(&Value::Null), Ok(Value::Null));
        assert_eq!(to_value(&Value::Bool(true)), Ok(Value::Bool(true)));
        assert_eq!(to_value(&Value::I8(1)), Ok(Value::I8(1)));
        assert_eq!(to_value(&Value::U8(1)), Ok(Value::U8(1)));
        assert_eq!(to_value(&Value::I16(1)), Ok(Value::I16(1)));
        assert_eq!(to_value(&Value::U16(1)), Ok(Value::U16(1)));
        assert_eq!(to_value(&Value::I32(1)), Ok(Value::I32(1)));
        assert_eq!(to_value(&Value::U32(1)), Ok(Value::U32(1)));
        assert_eq!(to_value(&Value::F32(1.0)), Ok(Value::F32(1.0)));
        assert_eq!(to_value(&Value::I64(1)), Ok(Value::I64(1)));
        assert_eq!(to_value(&Value::U64(1)), Ok(Value::U64(1)));
        assert_eq!(to_value(&Value::F64(1.0)), Ok(Value::F64(1.0)));
        assert_eq!(
            to_value(&Value::String("hello".into())),
            Ok(Value::String("hello".into()))
        );
        assert_eq!(
            to_value(&Value::Bytes(Bytes::new(vec![1, 2, 3]))),
            Ok(Value::Bytes(Bytes::new(vec![1, 2, 3])))
        );
    }

    #[test]
    fn test_serialize_array() {
        let arr = vec![1, 2, 3];
        assert_eq!(
            to_value(&arr),
            Ok(Value::Array(vec![
                Value::I32(1),
                Value::I32(2),
                Value::I32(3)
            ]))
        );

        let arr = vec![Value::I32(1), Value::I32(2), Value::I32(3)];
        assert_eq!(to_value(&arr), Ok(Value::Array(arr)));
    }

    #[test]
    fn test_serialize_map() {
        let mut map = BTreeMap::new();
        map.insert("a".to_string(), Value::I32(1));
        map.insert("b".to_string(), Value::String("hello".to_string()));
        assert_eq!(
            to_value(&map),
            Ok(Value::Map(vec![
                ("a".to_string(), Value::I32(1)),
                ("b".to_string(), Value::String("hello".to_string()))
            ]))
        );

        let map = Value::Map(vec![
            ("a".to_string(), Value::I32(1)),
            ("b".to_string(), Value::String("hello".to_string())),
        ]);
        assert_eq!(to_value(&map), Ok(map));
    }

    #[test]
    fn test_serialize_struct() {
        #[derive(Debug, Serialize, PartialEq, Eq)]
        struct TestStruct {
            a: i8,
            b: String,
        }

        let test_struct = TestStruct {
            a: 1,
            b: "hello".to_string(),
        };
        assert_eq!(
            to_value(&test_struct),
            Ok(Value::Map(vec![
                ("a".to_string(), Value::I8(1)),
                ("b".to_string(), Value::String("hello".to_string()))
            ]))
        );

        #[derive(Debug, Serialize, PartialEq, Eq)]
        struct TestStruct2;
        let test_struct2 = TestStruct2;
        assert_eq!(to_value(&test_struct2), Ok(Value::Null));

        #[derive(Debug, Serialize, PartialEq, Eq)]
        struct TestStruct3(TestStruct, String);
        let test_struct3 = TestStruct3(
            TestStruct {
                a: 2,
                b: "world".to_string(),
            },
            "test".to_string(),
        );
        assert_eq!(
            to_value(&test_struct3),
            Ok(Value::Array(vec![
                Value::Map(vec![
                    ("a".to_string(), Value::I8(2)),
                    ("b".to_string(), Value::String("world".to_string()))
                ]),
                Value::String("test".to_string())
            ]))
        );
    }

    #[test]
    fn test_serialize_enum() {
        #[derive(Debug, Serialize, PartialEq, Eq)]
        enum TestEnum {
            Variant1(i32),
            Variant2(String),
            Color { red: u8, green: u8, blue: u8 },
            UnitVariant,
        }

        let variant1 = TestEnum::Variant1(42);
        assert_eq!(to_value(&variant1), Ok(Value::I32(42)));

        let variant2 = TestEnum::Variant2("hello".to_string());
        assert_eq!(to_value(&variant2), Ok(Value::String("hello".to_string())));

        let color = TestEnum::Color {
            red: 255,
            green: 0,
            blue: 0,
        };
        assert_eq!(
            to_value(&color),
            Ok(Value::Map(vec![
                ("red".to_string(), Value::U8(255)),
                ("green".to_string(), Value::U8(0)),
                ("blue".to_string(), Value::U8(0)),
            ]))
        );

        let unit_variant = TestEnum::UnitVariant;
        assert_eq!(
            to_value(&unit_variant),
            Ok(Value::String("UnitVariant".to_string()))
        );
    }

    #[test]
    fn test_serialize_to_bytes() {
        assert_eq!(to_bytes(&()), Ok(vec![0]));
        assert_eq!(to_bytes(&true), Ok(vec![1]));
        assert_eq!(to_bytes(&false), Ok(vec![2]));
        // TODO
    }

    #[test]
    fn test_serialize_len() {
        assert_eq!(to_bytes_len(&Value::Null), Ok(1));
        assert_eq!(to_bytes_len(&Value::Bool(true)), Ok(1));
        assert_eq!(to_bytes_len(&Value::Bool(false)), Ok(1));
        assert_eq!(to_bytes_len(&Value::I8(1)), Ok(2));
        assert_eq!(to_bytes_len(&Value::U8(1)), Ok(2));
        assert_eq!(to_bytes_len(&Value::I16(1)), Ok(3));
        assert_eq!(to_bytes_len(&Value::U16(1)), Ok(3));
        assert_eq!(to_bytes_len(&Value::I32(1)), Ok(5));
        assert_eq!(to_bytes_len(&Value::U32(1)), Ok(5));
        assert_eq!(to_bytes_len(&Value::F32(1.0)), Ok(5));
        assert_eq!(to_bytes_len(&Value::I64(1)), Ok(9));
        assert_eq!(to_bytes_len(&Value::U64(1)), Ok(9));
        assert_eq!(to_bytes_len(&Value::F64(1.0)), Ok(9));
        assert_eq!(to_bytes_len(&Value::String("hello".into())), Ok(7));
        assert_eq!(
            to_bytes_len(&Value::Bytes(Bytes::new(vec![1, 2, 3]))),
            Ok(5)
        );
        assert_eq!(
            to_bytes_len(&Value::Array(vec![Value::Null, Value::Null])),
            Ok(4)
        );
        assert_eq!(
            to_bytes_len(&Value::Map(vec![
                ("a".to_string(), Value::I8(1)),
                ("b".to_string(), Value::String("hello".to_string()))
            ])),
            Ok(17)
        );

        assert_eq!(to_bytes_len(&vec![0_u8; 255]), Ok(512));
        assert_eq!(to_bytes_len(&vec![0_u8; 256]), Ok(515));
        assert_eq!(to_bytes_len(&vec![0_u8; 65535]), Ok(131073));
        assert_eq!(to_bytes_len(&vec![0_u8; 65536]), Ok(131077));

        #[derive(Debug, Serialize)]
        struct Rgb {
            r: u8,
            g: u8,
            b: u8,
        }
        let rgb = Rgb { r: 0, g: 0, b: 0 };
        assert_eq!(to_bytes(&rgb).map(|b| b.len()), to_bytes_len(&rgb));
    }
}
