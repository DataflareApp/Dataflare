use Keyword::*;
use serde::Serialize;
use sqlparser::dialect::Dialect;
use sqlparser::keywords::Keyword;
use sqlparser::tokenizer::{Token, Tokenizer};

// Extract the first two consecutive keywords from a SQL statement
fn split_keyword(dialect: &dyn Dialect, sql: &str) -> Option<(Keyword, Keyword)> {
    let rst = Tokenizer::new(dialect, sql).tokenize();
    if let Ok(tokens) = rst {
        let mut tokens = tokens
            .into_iter()
            .filter(|t| !matches!(t, Token::Whitespace(..)));
        if let (Some(a), Some(b)) = (tokens.next(), tokens.next()) {
            if let (Token::Word(a), Token::Word(b)) = (a, b) {
                return Some((a.keyword, b.keyword));
            }
        }
    }
    None
}

// Finer-grained control is possible in the future, but not needed for now
#[derive(Debug, PartialEq, Eq, Serialize)]
pub struct DdlType {
    pub table: bool,
    pub suggest: bool,
}

// TODO: This method is incomplete; it's just a basic version. Sometimes ALTER TABLE does not require a refresh
// For example, ClickHouse also uses ALTER TABLE to update data
#[rustfmt::skip]
pub fn ddl_type(dialect: &dyn Dialect, sqls: Vec<String>) -> DdlType {
    let mut ddl = DdlType {
        table: false,
        suggest: false,
    };
    for sql in sqls {
        let ks = match split_keyword(dialect, &sql) {
            Some(ks) => ks,
            None => continue,
        };
        match ks {
            (CREATE, TABLE) | (DROP, TABLE) | (RENAME, TABLE) | (ALTER, TABLE) |
            (CREATE, VIEW) | (DROP, VIEW) | (ALTER, VIEW) | (RENAME, VIEW) |
            (CREATE, DATABASE) | (DROP, DATABASE) | (RENAME, DATABASE) | (ALTER, DATABASE) | (ATTACH, DATABASE) | (DETACH, DATABASE) | (USE, DATABASE) | (SET, DATABASE) |
            (CREATE, SCHEMA) | (DROP, SCHEMA)| (RENAME, SCHEMA) | (ALTER, SCHEMA) | (SET, SCHEMA) | (USE, SCHEMA) |
            (USE, CATALOG) | (SET, CATALOG) | 
            (USE, NoKeyword) => {
                ddl.table = true;
                ddl.suggest = true;
                break;
            },
            (CREATE, FUNCTION) | (DROP, FUNCTION) | (ALTER, FUNCTION) | (RENAME, FUNCTION) |
            (CREATE, INDEX) | (DROP, INDEX) | (ALTER, INDEX) | (RENAME, INDEX) |
            (CREATE, SEARCH) | (DROP, SEARCH) | // BigQuery 'CREATE SEARCH INDEX'
            (CREATE, TYPE) | (DROP, TYPE) | (ALTER, TYPE) | (RENAME, TYPE) => {
                ddl.suggest = true;
            },
            _ => {}
        };
    }
    ddl
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::*;

    #[test]
    fn test_split_keyword() {
        assert_eq!(
            split_keyword(&ClickHouseDialect {}, "Use db"),
            Some((USE, NoKeyword))
        );
        assert_eq!(
            split_keyword(&PostgreSqlDialect {}, "UPDATE SET"),
            Some((UPDATE, SET))
        );
        assert_eq!(
            split_keyword(&SQLiteDialect {}, "CREATE TABLE abc"),
            Some((CREATE, TABLE))
        );
        assert_eq!(
            split_keyword(&DuckDbDialect {}, "ALTER TABLE -- Comment"),
            Some((ALTER, TABLE))
        );
        assert_eq!(
            split_keyword(&MySqlDialect {}, "\r -- Comment \nRENAME TABLE"),
            Some((RENAME, TABLE))
        );
        assert_eq!(
            split_keyword(&MsSqlDialect {}, "CREATE /* Comment */ DATABASE"),
            Some((CREATE, DATABASE))
        );
        assert_eq!(
            split_keyword(
                &MySqlDialect {},
                "/* Comment */ SELECT \r\n\n DATABASE DROP"
            ),
            Some((SELECT, DATABASE))
        );
    }

    #[test]
    fn test_ddl_type() {
        assert_eq!(
            ddl_type(&MySqlDialect {}, vec!["USE catalog db".into()]),
            DdlType {
                table: true,
                suggest: true
            }
        );
        assert_eq!(
            ddl_type(&MySqlDialect {}, vec!["sEt catalog db".into()]),
            DdlType {
                table: true,
                suggest: true
            }
        );
        assert_eq!(
            ddl_type(&MySqlDialect {}, vec!["USE db2".into()]),
            DdlType {
                table: true,
                suggest: true
            }
        );
        assert_eq!(
            ddl_type(&PostgreSqlDialect {}, vec!["CREATE DATABASE".into()]),
            DdlType {
                table: true,
                suggest: true
            }
        );
        assert_eq!(
            ddl_type(
                &PostgreSqlDialect {},
                vec!["DRop VIEW --commnet \n 12345".into()]
            ),
            DdlType {
                table: true,
                suggest: true
            }
        );
        assert_eq!(
            ddl_type(&PostgreSqlDialect {}, vec!["SET SCHEma".into()]),
            DdlType {
                table: true,
                suggest: true
            }
        );
        assert_eq!(
            ddl_type(&MySqlDialect {}, vec!["create type a".into()]),
            DdlType {
                table: false,
                suggest: true
            }
        );
        assert_eq!(
            ddl_type(
                &SQLiteDialect {},
                vec!["-- commnet \n CREATE -- comment \n typE abc".into()]
            ),
            DdlType {
                table: false,
                suggest: true
            }
        );
        assert_eq!(
            ddl_type(&DuckDbDialect {}, vec!["create function asd".into()]),
            DdlType {
                table: false,
                suggest: true
            }
        );
        assert_eq!(
            ddl_type(&DuckDbDialect {}, vec!["CREATE INDEX abc".into()]),
            DdlType {
                table: false,
                suggest: true
            }
        );
    }
}
