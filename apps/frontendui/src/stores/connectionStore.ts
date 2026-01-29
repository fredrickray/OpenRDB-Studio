import { create } from 'zustand'
import { api } from '@/lib/api'
import type { ConnectionConfig, ConnectionInfo, ConnectionTestResult } from '@/lib/api'

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

interface ConnectionStore {
    connections: Connection[]
    activeConnectionId: string | null
    isModalOpen: boolean
    editingConnection: Connection | null

    // Actions
    addConnection: (conn: Omit<Connection, 'id'>) => void
    updateConnection: (id: string, conn: Partial<Connection>) => void
    deleteConnection: (id: string) => void
    setActiveConnection: (id: string | null) => void
    openModal: (conn?: Connection) => void
    closeModal: () => void

    // Backend integration actions
    testConnection: (id: string) => Promise<ConnectionTestResult>
    connectToDatabase: (id: string) => Promise<boolean>
    disconnectFromDatabase: (id: string) => Promise<boolean>
}

// Sample connections for demo
const sampleConnections: Connection[] = [
    {
        id: '1',
        name: 'Local Postgres',
        host: 'localhost',
        port: 5432,
        username: 'postgres',
        password: 'password',
        database: 'main_production',
        sslRequired: false,
        readOnly: false,
        color: 'red',
        status: 'disconnected',
    },
    {
        id: '2',
        name: 'Production MySQL',
        host: '192.168.1.100',
        port: 3306,
        username: 'admin',
        password: 'secret',
        database: 'production_db',
        sslRequired: true,
        readOnly: false,
        color: 'yellow',
        status: 'disconnected',
    },
    {
        id: '3',
        name: 'AWS Staging Replica',
        host: 'rds.example.aws.com',
        port: 5432,
        username: 'readonly',
        password: 'readonly123',
        database: 'staging',
        sslRequired: true,
        readOnly: true,
        color: 'purple',
        status: 'disconnected',
    },
]

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

export const useConnectionStore = create<ConnectionStore>((set, get) => ({
    connections: sampleConnections,
    activeConnectionId: null,
    isModalOpen: false,
    editingConnection: null,

    addConnection: (conn) =>
        set((state) => ({
            connections: [
                ...state.connections,
                { ...conn, id: crypto.randomUUID() },
            ],
        })),

    updateConnection: (id, updates) =>
        set((state) => ({
            connections: state.connections.map((conn) =>
                conn.id === id ? { ...conn, ...updates } : conn
            ),
        })),

    deleteConnection: (id) =>
        set((state) => ({
            connections: state.connections.filter((conn) => conn.id !== id),
            activeConnectionId:
                state.activeConnectionId === id ? null : state.activeConnectionId,
        })),

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
        if (!connection) return false

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

            return true
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            set((state) => ({
                connections: state.connections.map((c) =>
                    c.id === id ? { ...c, status: 'error' as const, errorMessage: message } : c
                ),
            }))
            return false
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
}))
