mod common;

use crate::common::shared_connection;
use common::unique_table_name;

#[tokio::test]
async fn test_insert_rows_affected() {
    let mut conn = shared_connection().await;
    let table = unique_table_name("test_rows_affected_insert");

    conn.query(&format!("CREATE TABLE {table} (id INT, val STRING)"))
        .await
        .unwrap();

    let result = conn
        .query(&format!(
            "INSERT INTO {table} VALUES (1, 'a'), (2, 'b'), (3, 'c')"
        ))
        .await
        .unwrap();

    assert_eq!(
        result.rows_affected,
        Some(3),
        "INSERT 3 rows should report rows_affected = 3"
    );

    conn.query(&format!("DROP TABLE {table}")).await.unwrap();
}

#[tokio::test]
async fn test_update_rows_affected() {
    let mut conn = shared_connection().await;
    let table = unique_table_name("test_rows_affected_update");

    conn.query(&format!("CREATE TABLE {table} (id INT, val STRING)"))
        .await
        .unwrap();
    conn.query(&format!(
        "INSERT INTO {table} VALUES (1, 'a'), (2, 'a'), (3, 'b')"
    ))
    .await
    .unwrap();

    let result = conn
        .query(&format!("UPDATE {table} SET val = 'x' WHERE val = 'a'"))
        .await
        .unwrap();

    assert_eq!(
        result.rows_affected,
        Some(2),
        "UPDATE matching 2 rows should report rows_affected = 2"
    );

    conn.query(&format!("DROP TABLE {table}")).await.unwrap();
}

#[tokio::test]
async fn test_delete_rows_affected() {
    let mut conn = shared_connection().await;
    let table = unique_table_name("test_rows_affected_delete");

    conn.query(&format!("CREATE TABLE {table} (id INT, val STRING)"))
        .await
        .unwrap();
    conn.query(&format!(
        "INSERT INTO {table} VALUES (1, 'a'), (2, 'b'), (3, 'a')"
    ))
    .await
    .unwrap();

    let result = conn
        .query(&format!("DELETE FROM {table} WHERE val = 'a'"))
        .await
        .unwrap();

    assert_eq!(
        result.rows_affected,
        Some(2),
        "DELETE matching 2 rows should report rows_affected = 2"
    );

    conn.query(&format!("DROP TABLE {table}")).await.unwrap();
}

#[tokio::test]
async fn test_select_rows_affected_is_none() {
    let mut conn = shared_connection().await;

    let result = conn.query("SELECT 1 AS n, 2 AS m").await.unwrap();

    assert!(
        result.rows_affected.is_none(),
        "SELECT should not report rows_affected, got {:?}",
        result.rows_affected
    );
}
