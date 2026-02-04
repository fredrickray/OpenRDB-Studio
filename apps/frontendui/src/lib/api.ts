// Types matching Rust backend
export interface ConnectionConfig {
    host: string
    port: number
    username: string
    password: string
    database: string
    ssl_required: boolean
}

export interface ConnectionTestResult {
    success: boolean
    message: string
    server_version: string | null
}

export interface ConnectionInfo {
    id: string
    host: string
    port: number
    database: string
    username: string
    connected_at: string
}

export interface TableInfo {
    schema: string | null
    name: string | null
}

export interface QueryResult {
    columns: string[]
    rows: string[][]
}

export interface DatabaseInfo {
    name: string
    size: string | null
    owner: string | null
}

export interface ColumnInfo {
    name: string | null
    data_type: string | null
    is_nullable: boolean
    default_value: string | null
    is_primary_key: boolean
    is_foreign_key: boolean
}

export interface TableDataResult {
    columns: string[]
    rows: (string | null)[][]
    total_rows: number
    page: number
    limit: number
}

// Check if we're running in Tauri
const isTauri = typeof window !== 'undefined' && '__TAURI__' in window

// Dynamic import for Tauri invoke
let invoke: ((cmd: string, args?: Record<string, unknown>) => Promise<unknown>) | null = null

if (isTauri) {
    import('@tauri-apps/api/core').then((module) => {
        invoke = module.invoke
    }).catch((e) => {
        console.warn('Failed to load Tauri API:', e)
    })
}

// Helper to call invoke with fallback
async function callTauri<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
    if (!invoke) {
        // Try to load it dynamically
        try {
            const module = await import('@tauri-apps/api/core')
            invoke = module.invoke
        } catch (e) {
            throw new Error('Tauri API not available. Make sure you are running in the Tauri app.')
        }
    }
    return invoke(cmd, args) as Promise<T>
}

// API functions
export const api = {
    /**
     * Test a PostgreSQL connection without storing it
     */
    async testConnection(config: ConnectionConfig): Promise<ConnectionTestResult> {
        return callTauri<ConnectionTestResult>('test_connection', { config })
    },

    /**
     * Establish and store a connection
     */
    async connect(config: ConnectionConfig): Promise<ConnectionInfo> {
        return callTauri<ConnectionInfo>('connect', { config })
    },

    /**
     * Disconnect and remove a connection
     */
    async disconnect(connectionId: string): Promise<boolean> {
        return callTauri<boolean>('disconnect', { connectionId })
    },

    /**
     * List all active connections
     */
    async listConnections(): Promise<ConnectionInfo[]> {
        return callTauri<ConnectionInfo[]>('list_connections')
    },

    /**
     * List tables for a connection
     */
    async listTables(connectionId: string): Promise<TableInfo[]> {
        return callTauri<TableInfo[]>('list_tables', { connectionId })
    },

    /**
     * List columns for a specific table
     */
    async listColumns(connectionId: string, schema: string, table: string): Promise<ColumnInfo[]> {
        return callTauri<ColumnInfo[]>('list_columns', { connectionId, schema, table })
    },

    /**
     * Get paginated table data
     */
    async getTableData(connectionId: string, schema: string, table: string, page: number, limit: number): Promise<TableDataResult> {
        return callTauri<TableDataResult>('get_table_data', { connectionId, schema, table, page, limit })
    },

    /**
     * Execute a SQL query
     */
    async executeQuery(connectionId: string, sql: string): Promise<QueryResult> {
        return callTauri<QueryResult>('execute_query', { connectionId, sql })
    },

    /**
     * Ping the backend (for testing)
     */
    async ping(): Promise<string> {
        return callTauri<string>('ping')
    },

    /**
     * List available databases
     */
    async listDatabases(config: ConnectionConfig): Promise<DatabaseInfo[]> {
        return callTauri<DatabaseInfo[]>('list_databases', { config })
    }
}

