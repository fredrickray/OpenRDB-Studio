import { create } from 'zustand'

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
    // State
    databases: Database[]
    selectedDatabase: string | null
    selectedTable: string | null
    tableData: TableRow[]
    currentPage: number
    rowsPerPage: number
    totalRows: number
    queryTime: number
    activeTab: 'data' | 'structure' | 'sql'
    filter: string

    // Actions
    setSelectedDatabase: (db: string | null) => void
    setSelectedTable: (table: string | null) => void
    setActiveTab: (tab: 'data' | 'structure' | 'sql') => void
    setCurrentPage: (page: number) => void
    setRowsPerPage: (rows: number) => void
    setFilter: (filter: string) => void
    refreshData: () => void
}

// Mock data for demonstration
const mockDatabases: Database[] = [
    {
        name: 'Inventory_DB',
        tables: [
            {
                name: 'products_table',
                schema: 'public',
                rowCount: 12403,
                columns: [
                    { name: 'id', type: 'uuid', nullable: false, defaultValue: 'gen_random_uuid()', isPrimaryKey: true, isForeignKey: false },
                    { name: 'name', type: 'varchar(255)', nullable: false, defaultValue: null, isPrimaryKey: false, isForeignKey: false },
                    { name: 'category', type: 'varchar(100)', nullable: true, defaultValue: null, isPrimaryKey: false, isForeignKey: false },
                    { name: 'stock', type: 'integer', nullable: false, defaultValue: '0', isPrimaryKey: false, isForeignKey: false },
                    { name: 'is_active', type: 'boolean', nullable: false, defaultValue: 'true', isPrimaryKey: false, isForeignKey: false },
                    { name: 'created_at', type: 'timestamp', nullable: false, defaultValue: 'now()', isPrimaryKey: false, isForeignKey: false },
                ],
            },
            {
                name: 'orders',
                schema: 'public',
                rowCount: 8542,
                columns: [
                    { name: 'id', type: 'uuid', nullable: false, defaultValue: 'gen_random_uuid()', isPrimaryKey: true, isForeignKey: false },
                    { name: 'product_id', type: 'uuid', nullable: false, defaultValue: null, isPrimaryKey: false, isForeignKey: true },
                    { name: 'quantity', type: 'integer', nullable: false, defaultValue: '1', isPrimaryKey: false, isForeignKey: false },
                    { name: 'status', type: 'varchar(50)', nullable: false, defaultValue: "'pending'", isPrimaryKey: false, isForeignKey: false },
                ],
            },
            {
                name: 'customers',
                schema: 'public',
                rowCount: 3200,
                columns: [
                    { name: 'id', type: 'uuid', nullable: false, defaultValue: 'gen_random_uuid()', isPrimaryKey: true, isForeignKey: false },
                    { name: 'name', type: 'varchar(255)', nullable: false, defaultValue: null, isPrimaryKey: false, isForeignKey: false },
                    { name: 'email', type: 'varchar(255)', nullable: false, defaultValue: null, isPrimaryKey: false, isForeignKey: false },
                ],
            },
        ],
    },
]

const mockTableData: TableRow[] = [
    { id: '8d72-4b2a', name: 'Quantum Laptop X1', category: 'Electronics', stock: 42, is_active: true, created_at: '2023-10-12 14:20' },
    { id: '1a2b-3c4d', name: 'Mechanical Keyboard', category: 'NULL', stock: 128, is_active: true, created_at: '2023-10-14 09:15' },
    { id: '9f8e-7d6c', name: 'UltraWide Monitor 34"', category: 'Peripherals', stock: 0, is_active: false, created_at: '2023-11-01 16:45' },
    { id: '4e2w-1q8z', name: 'Smart Desk Lamp', category: 'Home Office', stock: 85, is_active: true, created_at: '2023-11-05 11:30' },
    { id: '2y3t-9r5v', name: 'Ergonomic Chair Pro', category: 'Furniture', stock: 14, is_active: true, created_at: '2023-11-08 14:10' },
    { id: '6h7j-8k9l', name: 'Thunderbolt Dock', category: 'Peripherals', stock: 3, is_active: false, created_at: '2023-11-10 10:05' },
    { id: '0p1q-2r3s', name: 'Wireless Mouse Pro', category: 'Peripherals', stock: 156, is_active: true, created_at: '2023-11-12 08:30' },
    { id: '4t5u-6v7w', name: 'USB-C Hub 7-in-1', category: 'Electronics', stock: 67, is_active: true, created_at: '2023-11-15 15:45' },
]

export const useTableStore = create<TableStore>((set) => ({
    databases: mockDatabases,
    selectedDatabase: 'Inventory_DB',
    selectedTable: 'products_table',
    tableData: mockTableData,
    currentPage: 1,
    rowsPerPage: 20,
    totalRows: 12403,
    queryTime: 12,
    activeTab: 'data',
    filter: '',

    setSelectedDatabase: (db) => set({ selectedDatabase: db }),
    setSelectedTable: (table) => set({ selectedTable: table, currentPage: 1 }),
    setActiveTab: (tab) => set({ activeTab: tab }),
    setCurrentPage: (page) => set({ currentPage: page }),
    setRowsPerPage: (rows) => set({ rowsPerPage: rows, currentPage: 1 }),
    setFilter: (filter) => set({ filter }),
    refreshData: () => set({ queryTime: Math.floor(Math.random() * 20) + 5 }),
}))
