import { create } from 'zustand'
import { api } from '@/lib/api'
import type { ConnectionConfig, ConnectionInfo, ConnectionTestResult, DatabaseInfo } from '@/lib/api'
import { useToastStore } from '@/stores/toastStore'
import { friendlyDbError } from '@/lib/errors'

export type ConnectionColor = 'red' | 'yellow' | 'purple' | 'blue' | 'green' | 'none'

export interface Connection {
    id: string
    name: string
    host: string
    port: number
    username: string
    password: string
    /** Last-used / preferred database (optional; listing uses postgres bootstrap) */
    database: string
    sslRequired: boolean
    readOnly: boolean
    color: ConnectionColor
    favorite: boolean
    status: 'connected' | 'disconnected' | 'testing' | 'connecting' | 'error'
    backendId?: string
    errorMessage?: string
    serverVersion?: string
    /** UI: tree expanded */
    expanded?: boolean
    /** Cached database list for this server */
    databases?: DatabaseInfo[]
    isLoadingDatabases?: boolean
    /** Currently selected database name under this connection */
    activeDatabase?: string | null
}

interface SavedConnection {
    id: string
    name: string
    host: string
    port: number
    username: string
    database: string
    sslRequired: boolean
    readOnly: boolean
    color: ConnectionColor
    favorite?: boolean
}

interface ConnectionStore {
    connections: Connection[]
    activeConnectionId: string | null
    isModalOpen: boolean
    editingConnection: Connection | null
    isCreateDbModalOpen: boolean
    createDbConnectionId: string | null
    isLoaded: boolean

    addConnection: (conn: Omit<Connection, 'id' | 'status'> & { status?: Connection['status'] }) => string
    updateConnection: (id: string, conn: Partial<Connection>) => void
    deleteConnection: (id: string) => void
    setActiveConnection: (id: string | null) => void
    openModal: (conn?: Connection) => void
    closeModal: () => void
    openCreateDbModal: (connectionId: string) => void
    closeCreateDbModal: () => void
    loadSavedConnections: () => Promise<void>
    toggleExpanded: (id: string) => void
    setExpanded: (id: string, expanded: boolean) => void

    testConnection: (id: string) => Promise<ConnectionTestResult>
    /** Connect to a specific database under this server connection */
    connectToDatabase: (id: string, databaseName?: string) => Promise<ConnectionInfo | null>
    disconnectFromDatabase: (id: string) => Promise<boolean>
    refreshDatabases: (id: string) => Promise<{ success: boolean; databases: DatabaseInfo[]; message?: string }>
    listDatabases: (id: string) => Promise<{ success: boolean; databases: DatabaseInfo[]; message?: string }>
    createDatabase: (id: string, name: string) => Promise<{ success: boolean; message?: string }>
}

function toConnectionConfig(conn: Connection, databaseOverride?: string): ConnectionConfig {
    const database =
        (databaseOverride && databaseOverride.trim()) ||
        conn.database?.trim() ||
        'postgres'

    return {
        host: conn.host,
        port: conn.port,
        username: conn.username,
        password: conn.password,
        database,
        ssl_required: conn.sslRequired,
    }
}

function toSavedConnection(conn: Connection): SavedConnection {
    return {
        id: conn.id,
        name: conn.name,
        host: conn.host,
        port: conn.port,
        username: conn.username,
        database: conn.database,
        sslRequired: conn.sslRequired,
        readOnly: conn.readOnly,
        color: conn.color === 'none' ? 'blue' : conn.color,
        favorite: conn.favorite,
    }
}

async function persistToDisk(connections: Connection[]) {
    try {
        await Promise.all(
            connections.map((conn) =>
                api.savePassword(conn.id, conn.password).catch((err) => {
                    console.error(`Failed to save password for ${conn.name}:`, err)
                    useToastStore.getState().showToast(
                        `Could not save password for "${conn.name}" to the keychain.`,
                        'error'
                    )
                })
            )
        )

        const saved = connections.map(toSavedConnection)
        await api.saveConnections(JSON.stringify(saved))
    } catch (error) {
        console.error('Failed to save connections:', error)
        useToastStore.getState().showToast(
            error instanceof Error ? error.message : 'Failed to save connections',
            'error'
        )
    }
}

