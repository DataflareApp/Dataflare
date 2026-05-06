use sqlformat::{FormatOptions, Indent, QueryParams};
use sqlparser::{dialect::Dialect, parser::Parser};

pub fn format(sql: String) -> String {
    sqlformat::format(
        &sql,
        &QueryParams::None,
        &FormatOptions {
            indent: Indent::Spaces(2),
            uppercase: Some(true),
            lines_between_queries: 2,
            ignore_case_convert: None,
            ..Default::default()
        },
    )
}

pub fn minify(dialect: &dyn Dialect, sql: &str) -> Result<String, String> {
    if sql.trim().is_empty() {
        return Ok("".into());
    }
    if let Ok(ast) = Parser::parse_sql(dialect, sql) {
        if ast.is_empty() {
            return Ok(sql.into());
        }
        let statements = ast
            .iter()
            .map(|stmt| format!("{};", stmt))
            .collect::<Vec<_>>()
            .join("\n");
        return Ok(statements);
    }
    // sqlparser requires SQL to be valid; for invalid SQL we fall back to sqlformat for now
    let options = FormatOptions {
        inline: true,
        uppercase: Some(true),
        lines_between_queries: 2,
        ignore_case_convert: None,
        ..Default::default()
    };
    let sql = sqlformat::format(&sql, &QueryParams::None, &options);
    Ok(sql)
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlparser::dialect::GenericDialect;

    #[test]
    fn test_format() {
        assert_eq!(format("".into()), "");
        assert_eq!(format("     ".into()), "");
        assert_eq!(format(";".into()), ";");
        assert_eq!(format("123".into()), "123");
        assert_eq!(format("1 2 3".into()), "1 2 3");
        assert_eq!(format("selECT".into()), "SELECT");
        assert_eq!(format("select x'ff'".into()), "SELECT\n  x'ff'");
        assert_eq!(
            format("SELECT 1;".into()),
            r#"
SELECT
  1;
"#
            .trim()
        );
        assert_eq!(
            format("SELECT * FROM users WHERE id = 1;".into()),
            r#"
SELECT
  *
FROM
  users
WHERE
  id = 1;
            "#
            .trim()
        );
        assert_eq!(
            format("insert into books (id, title) values (1, 'Rust');".into()),
            r#"
INSERT INTO
  books (id, title)
VALUES
  (1, 'Rust');
            "#
            .trim()
        );

        assert_eq!(
            format("update users set name = 'Alice' where id = 2;".into()),
            r#"
UPDATE
  users
SET
  name = 'Alice'
WHERE
  id = 2;
            "#
            .trim()
        );

        assert_eq!(
            format("delete from users where id = 3;".into()),
            r#"
DELETE FROM
  users
WHERE
  id = 3;
        "#
            .trim()
        );

        assert_eq!(
            format("select id, name from users order by name desc;".into()),
            r#"
SELECT
  id,
  name
FROM
  users
ORDER BY
  name DESC;
            "#
            .trim()
        );

        assert_eq!(
            format("select * from users; select * from books;".into()),
            r#"
SELECT
  *
FROM
  users;

SELECT
  *
FROM
  books;
            "#
            .trim()
        );
    }

    #[test]
    fn test_minify() {
        let dialect = GenericDialect {};
        assert_eq!(minify(&dialect, ""), Ok("".into()));
        assert_eq!(minify(&dialect, "   "), Ok("".into()));
        assert_eq!(minify(&dialect, ";"), Ok(";".into()));
        assert_eq!(minify(&dialect, " ; "), Ok(" ; ".into()));
        assert_eq!(
            minify(&dialect, "SELECT * FROm         users"),
            Ok("SELECT * FROM users;".into())
        );
        assert_eq!(
            minify(
                &dialect,
                "SELECT   id,   name   FROM   users   WHERE   id = 1"
            ),
            Ok("SELECT id, name FROM users WHERE id = 1;".into())
        );
        assert_eq!(
            minify(
                &dialect,
                "INSERT INTO \nbooks (id, title) VALUES (1, 'Rust')"
            ),
            Ok("INSERT INTO books (id, title) VALUES (1, 'Rust');".into())
        );
        assert_eq!(
            minify(&dialect, "UPDATE users \t set name = 'Alice' WHERE id = 2"),
            Ok("UPDATE users SET name = 'Alice' WHERE id = 2;".into())
        );
        assert_eq!(
            minify(&dialect, "DELETE FROM users WHERE id = 3"),
            Ok("DELETE FROM users WHERE id = 3;".into())
        );
        assert_eq!(
            minify(&dialect, "SELECT * FROM users; SELECT * FROM books"),
            Ok("SELECT * FROM users;\nSELECT * FROM books;".into())
        );
        assert_eq!(
            minify(
                &dialect,
                "SELECT   *   FROM   users  ;   INSERT   INTO   books   VALUES   (1, 'test')"
            ),
            Ok("SELECT * FROM users;\nINSERT INTO books VALUES (1, 'test');".into())
        );
        assert_eq!(
            minify(&dialect, "INVALID   SQL  SYNTAX"),
            Ok("INVALID SQL SYNTAX".into())
        );
    }
}
