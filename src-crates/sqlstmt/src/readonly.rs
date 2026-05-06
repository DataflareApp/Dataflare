use sqlparser::ast::Statement;
use sqlparser::dialect::Dialect;
use sqlparser::parser::Parser;

pub fn statement_readonly(dialect: &dyn Dialect, sql: &str) -> bool {
    let stmts = match Parser::parse_sql(dialect, sql) {
        Ok(stmts) => stmts,
        Err(_) => return false,
    };
    for stmt in stmts {
        if !read_only(&stmt) {
            return false;
        }
    }
    true
}

fn read_only(stmt: &Statement) -> bool {
    match stmt {
        Statement::Query(_) => true,
        Statement::Explain { .. } => true,
        Statement::ExplainTable { .. } => true,
        Statement::ShowDatabases { .. } => true,
        Statement::ShowSchemas { .. } => true,
        Statement::ShowTables { .. } => true,
        Statement::ShowColumns { .. } => true,
        Statement::ShowViews { .. } => true,
        Statement::ShowObjects(_) => true,
        Statement::ShowCollation { .. } => true,
        Statement::ShowCreate { .. } => true,
        Statement::ShowStatus { .. } => true,
        Statement::ShowVariable { .. } => true,
        Statement::ShowVariables { .. } => true,
        Statement::ShowFunctions { .. } => true,
        Statement::Use(_) => true,
        Statement::Fetch { .. } => true,
        Statement::Open(..) => true,
        Statement::Close { .. } => true,

        Statement::Insert(_) => false,
        Statement::Update { .. } => false,
        Statement::Delete(_) => false,
        Statement::Merge { .. } => false,

        Statement::CreateTable(_) => false,
        Statement::CreateView { .. } => false,
        Statement::CreateIndex(_) => false,
        Statement::CreateSchema { .. } => false,
        Statement::CreateDatabase { .. } => false,
        Statement::CreateFunction { .. } => false,
        Statement::CreateProcedure { .. } => false,
        Statement::CreateMacro { .. } => false,
        Statement::CreateSequence { .. } => false,
        Statement::CreateType { .. } => false,
        Statement::CreateExtension { .. } => false,
        Statement::CreateTrigger { .. } => false,
        Statement::CreateStage { .. } => false,
        Statement::CreatePolicy { .. } => false,
        Statement::CreateRole { .. } => false,
        Statement::CreateSecret { .. } => false,
        Statement::CreateConnector { .. } => false,
        Statement::CreateVirtualTable { .. } => false,
        Statement::CreateServer(..) => false,
        Statement::CreateDomain(..) => false,

        Statement::AlterTable { .. } => false,
        Statement::AlterView { .. } => false,
        Statement::AlterIndex { .. } => false,
        Statement::AlterType { .. } => false,
        Statement::AlterRole { .. } => false,
        Statement::AlterSession { .. } => false,
        Statement::AlterPolicy { .. } => false,
        Statement::AlterConnector { .. } => false,

        Statement::Drop { .. } => false,
        Statement::DropFunction { .. } => false,
        Statement::DropProcedure { .. } => false,
        Statement::DropTrigger { .. } => false,
        Statement::DropExtension { .. } => false,
        Statement::DropSecret { .. } => false,
        Statement::DropPolicy { .. } => false,
        Statement::DropConnector { .. } => false,
        Statement::DropDomain(..) => false,

        Statement::StartTransaction { .. } => false,
        Statement::Commit { .. } => false,
        Statement::Rollback { .. } => false,
        Statement::Savepoint { .. } => false,
        Statement::ReleaseSavepoint { .. } => false,

        Statement::Set(_) => false,
        Statement::Truncate { .. } => false,
        Statement::Grant { .. } => false,
        Statement::Revoke { .. } => false,
        Statement::Analyze { .. } => false,
        Statement::Msck { .. } => false,
        Statement::Directory { .. } => false,
        Statement::Call(_) => false,
        Statement::Copy { .. } => false,
        Statement::CopyIntoSnowflake { .. } => false,
        Statement::Declare { .. } => false,
        Statement::Prepare { .. } => false,
        Statement::Execute { .. } => false,
        Statement::Deallocate { .. } => false,
        Statement::Discard { .. } => false,
        Statement::Flush { .. } => false,
        Statement::Kill { .. } => false,
        Statement::Comment { .. } => false,
        Statement::Assert { .. } => false,
        Statement::Cache { .. } => false,
        Statement::UNCache { .. } => false,
        Statement::LockTables { .. } => false,
        Statement::UnlockTables => false,
        Statement::Pragma { .. } => false,
        Statement::Unload { .. } => false,
        Statement::OptimizeTable { .. } => false,
        Statement::AttachDatabase { .. } => false,
        Statement::AttachDuckDBDatabase { .. } => false,
        Statement::DetachDuckDBDatabase { .. } => false,
        Statement::Install { .. } => false,
        Statement::Load { .. } => false,
        Statement::LoadData { .. } => false,
        Statement::LISTEN { .. } => false,
        Statement::NOTIFY { .. } => false,
        Statement::UNLISTEN { .. } => false,
        Statement::RenameTable { .. } => false,
        Statement::RaisError { .. } => false,
        Statement::Print { .. } => false,
        Statement::Return { .. } => false,
        Statement::List(_) => true,
        Statement::Remove(_) => false,
        Statement::Deny(..) => false,
        Statement::Case(_) => false,
        Statement::If(_) => false,
        Statement::While(_) => false,
        Statement::Raise(_) => false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlparser::dialect::GenericDialect;

    #[test]
    fn test_statement_readonly_various_cases() {
        let dialect = GenericDialect {};

        assert!(statement_readonly(&dialect, "SELECT * FROM users"));
        assert!(statement_readonly(&dialect, "EXPLAIN SELECT * FROM users"));
        assert!(statement_readonly(&dialect, "SHOW TABLES"));
        assert!(statement_readonly(&dialect, "SHOW DATABASES"));
        assert!(statement_readonly(&dialect, "USE mydb"));

        assert!(!statement_readonly(
            &dialect,
            "INSERT INTO users VALUES (1, 'Alice')"
        ));
        assert!(!statement_readonly(
            &dialect,
            "UPDATE users SET name = 'Bob' WHERE id = 1"
        ));
        assert!(!statement_readonly(
            &dialect,
            "DELETE FROM users WHERE id = 1"
        ));
        assert!(!statement_readonly(&dialect, "CREATE TABLE test (id INT)"));
        assert!(!statement_readonly(&dialect, "DROP TABLE test"));
        assert!(!statement_readonly(
            &dialect,
            "ALTER TABLE users ADD COLUMN age INT"
        ));
        assert!(!statement_readonly(&dialect, "TRUNCATE TABLE users"));
        assert!(!statement_readonly(&dialect, "COMMIT"));
        assert!(!statement_readonly(&dialect, "ROLLBACK"));

        assert!(statement_readonly(&dialect, "SELECT 1; SHOW TABLES;"));

        assert!(!statement_readonly(
            &dialect,
            "SELECT 1; INSERT INTO users VALUES (2, 'Eve');"
        ));

        assert!(!statement_readonly(&dialect, "THIS IS NOT SQL"));

        assert!(statement_readonly(
            &dialect,
            "WITH cte AS (SELECT 1) SELECT * FROM cte"
        ));
    }
}
