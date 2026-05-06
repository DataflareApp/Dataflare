use crate::column::EnumValue;
use bit_vec::BitVec;
use chrono::{NaiveDate, NaiveDateTime, NaiveTime};
use num_bigint::BigInt;
use rust_decimal::Decimal;
use std::fmt::{Debug, Display, Write};
use std::rc::Rc;
use uuid::Uuid;

#[derive(Default, PartialEq, Clone, Debug)]
pub enum Value {
    #[default]
    Null,
    Boolean(bool),
    I8(i8),
    I16(i16),
    I32(i32),
    I64(i64),
    I128(i128),
    U8(u8),
    U16(u16),
    U32(u32),
    U64(u64),
    U128(u128),
    F32(f32),
    F64(f64),
    Decimal(Decimal),
    Timestamp(NaiveDateTime),
    Date(NaiveDate),
    Time(NaiveTime),
    Interval(Interval),
    Uuid(Uuid),
    Text(String),
    Blob(Vec<u8>),
    Enum(EnumValue),
    List(Vec<Self>),
    Map(Vec<(Self, Self)>),
    Struct(Vec<(Rc<String>, Self)>),
    Union(Rc<String>, Box<Self>),
    Bit(BitVec),
    BigNum(BigInt),
}

#[derive(Default, PartialEq, Clone, Copy)]
pub struct Interval {
    pub months: i32,
    pub days: i32,
    pub micros: i64,
}

impl Display for Value {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Null => write!(f, "NULL"),
            Self::Boolean(v) => write!(f, "{v}"),
            Self::I8(v) => write!(f, "{v}"),
            Self::I16(v) => write!(f, "{v}"),
            Self::I32(v) => write!(f, "{v}"),
            Self::I64(v) => write!(f, "{v}"),
            Self::I128(v) => write!(f, "{v}"),
            Self::U8(v) => write!(f, "{v}"),
            Self::U16(v) => write!(f, "{v}"),
            Self::U32(v) => write!(f, "{v}"),
            Self::U64(v) => write!(f, "{v}"),
            Self::U128(v) => write!(f, "{v}"),
            Self::F32(v) => write!(f, "{v}"),
            Self::F64(v) => write!(f, "{v}"),
            Self::Decimal(v) => write!(f, "{v}"),
            Self::Timestamp(v) => write!(f, "{v}"),
            Self::Date(v) => write!(f, "{v}"),
            Self::Time(v) => write!(f, "{v}"),
            Self::Interval(v) => write!(f, "{v}"),
            Self::Uuid(v) => write!(f, "{v}"),
            Self::Text(v) => write!(f, "{v}"),
            Self::Enum(v) => write!(f, "{v}"),
            Self::Bit(v) => write!(f, "{v}"),
            Self::Blob(v) => {
                let s = v
                    .iter()
                    .fold(String::with_capacity(v.len() * 4), |mut out, b| {
                        let _ = write!(out, "\\x{:02X}", b);
                        out
                    });
                write!(f, "{s}")
            }
            Self::List(items) => {
                let s = items
                    .iter()
                    .map(|val| val.to_string())
                    .collect::<Vec<String>>()
                    .join(", ");
                write!(f, "[{s}]")
            }
            Self::Map(items) => {
                let s = items
                    .iter()
                    .map(|(k, v)| format!("{k}={v}"))
                    .collect::<Vec<String>>()
                    .join(", ");
                write!(f, "{{{s}}}")
            }
            Self::Struct(items) => {
                let s = items
                    .iter()
                    .map(|(k, v)| format!("'{k}': {v}"))
                    .collect::<Vec<String>>()
                    .join(", ");
                write!(f, "{{{s}}}")
            }
            Self::Union(_, val) => write!(f, "{val}"),
            Self::BigNum(v) => write!(f, "{v}"),
        }
    }
}

const HOURS: i64 = 60 * 60 * 1_000_000;
const MINUTE: i64 = 60 * 1_000_000;

