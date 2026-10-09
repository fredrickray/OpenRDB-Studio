import { format, type SqlLanguage } from 'sql-formatter'
import type { DatabaseEngine } from '@/lib/engines'
import { useConnectionStore } from '@/stores/connectionStore'
import { useTableStore } from '@/stores/tableStore'

const SQL_LANGUAGE: Record<DatabaseEngine, SqlLanguage> = {
    postgres: 'postgresql',
    mysql: 'mysql',
}

export function formatSql(sql: string, engine: DatabaseEngine = 'postgres'): string {
    return format(sql, {
        language: SQL_LANGUAGE[engine],
        tabWidth: 2,
        keywordCase: 'upper',
    })
}

/** Format using the engine of the database the query editor is connected to. */
export function formatSqlForActiveConnection(sql: string): string {
    const backendId = useTableStore.getState().activeConnectionId
    const connection = useConnectionStore
        .getState()
        .connections.find((item) => item.backendId === backendId)
    return formatSql(sql, connection?.engine ?? 'postgres')
}
