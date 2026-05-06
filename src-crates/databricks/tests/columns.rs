mod common;

use common::shared_connection;

#[tokio::test]
async fn test_column_names() {
    let mut conn = shared_connection().await;
    let result = conn
        .query("SELECT 1 AS id, 'hello' AS name, TRUE AS flag")
        .await
        .unwrap();
    assert_eq!(result.columns[0].name, "id");
    assert_eq!(result.columns[1].name, "name");
    assert_eq!(result.columns[2].name, "flag");
}

#[tokio::test]
async fn test_column_datatypes() {
    let mut conn = shared_connection().await;
    let result = conn
        .query(
            r#"SELECT
                CAST(1 AS TINYINT)        AS c_tinyint,
                CAST(1 AS SMALLINT)       AS c_smallint,
                CAST(1 AS INT)            AS c_int,
                CAST(1 AS BIGINT)         AS c_bigint,
                CAST(1.0 AS FLOAT)        AS c_float,
                CAST(1.0 AS DOUBLE)       AS c_double,
                CAST(1.0 AS DECIMAL(5,2)) AS c_decimal,
                TRUE                      AS c_boolean,
                'hello'                   AS c_string,
                CAST('2024-01-01' AS DATE)           AS c_date,
                CAST('2024-01-01' AS TIMESTAMP)      AS c_timestamp,
                to_binary('ff')                      AS c_binary
            "#,
        )
        .await
        .unwrap();
    assert_eq!(result.columns[0].datatype, "TINYINT");
    assert_eq!(result.columns[1].datatype, "SMALLINT");
    assert_eq!(result.columns[2].datatype, "INT");
    assert_eq!(result.columns[3].datatype, "BIGINT");
    assert_eq!(result.columns[4].datatype, "FLOAT");
    assert_eq!(result.columns[5].datatype, "DOUBLE");
    assert_eq!(result.columns[6].datatype, "DECIMAL");
    assert_eq!(result.columns[7].datatype, "BOOLEAN");
    assert_eq!(result.columns[8].datatype, "STRING");
    assert_eq!(result.columns[9].datatype, "DATE");
    assert_eq!(result.columns[10].datatype, "TIMESTAMP");
    assert_eq!(result.columns[11].datatype, "BINARY");
}

#[tokio::test]
async fn test_select_literal_columns() {
    let mut conn = shared_connection().await;
    let result = conn.query("SELECT 1 AS id, 'hello' AS name").await.unwrap();
    assert_eq!(result.columns.len(), 2);
    assert_eq!(result.rows.len(), 1);
}
