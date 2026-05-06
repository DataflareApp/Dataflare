mod common;

use common::{connection, connection_with_catalog_schema, shared_connection};
use databricks::Value;
use databricks::error::Error;

#[tokio::test]
async fn test_connect() {
    let mut conn = shared_connection().await;
    conn.query("SELECT 1").await.unwrap();
}

#[tokio::test]
async fn test_close_idempotent() {
    let conn = connection().await;
    drop(conn);
}

#[tokio::test]
async fn test_multiple_queries() {
    let mut conn = shared_connection().await;
    for i in 1..=5 {
        let result = conn.query(&format!("SELECT {i} AS val")).await.unwrap();
        assert_eq!(result.rows[0][0], databricks::Value::Int(i));
    }
}

#[tokio::test]
async fn test_initial_catalog_applied() {
    let catalog = "system";
    let mut conn = connection_with_catalog_schema(Some(catalog), None).await;
    let result = conn.query("SELECT current_catalog()").await.unwrap();
    assert_eq!(result.rows[0][0], Value::String(catalog.into()));
}

#[tokio::test]
async fn test_initial_schema_applied() {
    let schema = "information_schema";
    let mut conn = connection_with_catalog_schema(None, Some(schema)).await;
    let result = conn.query("SELECT current_schema()").await.unwrap();
    assert_eq!(result.rows[0][0], Value::String(schema.into()));
}

#[tokio::test]
async fn test_syntax_error() {
    let mut conn = shared_connection().await;
    let err = conn.query("SELECTT 1").await.unwrap_err();
    assert!(
        matches!(err, Error::Status { .. } | Error::OperationFailed(_)),
        "unexpected error variant: {err:?}"
    );
}
