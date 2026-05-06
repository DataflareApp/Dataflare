use serde::Serialize;
use sqlparser::dialect::Dialect;
use sqlparser::tokenizer::Token;
use sqlparser::tokenizer::Tokenizer;

#[derive(Debug, Serialize, Clone, Copy, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct StatementPosition {
    start_line: u64,
    start_column: u64,
    end_line: u64,
    end_column: u64,
}

const MAX: u64 = 9007199254740991;

pub fn statements_position(dialect: &dyn Dialect, sql: &str) -> Result<Vec<StatementPosition>, ()> {
    let tokens = Tokenizer::new(dialect, sql)
        .tokenize_with_location()
        .map_err(|_| ())?;

    let mut positions = Vec::new();

    let tokens = tokens
        .split_inclusive(|token| token == &Token::SemiColon)
        .filter(|items| !(items.len() == 1 && matches!(items[0].token, Token::SemiColon)));

    for items in tokens {
        if let Some(first) = items
            .iter()
            .find(|item| !matches!(item.token, Token::Whitespace(_)))
        {
            if let Some(last) = items
                .iter()
                .rfind(|item| !matches!(item.token, Token::Whitespace(_)))
            {
                positions.push(StatementPosition {
                    start_line: first.span.start.line,
                    start_column: first.span.start.column,
                    end_line: last.span.end.line,
                    end_column: last.span.end.column,
                });
            }
        }
    }

    // NOTE:
    // If the user types quickly at the end of the editor, the cursor change causes statement highlighting to flicker
    // This is because the old positions are used before the new statement parsing returns, but the old positions don't include the cursor position
    // This is fundamentally a frontend issue, but here we can avoid it by setting the last statement's end position to a large value
    if let Some(last) = positions.last_mut() {
        last.end_column = MAX;
    }

    Ok(positions)
}

#[cfg(test)]
mod tests {
    use sqlparser::dialect::SQLiteDialect;

    use super::*;

    fn test(sql: &str, expected: Vec<((u64, u64), (u64, u64))>) {
        let actual = statements_position(&SQLiteDialect {}, sql)
            .unwrap()
            .into_iter()
            .map(|p| ((p.start_line, p.start_column), (p.end_line, p.end_column)))
            .collect::<Vec<_>>();
        assert_eq!(actual, expected);
    }

    #[test]
    fn test_position() {
        test("", vec![]);
        test(";", vec![]);
        test(";;;", vec![]);
        test("abc", vec![((1, 1), (1, MAX))]);
        test("abc;", vec![((1, 1), (1, MAX))]);
        test("abc;abc", vec![((1, 1), (1, 5)), ((1, 5), (1, MAX))]);
        test("abc;\nabc", vec![((1, 1), (1, 5)), ((2, 1), (2, MAX))]);
        test("SELECT 1;", vec![((1, 1), (1, MAX))]);
        test("SELECT 1; ", vec![((1, 1), (1, MAX))]);
        test("-- Comment\nSELECT 1;", vec![((2, 1), (2, MAX))]);
        test("SELECT 1; --Comment", vec![((1, 1), (1, MAX))]);
        test(
            "SELECT 1; SELECT 2;",
            vec![((1, 1), (1, 10)), ((1, 11), (1, MAX))],
        );
        test(
            "SELECT 1; \nSELECT 2;",
            vec![((1, 1), (1, 10)), ((2, 1), (2, MAX))],
        );
        test(
            "SELECT 1; \n--Comment\nSELECT 2;",
            vec![((1, 1), (1, 10)), ((3, 1), (3, MAX))],
        );
    }
}
