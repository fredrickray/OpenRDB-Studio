import { create } from 'zustand'
import { api } from '@/lib/api'
import type { ConnectionConfig, ConnectionInfo, ConnectionTestResult, DatabaseInfo } from '@/lib/api'

export interface Connection {
    id: string
    name: string
    host: string
    port: number
    username: string
    password: string
    database: string
    sslRequired: boolean
    readOnly: boolean
    color: 'red' | 'yellow' | 'purple' | 'blue' | 'green'
    status: 'connected' | 'disconnected' | 'testing' | 'connecting' | 'error'
    backendId?: string // ID from backend for active connection
    errorMessage?: string
    serverVersion?: string
}

// Fields to persist (exclude runtime-only fields)
interface SavedConnection {
    id: string
    name: string
    host: string
    port: number
    username: string
    password: string
    database: string
    sslRequired: boolean
    readOnly: boolean
    color: 'red' | 'yellow' | 'purple' | 'blue' | 'green'
}

interface ConnectionStore {
    connections: Connection[]
    activeConnectionId: string | null
    isModalOpen: boolean
    editingConnection: Connection | null
    isLoaded: boolean

    // Actions
    addConnection: (conn: Omit<Connection, 'id'>) => void
    updateConnection: (id: string, conn: Partial<Connection>) => void
    deleteConnection: (id: string) => void
    setActiveConnection: (id: string | null) => void
    openModal: (conn?: Connection) => void
    closeModal: () => void
    loadSavedConnections: () => Promise<void>

    // Backend integration actions
    testConnection: (id: string) => Promise<ConnectionTestResult>
    connectToDatabase: (id: string) => Promise<ConnectionInfo | null>
    disconnectFromDatabase: (id: string) => Promise<boolean>
    listDatabases: (id: string) => Promise<{ success: boolean; databases: DatabaseInfo[]; message?: string }>
}

// Helper to convert store Connection to API ConnectionConfig
function toConnectionConfig(conn: Connection): ConnectionConfig {
    return {
        host: conn.host,
        port: conn.port,
        username: conn.username,
        password: conn.password,
        database: conn.database,
        ssl_required: conn.sslRequired,
    }
}

// Helper to convert Connection to saveable format (strip runtime fields)
function toSavedConnection(conn: Connection): SavedConnection {
    return {
        id: conn.id,
        name: conn.name,
        host: conn.host,
        port: conn.port,
        username: conn.username,
        password: conn.password,
        database: conn.database,
        sslRequired: conn.sslRequired,
        readOnly: conn.readOnly,
        color: conn.color,
    }
}

// Helper to convert saved connection back to full Connection
function fromSavedConnection(saved: SavedConnection): Connection {
    return {
        ...saved,
        status: 'disconnected',
    }
}

// Persist connections to disk (fire-and-forget)
async function persistToDisk(connections: Connection[]) {
    try {
        const saved = connections.map(toSavedConnection)
        await api.saveConnections(JSON.stringify(saved))
    } catch (error) {
        console.error('Failed to save connections:', error)
    }
}

