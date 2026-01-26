import { create } from 'zustand'

export interface QueryTab {
    id: string
    name: string
    sql: string
    isModified: boolean
}

export interface QueryResult {
    columns: string[]
    rows: string[][]
    rowCount: number
    executionTime: number
    error?: string
    timestamp: Date
}

interface QueryStore {
    tabs: QueryTab[]
    activeTabId: string
    results: Record<string, QueryResult>
    isExecuting: boolean
    executingTabId: string | null

    // Tab Actions
    addTab: () => void
    closeTab: (id: string) => void
    setActiveTab: (id: string) => void
    updateSql: (id: string, sql: string) => void
    renameTab: (id: string, name: string) => void

    // Query Actions
    executeQuery: (tabId: string) => Promise<void>
    cancelQuery: () => void
    clearResults: (tabId: string) => void
}

// Sample data for demo
const sampleResults: QueryResult = {
    columns: ['order_id', 'order_id', 'username', 'email', 'total_amount', 'status'],
    rows: [
        ['10942', '1840_qbb', 'john_doe', 'john.doe@example.com', '$102.98', 'COMPLETE'],
        ['10943', '1820-3840', 'sarah_smith', 's.smith@provider.net', '$87.50', 'COMPLETE'],
        ['10944', 'a0de_oscer', 'mike_brown', 'm.brown@mail.com', '$1,209.00', 'COMPLETE'],
        ['10945', '1840', 'alex_lee', 'alex@alexsite.io', '$56.30', 'COMPLETE'],
    ],
    rowCount: 4,
    executionTime: 45,
    timestamp: new Date(),
}

const defaultTab: QueryTab = {
    id: 'default',
    name: 'user_report.sql',
    sql: `-- Get all product orders with user details
SELECT o.order_id, o.username, u.email, o.total_amount, o.status
FROM orders_archive o
JOIN auth_users u ON o.user_id = u.id
WHERE o.status = 'completed'
ORDER BY o.created_at DESC
LIMIT 1000;`,
    isModified: false,
}

export const useQueryStore = create<QueryStore>((set, get) => ({
    tabs: [defaultTab],
    activeTabId: 'default',
    results: { default: sampleResults },
    isExecuting: false,
    executingTabId: null,

    addTab: () => {
        const id = crypto.randomUUID()
        const tabNumber = get().tabs.length + 1
        const newTab: QueryTab = {
            id,
            name: `Scratchpad ${tabNumber}`,
            sql: '',
            isModified: false,
        }
        set((state) => ({
            tabs: [...state.tabs, newTab],
            activeTabId: id,
        }))
    },

    closeTab: (id) => {
        const { tabs, activeTabId } = get()
        if (tabs.length === 1) return // Don't close last tab

        const newTabs = tabs.filter((t) => t.id !== id)
        const newActiveId = activeTabId === id
            ? newTabs[newTabs.length - 1].id
            : activeTabId

        set({
            tabs: newTabs,
            activeTabId: newActiveId,
        })
    },

    setActiveTab: (id) => set({ activeTabId: id }),

    updateSql: (id, sql) =>
        set((state) => ({
            tabs: state.tabs.map((t) =>
                t.id === id ? { ...t, sql, isModified: true } : t
            ),
        })),

    renameTab: (id, name) =>
        set((state) => ({
            tabs: state.tabs.map((t) =>
                t.id === id ? { ...t, name } : t
            ),
        })),

    executeQuery: async (tabId) => {
        set({ isExecuting: true, executingTabId: tabId })

        // Simulate query execution
        await new Promise((resolve) => setTimeout(resolve, 1500))

        const tab = get().tabs.find((t) => t.id === tabId)
        if (!tab) {
            set({ isExecuting: false, executingTabId: null })
            return
        }

        // Mock result based on query
        const result: QueryResult = {
            columns: ['id', 'name', 'email', 'created_at'],
            rows: [
                ['1', 'John Doe', 'john@example.com', '2024-01-15'],
                ['2', 'Jane Smith', 'jane@example.com', '2024-01-16'],
                ['3', 'Bob Wilson', 'bob@example.com', '2024-01-17'],
            ],
            rowCount: 3,
            executionTime: Math.floor(Math.random() * 100) + 10,
            timestamp: new Date(),
        }

        set((state) => ({
            isExecuting: false,
            executingTabId: null,
            results: { ...state.results, [tabId]: result },
        }))
    },

    cancelQuery: () => {
        set({ isExecuting: false, executingTabId: null })
    },

    clearResults: (tabId) =>
        set((state) => {
            const { [tabId]: _, ...rest } = state.results
            return { results: rest }
        }),
}))