function sortConnections(connections: Connection[]): Connection[] {
    return [...connections].sort((a, b) => {
        if (a.favorite !== b.favorite) return a.favorite ? -1 : 1
        return a.name.localeCompare(b.name)
    })
}

export const useConnectionStore = create<ConnectionStore>((set, get) => ({
    connections: [],
    activeConnectionId: null,
    isModalOpen: false,
    editingConnection: null,
    isCreateDbModalOpen: false,
    createDbConnectionId: null,
    isLoaded: false,

    loadSavedConnections: async () => {
        try {
            const json = await api.loadConnections()
            const saved: SavedConnection[] = JSON.parse(json)

            const connections: Connection[] = await Promise.all(
                saved.map(async (s): Promise<Connection> => {
                    let password = ''
                    try {
                        password = (await api.getPassword(s.id)) || ''
                    } catch (err) {
                        console.error(`Failed to load password for ${s.name}:`, err)
                    }
                    return {
                        ...s,
                        color: s.color || 'blue',
                        favorite: s.favorite ?? false,
                        password,
                        status: 'disconnected',
                        expanded: false,
                        databases: [],
                        activeDatabase: s.database || null,
                    }
                })
            )

            set({ connections: sortConnections(connections), isLoaded: true })
        } catch (error) {
            console.error('Failed to load connections:', error)
            set({ connections: [], isLoaded: true })
        }
    },

    addConnection: (conn) => {
        const id = crypto.randomUUID()
        const newConn: Connection = {
            ...conn,
            id,
            status: conn.status || 'disconnected',
            favorite: conn.favorite ?? false,
            color: conn.color || 'blue',
            expanded: false,
            databases: [],
            activeDatabase: conn.database || null,
        }
        set((state) => {
            const connections = sortConnections([...state.connections, newConn])
            persistToDisk(connections)
            return { connections }
        })
        return id
    },

    updateConnection: (id, updates) => {
        set((state) => {
            const connections = sortConnections(
                state.connections.map((conn) =>
                    conn.id === id ? { ...conn, ...updates } : conn
                )
            )
            const hasConfigChange =
                updates.name !== undefined ||
                updates.host !== undefined ||
                updates.port !== undefined ||
                updates.username !== undefined ||
                updates.password !== undefined ||
                updates.database !== undefined ||
                updates.sslRequired !== undefined ||
                updates.readOnly !== undefined ||
                updates.color !== undefined ||
                updates.favorite !== undefined
            if (hasConfigChange) {
                persistToDisk(connections)
            }
            return { connections }
        })
    },

    deleteConnection: (id) => {
        api.deletePassword(id).catch((err) =>
            console.error('Failed to delete password from keychain:', err)
        )

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

    openCreateDbModal: (connectionId) =>
        set({
            isCreateDbModalOpen: true,
            createDbConnectionId: connectionId,
        }),

    closeCreateDbModal: () =>
        set({
            isCreateDbModalOpen: false,
            createDbConnectionId: null,
        }),

    toggleExpanded: (id) => {
        const conn = get().connections.find((c) => c.id === id)
        if (!conn) return
        const next = !conn.expanded
        get().setExpanded(id, next)
        if (next) {
            void get().refreshDatabases(id)
        }
    },

    setExpanded: (id, expanded) => {
        set((state) => ({
            connections: state.connections.map((c) =>
                c.id === id ? { ...c, expanded } : c
            ),
        }))
    },

    testConnection: async (id) => {
        const connection = get().connections.find((c) => c.id === id)
        if (!connection) {
            return { success: false, message: 'Connection not found', server_version: null }
        }

        set((state) => ({
            connections: state.connections.map((c) =>
                c.id === id ? { ...c, status: 'testing' as const, errorMessage: undefined } : c
            ),
        }))

        try {
            // Test against last-used DB or postgres
            const result = await api.testConnection(toConnectionConfig(connection))

            set((state) => ({
                connections: state.connections.map((c) =>
                    c.id === id
                        ? {
                              ...c,
                              status: result.success
                                  ? c.backendId
                                      ? 'connected'
                                      : 'disconnected'
                                  : 'error',
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

    connectToDatabase: async (id, databaseName) => {
        const connection = get().connections.find((c) => c.id === id)
        if (!connection) return null

        const targetDb = databaseName?.trim() || connection.database?.trim() || 'postgres'

        // Disconnect previous pool if switching DB on same connection
        if (connection.backendId) {
            try {
                await api.disconnect(connection.backendId)
            } catch {
                // ignore
            }
        }

        set((state) => ({
            connections: state.connections.map((c) =>
                c.id === id
                    ? {
                          ...c,
                          status: 'connecting' as const,
                          errorMessage: undefined,
                          backendId: undefined,
                      }
                    : c
            ),
        }))

        try {
            const info = await api.connect(toConnectionConfig(connection, targetDb))

            set((state) => {
                const connections = sortConnections(
                    state.connections.map((c) =>
                        c.id === id
                            ? {
                                  ...c,
                                  status: 'connected' as const,
                                  backendId: info.id,
                                  database: targetDb,
                                  activeDatabase: targetDb,
                                  errorMessage: undefined,
                                  expanded: true,
                              }
                            : c
                    )
                )
                persistToDisk(connections)
                return {
                    connections,
                    activeConnectionId: id,
                }
            })

            return info
        } catch (error) {
            const message = friendlyDbError(
                error instanceof Error ? error.message : String(error)
            )
            set((state) => ({
                connections: state.connections.map((c) =>
                    c.id === id ? { ...c, status: 'error' as const, errorMessage: message } : c
                ),
            }))
            useToastStore.getState().showToast(message, 'error')
            return null
        }
    },

    disconnectFromDatabase: async (id) => {
        const connection = get().connections.find((c) => c.id === id)
        if (!connection || !connection.backendId) return false

        try {
            await api.disconnect(connection.backendId)

            set((state) => ({
                connections: state.connections.map((c) =>
                    c.id === id
                        ? {
                              ...c,
                              status: 'disconnected' as const,
                              backendId: undefined,
                              activeDatabase: null,
                              errorMessage: undefined,
                          }
                        : c
                ),
            }))

            return true
        } catch {
            return false
        }
    },

    refreshDatabases: async (id) => {
        const connection = get().connections.find((c) => c.id === id)
        if (!connection) {
            return { success: false, databases: [], message: 'Connection not found' }
        }

        set((state) => ({
            connections: state.connections.map((c) =>
                c.id === id ? { ...c, isLoadingDatabases: true } : c
            ),
        }))

        try {
            const databases = await api.listDatabases(toConnectionConfig(connection, 'postgres'))
            set((state) => ({
                connections: state.connections.map((c) =>
                    c.id === id
                        ? { ...c, databases, isLoadingDatabases: false, errorMessage: undefined }
                        : c
                ),
            }))
            return { success: true, databases }
        } catch (error) {
            const message = friendlyDbError(
                error instanceof Error ? error.message : String(error)
            )
            set((state) => ({
                connections: state.connections.map((c) =>
                    c.id === id
                        ? { ...c, isLoadingDatabases: false, errorMessage: message }
                        : c
                ),
            }))
            return { success: false, databases: [], message }
        }
    },

    listDatabases: async (id) => get().refreshDatabases(id),

    createDatabase: async (id, name) => {
        const connection = get().connections.find((c) => c.id === id)
        if (!connection) {
            return { success: false, message: 'Connection not found' }
        }

        try {
            await api.createDatabase(toConnectionConfig(connection, 'postgres'), name.trim())
            await get().refreshDatabases(id)
            useToastStore.getState().showToast(`Database “${name.trim()}” created`, 'success')
            return { success: true }
        } catch (error) {
            const message = friendlyDbError(
                error instanceof Error ? error.message : String(error)
            )
            useToastStore.getState().showToast(message, 'error')
            return { success: false, message }
        }
    },
}))

useConnectionStore.getState().loadSavedConnections()
