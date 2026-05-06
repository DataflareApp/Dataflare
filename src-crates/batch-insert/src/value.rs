use crate::chars::{LETTER, NUMBER_LETTER, TLDS};
use rand::distr::{Alphanumeric, SampleString};
use rand::prelude::IndexedRandom;
use rand::{Rng, rng};
use serde::Deserialize;
use std::borrow::Cow;
use std::net::{Ipv4Addr, Ipv6Addr};
use uuid::Uuid;

// TODO: Number(i8,u8...)/UUIDv7/time range/country or region code/coordinates/URL/word/color/name/address/zip code/GEO/round-trip repeat
#[derive(Debug, Deserialize)]
#[serde(tag = "type", content = "options")]
pub enum InsertValue {
    Default,
    Null,
    Custom { value: String, raw: bool },
    RandomInteger { min: i64, max: i64 },
    RandomFloat { min: f32, max: f32 },
    RandomText { min: usize, max: usize },
    RandomBoolean,
    RandomUuid,
    RandomEmail,
    RandomIpAddress { contain: IpType },
    RandomDate,
    RandomTime,
    RandomDatetime,
    RandomUnixTimestamp { ms: bool },
}

#[derive(Debug, Deserialize)]
pub enum IpType {
    #[serde(rename = "IPv4/IPv6")]
    Ipv4OrIpv6,
    #[serde(rename = "IPv4")]
    Ipv4,
    #[serde(rename = "IPv6")]
    Ipv6,
}

impl InsertValue {
    pub fn generate(&self) -> Cow<'_, str> {
        match self {
            Self::Default => "DEFAULT".into(),
            Self::Null => "NULL".into(),
            Self::Custom { value, raw } => {
                if *raw {
                    value.into()
                } else if value.contains('\'') {
                    format!("'{}'", value.replace('\'', "''")).into()
                } else {
                    format!("'{}'", value).into()
                }
            }
            Self::RandomInteger { min, max } => {
                let n = rng().random_range(*min..=*max);
                n.to_string().into()
            }
            Self::RandomFloat { min, max } => {
                let n = rng().random_range(*min..=*max);
                n.to_string().into()
            }
            Self::RandomText { min, max } => {
                let mut rng = rng();
                let n = rng.random_range(*min..=*max);
                let s = Alphanumeric.sample_string(&mut rng, n);
                format!("'{}'", s).into()
            }
            Self::RandomBoolean => {
                let b = match rng().random_bool(0.5) {
                    true => "TRUE",
                    false => "FALSE",
                };
                b.into()
            }
            Self::RandomUuid => format!("'{}'", Uuid::new_v4()).into(),
            Self::RandomEmail => random_email().into(),
            Self::RandomIpAddress { contain } => random_ip_addr(contain).into(),
            Self::RandomDate => random_date().into(),
            Self::RandomTime => random_time().into(),
            Self::RandomDatetime => random_datetime().into(),
            Self::RandomUnixTimestamp { ms } => random_unix_timestamp(*ms).into(),
        }
    }
}

fn random_datetime() -> String {
    let mut rng = rng();
    let y = rng.random_range(1900..=2100);
    let m = rng.random_range(1..=12);
    let d = rng.random_range(1..=days_in_month(y, m));
    let hr: u8 = rng.random_range(0..=23);
    let mi: u8 = rng.random_range(0..=59);
    let se: u8 = rng.random_range(0..=59);
    format!("'{y}-{:0>2}-{:0>2} {:0>2}:{:0>2}:{:0>2}'", m, d, hr, mi, se)
}

fn random_date() -> String {
    let mut rng = rng();
    let y = rng.random_range(1900..=2100);
    let m = rng.random_range(1..=12);
    let d = rng.random_range(1..=days_in_month(y, m));
    format!("'{y}-{:0>2}-{:0>2}'", m, d)
}

fn random_time() -> String {
    let mut rng = rng();
    let h: u8 = rng.random_range(0..=23);
    let m: u8 = rng.random_range(0..=59);
    let s: u8 = rng.random_range(0..=59);
    format!("'{:0>2}:{:0>2}:{:0>2}'", h, m, s)
}

fn days_in_month(year: u16, month: u8) -> u8 {
    match month {
        4 | 6 | 9 | 11 => 30,
        2 if (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0) => 29,
        2 => 28,
        _ => 31,
    }
}

fn random_unix_timestamp(ms: bool) -> String {
    let mut end: u64 = 4102444800; // 2100-01-01 00:00:00
    if ms {
        end *= 1000;
    }
    rng().random_range(0..=end).to_string()
}

fn random_email() -> String {
    let mut rng = rng();
    let len = rng.random_range(1..=16);
    let prefix = NUMBER_LETTER
        .choose_multiple(&mut rng, len)
        .collect::<String>();
    let len = rng.random_range(1..=8);
    let name = LETTER.choose_multiple(&mut rng, len).collect::<String>();
    let tld = TLDS.choose(&mut rng).unwrap();
    format!("'{prefix}@{name}.{tld}'")
}

fn random_ip_addr(contain: &IpType) -> String {
    let mut rng = rng();
    let ipv4 = match contain {
        IpType::Ipv4OrIpv6 => rng.random_bool(0.5),
        IpType::Ipv4 => true,
        IpType::Ipv6 => false,
    };
    if ipv4 {
        format!("'{}'", Ipv4Addr::from(rng.random::<u32>()))
    } else {
        format!("'{}'", Ipv6Addr::from(rng.random::<u128>()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_days_in_month() {
        assert_eq!(days_in_month(2021, 2), 28); // Feb 2021 is not a leap year, so 28 days
        assert_eq!(days_in_month(2024, 2), 29); // Feb 2024 is a leap year, so 29 days
        assert_eq!(days_in_month(2021, 4), 30); // April always has 30 days
        assert_eq!(days_in_month(2021, 8), 31); // August always has 31 days
    }
}
