use crate::utils::FirstCell;
use crate::{ChunkInsert, Database, Result, SqliteConfig};
use query::{Query, QueryColumn, Value};
use rusqlite::{Connection, OpenFlags, types::ValueRef};
use std::sync::Arc;
use std::time::Instant;
use tokio::sync::Mutex;

#[derive(Debug, Clone)]
pub struct SqliteConnection {
    conn: Arc<Mutex<Connection>>,
}

impl SqliteConnection {
    pub(crate) async fn test(config: SqliteConfig) -> Result<Option<String>> {
        let conn = Self::make_connection(config.path, config.readonly, config.initial)?;
        // Ensure it's a valid database
        conn.select("SELECT * FROM sqlite_master LIMIT 0;".into())
            .await?;
        conn.select("SELECT concat('SQLite version: ', sqlite_version());".into())
            .await?
            .first_cell_string()
            .map(Some)
    }

    pub(crate) async fn connect(config: SqliteConfig) -> Result<Database> {
        let conn = Self::make_connection(config.path, config.readonly, config.initial)?;
        Ok(Database::Sqlite(conn))
    }

    fn make_connection(path: String, readonly: bool, initial: Option<String>) -> Result<Self> {
        let mut flags = if readonly {
            OpenFlags::SQLITE_OPEN_READ_ONLY
        } else {
            OpenFlags::SQLITE_OPEN_READ_WRITE | OpenFlags::SQLITE_OPEN_CREATE
        };
        flags.set(OpenFlags::SQLITE_OPEN_NO_MUTEX, true);
        flags.set(OpenFlags::SQLITE_OPEN_URI, true);
        let conn = Connection::open_with_flags(&path, flags)?;
        if let Some(sql) = initial {
            conn.execute_batch(&sql)?;
        }
        Ok(Self {
            conn: Arc::new(Mutex::new(conn)),
        })
    }

    pub(crate) async fn select(&self, sql: String) -> Result<Vec<Vec<Value>>> {
        self.query(sql).await.map(|q| q.rows)
    }

    pub(crate) async fn execute(&self, sql: String) -> Result<()> {
        self.conn.lock().await.execute(&sql, ())?;
        Ok(())
    }

    pub(crate) async fn transaction(&self, sqls: Vec<String>) -> Result<()> {
        let mut conn = self.conn.lock().await;
        let tx = conn.transaction()?;
        for sql in &sqls {
            tx.execute(sql, [])?;
        }
        tx.commit()?;
        Ok(())
    }

    pub(crate) async fn query(&self, sql: String) -> Result<Query> {
        let conn = self.conn.lock().await;
        let now = Instant::now();

        let mut stmt = conn.prepare(&sql)?;

        let columns = stmt
            .columns()
            .into_iter()
            .map(|col| QueryColumn {
                name: col.name().into(),
                datatype: col.decl_type().unwrap_or_default().into(),
            })
            .collect::<Vec<_>>();

        let mut values = Vec::new();
        let mut rows = stmt.query(())?;
        while let Some(r) = rows.next()? {
            let mut row = Vec::with_capacity(columns.len());
            for i in 0..columns.len() {
                let v = decode(r.get_ref(i)?)?;
                row.push(v);
            }
            values.push(row);
        }

        Ok(Query {
            columns,
            rows: values,
            rows_affected: Some(conn.changes()),
            duration: now.elapsed().as_millis() as u32,
        })
    }

    pub(crate) async fn batch_insert(&self, insert: ChunkInsert) -> Result<()> {
        for sql in insert {
            self.execute(sql).await?;
        }
        Ok(())
    }
}

fn decode(v: ValueRef) -> Result<Value, rusqlite::Error> {
    let v = match v {
        ValueRef::Null => Value::Null,
        ValueRef::Integer(n) => Value::I64(n),
        ValueRef::Real(f) => Value::F64(f),
        ValueRef::Blob(b) => Value::from_bytes(b.into()),
        ValueRef::Text(t) => {
            // "Only UTF-8 'TEXT' is supported"
            match std::str::from_utf8(t) {
                Ok(s) => Value::String(s.into()),
                Err(err) => return Err(rusqlite::Error::from(err)),
            }
        }
    };
    Ok(v)
}
