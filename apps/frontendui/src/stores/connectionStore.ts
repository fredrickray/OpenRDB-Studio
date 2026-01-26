import { create } from 'zustand'

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
    status: 'connected' | 'disconnected' | 'error'
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

export const useConnectionStore = create<ConnectionStore>((set) => ({
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
}))
