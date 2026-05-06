use crate::column::Column;
use crate::vector::from_vector;
use crate::{Database, Error, Result, Value};
use libduckdb_sys::{self as ffi};
use std::ffi::{CStr, CString};
use std::fmt::Debug;
use std::mem::zeroed;
use std::ptr::null_mut;
use std::sync::Arc;
use std::time::{Duration, Instant};

pub struct Connection {
    db: Database,
    conn: Arc<ffi::duckdb_connection>,
}

unsafe impl Send for Connection {}
unsafe impl Sync for Connection {}

impl Drop for Connection {
    fn drop(&mut self) {
        if let Some(conn) = Arc::get_mut(&mut self.conn) {
            unsafe {
                ffi::duckdb_disconnect(conn);
            }
        }
    }
}

impl Debug for Connection {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "Connection {{..}}")
    }
}

impl Connection {
    pub fn connect_with(db: &Database) -> Result<Self> {
        unsafe {
            let mut conn = null_mut();
            let state = ffi::duckdb_connect(db.ptr(), &mut conn);
            if state != ffi::DuckDBSuccess {
                ffi::duckdb_disconnect(&mut conn);
                return Err(Error::Database("connect failed".into()));
            }
            Ok(Self {
                db: db.clone(),
                #[allow(clippy::arc_with_non_send_sync)]
                conn: Arc::new(conn),
            })
        }
    }

    pub fn try_new(&self) -> Result<Self> {
        self.db.connect()
    }

    unsafe fn result<S: Into<Vec<u8>>>(&self, sql: S) -> Result<ffi::duckdb_result> {
        unsafe {
            let c_sql = CString::new(sql)?;
            let mut result: ffi::duckdb_result = zeroed();
            let state = ffi::duckdb_query(*self.conn, c_sql.as_ptr(), &mut result);
            if state != ffi::DuckDBSuccess {
                let err = ffi::duckdb_result_error(&mut result);
                let msg = CStr::from_ptr(err).to_string_lossy().to_string();
                ffi::duckdb_destroy_result(&mut result);
                return Err(Error::Query(msg));
            }
            Ok(result)
        }
    }

    pub fn execute<S: AsRef<str>>(&self, sql: S) -> Result<u64> {
        unsafe {
            let mut result = self.result(sql.as_ref())?;
            let rows_affected = ffi::duckdb_rows_changed(&mut result);
            ffi::duckdb_destroy_result(&mut result);
            Ok(rows_affected)
        }
    }

    pub fn query<S: AsRef<str>>(&self, sql: S) -> Result<Query> {
        unsafe {
            let now = Instant::now();
            let mut result = self.result(sql.as_ref())?;
            let rows_affected = ffi::duckdb_rows_changed(&mut result);
            let column_count = ffi::duckdb_column_count(&mut result);
            let row_count = ffi::duckdb_row_count(&mut result);
            let chunk_count = ffi::duckdb_result_chunk_count(result);
            let columns = match Column::try_from_ffi(result, column_count) {
                Ok(columns) => columns,
                Err(err) => {
                    ffi::duckdb_destroy_result(&mut result);
                    return Err(err);
                }
            };
            let mut rows = vec![vec![Value::Null; column_count as usize]; row_count as usize];

            let mut start_at = 0;
            for chunk_i in 0..chunk_count {
                let mut chunk = ffi::duckdb_result_get_chunk(result, chunk_i);
                let row_count = ffi::duckdb_data_chunk_get_size(chunk) as usize;
                for col_i in 0..column_count {
                    let vector = ffi::duckdb_data_chunk_get_vector(chunk, col_i);
                    let vector_values =
                        from_vector(vector, row_count, &columns[col_i as usize].logical_type);
                    for (row_i, val) in vector_values.into_iter().enumerate() {
                        rows[start_at + row_i][col_i as usize] = val;
                    }
                }
                start_at += row_count;
                ffi::duckdb_destroy_data_chunk(&mut chunk);
            }

            ffi::duckdb_destroy_result(&mut result);
            Ok(Query {
                columns,
                rows,
                rows_affected,
                duration: now.elapsed(),
            })
        }
    }
}

#[derive(Debug, Clone)]
pub struct Query {
    pub columns: Vec<Column>,
    pub rows: Vec<Vec<Value>>,
    pub rows_affected: u64,
    pub duration: Duration,
}

#[cfg(test)]
mod tests {
    use crate::*;
    use bit_vec::BitVec;

