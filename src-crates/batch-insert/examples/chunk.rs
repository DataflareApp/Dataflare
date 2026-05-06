use batch_insert::{BatchInsertOptions, ChunkInsert, InsertColumn, InsertValue, IpType};

fn main() {
    let options = BatchInsertOptions {
        entry: "test".into(),
        columns: vec![
            InsertColumn {
                name: "id".into(),
                values: vec![InsertValue::RandomUuid],
            },
            InsertColumn {
                name: "age".into(),
                values: vec![InsertValue::RandomInteger { min: 1, max: 100 }],
            },
            InsertColumn {
                name: "name".into(),
                values: vec![
                    InsertValue::Default,
                    InsertValue::Null,
                    InsertValue::RandomText { min: 0, max: 10 },
                ],
            },
            InsertColumn {
                name: "hight".into(),
                values: vec![
                    InsertValue::Null,
                    InsertValue::RandomFloat {
                        min: 0.,
                        max: 100.3,
                    },
                ],
            },
            InsertColumn {
                name: "email".into(),
                values: vec![InsertValue::RandomEmail],
            },
            InsertColumn {
                name: "enabled".into(),
                values: vec![
                    InsertValue::Custom {
                        value: "true".into(),
                        raw: true,
                    },
                    InsertValue::Custom {
                        value: "false".into(),
                        raw: true,
                    },
                    InsertValue::Null,
                    InsertValue::Default,
                ],
            },
            InsertColumn {
                name: "birth".into(),
                values: vec![InsertValue::RandomDate, InsertValue::Null],
            },
            InsertColumn {
                name: "created_at".into(),
                values: vec![InsertValue::RandomDatetime],
            },
            InsertColumn {
                name: "deleted_at".into(),
                values: vec![
                    InsertValue::RandomUnixTimestamp { ms: true },
                    InsertValue::Null,
                ],
            },
            InsertColumn {
                name: "enabled".into(),
                values: vec![InsertValue::RandomBoolean],
            },
            InsertColumn {
                name: "last_login".into(),
                values: vec![InsertValue::RandomIpAddress {
                    contain: IpType::Ipv4OrIpv6,
                }],
            },
        ],
        count: 10,
    };
    let insert = ChunkInsert::new(options, 4);
    let t = std::time::Instant::now();
    for sql in insert {
        println!("{sql}");
    }
    dbg!(t.elapsed());
}
