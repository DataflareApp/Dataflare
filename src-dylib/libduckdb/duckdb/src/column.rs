use crate::{Error, Result};
use libduckdb_sys::{self as ffi, duckdb_free};
use std::ffi::CStr;
use std::fmt::{Debug, Display};
use std::rc::Rc;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Column {
    pub name: String,
    pub logical_type: LogicalType,
    pub logical_type_alias: Option<String>,
}

/// [DuckDB logical type](https://duckdb.org/docs/api/c/types)
#[derive(Clone, PartialEq, Eq)]
pub enum LogicalType {
    Boolean,
    Tinyint,
    Smallint,
    Integer,
    Bigint,
    UTinyint,
    USmallint,
    UInteger,
    UBigint,
    Float,
    Double,
    Timestamp,
    Date,
    Time,
    Interval,
    Hugeint,
    UHugeint,
    Varchar,
    Blob,
    Decimal(u8, u8),
    TimestampS,
    TimestampMs,
    TimestampNs,
    Enum(Enum),
    List(Box<Self>),
    Struct(Vec<(Rc<String>, Self)>),
    Map(Box<Self>, Box<Self>),
    Array(Box<Self>, usize),
    Uuid,
    Union(Vec<(Rc<String>, Self)>),
    Bit,
    TimeTz,
    TimestampTz,
    BigNum,
    TimeNs,
}

#[derive(Clone, PartialEq, Eq)]
pub struct Enum {
    pub(crate) dictionary: Rc<Vec<String>>,
    pub(crate) internal_type: EnumValueType,
}

impl Debug for Enum {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{:?} {:?}", self.dictionary(), self.internal_type)
    }
}

impl Enum {
    pub fn dictionary(&self) -> &[String] {
        &self.dictionary
    }

    pub(crate) fn select(&self, i: usize) -> EnumValue {
        EnumValue {
            dictionary: self.dictionary.clone(),
            selected: i,
        }
    }
}

#[allow(clippy::enum_variant_names)]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum EnumValueType {
    UTinyint,
    USmallInt,
    UInteger,
}

#[derive(Clone, PartialEq)]
pub struct EnumValue {
    dictionary: Rc<Vec<String>>,
    selected: usize,
}

impl EnumValue {
    pub fn dictionary(&self) -> &[String] {
        &self.dictionary
    }

    pub fn value(&self) -> &str {
        &self.dictionary[self.selected]
    }
}

impl Display for EnumValue {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.value())
    }
}

impl Debug for EnumValue {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.value())
    }
}

