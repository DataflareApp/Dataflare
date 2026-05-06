use crate::{Query, QueryColumn, QueryValue};
use std::{sync::Arc, time::Duration};
use turso_sdk_kit::rsapi::{
    EncryptionOpts, Numeric, TursoConnection, TursoDatabase, TursoDatabaseConfig, TursoError,
    TursoStatement, TursoStatusCode, Value as TursoValue,
};

#[derive(Clone)]
pub struct Connection {
    inner: Arc<TursoConnection>,
}

impl Connection {
    // TODO: Support readonly: bool
    pub fn connect(
        path: impl AsRef<str>,
        encryption: Option<EncryptionOpts>,
    ) -> Result<Self, TursoError> {
        let features =
            "encryption,attach,custom_types,autovacuum,index_method,views,generated_columns";
        let config = TursoDatabaseConfig {
            path: path.as_ref().into(),
            experimental_features: Some(features.into()),
            async_io: false,
            encryption,
            vfs: None,
            io: None,
            db_file: None,
        };
        let db = TursoDatabase::new(config);
        let _ = db.open()?;
        let conn = db.connect()?;
        conn.set_busy_timeout(Duration::from_secs(10));
        Ok(Self { inner: conn })
    }

    pub fn query(&self, sql: impl AsRef<str>) -> Result<Query, TursoError> {
        let mut stmt = Statement::new(self.inner.prepare_single(sql)?);
        let stmt = stmt.as_mut();

        let cols = stmt.column_count();

        let mut columns = Vec::with_capacity(cols);
        for i in 0..cols {
            let name = stmt.column_name(i).unwrap().into();
            let datatype = stmt.column_decltype(i).unwrap_or_default();
            columns.push(QueryColumn { name, datatype });
        }

        let mut rows = Vec::new();
        loop {
            let status = stmt.step(None)?;
            match status {
                TursoStatusCode::Done => break,
                TursoStatusCode::Io => stmt.run_io()?,
                TursoStatusCode::Row => {
                    let mut row = Vec::with_capacity(cols);
                    for i in 0..cols {
                        let v = match stmt.row_value(i)?.to_owned() {
                            TursoValue::Null => QueryValue::Null,
                            TursoValue::Numeric(n) => match n {
                                Numeric::Integer(n) => QueryValue::I64(n),
                                Numeric::Float(n) => QueryValue::F64(f64::from(n)),
                            },
                            TursoValue::Text(v) => QueryValue::String(v.to_string()),
                            TursoValue::Blob(value) => QueryValue::Bytes(value),
                        };
                        row.push(v);
                    }
                    rows.push(row);
                }
            }
        }

        Ok(Query {
            columns,
            rows,
            rows_affected: stmt.n_change() as u64,
        })
    }

    pub fn execute(&self, sql: impl AsRef<str>) -> Result<(), TursoError> {
        let mut stmt = Statement::new(self.inner.prepare_single(sql)?);
        let stmt = stmt.as_mut();
        loop {
            let status = stmt.step(None)?;
            match status {
                TursoStatusCode::Done => break,
                TursoStatusCode::Io => stmt.run_io()?,
                TursoStatusCode::Row => {}
            }
        }
        Ok(())
    }

    pub fn execute_batch(&self, sql: impl AsRef<str>) -> Result<(), TursoError> {
        let mut sql = sql.as_ref();
        while let Some((stmt, offset)) = self.inner.prepare_first(sql)? {
            let mut stmt = Statement::new(stmt);
            let stmt = stmt.as_mut();
            loop {
                let status = stmt.step(None)?;
                match status {
                    TursoStatusCode::Done => break,
                    TursoStatusCode::Io => stmt.run_io()?,
                    TursoStatusCode::Row => {}
                }
            }
            sql = &sql[offset..];
        }
        Ok(())
    }

    pub fn transaction(&self, sqls: &[impl AsRef<str>]) -> Result<(), TursoError> {
        if sqls.is_empty() {
            return Ok(());
        }
        let forbidden = sqls.iter().any(|s| {
            let s = s.as_ref().trim_start().to_uppercase();
            s.starts_with("BEGIN")
                || s.starts_with("COMMIT")
                || s.starts_with("END")
                || s.starts_with("ROLLBACK")
                || s.starts_with("SAVEPOINT")
                || s.starts_with("RELEASE")
        });
        if forbidden {
            return Err(TursoError::Error(
                "transaction batch cannot contain transaction control statements".into(),
            ));
        }
        self.execute("BEGIN IMMEDIATE")?;
        for sql in sqls {
            if let Err(err) = self.execute(sql.as_ref()) {
                let _ = self.execute("ROLLBACK");
                return Err(err);
            }
        }
        self.execute("COMMIT")?;
        Ok(())
    }
}

struct Statement {
    inner: Box<TursoStatement>,
}

impl Drop for Statement {
    fn drop(&mut self) {
        let _ = self.inner.finalize(None);
    }
}

impl Statement {
    fn new(stmt: Box<TursoStatement>) -> Self {
        Self { inner: stmt }
    }

    fn as_mut(&mut self) -> &mut TursoStatement {
        &mut self.inner
    }
}

#[cfg(test)]
mod tests {}
