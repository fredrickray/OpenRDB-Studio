/**
 * Engines the app can connect to.
 * Add an entry here only after the matching Rust adapter exists.
 * Saved connections without this field load as PostgreSQL.
 */
export type DatabaseEngine = 'postgres' | 'mysql'

export interface EngineDefaults {
    id: DatabaseEngine
    label: string
    port: number
    username: string
    /** Database used when the user has not chosen one yet. */
    database: string
}

export const DATABASE_ENGINES: EngineDefaults[] = [
    {
        id: 'postgres',
        label: 'PostgreSQL',
        port: 5432,
        username: 'postgres',
        database: 'postgres',
    },
    {
        id: 'mysql',
        label: 'MySQL',
        port: 3306,
        username: 'root',
        database: '',
    },
]

export function engineDefaults(engine: DatabaseEngine = 'postgres'): EngineDefaults {
    return DATABASE_ENGINES.find((item) => item.id === engine) ?? DATABASE_ENGINES[0]
}

export function normalizeEngine(value: unknown): DatabaseEngine {
    if (typeof value === 'string' && DATABASE_ENGINES.some((item) => item.id === value)) {
        return value as DatabaseEngine
    }
    return 'postgres'
}
