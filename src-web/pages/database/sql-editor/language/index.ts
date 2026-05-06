import { LanguageHighLight, monaco } from '..'
import { SqlDatabaseType } from '../../../../tauri'

export const LANGUAGE_ID = 'sql'

monaco.languages.register({
    id: LANGUAGE_ID
})

monaco.languages.setLanguageConfiguration(LANGUAGE_ID, {
    comments: {
        lineComment: '--',
        blockComment: ['/*', '*/']
    },
    brackets: [
        ['{', '}'],
        ['[', ']'],
        ['(', ')']
    ],
    autoClosingPairs: [
        { open: '{', close: '}' },
        { open: '[', close: ']' },
        { open: '(', close: ')' },
        { open: '"', close: '"' },
        { open: "'", close: "'" }
    ],
    surroundingPairs: [
        { open: '{', close: '}' },
        { open: '[', close: ']' },
        { open: '(', close: ')' },
        { open: '"', close: '"' },
        { open: "'", close: "'" }
    ]
})

export const setMonarchTokensProvider = async (language: LanguageHighLight) => {
    let def: monaco.languages.IMonarchLanguage
    switch (language.databaseType) {
        case SqlDatabaseType.Postgres:
        case SqlDatabaseType.CockroachDB:
        case SqlDatabaseType.ClickHouse:
        case SqlDatabaseType.QuestDB:
        case SqlDatabaseType.Databend: {
            def = (await import('./postgres')).default
            break
        }
        case SqlDatabaseType.MySql:
        case SqlDatabaseType.MariaDB:
        case SqlDatabaseType.ManticoreSearch: {
            def = (await import('./mysql')).default
            break
        }
        case SqlDatabaseType.Databricks: {
            def = (await import('./databricks')).default
            break
        }
        case SqlDatabaseType.Sqlite:
        case SqlDatabaseType.MsSql:
        case SqlDatabaseType.Turso:
        case SqlDatabaseType.DuckDB:
        case SqlDatabaseType.Rqlite:
        case SqlDatabaseType.EchoLite:
        case SqlDatabaseType.SqlCipher:
        case SqlDatabaseType.CloudflareD1:
        case SqlDatabaseType.WorkersAnalyticsEngine:
        case SqlDatabaseType.R2Sql:
        case SqlDatabaseType.BigQuery:
        case SqlDatabaseType.Trino:
        case SqlDatabaseType.Presto: {
            def = (await import('./sql')).default
            break
        }
    }

    def['keywords'] = language.keywords
    def['builtinFunctions'] = language.functions

    monaco.languages.setMonarchTokensProvider(LANGUAGE_ID, def)
}
