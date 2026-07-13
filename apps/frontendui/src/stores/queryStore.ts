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
    autoLimit: boolean
    /** Bumped on cancel so in-flight results are ignored */
    executeGeneration: number

    // Tab Actions
    addTab: () => void
    closeTab: (id: string) => void
    setActiveTab: (id: string) => void
    updateSql: (id: string, sql: string) => void
    renameTab: (id: string, name: string) => void

    // Query Actions
    setAutoLimit: (enabled: boolean) => void
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

/** Append LIMIT 1000 when auto-limit is on and the SQL has no LIMIT already. */
function applyAutoLimit(sql: string, autoLimit: boolean): string {
    if (!autoLimit) return sql
    const withoutComments = sql
        .replace(/--.*$/gm, '')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .trim()
    if (/\blimit\b/i.test(withoutComments)) return sql
    return `${sql.trimEnd()}\nLIMIT 1000`
}

export const useQueryStore = create<QueryStore>((set, get) => ({
    tabs: [defaultTab],
    activeTabId: 'default',
    results: {},
    isExecuting: false,
    executingTabId: null,
    autoLimit: true,
    executeGeneration: 0,

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

    setAutoLimit: (enabled) => set({ autoLimit: enabled }),

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

        const generation = get().executeGeneration + 1
        set({ isExecuting: true, executingTabId: tabId, executeGeneration: generation })
        const startTime = performance.now()
        const sqlToRun = applyAutoLimit(tab.sql, get().autoLimit)

        try {
            const apiResult = await api.executeQuery(connectionId, sqlToRun)

            // Cancelled while in flight — ignore result
            if (get().executeGeneration !== generation) {
                return
            }

            const executionTime = Math.round(performance.now() - startTime)

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
                tabs: state.tabs.map((t) =>
                    t.id === tabId ? { ...t, isModified: false } : t
                ),
            }))
        } catch (error) {
            if (get().executeGeneration !== generation) {
                return
            }

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
        // Bump generation so any in-flight result is ignored.
        // Server-side abort is not available yet; this stops waiting in the UI.
        set((state) => ({
            isExecuting: false,
            executingTabId: null,
            executeGeneration: state.executeGeneration + 1,
        }))
    },

    clearResults: (tabId) =>
        set((state) => {
            const { [tabId]: _, ...rest } = state.results
            return { results: rest }
        }),
}))