impl Display for Interval {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let mut micros = self.micros;
        let years = self.months / 12;
        let months = self.months % 12;
        let days = self.days;
        let hours = micros / HOURS;
        if hours > 0 {
            micros -= hours * HOURS;
        }
        let minute = micros / MINUTE;
        if minute > 0 {
            micros -= minute * MINUTE;
        }
        let units = [
            Units::Year(years),
            Units::Month(months),
            Units::Day(days),
            Units::Time {
                hours,
                minute,
                micros,
            },
        ];
        if units.iter().all(|u| u.is_empty()) {
            write!(f, "00:00:00")
        } else {
            let rst = units
                .into_iter()
                .filter(|u| !u.is_empty())
                .map(|u| u.to_string())
                .collect::<Vec<_>>()
                .join(" ");
            write!(f, "{rst}")
        }
    }
}

impl Debug for Interval {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{self}")
    }
}

enum Units {
    Year(i32),
    Month(i32),
    Day(i32),
    Time {
        hours: i64,
        minute: i64,
        micros: i64,
    },
}

impl Display for Units {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Year(n) => match n {
                1 => write!(f, "1 year")?,
                n => write!(f, "{n} years")?,
            },
            Self::Month(n) => match n {
                1 => write!(f, "1 month")?,
                n => write!(f, "{n} months")?,
            },
            Self::Day(n) => match n {
                1 => write!(f, "1 day")?,
                n => write!(f, "{n} days")?,
            },
            Self::Time {
                hours,
                minute,
                micros,
            } => {
                if *micros == 0 {
                    write!(f, "{:02}:{:02}:00", hours, minute)?;
                } else {
                    let a = micros / 1_000_000;
                    let b = micros % 1_000_000;
                    write!(f, "{:02}:{:02}:{:0>2}.{:0>6}", hours, minute, a, b)?;
                }
            }
        }
        Ok(())
    }
}

impl Units {
    fn is_empty(&self) -> bool {
        match self {
            Self::Year(n) => *n == 0,
            Self::Month(n) => *n == 0,
            Self::Day(n) => *n == 0,
            Self::Time {
                hours,
                minute,
                micros,
            } => *hours == 0 && *minute == 0 && *micros == 0,
        }
    }
}

#[cfg(test)]
mod tests {
    use crate::*;

    #[test]
    fn test_interval_empty() {
        assert_eq!(
            Interval {
                ..Default::default()
            }
            .to_string(),
            "00:00:00"
        );
    }

    #[test]
    fn test_interval_months() {
        assert_eq!(
            Interval {
                months: 1,
                ..Default::default()
            }
            .to_string(),
            "1 month"
        );
        assert_eq!(
            Interval {
                months: 2,
                ..Default::default()
            }
            .to_string(),
            "2 months"
        );
        assert_eq!(
            Interval {
                months: 12,
                ..Default::default()
            }
            .to_string(),
            "1 year"
        );
        assert_eq!(
            Interval {
                months: 13,
                ..Default::default()
            }
            .to_string(),
            "1 year 1 month"
        );
        assert_eq!(
            Interval {
                months: 14,
                ..Default::default()
            }
            .to_string(),
            "1 year 2 months"
        );
        assert_eq!(
            Interval {
                months: 24,
                ..Default::default()
            }
            .to_string(),
            "2 years"
        );
        assert_eq!(
            Interval {
                months: 25,
                ..Default::default()
            }
            .to_string(),
            "2 years 1 month"
        );
        assert_eq!(
            Interval {
                months: 28,
                ..Default::default()
            }
            .to_string(),
            "2 years 4 months"
        );
    }

    #[test]
    fn test_interval_micros() {
        assert_eq!(
            Interval {
                micros: 1,
                ..Default::default()
            }
            .to_string(),
            "00:00:00.000001"
        );
        assert_eq!(
            Interval {
                micros: 1000000,
                ..Default::default()
            }
            .to_string(),
            "00:00:01.000000"
        );
        assert_eq!(
            Interval {
                micros: 2000000,
                ..Default::default()
            }
            .to_string(),
            "00:00:02.000000"
        );
        assert_eq!(
            Interval {
                micros: 20000000,
                ..Default::default()
            }
            .to_string(),
            "00:00:20.000000"
        );
        assert_eq!(
            Interval {
                months: 26,
                days: 2,
                micros: 20000000,
                ..Default::default()
            }
            .to_string(),
            "2 years 2 months 2 days 00:00:20.000000"
        );
    }
}