impl LogicalType {
    unsafe fn try_from_ffi(value: ffi::duckdb_logical_type) -> Result<Self> {
        unsafe {
            let type_id = ffi::duckdb_get_type_id(value);
            let t = match type_id {
                // ffi::DUCKDB_TYPE_DUCKDB_TYPE_INVALID
                ffi::DUCKDB_TYPE_DUCKDB_TYPE_BOOLEAN => Self::Boolean,
                ffi::DUCKDB_TYPE_DUCKDB_TYPE_TINYINT => Self::Tinyint,
                ffi::DUCKDB_TYPE_DUCKDB_TYPE_SMALLINT => Self::Smallint,
                ffi::DUCKDB_TYPE_DUCKDB_TYPE_INTEGER => Self::Integer,
                ffi::DUCKDB_TYPE_DUCKDB_TYPE_BIGINT => Self::Bigint,
                ffi::DUCKDB_TYPE_DUCKDB_TYPE_UTINYINT => Self::UTinyint,
                ffi::DUCKDB_TYPE_DUCKDB_TYPE_USMALLINT => Self::USmallint,
                ffi::DUCKDB_TYPE_DUCKDB_TYPE_UINTEGER => Self::UInteger,
                ffi::DUCKDB_TYPE_DUCKDB_TYPE_UBIGINT => Self::UBigint,
                ffi::DUCKDB_TYPE_DUCKDB_TYPE_FLOAT => Self::Float,
                ffi::DUCKDB_TYPE_DUCKDB_TYPE_DOUBLE => Self::Double,
                ffi::DUCKDB_TYPE_DUCKDB_TYPE_TIMESTAMP => Self::Timestamp,
                ffi::DUCKDB_TYPE_DUCKDB_TYPE_DATE => Self::Date,
                ffi::DUCKDB_TYPE_DUCKDB_TYPE_TIME => Self::Time,
                ffi::DUCKDB_TYPE_DUCKDB_TYPE_INTERVAL => Self::Interval,
                ffi::DUCKDB_TYPE_DUCKDB_TYPE_HUGEINT => Self::Hugeint,
                ffi::DUCKDB_TYPE_DUCKDB_TYPE_UHUGEINT => Self::UHugeint,
                ffi::DUCKDB_TYPE_DUCKDB_TYPE_VARCHAR => Self::Varchar,
                ffi::DUCKDB_TYPE_DUCKDB_TYPE_BLOB => Self::Blob,
                ffi::DUCKDB_TYPE_DUCKDB_TYPE_DECIMAL => {
                    let width = ffi::duckdb_decimal_width(value);
                    let scale = ffi::duckdb_decimal_scale(value);
                    Self::Decimal(width, scale)
                }
                ffi::DUCKDB_TYPE_DUCKDB_TYPE_TIMESTAMP_S => Self::TimestampS,
                ffi::DUCKDB_TYPE_DUCKDB_TYPE_TIMESTAMP_MS => Self::TimestampMs,
                ffi::DUCKDB_TYPE_DUCKDB_TYPE_TIMESTAMP_NS => Self::TimestampNs,
                ffi::DUCKDB_TYPE_DUCKDB_TYPE_ENUM => {
                    let len = ffi::duckdb_enum_dictionary_size(value);
                    let mut dictionary = Vec::with_capacity(len as usize);
                    for i in 0..len as u64 {
                        let ptr = ffi::duckdb_enum_dictionary_value(value, i);
                        let name = CStr::from_ptr(ptr).to_string_lossy().to_string();
                        duckdb_free(ptr as _);
                        dictionary.push(name);
                    }
                    let internal_type = match ffi::duckdb_enum_internal_type(value) {
                        ffi::DUCKDB_TYPE_DUCKDB_TYPE_UTINYINT => EnumValueType::UTinyint,
                        ffi::DUCKDB_TYPE_DUCKDB_TYPE_USMALLINT => EnumValueType::USmallInt,
                        ffi::DUCKDB_TYPE_DUCKDB_TYPE_UINTEGER => EnumValueType::UInteger,
                        id => return Err(Error::InternalEnumTypeId(id)),
                    };
                    Self::Enum(Enum {
                        dictionary: Rc::new(dictionary),
                        internal_type,
                    })
                }
                ffi::DUCKDB_TYPE_DUCKDB_TYPE_LIST => {
                    let mut t = ffi::duckdb_list_type_child_type(value);
                    let rst = Self::try_from_ffi(t);
                    ffi::duckdb_destroy_logical_type(&mut t);
                    Self::List(Box::new(rst?))
                }
                ffi::DUCKDB_TYPE_DUCKDB_TYPE_STRUCT => {
                    let len = ffi::duckdb_struct_type_child_count(value);
                    let mut children = Vec::with_capacity(len as usize);
                    for i in 0..len {
                        let name_ptr = ffi::duckdb_struct_type_child_name(value, i);
                        let mut value_t = ffi::duckdb_struct_type_child_type(value, i);
                        let name = CStr::from_ptr(name_ptr).to_string_lossy().to_string();
                        let value = Self::try_from_ffi(value_t);
                        duckdb_free(name_ptr as _);
                        ffi::duckdb_destroy_logical_type(&mut value_t);
                        children.push((Rc::new(name), value?));
                    }
                    Self::Struct(children)
                }
                ffi::DUCKDB_TYPE_DUCKDB_TYPE_MAP => {
                    let mut key_t = ffi::duckdb_map_type_key_type(value);
                    let mut value_t = ffi::duckdb_map_type_value_type(value);
                    let key = Self::try_from_ffi(key_t);
                    let value = Self::try_from_ffi(value_t);
                    ffi::duckdb_destroy_logical_type(&mut key_t);
                    ffi::duckdb_destroy_logical_type(&mut value_t);
                    Self::Map(Box::new(key?), Box::new(value?))
                }
                ffi::DUCKDB_TYPE_DUCKDB_TYPE_ARRAY => {
                    let len = ffi::duckdb_array_type_array_size(value);
                    let mut t = ffi::duckdb_array_type_child_type(value);
                    let rst = Self::try_from_ffi(t);
                    ffi::duckdb_destroy_logical_type(&mut t);
                    Self::Array(Box::new(rst?), len as usize)
                }
                ffi::DUCKDB_TYPE_DUCKDB_TYPE_UUID => Self::Uuid,
                ffi::DUCKDB_TYPE_DUCKDB_TYPE_UNION => {
                    let len = ffi::duckdb_union_type_member_count(value);
                    let mut children = Vec::with_capacity(len as usize);
                    for i in 0..len {
                        let name_ptr = ffi::duckdb_union_type_member_name(value, i);
                        let mut value_t = ffi::duckdb_union_type_member_type(value, i);
                        let name = CStr::from_ptr(name_ptr).to_string_lossy().to_string();
                        let value = Self::try_from_ffi(value_t);
                        duckdb_free(name_ptr as _);
                        ffi::duckdb_destroy_logical_type(&mut value_t);
                        children.push((Rc::new(name), value?));
                    }
                    Self::Union(children)
                }
                ffi::DUCKDB_TYPE_DUCKDB_TYPE_BIT => Self::Bit,
                ffi::DUCKDB_TYPE_DUCKDB_TYPE_TIME_TZ => Self::TimeTz,
                ffi::DUCKDB_TYPE_DUCKDB_TYPE_TIMESTAMP_TZ => Self::TimestampTz,
                // ffi::DUCKDB_TYPE_DUCKDB_TYPE_ANY
                ffi::DUCKDB_TYPE_DUCKDB_TYPE_BIGNUM => Self::BigNum,
                // ffi::DUCKDB_TYPE_DUCKDB_TYPE_SQLNULL
                // ffi::DUCKDB_TYPE_DUCKDB_TYPE_STRING_LITERAL
                // ffi::DUCKDB_TYPE_DUCKDB_TYPE_INTEGER_LITERAL
                ffi::DUCKDB_TYPE_DUCKDB_TYPE_TIME_NS => Self::TimeNs,
                id => return Err(Error::UnknownTypeId(id)),
            };
            Ok(t)
        }
    }

