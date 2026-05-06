use crate::{Interval, LogicalType, Value, column::EnumValueType};
use bit_vec::BitVec;
use chrono::{DateTime, Duration, NaiveDate, NaiveTime};
use libduckdb_sys as ffi;
use num_bigint::BigInt;
use rust_decimal::Decimal;
use std::{ffi::c_void, rc::Rc, slice::from_raw_parts};
use uuid::Uuid;

pub(crate) unsafe fn from_vector(
    vector: ffi::duckdb_vector,
    len: usize,
    logical_type: &LogicalType,
) -> Vec<Value> {
    unsafe {
        let ptr = ffi::duckdb_vector_get_data(vector);
        let validity = ffi::duckdb_vector_get_validity(vector);
        match logical_type {
            // TODO: 'Boolean' may not be 1 byte
            // https://github.com/duckdb/duckdb-node-neo/blob/d187454c17c3c47693f5b3df558412e5aa25e769/api/src/DuckDBVector.ts#L142
            LogicalType::Boolean => {
                vector_parts::<u8, _>(ptr, validity, len, |v| Value::Boolean(*v != 0))
            }
            LogicalType::Tinyint => vector_parts(ptr, validity, len, |v| Value::I8(*v)),
            LogicalType::Smallint => vector_parts(ptr, validity, len, |v| Value::I16(*v)),
            LogicalType::Integer => vector_parts(ptr, validity, len, |v| Value::I32(*v)),
            LogicalType::Bigint => vector_parts(ptr, validity, len, |v| Value::I64(*v)),
            LogicalType::UTinyint => vector_parts(ptr, validity, len, |v| Value::U8(*v)),
            LogicalType::USmallint => vector_parts(ptr, validity, len, |v| Value::U16(*v)),
            LogicalType::UInteger => vector_parts(ptr, validity, len, |v| Value::U32(*v)),
            LogicalType::UBigint => vector_parts(ptr, validity, len, |v| Value::U64(*v)),
            LogicalType::Float => vector_parts(ptr, validity, len, |v| Value::F32(*v)),
            LogicalType::Double => vector_parts(ptr, validity, len, |v| Value::F64(*v)),
            LogicalType::Timestamp | LogicalType::TimestampTz => {
                // For TimestampTz: https://github.com/marcboeker/go-duckdb/blob/main/README.md#notes
                vector_parts::<i64, _>(ptr, validity, len, |v| {
                    let datetime = DateTime::from_timestamp_micros(*v).unwrap().naive_utc();
                    Value::Timestamp(datetime)
                })
            }
            LogicalType::TimestampS => vector_parts::<i64, _>(ptr, validity, len, |v| {
                let datetime = DateTime::from_timestamp(*v, 0).unwrap().naive_utc();
                Value::Timestamp(datetime)
            }),
            LogicalType::TimestampMs => vector_parts::<i64, _>(ptr, validity, len, |v| {
                let datetime = DateTime::from_timestamp_millis(*v).unwrap().naive_utc();
                Value::Timestamp(datetime)
            }),
            LogicalType::TimestampNs => vector_parts::<i64, _>(ptr, validity, len, |v| {
                let datetime = DateTime::from_timestamp_nanos(*v).naive_utc();
                Value::Timestamp(datetime)
            }),
            LogicalType::Date => vector_parts::<i32, _>(ptr, validity, len, |v| {
                let date = NaiveDate::default() + Duration::days(*v as i64);
                Value::Date(date)
            }),
            LogicalType::Time => vector_parts::<i64, _>(ptr, validity, len, |v| {
                let time = NaiveTime::from_num_seconds_from_midnight_opt(
                    (v / 1_000_000) as u32,
                    ((v % 1_000_000) * 1_000) as u32,
                )
                .unwrap();
                Value::Time(time)
            }),
            LogicalType::TimeNs => vector_parts::<i64, _>(ptr, validity, len, |v| {
                let time = NaiveTime::from_num_seconds_from_midnight_opt(
                    (v / 1_000_000_000) as u32,
                    (v % 1_000_000_000) as u32,
                )
                .unwrap();
                Value::Time(time)
            }),
            LogicalType::TimeTz => vector_parts::<u64, _>(ptr, validity, len, |v| {
                const MAX_OFFSET: i64 = 16 * 60 * 60 - 1; // ±15:59:59 = 57599 seconds
                let microseconds = v >> 24;
                let offset = MAX_OFFSET - ((v & 0xFFFFFF) as i64);
                let time = NaiveTime::from_num_seconds_from_midnight_opt(
                    (microseconds / 1_000_000) as u32,
                    ((microseconds % 1_000_000) * 1_000) as u32,
                )
                .unwrap();
                Value::Time(time - Duration::seconds(offset))
            }),
            LogicalType::Hugeint => {
                vector_parts::<i128, _>(ptr, validity, len, |v| Value::I128(*v))
            }
            LogicalType::UHugeint => {
                vector_parts::<u128, _>(ptr, validity, len, |v| Value::U128(*v))
            }
            LogicalType::Uuid => vector_parts::<i128, _>(ptr, validity, len, |v| {
                let n = (*v as u128).wrapping_sub(i128::MIN as u128);
                Value::Uuid(Uuid::from_u128(n))
            }),
            LogicalType::Interval => {
                vector_parts::<(i32, i32, i64), _>(ptr, validity, len, |(months, days, micros)| {
                    Value::Interval(Interval {
                        months: *months,
                        days: *days,
                        micros: *micros,
                    })
                })
            }
            LogicalType::Varchar => vector_bytes(ptr, validity, len, |bytes| {
                let s = std::str::from_utf8_unchecked(bytes).to_string();
                Value::Text(s)
            }),
            LogicalType::Blob => {
                vector_bytes(ptr, validity, len, |bytes| Value::Blob(bytes.to_vec()))
            }
            LogicalType::Bit => vector_bytes(ptr, validity, len, |bytes| {
                let len = (bytes.len() - 1) * 8 - bytes[0] as usize;
                let mut bits = BitVec::from_bytes(bytes);
                let bits = bits.split_off(bits.len() - len);
                Value::Bit(bits)
            }),
            LogicalType::Decimal(width, scale) => match *width {
                n if n <= 4 => vector_parts::<i16, _>(ptr, validity, len, |v| {
                    Value::Decimal(Decimal::new(*v as i64, *scale as u32))
                }),
                n if n <= 9 => vector_parts::<i32, _>(ptr, validity, len, |v| {
                    Value::Decimal(Decimal::new(*v as i64, *scale as u32))
                }),
                n if n <= 18 => vector_parts::<i64, _>(ptr, validity, len, |v| {
                    Value::Decimal(Decimal::new(*v, *scale as u32))
                }),
                n if n <= 38 => vector_parts::<i128, _>(ptr, validity, len, |v| {
                    // TODO: select '99999999999999999999999999999999.123'::Decimal(38, 3) panic
                    Value::Decimal(Decimal::from_i128_with_scale(*v, *scale as u32))
                }),
                _ => unreachable!("Decimal width must be between 1 and 38!"),
            },
            LogicalType::Enum(e) => match e.internal_type {
                EnumValueType::UTinyint => vector_parts::<u8, _>(ptr, validity, len, |v| {
                    Value::Enum(e.select(*v as usize))
                }),
                EnumValueType::USmallInt => vector_parts::<u16, _>(ptr, validity, len, |v| {
                    Value::Enum(e.select(*v as usize))
                }),
                EnumValueType::UInteger => vector_parts::<u32, _>(ptr, validity, len, |v| {
                    Value::Enum(e.select(*v as usize))
                }),
            },
            LogicalType::List(t) => {
                let mut vec = Vec::with_capacity(len);
                let bytes = from_raw_parts::<'_, [u64; 2]>(ptr as _, len);
                let child_data = from_vector(
                    ffi::duckdb_list_vector_get_child(vector),
                    ffi::duckdb_list_vector_get_size(vector) as usize,
                    t,
                );
                for (i, [start, len]) in bytes.iter().enumerate() {
                    if row_is_valid(validity, i) {
                        // NOTE: We must clone here because the value of child_data may be reused.
                        let list = child_data
                            .iter()
                            .skip(*start as usize)
                            .take(*len as usize)
                            .cloned()
                            .collect::<Vec<_>>();
                        vec.push(Value::List(list));
                    } else {
                        vec.push(Value::Null);
                    }
                }
                vec
            }
            LogicalType::Array(t, child_len) => {
                let mut vec = Vec::with_capacity(len);
                let mut child_data = from_vector(
                    ffi::duckdb_array_vector_get_child(vector),
                    len * child_len,
                    t,
                );
                for i in 0..len {
                    if row_is_valid(validity, i) {
                        let list = child_data.drain(0..*child_len).collect::<Vec<_>>();
                        vec.push(Value::List(list));
                    } else {
                        vec.push(Value::Null)
                    }
                }
                vec
            }
            LogicalType::Struct(entrys) => {
                let mut all = Vec::with_capacity(entrys.len());
                for (i, (name, t)) in entrys.iter().enumerate() {
                    let child_vector = ffi::duckdb_struct_vector_get_child(vector, i as u64);
                    let values = from_vector(child_vector, len, t);
                    all.push((name.clone(), values));
                }
                let mut vec = Vec::with_capacity(len);
                for i in 0..len {
                    if row_is_valid(validity, i) {
                        let mut entries = Vec::with_capacity(entrys.len());
                        for (key, values) in all.iter_mut() {
                            entries.push((key.clone(), values.remove(0)));
                        }
                        vec.push(Value::Struct(entries));
                    } else {
                        vec.push(Value::Null);
                    }
                }
                vec
            }
            LogicalType::Map(k, v) => from_vector(
                vector,
                len,
                &LogicalType::List(Box::new(LogicalType::Struct(vec![
                    (Rc::new("".to_string()), *k.clone()),
                    (Rc::new("".to_string()), *v.clone()),
                ]))),
            )
            .into_iter()
            .map(|val| match val {
                Value::List(vals) => {
                    let mut map = Vec::with_capacity(vals.len());
                    for val in vals {
                        match val {
                            Value::Struct(mut entrys) => {
                                let (_, k) = entrys.remove(0);
                                let (_, v) = entrys.remove(0);
                                map.push((k, v))
                            }
                            _ => unreachable!("Value should be 'Struct'"),
                        }
                    }
                    Value::Map(map)
                }
                Value::Null => Value::Null,
                _ => unreachable!("Value should be 'List' or 'Null'"),
            })
            .collect::<Vec<_>>(),
            LogicalType::Union(entrys) => {
                let mut types = entrys.clone();
                types.insert(0, (Rc::new("".to_string()), LogicalType::UTinyint)); // Value index
                from_vector(vector, len, &LogicalType::Struct(types))
                    .into_iter()
                    .map(|val| match val {
                        Value::Null => Value::Null,
                        Value::Struct(mut alternative) => {
                            let i = match alternative.remove(0).1 {
                                Value::U8(i) => i as usize,
                                _ => unreachable!("Value should be 'U8'"),
                            };
                            let (name, val) = alternative.remove(i);
                            Value::Union(name, Box::new(val))
                        }
                        _ => unreachable!("Value should be 'Struct' or 'Null'"),
                    })
                    .collect::<Vec<_>>()
            }
            LogicalType::BigNum => vector_bytes(ptr, validity, len, |bytes| {
                Value::BigNum(parse_bignum(bytes))
            }),
        }
    }
}

