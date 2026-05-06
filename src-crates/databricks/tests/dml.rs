mod common;

use common::{connection, unique_table_name};
use databricks::Value;

#[tokio::test]
async fn test_insert_select_update_delete() {
    let mut conn = connection().await;
    let table = unique_table_name("test_dml");

    // CREATE
    conn.query(&format!(
        "CREATE TABLE {table} (
            id INT,
            name STRING,
            amount DECIMAL(10,2),
            active BOOLEAN,
            created_at TIMESTAMP
        )"
    ))
    .await
    .unwrap();

    // INSERT
    conn.query(&format!(
        "INSERT INTO {table} VALUES
            (1, 'alice', 100.50, true, '2024-01-01 00:00:00'),
            (2, 'bob', 200.75, false, '2024-06-15 12:30:00'),
            (3, 'carol', 0.00, true, '2024-12-31 23:59:59')"
    ))
    .await
    .unwrap();

    // SELECT
    let result = conn
        .query(&format!("SELECT * FROM {table} ORDER BY id"))
        .await
        .unwrap();
    assert_eq!(result.rows.len(), 3);
    assert_eq!(result.columns.len(), 5);
    assert_eq!(result.rows[0][0], Value::Int(1));
    assert_eq!(result.rows[0][1], Value::String("alice".into()));
    assert_eq!(result.rows[1][0], Value::Int(2));
    assert_eq!(result.rows[2][0], Value::Int(3));

    // UPDATE
    conn.query(&format!(
        "UPDATE {table} SET name = 'alice_updated' WHERE id = 1"
    ))
    .await
    .unwrap();
    let updated = conn
        .query(&format!("SELECT name FROM {table} WHERE id = 1"))
        .await
        .unwrap();
    assert_eq!(updated.rows[0][0], Value::String("alice_updated".into()));

    // DELETE
    conn.query(&format!("DELETE FROM {table} WHERE id = 2"))
        .await
        .unwrap();
    let after_delete = conn
        .query(&format!("SELECT COUNT(*) AS cnt FROM {table}"))
        .await
        .unwrap();
    assert_eq!(after_delete.rows[0][0], Value::BigInt(2));

    // DROP
    conn.query(&format!("DROP TABLE {table}")).await.unwrap();
}
