mod common;

use common::shared_connection;
use databricks::Value;

#[tokio::test]
async fn test_query_duration() {
    let mut conn = shared_connection().await;
    let result = conn.query("SELECT 1").await.unwrap();
    assert!(
        result.duration.unwrap() > 1,
        "duration should be a positive integer"
    );
    assert_eq!(result.rows_affected, None);
}

#[tokio::test]
async fn test_empty_result() {
    let mut conn = shared_connection().await;
    let result = conn.query("SELECT 1 AS id WHERE 1 = 0").await.unwrap();
    assert_eq!(result.columns.len(), 1);
    assert_eq!(result.rows.len(), 0);
}

#[tokio::test]
async fn test_generate_series() {
    let mut conn = shared_connection().await;
    let result = conn
        .query("SELECT id FROM (SELECT explode(sequence(1, 100)) AS id)")
        .await
        .unwrap();
    assert_eq!(result.rows.len(), 100);
}

#[tokio::test]
async fn test_union_all() {
    let mut conn = shared_connection().await;
    let result = conn
        .query("SELECT 1 AS id UNION ALL SELECT 2 UNION ALL SELECT 3")
        .await
        .unwrap();
    assert_eq!(result.rows.len(), 3);
}

#[tokio::test]
async fn test_case_expression() {
    let mut conn = shared_connection().await;
    let result = conn
        .query("SELECT CASE WHEN 1 > 0 THEN 'yes' ELSE 'no' END AS r")
        .await
        .unwrap();
    assert_eq!(result.rows[0][0], Value::String("yes".into()));
}

#[tokio::test]
async fn test_string_functions() {
    let mut conn = shared_connection().await;
    let result = conn
        .query(
            "SELECT upper('hello') AS u, lower('WORLD') AS l, \
             length('test') AS len, concat('a', 'b', 'c') AS cat",
        )
        .await
        .unwrap();
    assert_eq!(result.rows[0][0], Value::String("HELLO".into()));
    assert_eq!(result.rows[0][1], Value::String("world".into()));
    assert_eq!(result.rows[0][2], Value::Int(4));
    assert_eq!(result.rows[0][3], Value::String("abc".into()));
}

#[tokio::test]
async fn test_math_functions() {
    let mut conn = shared_connection().await;
    let result = conn
        .query("SELECT abs(-5) AS a, ceil(1.1) AS c, floor(1.9) AS f")
        .await
        .unwrap();
    assert_eq!(result.rows[0][0], Value::Int(5));
}

#[tokio::test]
async fn test_aggregate_functions() {
    let mut conn = shared_connection().await;
    let result = conn
        .query(
            "SELECT sum(v) AS s, avg(v) AS a, min(v) AS mn, max(v) AS mx, count(v) AS c \
             FROM (SELECT explode(array(1, 2, 3, 4, 5)) AS v)",
        )
        .await
        .unwrap();
    assert_eq!(result.rows.len(), 1);
    assert_eq!(result.rows[0][0], Value::BigInt(15));
}