unsafe fn vector_parts<T, F>(ptr: *mut c_void, validity: *mut u64, len: usize, f: F) -> Vec<Value>
where
    F: Fn(&T) -> Value,
{
    unsafe {
        let mut vec = Vec::with_capacity(len);
        let bytes = from_raw_parts::<'_, T>(ptr as _, len);
        for (i, byte) in bytes.iter().enumerate() {
            if row_is_valid(validity, i) {
                vec.push(f(byte));
            } else {
                vec.push(Value::Null);
            }
        }
        vec
    }
}

unsafe fn vector_bytes<F>(ptr: *mut c_void, validity: *mut u64, len: usize, f: F) -> Vec<Value>
where
    F: Fn(&[u8]) -> Value,
{
    unsafe {
        let mut vec = Vec::with_capacity(len);
        let bytes = from_raw_parts::<'_, u8>(ptr as _, len * 16);
        for (i, data) in bytes.chunks(16).enumerate() {
            if row_is_valid(validity, i) {
                let len = u32::from_ne_bytes([data[0], data[1], data[2], data[3]]);
                if len <= 12 {
                    let blob = &data[4..4 + len as usize];
                    vec.push(f(blob));
                } else {
                    let addr = usize::from_ne_bytes(data[8..].try_into().unwrap());
                    let blob = from_raw_parts::<'_, u8>(addr as _, len as usize);
                    vec.push(f(blob));
                }
            } else {
                vec.push(Value::Null);
            }
        }
        vec
    }
}

unsafe fn row_is_valid(validity: *mut u64, row: usize) -> bool {
    unsafe {
        if validity.is_null() {
            return true;
        }
        let entry_idx = row / 64;
        let idx_in_entry = row % 64;
        *validity.add(entry_idx) & (1 << idx_in_entry) != 0
    }
}

fn parse_bignum(bytes: &[u8]) -> BigInt {
    let negative = (bytes[0] & 0x80) == 0;
    let data_size = if negative {
        !u32::from_be_bytes([0, bytes[0] & 0x7F, bytes[1], bytes[2]]) & 0x7F_FF_FF
    } else {
        u32::from_be_bytes([0, bytes[0] & 0x7F, bytes[1], bytes[2]])
    } as usize;
    if data_size == 1 && bytes[3] == 0 {
        return BigInt::ZERO;
    }
    let mut v = BigInt::ZERO;
    for &byte in &bytes[3..] {
        v = (v << 8) | BigInt::from(if negative { !byte } else { byte });
    }
    if negative {
        v = -v
    }
    v
}
