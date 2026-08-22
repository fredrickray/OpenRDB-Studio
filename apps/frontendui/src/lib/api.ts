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

export interface ForeignKeyInfo {
    constraint_name: string
    from_schema: string
    from_table: string
    from_column: string
    to_schema: string
    to_table: string
    to_column: string
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
    async getTableData(
        connectionId: string,
        schema: string,
        table: string,
        page: number,
        limit: number,
        sortColumn?: string,
        sortDirection?: 'asc' | 'desc',
        filter?: string
    ): Promise<TableDataResult> {
        return callTauri<TableDataResult>('get_table_data', {
            connectionId,
            schema,
            table,
            page,
            limit,
            sortColumn: sortColumn || null,
            sortDirection: sortDirection || null,
            filter: filter || null,
        })
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
    },

    /**
     * Create a database on the server
     */
    async createDatabase(config: ConnectionConfig, name: string): Promise<boolean> {
        return callTauri<boolean>('create_database', { config, name })
    },

    /**
     * Update a single cell in a table
     */
    async updateRow(
        connectionId: string,
        schema: string,
        table: string,
        pkColumn: string,
        pkValue: string,
        column: string,
        newValue: string | null
    ): Promise<boolean> {
        return callTauri<boolean>('update_row', {
            connectionId,
            schema,
            table,
            pkColumn,
            pkValue,
            column,
            newValue
        })
    },

    /**
     * Insert a new row into a table
     */
    async insertRow(
        connectionId: string,
        schema: string,
        table: string,
        columns: string[],
        values: (string | null)[]
    ): Promise<boolean> {
        return callTauri<boolean>('insert_row', {
            connectionId,
            schema,
            table,
            columns,
            values
        })
    },

    /**
     * Delete rows from a table by primary key values
     */
    async deleteRows(
        connectionId: string,
        schema: string,
        table: string,
        pkColumn: string,
        pkValues: string[]
    ): Promise<number> {
        return callTauri<number>('delete_rows', {
            connectionId,
            schema,
            table,
            pkColumn,
            pkValues
        })
    },

    /**
     * Save connection configurations to disk
     */
    async saveConnections(connectionsJson: string): Promise<boolean> {
        return callTauri<boolean>('save_connections', { connectionsJson })
    },

    /**
     * Load saved connection configurations from disk
     */
    async loadConnections(): Promise<string> {
        return callTauri<string>('load_connections')
    },

    /**
     * Save a password to the OS keychain
     */
    async savePassword(connectionId: string, password: string): Promise<boolean> {
        return callTauri<boolean>('save_password', { connectionId, password })
    },

    /**
     * Get a password from the OS keychain
     */
    async getPassword(connectionId: string): Promise<string | null> {
        return callTauri<string | null>('get_password', { connectionId })
    },

    /**
     * Delete a password from the OS keychain
     */
    async deletePassword(connectionId: string): Promise<boolean> {
        return callTauri<boolean>('delete_password', { connectionId })
    },

    /**
     * List foreign key relationships for the connected database
     */
    async listForeignKeys(connectionId: string): Promise<ForeignKeyInfo[]> {
        return callTauri<ForeignKeyInfo[]>('list_foreign_keys', { connectionId })
    },
}

