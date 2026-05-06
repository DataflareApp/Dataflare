mod common;

use common::{connection, shared_connection, unique_table_name};

#[tokio::test]
async fn test_create_and_drop_table() {
    let mut conn = connection().await;
    let table = unique_table_name("test_ddl");

    conn.query(&format!(
        "CREATE TABLE {table} (
            id INT,
            name STRING
        )"
    ))
    .await
    .unwrap();

    conn.query(&format!("DROP TABLE {table}")).await.unwrap();
}

#[tokio::test]
async fn test_create_table_all_types() {
    let mut conn = connection().await;
    let table = unique_table_name("test_types");

    conn.query(&format!(
        "CREATE TABLE {table} (
            c_tinyint    TINYINT,
            c_smallint   SMALLINT,
            c_int        INT,
            c_bigint     BIGINT,
            c_float      FLOAT,
            c_double     DOUBLE,
            c_decimal    DECIMAL(18,4),
            c_string     STRING,
            c_varchar    VARCHAR(100),
            c_char       CHAR(10),
            c_boolean    BOOLEAN,
            c_binary     BINARY,
            c_date       DATE,
            c_timestamp  TIMESTAMP,
            c_ts_ntz     TIMESTAMP_NTZ,
            c_array      ARRAY<INT>,
            c_map        MAP<STRING, INT>,
            c_struct     STRUCT<x: INT, y: STRING>
        )"
    ))
    .await
    .unwrap();

    conn.query(&format!(
        "INSERT INTO {table} VALUES (
            1, 2, 3, 4, 1.5, 2.5, 123.4567, 'hello', 'world', 'fixed',
            true, to_binary('ff'), '2024-01-01', '2024-01-01 00:00:00',
            '2024-01-01 00:00:00', array(1, 2), map('a', 1), struct(1, 'x')
        )"
    ))
    .await
    .unwrap();

    let result = conn.query(&format!("SELECT * FROM {table}")).await.unwrap();
    assert_eq!(result.rows.len(), 1);
    assert_eq!(result.columns.len(), 18);

    conn.query(&format!("DROP TABLE {table}")).await.unwrap();
}

#[tokio::test]
async fn test_show_tables() {
    let mut conn = shared_connection().await;
    let result = conn
        .query("SHOW TABLES IN information_schema")
        .await
        .unwrap();
    assert!(!result.columns.is_empty());
}

#[tokio::test]
async fn test_describe_table() {
    let mut conn = shared_connection().await;
    let result = conn
        .query("DESCRIBE information_schema.tables")
        .await
        .unwrap();
    assert!(!result.rows.is_empty());
    assert!(result.columns.iter().any(|c| c.name == "col_name"));
}
