mod common;

use common::shared_connection;
use databricks::Value;

#[tokio::test]
async fn test_tinyint() {
    let mut conn = shared_connection().await;
    let result = conn
        .query(
            "SELECT CAST(-128 AS TINYINT) AS mn, CAST(0 AS TINYINT) AS z, \
             CAST(127 AS TINYINT) AS mx",
        )
        .await
        .unwrap();
    let row = &result.rows[0];
    assert_eq!(result.columns[0].datatype, "TINYINT");
    assert_eq!(row[0], Value::TinyInt(-128));
    assert_eq!(row[1], Value::TinyInt(0));
    assert_eq!(row[2], Value::TinyInt(127));
}

#[tokio::test]
async fn test_smallint() {
    let mut conn = shared_connection().await;
    let result = conn
        .query(
            "SELECT CAST(-32768 AS SMALLINT) AS mn, CAST(0 AS SMALLINT) AS z, \
             CAST(32767 AS SMALLINT) AS mx",
        )
        .await
        .unwrap();
    let row = &result.rows[0];
    assert_eq!(result.columns[0].datatype, "SMALLINT");
    assert_eq!(row[0], Value::SmallInt(-32768));
    assert_eq!(row[1], Value::SmallInt(0));
    assert_eq!(row[2], Value::SmallInt(32767));
}

#[tokio::test]
async fn test_int() {
    let mut conn = shared_connection().await;
    let result = conn
        .query(
            "SELECT CAST(-2147483648 AS INT) AS mn, CAST(0 AS INT) AS z, \
             CAST(2147483647 AS INT) AS mx",
        )
        .await
        .unwrap();
    let row = &result.rows[0];
    assert_eq!(result.columns[0].datatype, "INT");
    assert_eq!(row[0], Value::Int(-2147483648));
    assert_eq!(row[1], Value::Int(0));
    assert_eq!(row[2], Value::Int(2147483647));
}

#[tokio::test]
async fn test_bigint() {
    let mut conn = shared_connection().await;
    let result = conn
        .query(
            "SELECT CAST(-9223372036854775808 AS BIGINT) AS mn, \
             CAST(0 AS BIGINT) AS z, \
             CAST(9223372036854775807 AS BIGINT) AS mx",
        )
        .await
        .unwrap();
    let row = &result.rows[0];
    assert_eq!(result.columns[0].datatype, "BIGINT");
    assert_eq!(row[0], Value::BigInt(i64::MIN));
    assert_eq!(row[1], Value::BigInt(0));
    assert_eq!(row[2], Value::BigInt(i64::MAX));
}

#[tokio::test]
async fn test_decimal() {
    let mut conn = shared_connection().await;
    let result = conn
        .query(
            r#"SELECT
                CAST(12.34 AS DECIMAL(5,2))           AS d1,
                CAST(-999.99 AS DECIMAL(5,2))         AS d2,
                CAST(0 AS DECIMAL(10,0))              AS d3,
                CAST(1234567890.12 AS DECIMAL(18,2))  AS d4
            "#,
        )
        .await
        .unwrap();
    let row = &result.rows[0];
    assert_eq!(result.columns[0].datatype, "DECIMAL");
    assert_eq!(row[0], Value::String("12.34".into()));
    assert_eq!(row[1], Value::String("-999.99".into()));
    assert_eq!(row[2], Value::String("0".into()));
    assert_eq!(row[3], Value::String("1234567890.12".into()));
}

#[tokio::test]
async fn test_float() {
    let mut conn = shared_connection().await;
    let result = conn
        .query(
            r#"SELECT
                CAST(1.5 AS FLOAT)          AS val,
                CAST(-1.5 AS FLOAT)         AS neg,
                CAST('NaN' AS FLOAT)        AS nan_val,
                CAST('Infinity' AS FLOAT)   AS pos_inf,
                CAST('-Infinity' AS FLOAT)  AS neg_inf
            "#,
        )
        .await
        .unwrap();
    let row = &result.rows[0];
    assert_eq!(result.columns[0].datatype, "FLOAT");
    assert_eq!(row[0], Value::Float(1.5));
    assert_eq!(row[1], Value::Float(-1.5));
    assert!(
        matches!(&row[2], Value::Float(v) if v.is_nan()),
        "expected NaN, got {:?}",
        row[2]
    );
    assert!(matches!(&row[3], Value::Float(v) if v.is_infinite() && v.is_sign_positive()));
    assert!(matches!(&row[4], Value::Float(v) if v.is_infinite() && v.is_sign_negative()));
}