    unsafe fn alias(value: ffi::duckdb_logical_type) -> Result<Option<String>> {
        unsafe {
            let ptr = ffi::duckdb_logical_type_get_alias(value);
            if ptr.is_null() {
                ffi::duckdb_free(ptr as _);
                return Ok(None);
            }
            let rst = CStr::from_ptr(ptr).to_string_lossy().to_string();
            ffi::duckdb_free(ptr as _);
            Ok(Some(rst))
        }
    }
}

impl Column {
    pub(crate) unsafe fn try_from_ffi(
        mut result: ffi::duckdb_result,
        column_count: u64,
    ) -> Result<Vec<Column>> {
        let mut columns = Vec::with_capacity(column_count as usize);
        for i in 0..column_count {
            unsafe {
                let mut t = ffi::duckdb_column_logical_type(&mut result, i);
                let name_ptr = ffi::duckdb_column_name(&mut result, i);
                let name = CStr::from_ptr(name_ptr).to_string_lossy().to_string();
                let logical_type = LogicalType::try_from_ffi(t);
                let logical_type_alias = LogicalType::alias(t);
                ffi::duckdb_destroy_logical_type(&mut t);
                columns.push(Column {
                    name,
                    logical_type: logical_type?,
                    logical_type_alias: logical_type_alias?,
                });
            }
        }
        Ok(columns)
    }
}

impl Display for LogicalType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Boolean => write!(f, "boolean"),
            Self::Tinyint => write!(f, "int8"),
            Self::Smallint => write!(f, "int16"),
            Self::Integer => write!(f, "int32"),
            Self::Bigint => write!(f, "int64"),
            Self::UTinyint => write!(f, "uint8"),
            Self::USmallint => write!(f, "uint16"),
            Self::UInteger => write!(f, "uint32"),
            Self::UBigint => write!(f, "uint64"),
            Self::Float => write!(f, "float"),
            Self::Double => write!(f, "double"),
            Self::Timestamp | Self::TimestampS | Self::TimestampMs | Self::TimestampNs => {
                write!(f, "timestamp")
            }
            Self::Date => write!(f, "date"),
            Self::Time => write!(f, "time"),
            Self::Interval => write!(f, "interval"),
            Self::Hugeint => write!(f, "int128"),
            Self::UHugeint => write!(f, "uint128"),
            Self::Varchar => write!(f, "varchar"),
            Self::Blob => write!(f, "blob"),
            Self::Decimal(width, scale) => write!(f, "decimal({width}, {scale})"),
            Self::Enum(e) => {
                let val = e.dictionary.join(", ");
                write!(f, "enum({val})")
            }
            Self::List(children) => write!(f, "{children}[]"),
            Self::Struct(children) => {
                let val = children
                    .iter()
                    .map(|(n, t)| format!("{n} {t}"))
                    .collect::<Vec<String>>()
                    .join(", ");
                write!(f, "struct({val})")
            }
            Self::Map(key, val) => write!(f, "map({key}, {val})"),
            Self::Array(children, len) => write!(f, "{children}[{len}]"),
            Self::Uuid => write!(f, "uuid"),
            Self::Union(children) => {
                let val = children
                    .iter()
                    .map(|(n, t)| format!("{n} {t}"))
                    .collect::<Vec<String>>()
                    .join(", ");
                write!(f, "union({val})")
            }
            Self::Bit => write!(f, "bit"),
            // DuckDB cli: time with time zone
            Self::TimeTz => write!(f, "timetz"),
            // DuckDB cli: timestamp with time zone
            Self::TimestampTz => write!(f, "timestamptz"),
            Self::BigNum => write!(f, "bignum"),
            Self::TimeNs => write!(f, "time_ns"),
        }
    }
}

impl Debug for LogicalType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{self}")
    }
}
