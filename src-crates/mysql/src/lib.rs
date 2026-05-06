use bit_vec::BitVec;
use geo_types::Geometry;
use geozero::{
    ToWkt,
    wkb::{FromWkb, WkbDialect},
};
pub use mysql_async::{ClientIdentity, Compression, Error, Opts, OptsBuilder, PathOrBuf, SslOpts};
use mysql_async::{Column, Conn, Result, Value as MySqlValue};
use mysql_async::{
    Params, TxOpts,
    consts::{ColumnFlags, ColumnType},
    prelude::Queryable,
};
use query::{QueryValueExt, Value};
use std::{
    num::{ParseFloatError, ParseIntError},
    string::FromUtf8Error,
};

#[derive(Debug)]
pub struct Connection {
    conn: Conn,
    pub opts: Opts,
    pub flavor: Flavor,
}

#[derive(Debug, Clone, Copy)]
pub enum Flavor {
    MySql,
    ManticoreSearch,
}

impl Connection {
    pub async fn connect(opts: Opts, flavor: Flavor) -> Result<Self> {
        Ok(Self {
            conn: Self::make_conn(opts.clone()).await?,
            opts,
            flavor,
        })
    }

    fn trim_sql<'a>(&self, sql: &'a str) -> &'a str {
        match self.flavor {
            Flavor::MySql => sql,
            // Trim trailing semicolons
            // ManticoreSearch does not allow semicolons (;) at the end of certain syntaxes.
            // eg:
            // create table products(title text) morphology='stem_en';
            // drop table products;
            Flavor::ManticoreSearch => sql.trim_end().trim_end_matches(';'),
        }
    }

    async fn make_conn(opts: Opts) -> Result<Conn> {
        let conn = Conn::new(opts).await?;
        Ok(conn)
    }

    pub async fn exec_drop(&mut self, sql: &str) -> Result<()> {
        let sql = self.trim_sql(sql);
        self.conn.exec_drop(sql, Params::Empty).await?;
        Ok(())
    }

    async fn inner_query<S: AsRef<str>>(&mut self, sql: S) -> Result<Response> {
        let mut query = self.conn.query_iter(sql.as_ref()).await?;

        let columns = query
            .columns()
            .map(|cols| {
                cols.iter()
                    .map(|col| (col.name_str().to_string(), type_name(col).to_string()))
                    .collect::<Vec<_>>()
            })
            .unwrap_or_default();

        let mut rows = Vec::new();
        loop {
            let row = match query.next().await {
                Ok(Some(row)) => row,
                Ok(None) => break,
                Err(e) => return Err(e),
            };
            let columns = row.columns();
            let mut values = Vec::with_capacity(row.len());
            for (i, cell) in row.unwrap().into_iter().enumerate() {
                match cell {
                    MySqlValue::NULL => values.push(Value::Null),
                    MySqlValue::Bytes(bytes) => match decode_value(&columns[i], bytes) {
                        Ok(val) => values.push(val),
                        Err(err) => {
                            return Err(Error::Other(err.to_string().into()));
                        }
                    },
                    _ => {
                        // We use the text protocol, so we should only receive null and bytes
                        return Err(Error::Other(
                            format!("expected 'NULL, Bytes' but received '{:?}'", cell).into(),
                        ));
                    }
                }
            }
            rows.push(values);
        }

        Ok(Response {
            affected_rows: query.affected_rows(),
            columns,
            rows,
        })
    }
    pub async fn query<S: AsRef<str>>(&mut self, sql: S) -> Result<Response> {
        let sql = self.trim_sql(sql.as_ref());
        match self.inner_query(sql).await {
            Ok(res) => Ok(res),
            Err(err) => {
                // Reconnect
                if matches!(err, Error::Driver(..) | Error::Io(..) | Error::Server(..)) {
                    self.conn = Self::make_conn(self.opts.clone()).await?;
                }
                Err(err)
            }
        }
    }

    async fn inner_transaction<S: AsRef<str>>(&mut self, sqls: &[S]) -> Result<()> {
        let sqls = sqls
            .iter()
            .map(|s| self.trim_sql(s.as_ref()))
            .collect::<Vec<_>>();
        let mut transaction = self.conn.start_transaction(TxOpts::new()).await?;
        for sql in sqls {
            if let Err(err) = transaction.query_drop(sql).await {
                transaction.rollback().await?;
                return Err(err);
            }
        }
        transaction.commit().await?;
        Ok(())
    }
    pub async fn transaction<S: AsRef<str>>(&mut self, sqls: &[S]) -> Result<()> {
        if let Err(err) = self.inner_transaction(sqls).await {
            // Reconnect
            if matches!(err, Error::Driver(..) | Error::Io(..) | Error::Server(..)) {
                self.conn = Self::make_conn(self.opts.clone()).await?;
            }
            return Err(err);
        }
        Ok(())
    }
}