#[tokio::test]
async fn test_double() {
    let mut conn = shared_connection().await;
    let result = conn
        .query(
            r#"SELECT
                CAST(1.5 AS DOUBLE)          AS val,
                CAST('NaN' AS DOUBLE)        AS nan_val,
                CAST('Infinity' AS DOUBLE)   AS pos_inf,
                CAST('-Infinity' AS DOUBLE)  AS neg_inf
            "#,
        )
        .await
        .unwrap();
    let row = &result.rows[0];
    assert_eq!(result.columns[0].datatype, "DOUBLE");
    assert_eq!(row[0], Value::Double(1.5));
    assert!(
        matches!(&row[1], Value::Double(v) if v.is_nan()),
        "expected NaN, got {:?}",
        row[1]
    );
    assert!(matches!(&row[2], Value::Double(v) if v.is_infinite() && v.is_sign_positive()));
    assert!(matches!(&row[3], Value::Double(v) if v.is_infinite() && v.is_sign_negative()));
}

#[tokio::test]
async fn test_boolean() {
    let mut conn = shared_connection().await;
    let result = conn
        .query("SELECT TRUE AS bool_t, FALSE AS bool_f")
        .await
        .unwrap();
    let row = &result.rows[0];
    assert_eq!(result.columns[0].datatype, "BOOLEAN");
    assert_eq!(result.columns[0].name, "bool_t");
    assert_eq!(result.columns[1].name, "bool_f");
    assert_eq!(row[0], Value::Boolean(true));
    assert_eq!(row[1], Value::Boolean(false));
}

#[tokio::test]
async fn test_string() {
    let mut conn = shared_connection().await;
    let result = conn
        .query("SELECT 'hello world' AS str_val, '' AS empty_val")
        .await
        .unwrap();
    let row = &result.rows[0];
    assert_eq!(result.columns[0].datatype, "STRING");
    assert_eq!(row[0], Value::String("hello world".into()));
    assert_eq!(row[1], Value::String("".into()));
}

#[tokio::test]
async fn test_varchar() {
    let mut conn = shared_connection().await;
    let result = conn
        .query("SELECT CAST('hello' AS VARCHAR(10)) AS vc")
        .await
        .unwrap();
    assert_eq!(result.columns[0].datatype, "STRING");
    assert_eq!(result.rows[0][0], Value::String("hello".into()));
}

#[tokio::test]
async fn test_char() {
    let mut conn = shared_connection().await;
    let result = conn
        .query("SELECT CAST('hi' AS CHAR(5)) AS ch")
        .await
        .unwrap();
    assert_eq!(result.columns[0].datatype, "STRING");
    assert_eq!(result.rows[0][0], Value::String("hi".into()));
}

#[tokio::test]
async fn test_binary() {
    let mut conn = shared_connection().await;
    let result = conn
        .query(
            r#"SELECT
                to_binary('00ff00')             AS bin_hex,
                to_binary('aGVsbG8=', 'base64') AS bin_b64
            "#,
        )
        .await
        .unwrap();
    let row = &result.rows[0];
    assert_eq!(result.columns[0].datatype, "BINARY");
    assert_eq!(row[0], Value::Binary(vec![0x00, 0xff, 0x00]));
    assert_eq!(row[1], Value::Binary(b"hello".to_vec()));
}