    #[test]
    fn test_query_column() {
        let columns = Database::open_with_memory(Config::new())
            .unwrap()
            .connect()
            .unwrap()
            .query("select 1::integer as num, gen_random_uuid() as id, '01'::bit")
            .unwrap()
            .columns;
        assert_eq!(
            columns,
            vec![
                Column {
                    name: "num".into(),
                    logical_type: LogicalType::Integer,
                    logical_type_alias: None,
                },
                Column {
                    name: "id".into(),
                    logical_type: LogicalType::Uuid,
                    logical_type_alias: None,
                },
                Column {
                    name: "CAST('01' AS BIT(1))".into(),
                    logical_type: LogicalType::Bit,
                    logical_type_alias: None,
                }
            ]
        );
    }

    #[test]
    fn test_query_value() {
        use Value::*;
        let conn = Database::open_with_memory(Config::new())
            .unwrap()
            .connect()
            .unwrap();
        let run = |sql: &str, eq: &[Value]| {
            let sql = format!("SELECT {sql}");
            let mut query = conn.query(&sql).unwrap();
            let val = query.rows.remove(0);
            assert_eq!(val, eq, "`{sql}`");
        };
        run("null", &[Null]);
        run("null, NULL", &[Null, Null]);
        run(
            "true, false, null::boolean",
            &[Boolean(true), Boolean(false), Null],
        );
        run(
            "'-128'::tinyint, '0'::tinyint, '127'::tinyint, null::tinyint",
            &[I8(-128), I8(0), I8(127), Null],
        );
        run(
            "'-32768'::smallint, '0'::smallint, '32767'::smallint, null::smallint",
            &[I16(-32768), I16(0), I16(32767), Null],
        );
        run(
            "'-2147483648'::integer, '0'::integer, '2147483647'::integer, null::integer",
            &[I32(-2147483648), I32(0), I32(2147483647), Null],
        );
        run(
            "'-9223372036854775808'::bigint, '0'::bigint, '9223372036854775807'::bigint, null::bigint",
            &[
                I64(-9223372036854775808),
                I64(0),
                I64(9223372036854775807),
                Null,
            ],
        );
        run(
            "'-170141183460469231731687303715884105728'::hugeint, '0'::hugeint, '170141183460469231731687303715884105727'::hugeint, null::hugeint",
            &[
                I128(-170141183460469231731687303715884105728),
                I128(0),
                I128(170141183460469231731687303715884105727),
                Null,
            ],
        );
        run(
            "'0'::utinyint, '255'::utinyint, null::utinyint",
            &[U8(0), U8(255), Null],
        );
        run(
            "'0'::usmallint, '65535'::usmallint, null::usmallint",
            &[U16(0), U16(65535), Null],
        );
        run(
            "'0'::uinteger, '4294967295'::uinteger, null::uinteger",
            &[U32(0), U32(4294967295), Null],
        );
        run(
            "'0'::ubigint, '18446744073709551615'::ubigint, null::ubigint",
            &[U64(0), U64(18446744073709551615), Null],
        );
        run(
            "'0'::uhugeint, '340282366920938463463374607431768211455'::uhugeint, null::uhugeint",
            &[U128(0), U128(340282366920938463463374607431768211455), Null],
        );
        run(
            "'-123.456'::float, '0.0'::float, '123.456'::float, null::float",
            &[F32(-123.456), F32(0.0), F32(123.456), Null],
        );
        run(
            "'-123.456'::double, '0.0'::double, '123.456'::double, null::double",
            &[F64(-123.456), F64(0.0), F64(123.456), Null],
        );
        run(
            "'-123.456'::decimal, '0.0'::decimal, '123.456'::decimal, null::decimal",
            &[
                Decimal(rust_decimal::Decimal::from_i128_with_scale(-123456, 3)),
                Decimal(rust_decimal::Decimal::from_i128_with_scale(0, 3)),
                Decimal(rust_decimal::Decimal::from_i128_with_scale(123456, 3)),
                Null,
            ],
        );
        run(
            "'2023-01-01'::timestamp, '2019-10-11 12:13:14'::timestamp, null::timestamp",
            &[
                Timestamp(NaiveDateTime::new(
                    NaiveDate::from_ymd_opt(2023, 1, 1).unwrap(),
                    NaiveTime::from_hms_opt(0, 0, 0).unwrap(),
                )),
                Timestamp(NaiveDateTime::new(
                    NaiveDate::from_ymd_opt(2019, 10, 11).unwrap(),
                    NaiveTime::from_hms_opt(12, 13, 14).unwrap(),
                )),
                Null,
            ],
        );
        run(
            "'2023-01-01'::date, '2019-10-11'::date, null::date",
            &[
                Date(NaiveDate::from_ymd_opt(2023, 1, 1).unwrap()),
                Date(NaiveDate::from_ymd_opt(2019, 10, 11).unwrap()),
                Null,
            ],
        );
        run(
            "'00:00:00'::time, '12:13:14'::time, null::time",
            &[
                Time(NaiveTime::from_hms_opt(0, 0, 0).unwrap()),
                Time(NaiveTime::from_hms_opt(12, 13, 14).unwrap()),
                Null,
            ],
        );
        run(
            "'00:00:00'::time_ns, '12:13:14.123456789'::time_ns, null::time_ns",
            &[
                Time(NaiveTime::from_hms_nano_opt(0, 0, 0, 0).unwrap()),
                Time(NaiveTime::from_hms_nano_opt(12, 13, 14, 123456789).unwrap()),
                Null,
            ],
        );
        run(
            "'hello'::text, ''::text, '0123456789 0123456789'::text, null::text",
            &[
                Text("hello".into()),
                Text("".into()),
                Text("0123456789 0123456789".into()),
                Null,
            ],
        );
        run(
            "'00000000-0000-0000-0000-000000000000'::uuid, 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid, '0194e32e-6393-7cc0-8371-600736e9b5bf'::uuid, null::text",
            &[
                Uuid(uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()),
                Uuid(uuid::Uuid::parse_str("ffffffff-ffff-ffff-ffff-ffffffffffff").unwrap()),
                Uuid(uuid::Uuid::parse_str("0194e32e-6393-7cc0-8371-600736e9b5bf").unwrap()),
                Null,
            ],
        );
        run(
            "'1 day'::interval, '1 month'::interval, '1 year'::interval, '1 year 1 month 1 day'::interval, '2 sec'::interval, null::interval",
            &[
                Interval(value::Interval {
                    months: 0,
                    days: 1,
                    micros: 0,
                }),
                Interval(value::Interval {
                    months: 1,
                    days: 0,
                    micros: 0,
                }),
                Interval(value::Interval {
                    months: 12,
                    days: 0,
                    micros: 0,
                }),
                Interval(value::Interval {
                    months: 13,
                    days: 1,
                    micros: 0,
                }),
                Interval(value::Interval {
                    months: 0,
                    days: 0,
                    micros: 2_000_000,
                }),
                Null,
            ],
        );
        run(
            "'123'::blob, 'Hello world'::blob, '00000000000000000000000000'::blob, null::blob",
            &[
                Blob("123".as_bytes().to_vec()),
                Blob("Hello world".as_bytes().to_vec()),
                Blob("00000000000000000000000000".as_bytes().to_vec()),
                Null,
            ],
        );
        // TODO
        // Enum(EnumValue),
        // List(Vec<Self>),
        // Map(Vec<(Self, Self)>),
        // Struct(Vec<(Arc<String>, Self)>),
        // Union(Arc<String>, Box<Self>),
        run(
            "'1'::bit, '0'::bit, '10'::bit, '11'::bit, '0000000000'::bit, null::bit",
            &[
                Bit(BitVec::from_iter([true])),
                Bit(BitVec::from_iter([false])),
                Bit(BitVec::from_iter([true, false])),
                Bit(BitVec::from_iter([true, true])),
                Bit(BitVec::from_elem(10, false)),
                Null,
            ],
        );
        run(
            &format!(
                r#"'{}'::varint, '{}'::varint, '{}'::bignum, '{}'::bignum, '{}'::bignum, '{}'::bignum, '{}'::bignum, '{}'::bignum, '{}'::bignum, '{}'::bignum, '{}'::bignum, '{}'::bignum"#,
                i8::MIN,
                i8::MAX,
                i16::MIN,
                i16::MAX,
                i32::MIN,
                i32::MAX,
                i64::MIN,
                i64::MAX,
                i128::MIN,
                i128::MAX,
                u128::MIN,
                u128::MAX,
            ),
            &[
                BigNum(BigInt::from(i8::MIN)),
                BigNum(BigInt::from(i8::MAX)),
                BigNum(BigInt::from(i16::MIN)),
                BigNum(BigInt::from(i16::MAX)),
                BigNum(BigInt::from(i32::MIN)),
                BigNum(BigInt::from(i32::MAX)),
                BigNum(BigInt::from(i64::MIN)),
                BigNum(BigInt::from(i64::MAX)),
                BigNum(BigInt::from(i128::MIN)),
                BigNum(BigInt::from(i128::MAX)),
                BigNum(BigInt::from(u128::MIN)),
                BigNum(BigInt::from(u128::MAX)),
            ],
        );
        run(
            "'-10'::varint, null, [1::varint, 2::varint], '-999999999'::varint",
            &[
                BigNum(BigInt::from(-10)),
                Null,
                List(vec![BigNum(BigInt::from(1)), BigNum(BigInt::from(2))]),
                BigNum(BigInt::from(-999999999)),
            ],
        );
    }

    #[test]
    fn test_json_extension() {
        let query = Database::open_with_memory(Config::new())
            .unwrap()
            .connect()
            .unwrap()
            .query("SELECT * FROM 'https://duckdb.org/data/records.json'")
            .unwrap();
        assert_eq!(query.columns.len(), 2);
        assert_eq!(query.rows.len(), 3);
    }
}
