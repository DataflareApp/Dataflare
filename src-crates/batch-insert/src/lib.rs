mod chars;
mod value;

use rand::{Rng, rng};
use serde::Deserialize;
pub use value::{InsertValue, IpType};

#[derive(Debug, Deserialize)]
pub struct BatchInsertOptions {
    pub entry: String,
    pub columns: Vec<InsertColumn>,
    pub count: usize,
}

#[derive(Debug, Deserialize)]
pub struct InsertColumn {
    pub name: String,
    pub values: Vec<InsertValue>,
}

#[derive(Debug)]
struct BatchInsert {
    entry: String,
    columns: String,
    values: Vec<Vec<InsertValue>>,
}

impl BatchInsert {
    pub fn new(entry: String, columns: Vec<InsertColumn>) -> Self {
        let (mut c, mut v) = (vec![], vec![]);
        for col in columns {
            if col.values.is_empty() {
                continue;
            }
            c.push(col.name);
            v.push(col.values);
        }
        Self {
            entry,
            columns: c.join(", "),
            values: v,
        }
    }

    fn row_values(&self) -> String {
        let mut rng = rng();
        self.values
            .iter()
            .map(|group| match group.len() {
                1 => group[0].generate(),
                n => group[rng.random_range(0..n)].generate(),
            })
            .collect::<Vec<_>>()
            .join(", ")
    }
}

pub struct ChunkInsert {
    batch_insert: BatchInsert,
    chunk_count: usize,
    count: usize,
}

impl ChunkInsert {
    pub fn new(options: BatchInsertOptions, chunk_count: usize) -> Self {
        Self {
            batch_insert: BatchInsert::new(options.entry, options.columns),
            chunk_count,
            count: options.count,
        }
    }

    fn generate_sql(&mut self, rows: usize) -> String {
        let values = (0..rows)
            .map(|_| format!("({})", self.batch_insert.row_values()))
            .collect::<Vec<_>>()
            .join(",\n");
        format!(
            "INSERT INTO {} ({})\nVALUES\n{values};",
            self.batch_insert.entry, self.batch_insert.columns,
        )
    }
}

impl Iterator for ChunkInsert {
    type Item = String;
    fn next(&mut self) -> Option<Self::Item> {
        if self.count >= self.chunk_count {
            self.count -= self.chunk_count;
            return Some(self.generate_sql(self.chunk_count));
        }
        if self.count != 0 {
            let n = self.count;
            self.count = 0;
            return Some(self.generate_sql(n));
        }
        None
    }
}

pub struct SingleInsert {
    batch_insert: BatchInsert,
    count: usize,
}

impl SingleInsert {
    pub fn new(options: BatchInsertOptions) -> Self {
        Self {
            batch_insert: BatchInsert::new(options.entry, options.columns),
            count: options.count,
        }
    }

    pub fn header(&self) -> String {
        format!(
            "INSERT INTO {} ({})\nVALUES\n",
            self.batch_insert.entry, self.batch_insert.columns
        )
    }
}

impl Iterator for SingleInsert {
    type Item = String;
    fn next(&mut self) -> Option<Self::Item> {
        if self.count == 0 {
            return None;
        }
        self.count -= 1;
        let v = self.batch_insert.row_values();
        if self.count != 0 {
            return Some(format!("({v}),\n"));
        }
        Some(format!("({v});"))
    }
}