#[tokio::test]
async fn test_date() {
    let mut conn = shared_connection().await;
    let result = conn
        .query(
            r#"SELECT
                CAST('2024-01-15' AS DATE)   AS d_normal,
                CAST('1970-01-01' AS DATE)   AS d_epoch,
                CAST('9999-12-31' AS DATE)   AS d_max
            "#,
        )
        .await
        .unwrap();
    assert_eq!(result.columns[0].datatype, "DATE");
    assert_eq!(result.rows[0][0], Value::String("2024-01-15".into()));
    assert_eq!(result.rows[0][1], Value::String("1970-01-01".into()));
    assert_eq!(result.rows[0][2], Value::String("9999-12-31".into()));
}

#[tokio::test]
async fn test_timestamp() {
    let mut conn = shared_connection().await;
    let result = conn
        .query("SELECT CAST('2024-01-15 10:30:00' AS TIMESTAMP) AS ts")
        .await
        .unwrap();
    let val = &result.rows[0][0];
    assert_eq!(result.columns[0].datatype, "TIMESTAMP");
    assert!(
        matches!(val, Value::String(s) if s.contains("2024-01-15") && s.contains("10:30:00")),
        "unexpected timestamp value: {val:?}"
    );
}

#[tokio::test]
async fn test_timestamp_ntz() {
    let mut conn = shared_connection().await;
    let result = conn
        .query("SELECT CAST('2024-01-15 10:30:00' AS TIMESTAMP_NTZ) AS ts_ntz")
        .await
        .unwrap();
    let val = &result.rows[0][0];
    assert_eq!(result.columns[0].datatype, "TIMESTAMP");
    assert_eq!(*val, Value::String("2024-01-15 10:30:00".into()));
}

#[test]
fn test_timestamp_ntz_type_id() {
    assert_eq!(databricks::thrift::TTypeId(22).as_str(), "TIMESTAMP_NTZ");
}

#[tokio::test]
async fn test_interval_year_month() {
    let mut conn = shared_connection().await;
    let result = conn
        .query(
            r#"SELECT
                INTERVAL '1' YEAR              AS ym_year,
                INTERVAL '3' MONTH             AS ym_month,
                INTERVAL '1-3' YEAR TO MONTH   AS ym_full
            "#,
        )
        .await
        .unwrap();
    let row = &result.rows[0];
    assert_eq!(row[0], Value::String("1-0".into()));
    assert_eq!(row[1], Value::String("0-3".into()));
    assert_eq!(row[2], Value::String("1-3".into()));
}

#[tokio::test]
async fn test_interval_day_time() {
    let mut conn = shared_connection().await;
    let result = conn
        .query(
            r#"SELECT
                INTERVAL '2' DAY                      AS dt_day,
                INTERVAL '3' HOUR                     AS dt_hour,
                INTERVAL '4' MINUTE                   AS dt_minute,
                INTERVAL '5.678' SECOND               AS dt_second,
                INTERVAL '1 02:03:04' DAY TO SECOND   AS dt_full
            "#,
        )
        .await
        .unwrap();
    let row = &result.rows[0];
    assert_eq!(row[0], Value::String("2 00:00:00.000000000".into()));
    assert_eq!(row[1], Value::String("0 03:00:00.000000000".into()));
    assert_eq!(row[2], Value::String("0 00:04:00.000000000".into()));
    assert_eq!(row[3], Value::String("0 00:00:05.678000000".into()));
    assert_eq!(row[4], Value::String("1 02:03:04.000000000".into()));
}

#[tokio::test]
async fn test_array() {
    let mut conn = shared_connection().await;
    let result = conn
        .query(
            "SELECT array(named_struct('id', 1, 'name', 'a'), named_struct('id', 2, 'name', 'b')) AS arr_val",
        )
        .await
        .unwrap();
    assert_eq!(result.columns[0].datatype, "ARRAY");
    assert_eq!(
        result.rows[0][0],
        Value::String("[{\"id\":1,\"name\":\"a\"},{\"id\":2,\"name\":\"b\"}]".into())
    );
}

#[tokio::test]
async fn test_map() {
    let mut conn = shared_connection().await;
    let result = conn
        .query("SELECT map('a', array(1, 2), 'b', array(3, NULL)) AS map_val")
        .await
        .unwrap();
    assert_eq!(result.columns[0].datatype, "MAP");
    assert_eq!(
        result.rows[0][0],
        Value::String("{\"a\":[1,2],\"b\":[3,null]}".into())
    );
}

