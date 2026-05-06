import { invoke } from '@tauri-apps/api/core'
import { SqlDatabaseType } from './database'

export interface StatementPosition {
    startLine: number
    startColumn: number
    endLine: number
    endColumn: number
}

export interface DdlType {
    table: boolean
    suggest: boolean
}

export class Sql {
    static format(sql: string): Promise<string> {
        return invoke<string>('format', {
            sql
        })
    }

    static minify(db: SqlDatabaseType, sql: string): Promise<string> {
        return invoke<string>('minify', {
            db,
            sql
        })
    }

    static statementsPosition(db: SqlDatabaseType, sql: string): Promise<StatementPosition[]> {
        return invoke('statements_position', {
            db,
            sql
        })
    }

    static statementReadonly(db: SqlDatabaseType, sql: string): Promise<boolean> {
        return invoke('statement_readonly', {
            db,
            sql
        })
    }

    static ddlType(db: SqlDatabaseType, sqls: string[]): Promise<DdlType> {
        return invoke('ddl_type', {
            db,
            sqls
        })
    }
}
