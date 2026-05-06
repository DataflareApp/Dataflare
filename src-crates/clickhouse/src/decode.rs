use query::Value;
use std::str::FromStr;

pub(super) fn decode_value(val: String, datatype: &str) -> Value {
    if val == "ᴺᵁᴸᴸ" && datatype.starts_with("nullable(") {
        return Value::Null;
    }
    match datatype {
        "bool" | "nullable(bool)" => decode(val, Value::Bool),
        "int8" | "nullable(int8)" => decode(val, Value::I8),
        "uint8" | "nullable(uint8)" => decode(val, Value::U8),
        "int16" | "nullable(int16)" => decode(val, Value::I16),
        "uint16" | "nullable(uint16)" => decode(val, Value::U16),
        "int32" | "nullable(int32)" => decode(val, Value::I32),
        "uint32" | "nullable(uint32)" => decode(val, Value::U32),
        "int64" | "nullable(int64)" => decode(val, Value::I64),
        "uint64" | "nullable(uint64)" => decode(val, Value::U64),
        "float32" | "nullable(float32)" => decode(val, Value::F32),
        "float64" | "nullable(float64)" => decode(val, Value::F64),
        _ => Value::String(val),
    }
}

#[inline]
fn decode<T: FromStr>(val: String, f: fn(T) -> Value) -> Value {
    match val.parse::<T>() {
        Ok(val) => f(val),
        Err(_) => Value::String(val),
    }
}

#[cfg(test)]
mod tests {
    use super::decode_value;
    use query::Value;

    #[test]
    fn decode_value_null_for_nullable_type() {
        assert_eq!(decode_value("ᴺᵁᴸᴸ".into(), "nullable(string)"), Value::Null);
        assert_eq!(decode_value("ᴺᵁᴸᴸ".into(), "nullable(int32)"), Value::Null);
        assert_eq!(decode_value("ᴺᵁᴸᴸ".into(), "nullable(bool)"), Value::Null);
    }

    #[test]
    fn decode_value_bool() {
        assert_eq!(decode_value("true".into(), "bool"), Value::Bool(true));
        assert_eq!(decode_value("false".into(), "bool"), Value::Bool(false));
        assert_eq!(
            decode_value("true".into(), "nullable(bool)"),
            Value::Bool(true)
        );
    }

    #[test]
    fn decode_value_signed_integers() {
        assert_eq!(decode_value("127".into(), "int8"), Value::I8(127));
        assert_eq!(decode_value("32767".into(), "int16"), Value::I16(32767));
        assert_eq!(
            decode_value("2147483647".into(), "int32"),
            Value::I32(2147483647)
        );
        assert_eq!(
            decode_value("9223372036854775807".into(), "int64"),
            Value::I64(i64::MAX)
        );
    }

    #[test]
    fn decode_value_unsigned_integers() {
        assert_eq!(decode_value("255".into(), "uint8"), Value::U8(255));
        assert_eq!(decode_value("65535".into(), "uint16"), Value::U16(65535));
        assert_eq!(
            decode_value("4294967295".into(), "uint32"),
            Value::U32(4294967295)
        );
        assert_eq!(
            decode_value("18446744073709551615".into(), "uint64"),
            Value::U64(u64::MAX)
        );
    }

    #[test]
    fn decode_value_floats() {
        assert_eq!(decode_value("3.14".into(), "float32"), Value::F32(3.14));
        assert_eq!(
            decode_value("3.141592653589793".into(), "float64"),
            Value::F64(3.141592653589793)
        );
    }

    #[test]
    fn decode_value_nullable_numeric_types() {
        assert_eq!(decode_value("42".into(), "nullable(int32)"), Value::I32(42));
        assert_eq!(decode_value("-1".into(), "nullable(int8)"), Value::I8(-1));
        assert_eq!(
            decode_value("100".into(), "nullable(uint64)"),
            Value::U64(100)
        );
        assert_eq!(
            decode_value("2.5".into(), "nullable(float32)"),
            Value::F32(2.5)
        );
    }

    #[test]
    fn decode_value_unknown_type_returns_string() {
        assert_eq!(
            decode_value("2024-01-01".into(), "date"),
            Value::String("2024-01-01".into())
        );
        assert_eq!(
            decode_value("hello".into(), "fixedstring(10)"),
            Value::String("hello".into())
        );
        assert_eq!(
            decode_value("[1,2,3]".into(), "array(uint32)"),
            Value::String("[1,2,3]".into())
        );
    }

    #[test]
    fn decode_value_unparseable_falls_back_to_string() {
        assert_eq!(
            decode_value("not_a_number".into(), "int32"),
            Value::String("not_a_number".into())
        );
        assert_eq!(
            decode_value("not_a_bool".into(), "bool"),
            Value::String("not_a_bool".into())
        );
        assert_eq!(
            decode_value("256".into(), "uint8"),
            Value::String("256".into())
        );
        assert_eq!(
            decode_value("-1".into(), "uint32"),
            Value::String("-1".into())
        );
    }
}
