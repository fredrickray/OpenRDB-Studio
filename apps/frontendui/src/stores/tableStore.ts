import { create } from 'zustand'
import { api, type TableInfo, type ColumnInfo, type TableDataResult } from '@/lib/api'

export interface TableColumn {
    name: string
    type: string
    nullable: boolean
    defaultValue: string | null
    isPrimaryKey: boolean
    isForeignKey: boolean
}

export interface TableRow {
    id: string
    [key: string]: string | number | boolean | null
}

export interface Table {
    name: string
    schema: string
    columns: TableColumn[]
    rowCount: number
}

export interface Database {
    name: string
    tables: Table[]
}

interface TableStore {
    // Connection state
    activeConnectionId: string | null
    connectedDatabase: string | null

    // Data state
    tables: TableInfo[]
    selectedSchema: string | null
    selectedTable: string | null
    columns: ColumnInfo[]
    tableData: TableDataResult | null

    // Pagination
    currentPage: number
    rowsPerPage: number

    // UI State
    activeTab: 'data' | 'structure' | 'sql'
    filter: string
    isLoadingTables: boolean
    isLoadingColumns: boolean
    isLoadingData: boolean
    error: string | null

    // Actions
    setActiveConnection: (connectionId: string, database: string) => void
    clearConnection: () => void
    fetchTables: () => Promise<void>
    setSelectedTable: (schema: string | null, table: string | null) => void
    fetchColumns: () => Promise<void>
    fetchTableData: () => Promise<void>
    setActiveTab: (tab: 'data' | 'structure' | 'sql') => void
    setCurrentPage: (page: number) => void
    setRowsPerPage: (rows: number) => void
    setFilter: (filter: string) => void
    refreshData: () => Promise<void>
}

export const useTableStore = create<TableStore>((set, get) => ({
    // Connection state
    activeConnectionId: null,
    connectedDatabase: null,

    // Data state
    tables: [],
    selectedSchema: null,
    selectedTable: null,
    columns: [],
    tableData: null,

    // Pagination
    currentPage: 1,
    rowsPerPage: 20,

    // UI State
    activeTab: 'data',
    filter: '',
    isLoadingTables: false,
    isLoadingColumns: false,
    isLoadingData: false,
    error: null,

    setActiveConnection: (connectionId: string, database: string) => {
        set({
            activeConnectionId: connectionId,
            connectedDatabase: database,
            tables: [],
            selectedTable: null,
            selectedSchema: null,
            columns: [],
            tableData: null,
            error: null
        })
        // Auto-fetch tables
        get().fetchTables()
    },

    clearConnection: () => {
        set({
            activeConnectionId: null,
            connectedDatabase: null,
            tables: [],
            selectedTable: null,
            selectedSchema: null,
            columns: [],
            tableData: null,
            error: null
        })
    },

    fetchTables: async () => {
        const { activeConnectionId } = get()
        if (!activeConnectionId) return

        set({ isLoadingTables: true, error: null })
        try {
            const tables = await api.listTables(activeConnectionId)
            set({ tables, isLoadingTables: false })

            // Auto-select first table if available
            if (tables.length > 0) {
                const first = tables[0]
                get().setSelectedTable(first.schema, first.name)
            }
        } catch (error) {
            set({
                isLoadingTables: false,
                error: error instanceof Error ? error.message : 'Failed to fetch tables'
            })
        }
    },

    setSelectedTable: (schema: string | null, table: string | null) => {
        set({
            selectedSchema: schema,
            selectedTable: table,
            currentPage: 1,
            columns: [],
            tableData: null
        })

        if (schema && table) {
            get().fetchColumns()
            get().fetchTableData()
        }
    },

    fetchColumns: async () => {
        const { activeConnectionId, selectedSchema, selectedTable } = get()
        if (!activeConnectionId || !selectedSchema || !selectedTable) return

        set({ isLoadingColumns: true, error: null })
        try {
            const columns = await api.listColumns(activeConnectionId, selectedSchema, selectedTable)
            set({ columns, isLoadingColumns: false })
        } catch (error) {
            set({
                isLoadingColumns: false,
                error: error instanceof Error ? error.message : 'Failed to fetch columns'
            })
        }
    },

    fetchTableData: async () => {
        const { activeConnectionId, selectedSchema, selectedTable, currentPage, rowsPerPage } = get()
        if (!activeConnectionId || !selectedSchema || !selectedTable) return

        set({ isLoadingData: true, error: null })
        try {
            const tableData = await api.getTableData(
                activeConnectionId,
                selectedSchema,
                selectedTable,
                currentPage,
                rowsPerPage
            )
            set({ tableData, isLoadingData: false })
        } catch (error) {
            set({
                isLoadingData: false,
                error: error instanceof Error ? error.message : 'Failed to fetch table data'
            })
        }
    },

    setActiveTab: (tab) => set({ activeTab: tab }),

    setCurrentPage: (page) => {
        set({ currentPage: page })
        get().fetchTableData()
    },

    setRowsPerPage: (rows) => {
        set({ rowsPerPage: rows, currentPage: 1 })
        get().fetchTableData()
    },

    setFilter: (filter) => set({ filter }),

    refreshData: async () => {
        await get().fetchTableData()
    },
}))
