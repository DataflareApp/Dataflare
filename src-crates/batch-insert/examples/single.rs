use batch_insert::{BatchInsertOptions, InsertColumn, InsertValue, IpType, SingleInsert};

fn main() {
    let options = BatchInsertOptions {
        entry: "single-table".into(),
        columns: vec![
            InsertColumn {
                name: "id".into(),
                values: vec![InsertValue::RandomUuid],
            },
            InsertColumn {
                name: "time".into(),
                values: vec![InsertValue::RandomTime],
            },
            InsertColumn {
                name: "age".into(),
                values: vec![InsertValue::RandomInteger { min: 1, max: 100 }],
            },
            InsertColumn {
                name: "ip".into(),
                values: vec![
                    InsertValue::Null,
                    InsertValue::RandomIpAddress {
                        contain: IpType::Ipv4,
                    },
                ],
            },
        ],
        count: 10,
    };
    let insert = SingleInsert::new(options);
    let mut rst = String::new();
    rst.push_str(&insert.header());
    let t = std::time::Instant::now();
    for sql in insert {
        rst.push_str(&sql);
    }
    dbg!(t.elapsed());
    println!("{rst}");
}