#[derive(Debug)]
pub struct Response {
    pub affected_rows: u64,
    pub columns: Vec<(String, String)>,
    pub rows: Vec<Vec<Value>>,
}

#[derive(thiserror::Error, Debug)]
pub enum DecodeError {
    #[error("invalid UTF-8: {0}")]
    Uft8(#[from] FromUtf8Error),
    #[error("parse int: {0}")]
    ParseInt(#[from] ParseIntError),
    #[error("parse float: {0}")]
    ParseFloat(#[from] ParseFloatError),
    #[error("parse JSON: {0}")]
    Json(#[from] serde_json::Error),
    #[error("parse geometry: {0}")]
    Geo(#[from] geozero::error::GeozeroError),
}

fn decode_value(column: &Column, bytes: Vec<u8>) -> std::result::Result<Value, DecodeError> {
    let v = match column.column_type() {
        ColumnType::MYSQL_TYPE_TINY => {
            if column.flags().contains(ColumnFlags::UNSIGNED_FLAG) {
                Value::U8(String::from_utf8(bytes)?.parse()?)
            } else {
                Value::I8(String::from_utf8(bytes)?.parse()?)
            }
        }
        ColumnType::MYSQL_TYPE_SHORT => {
            if column.flags().contains(ColumnFlags::UNSIGNED_FLAG) {
                Value::U16(String::from_utf8(bytes)?.parse()?)
            } else {
                Value::I16(String::from_utf8(bytes)?.parse()?)
            }
        }
        ColumnType::MYSQL_TYPE_LONG => {
            if column.flags().contains(ColumnFlags::UNSIGNED_FLAG) {
                Value::U32(String::from_utf8(bytes)?.parse()?)
            } else {
                Value::I32(String::from_utf8(bytes)?.parse()?)
            }
        }
        ColumnType::MYSQL_TYPE_INT24 | ColumnType::MYSQL_TYPE_LONGLONG => {
            if column.flags().contains(ColumnFlags::UNSIGNED_FLAG) {
                Value::U64(String::from_utf8(bytes)?.parse()?)
            } else {
                Value::I64(String::from_utf8(bytes)?.parse()?)
            }
        }
        ColumnType::MYSQL_TYPE_FLOAT => Value::F32(String::from_utf8(bytes)?.parse()?),
        ColumnType::MYSQL_TYPE_DOUBLE => Value::F64(String::from_utf8(bytes)?.parse()?),
        // This could be TEXT or BLOB; BINARY_FLAG alone cannot fully determine the type, so we prefer decoding as TEXT when possible
        ColumnType::MYSQL_TYPE_VAR_STRING
        | ColumnType::MYSQL_TYPE_STRING
        | ColumnType::MYSQL_TYPE_VARCHAR
        | ColumnType::MYSQL_TYPE_TINY_BLOB
        | ColumnType::MYSQL_TYPE_MEDIUM_BLOB
        | ColumnType::MYSQL_TYPE_LONG_BLOB
        | ColumnType::MYSQL_TYPE_BLOB
        | ColumnType::MYSQL_TYPE_TYPED_ARRAY
        | ColumnType::MYSQL_TYPE_UNKNOWN => {
            if column.flags().contains(ColumnFlags::BINARY_FLAG) {
                match String::from_utf8(bytes) {
                    Ok(s) => Value::String(s),
                    Err(err) => Value::from_bytes(err.into_bytes()),
                }
            } else {
                Value::String(String::from_utf8(bytes)?)
            }
        }
        ColumnType::MYSQL_TYPE_DECIMAL
        | ColumnType::MYSQL_TYPE_NEWDECIMAL
        | ColumnType::MYSQL_TYPE_TIMESTAMP
        | ColumnType::MYSQL_TYPE_TIMESTAMP2
        | ColumnType::MYSQL_TYPE_DATE
        | ColumnType::MYSQL_TYPE_NEWDATE
        | ColumnType::MYSQL_TYPE_TIME
        | ColumnType::MYSQL_TYPE_TIME2
        | ColumnType::MYSQL_TYPE_DATETIME
        | ColumnType::MYSQL_TYPE_DATETIME2
        | ColumnType::MYSQL_TYPE_YEAR
        | ColumnType::MYSQL_TYPE_ENUM
        | ColumnType::MYSQL_TYPE_SET => Value::String(String::from_utf8(bytes)?),
        ColumnType::MYSQL_TYPE_JSON => {
            let json = serde_json::from_slice(&bytes)?;
            Value::pretty_json(json)
        }
        ColumnType::MYSQL_TYPE_BIT => {
            let len = column.column_length() as usize;
            let mut bits = BitVec::from_bytes(&bytes);
            let bits = bits.split_off(bits.len() - len);
            Value::String(bits.to_string())
        }
        // TODO: Need to consider SRID
        ColumnType::MYSQL_TYPE_GEOMETRY => {
            let val: Geometry<f64> = FromWkb::from_wkb(&mut bytes.as_slice(), WkbDialect::MySQL)?;
            Value::String(val.to_wkt()?)
        }
        ColumnType::MYSQL_TYPE_VECTOR => {
            let mut val = String::with_capacity(2 + bytes.len() * 2);
            val.push_str("0x");
            for byte in bytes {
                val.push_str(&format!("{:02X}", byte));
            }
            Value::String(val)
        }
        // Should not reach here when value is NULL
        ColumnType::MYSQL_TYPE_NULL => Value::Null,
    };
    Ok(v)
}

fn type_name(column: &Column) -> &'static str {
    match column.column_type() {
        ColumnType::MYSQL_TYPE_TINY => {
            if column.flags().contains(ColumnFlags::UNSIGNED_FLAG) {
                "tinyint unsigned"
            } else {
                "tinyint"
            }
        }
        ColumnType::MYSQL_TYPE_SHORT => {
            if column.flags().contains(ColumnFlags::UNSIGNED_FLAG) {
                "smallint unsigned"
            } else {
                "smallint"
            }
        }
        ColumnType::MYSQL_TYPE_LONG => {
            if column.flags().contains(ColumnFlags::UNSIGNED_FLAG) {
                "int unsigned"
            } else {
                "int"
            }
        }
        ColumnType::MYSQL_TYPE_INT24 => {
            if column.flags().contains(ColumnFlags::UNSIGNED_FLAG) {
                "mediumint unsigned"
            } else {
                "mediumint"
            }
        }
        ColumnType::MYSQL_TYPE_LONGLONG => {
            if column.flags().contains(ColumnFlags::UNSIGNED_FLAG) {
                "bigint unsigned"
            } else {
                "bigint"
            }
        }
        ColumnType::MYSQL_TYPE_FLOAT => "float",
        ColumnType::MYSQL_TYPE_DOUBLE => "double",
        ColumnType::MYSQL_TYPE_DECIMAL | ColumnType::MYSQL_TYPE_NEWDECIMAL => "decimal",
        ColumnType::MYSQL_TYPE_NULL => "null",
        ColumnType::MYSQL_TYPE_TIMESTAMP | ColumnType::MYSQL_TYPE_TIMESTAMP2 => "timestamp",
        ColumnType::MYSQL_TYPE_DATE | ColumnType::MYSQL_TYPE_NEWDATE => "date",
        ColumnType::MYSQL_TYPE_TIME | ColumnType::MYSQL_TYPE_TIME2 => "time",
        ColumnType::MYSQL_TYPE_DATETIME | ColumnType::MYSQL_TYPE_DATETIME2 => "datetime",
        ColumnType::MYSQL_TYPE_YEAR => "year",
        ColumnType::MYSQL_TYPE_VARCHAR | ColumnType::MYSQL_TYPE_VAR_STRING => "varchar",
        ColumnType::MYSQL_TYPE_STRING => "string",
        ColumnType::MYSQL_TYPE_BIT => "bit",
        ColumnType::MYSQL_TYPE_TYPED_ARRAY => "typed_array",
        ColumnType::MYSQL_TYPE_UNKNOWN => "unknown",
        ColumnType::MYSQL_TYPE_JSON => "json",
        ColumnType::MYSQL_TYPE_ENUM => "enum",
        ColumnType::MYSQL_TYPE_SET => "set",
        ColumnType::MYSQL_TYPE_TINY_BLOB => "tinyblob",
        ColumnType::MYSQL_TYPE_MEDIUM_BLOB => "mediumblob",
        ColumnType::MYSQL_TYPE_LONG_BLOB => "longblob",
        ColumnType::MYSQL_TYPE_BLOB => "blob",
        ColumnType::MYSQL_TYPE_GEOMETRY => "geometry",
        ColumnType::MYSQL_TYPE_VECTOR => "vector",
    }
}