export const useConnectionStore = create<ConnectionStore>((set, get) => ({
    connections: [],
    activeConnectionId: null,
    isModalOpen: false,
    editingConnection: null,
    isLoaded: false,

    // Load saved connections from disk
    loadSavedConnections: async () => {
        try {
            const json = await api.loadConnections()
            const saved: SavedConnection[] = JSON.parse(json)
            const connections = saved.map(fromSavedConnection)
            set({ connections, isLoaded: true })
        } catch (error) {
            console.error('Failed to load connections:', error)
            set({ connections: [], isLoaded: true })
        }
    },

    addConnection: (conn) => {
        const newConn = { ...conn, id: crypto.randomUUID() }
        set((state) => {
            const connections = [...state.connections, newConn]
            persistToDisk(connections)
            return { connections }
        })
    },

    updateConnection: (id, updates) => {
        set((state) => {
            const connections = state.connections.map((conn) =>
                conn.id === id ? { ...conn, ...updates } : conn
            )
            // Only persist if non-runtime fields changed
            const hasConfigChange = updates.name !== undefined || updates.host !== undefined ||
                updates.port !== undefined || updates.username !== undefined ||
                updates.password !== undefined || updates.database !== undefined ||
                updates.sslRequired !== undefined || updates.readOnly !== undefined ||
                updates.color !== undefined
            if (hasConfigChange) {
                persistToDisk(connections)
            }
            return { connections }
        })
    },

    deleteConnection: (id) => {
        set((state) => {
            const connections = state.connections.filter((conn) => conn.id !== id)
            persistToDisk(connections)
            return {
                connections,
                activeConnectionId:
                    state.activeConnectionId === id ? null : state.activeConnectionId,
            }
        })
    },

    setActiveConnection: (id) => set({ activeConnectionId: id }),

    openModal: (conn) =>
        set({
            isModalOpen: true,
            editingConnection: conn || null,
        }),

    closeModal: () =>
        set({
            isModalOpen: false,
            editingConnection: null,
        }),

    // Test connection without connecting
    testConnection: async (id) => {
        const connection = get().connections.find((c) => c.id === id)
        if (!connection) {
            return { success: false, message: 'Connection not found', server_version: null }
        }

        // Set status to testing
        set((state) => ({
            connections: state.connections.map((c) =>
                c.id === id ? { ...c, status: 'testing' as const, errorMessage: undefined } : c
            ),
        }))

        try {
            const result = await api.testConnection(toConnectionConfig(connection))

            // Update status based on result
            set((state) => ({
                connections: state.connections.map((c) =>
                    c.id === id
                        ? {
                            ...c,
                            status: result.success ? 'disconnected' : 'error',
                            errorMessage: result.success ? undefined : result.message,
                            serverVersion: result.server_version || undefined,
                        }
                        : c
                ),
            }))

            return result
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            set((state) => ({
                connections: state.connections.map((c) =>
                    c.id === id ? { ...c, status: 'error' as const, errorMessage: message } : c
                ),
            }))
            return { success: false, message, server_version: null }
        }
    },

    // Connect to database
    connectToDatabase: async (id) => {
        const connection = get().connections.find((c) => c.id === id)
        if (!connection) return null

        // Set status to connecting
        set((state) => ({
            connections: state.connections.map((c) =>
                c.id === id ? { ...c, status: 'connecting' as const, errorMessage: undefined } : c
            ),
        }))

        try {
            const info = await api.connect(toConnectionConfig(connection))

            // Update with connected status and backend ID
            set((state) => ({
                connections: state.connections.map((c) =>
                    c.id === id
                        ? { ...c, status: 'connected' as const, backendId: info.id, errorMessage: undefined }
                        : c
                ),
                activeConnectionId: id,
            }))

            return info
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            set((state) => ({
                connections: state.connections.map((c) =>
                    c.id === id ? { ...c, status: 'error' as const, errorMessage: message } : c
                ),
            }))
            return null
        }
    },

    // Disconnect from database
    disconnectFromDatabase: async (id) => {
        const connection = get().connections.find((c) => c.id === id)
        if (!connection || !connection.backendId) return false

        try {
            await api.disconnect(connection.backendId)

            set((state) => ({
                connections: state.connections.map((c) =>
                    c.id === id
                        ? { ...c, status: 'disconnected' as const, backendId: undefined, errorMessage: undefined }
                        : c
                ),
            }))

            return true
        } catch (error) {
            return false
        }
    },

    // List available databases
    listDatabases: async (id) => {
        const connection = get().connections.find((c) => c.id === id)
        if (!connection) {
            return { success: false, databases: [], message: 'Connection not found' }
        }

        try {
            const databases = await api.listDatabases(toConnectionConfig(connection))
            return { success: true, databases }
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            return { success: false, databases: [], message }
        }
    },
}))

// Auto-load connections when the store is first used
useConnectionStore.getState().loadSavedConnections()
