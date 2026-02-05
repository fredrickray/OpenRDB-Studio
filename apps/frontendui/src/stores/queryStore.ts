import { create } from 'zustand'
import { api } from '@/lib/api'
import { useTableStore } from '@/stores/tableStore'

export interface QueryTab {
    id: string
    name: string
    sql: string
    isModified: boolean
}

export interface QueryResult {
    columns: string[]
    rows: (string | null)[][]
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

const defaultTab: QueryTab = {
    id: 'default',
    name: 'Query 1',
    sql: `-- Write your SQL query here
SELECT * FROM information_schema.tables
WHERE table_schema = 'public'
LIMIT 10;`,
    isModified: false,
}

export const useQueryStore = create<QueryStore>((set, get) => ({
    tabs: [defaultTab],
    activeTabId: 'default',
    results: {},
    isExecuting: false,
    executingTabId: null,

    addTab: () => {
        const id = crypto.randomUUID()
        const tabNumber = get().tabs.length + 1
        const newTab: QueryTab = {
            id,
            name: `Query ${tabNumber}`,
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
        // Get the connection ID from tableStore
        const connectionId = useTableStore.getState().activeConnectionId
        if (!connectionId) {
            const errorResult: QueryResult = {
                columns: [],
                rows: [],
                rowCount: 0,
                executionTime: 0,
                error: 'No database connection. Please connect to a database first.',
                timestamp: new Date(),
            }
            set((state) => ({
                results: { ...state.results, [tabId]: errorResult },
            }))
            return
        }

        const tab = get().tabs.find((t) => t.id === tabId)
        if (!tab || !tab.sql.trim()) {
            return
        }

        set({ isExecuting: true, executingTabId: tabId })
        const startTime = performance.now()

        try {
            const apiResult = await api.executeQuery(connectionId, tab.sql)
            const executionTime = Math.round(performance.now() - startTime)

            // Convert null values to display properly
            const rows = apiResult.rows.map(row =>
                row.map(cell => cell ?? null)
            )

            const result: QueryResult = {
                columns: apiResult.columns,
                rows,
                rowCount: apiResult.rows.length,
                executionTime,
                timestamp: new Date(),
            }

            set((state) => ({
                isExecuting: false,
                executingTabId: null,
                results: { ...state.results, [tabId]: result },
            }))
        } catch (error) {
            const executionTime = Math.round(performance.now() - startTime)
            const errorResult: QueryResult = {
                columns: [],
                rows: [],
                rowCount: 0,
                executionTime,
                error: error instanceof Error ? error.message : String(error),
                timestamp: new Date(),
            }

            set((state) => ({
                isExecuting: false,
                executingTabId: null,
                results: { ...state.results, [tabId]: errorResult },
            }))
        }
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