#[tokio::test]
async fn test_struct() {
    let mut conn = shared_connection().await;
    let result = conn
        .query(
            "SELECT named_struct('id', 1, 'tags', array('x', 'y'), 'enabled', true) AS struct_val",
        )
        .await
        .unwrap();
    assert_eq!(result.columns[0].datatype, "STRUCT");
    assert_eq!(
        result.rows[0][0],
        Value::String("{\"id\":1,\"tags\":[\"x\",\"y\"],\"enabled\":true}".into())
    );
}

#[tokio::test]
async fn test_variant() {
    let mut conn = shared_connection().await;
    let result = conn
        .query(r#"SELECT parse_json('{"x":1,"y":"hello"}') AS v_val"#)
        .await
        .unwrap();
    assert_eq!(
        result.rows[0][0],
        Value::String("{\"x\":1,\"y\":\"hello\"}".into())
    );
}

#[tokio::test]
async fn test_variant_nested() {
    let mut conn = shared_connection().await;
    let result = conn
        .query(r#"SELECT parse_json('{"a":[1,2],"b":{"c":true}}') AS v"#)
        .await
        .unwrap();
    assert_eq!(
        result.rows[0][0],
        Value::String("{\"a\":[1,2],\"b\":{\"c\":true}}".into())
    );
}

#[tokio::test]
async fn test_geometry() {
    let mut conn = shared_connection().await;
    let result = conn
        .query("SELECT st_geomfromtext('POINT(1 2)') AS geom_val")
        .await
        .unwrap();
    assert_eq!(result.rows[0][0], Value::String("POINT(1 2)".into()));
}

#[tokio::test]
async fn test_geography() {
    let mut conn = shared_connection().await;
    let result = conn
        .query("SELECT st_geogfromtext('POINT(10 20)') AS geog_val")
        .await
        .unwrap();
    assert_eq!(
        result.rows[0][0],
        Value::String("SRID=4326;POINT(10 20)".into())
    );
}

#[tokio::test]
async fn test_object_schema() {
    let mut conn = shared_connection().await;
    let result = conn
        .query(r#"SELECT schema_of_variant(parse_json('{"a":1}')) AS obj_schema"#)
        .await
        .unwrap();
    assert_eq!(result.rows[0][0], Value::String("OBJECT<a: BIGINT>".into()));
}

#[tokio::test]
async fn test_void() {
    let mut conn = shared_connection().await;
    let result = conn.query("SELECT NULL AS void_val").await.unwrap();
    assert_eq!(result.rows[0][0], Value::Null);
}

#[tokio::test]
async fn test_null_per_type() {
    let mut conn = shared_connection().await;
    let result = conn
        .query(
            r#"SELECT
                CAST(NULL AS TINYINT)       AS n_tinyint,
                CAST(NULL AS SMALLINT)      AS n_smallint,
                CAST(NULL AS INT)           AS n_int,
                CAST(NULL AS BIGINT)        AS n_bigint,
                CAST(NULL AS FLOAT)         AS n_float,
                CAST(NULL AS DOUBLE)        AS n_double,
                CAST(NULL AS DECIMAL(5,2))  AS n_decimal,
                CAST(NULL AS BOOLEAN)       AS n_boolean,
                CAST(NULL AS STRING)        AS n_string,
                CAST(NULL AS VARCHAR(10))   AS n_varchar,
                CAST(NULL AS CHAR(5))       AS n_char,
                CAST(NULL AS BINARY)        AS n_binary,
                CAST(NULL AS DATE)          AS n_date,
                CAST(NULL AS TIMESTAMP)     AS n_timestamp,
                CAST(NULL AS TIMESTAMP_NTZ) AS n_ts_ntz
            "#,
        )
        .await
        .unwrap();
    let row = &result.rows[0];
    for (i, v) in row.iter().enumerate() {
        assert_eq!(
            *v,
            Value::Null,
            "column {} ({}) should be Null",
            i,
            result.columns[i].name
        );
    }
}
