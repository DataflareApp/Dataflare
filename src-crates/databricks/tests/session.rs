mod common;

use common::connection;
use databricks::Value;

#[tokio::test]
async fn test_use_schema() {
    let mut conn = connection().await;
    let current_schema = conn.query("SELECT current_schema()").await.unwrap();
    conn.query("USE SCHEMA information_schema").await.unwrap();
    let after_schema = conn.query("SELECT current_schema()").await.unwrap();
    assert_eq!(
        after_schema.rows[0][0],
        Value::String("information_schema".into())
    );
    assert_ne!(current_schema.rows[0][0], after_schema.rows[0][0]);
}

#[tokio::test]
async fn test_use_catalog() {
    let mut conn = connection().await;
    let current_catalog = conn.query("SELECT current_catalog()").await.unwrap();
    conn.query("USE CATALOG system").await.unwrap();
    let after_catalog = conn.query("SELECT current_catalog()").await.unwrap();
    assert_eq!(after_catalog.rows[0][0], Value::String("system".into()));
    assert_ne!(current_catalog.rows[0][0], after_catalog.rows[0][0]);
}

#[tokio::test]
async fn test_set_and_get_config() {
    let mut conn = connection().await;
    conn.query("SET TIME ZONE 'UTC'").await.unwrap();
    let result = conn.query("SELECT current_timezone()").await.unwrap();
    assert_eq!(result.rows[0][0], Value::String("UTC".into()));
}

#[tokio::test]
async fn test_set_timezone_affects_timestamp() {
    let mut conn = connection().await;
    conn.query("SET TIME ZONE 'UTC'").await.unwrap();
    let utc = conn
        .query("SELECT CAST('2024-01-15 10:00:00' AS TIMESTAMP) AS ts")
        .await
        .unwrap();

    conn.query("SET TIME ZONE 'America/New_York'")
        .await
        .unwrap();
    let eastern = conn
        .query("SELECT CAST('2024-01-15 10:00:00' AS TIMESTAMP) AS ts")
        .await
        .unwrap();

    assert!(matches!(&utc.rows[0][0], Value::String(_)));
    assert!(matches!(&eastern.rows[0][0], Value::String(_)));
}
