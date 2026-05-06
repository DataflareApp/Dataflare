use bigquery::Connection;

#[tokio::main]
async fn main() {
    let key = ""; // include_str!("../../../../.bigquery.json");
    let project_id = None;
    let dataset = "dataset1".to_string();
    let conn = Connection::new(key, project_id, dataset).await.unwrap();

    let sql = r#"
        SELECT
            1 AS int,
            2.2 AS float,
            false AS bool_false,
            TRUE AS bool_true,
            NULL AS null_int,
            FROM_HEX('ff') AS bytes,
            INTERVAL 3 DAY AS interval1,
            '{"id": 1, "name": "Alice", "active": true}' AS json,
            [1, 2, 3] AS array_int,
            ["a", "b", "c"] AS array_string,
            STRUCT(1, 2, 3) AS struct_int,
            STRUCT("one", "two", "three") AS struct_string,
            STRUCT(1, "one") AS struct_int_string,
            STRUCT(1 AS one, "two" AS two) AS struct_name,
            [STRUCT(1,2 as a, 'Hi'), STRUCT(1,2 as a, 'Hi')] AS array_struct;
    "#;

    let res = conn.query(sql.into()).await.unwrap();
    dbg!(res);
}
