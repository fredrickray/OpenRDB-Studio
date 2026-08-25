import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface WorkspaceUiStore {
    sidebarWidth: number
    sidebarCollapsed: boolean
    connectionsSidebarWidth: number
    connectionsSidebarCollapsed: boolean
    setSidebarWidth: (width: number) => void
    setSidebarCollapsed: (collapsed: boolean) => void
    setConnectionsSidebarWidth: (width: number) => void
    setConnectionsSidebarCollapsed: (collapsed: boolean) => void
}

export const useWorkspaceUiStore = create<WorkspaceUiStore>()(
    persist(
        (set) => ({
            sidebarWidth: 256,
            sidebarCollapsed: false,
            connectionsSidebarWidth: 288,
            connectionsSidebarCollapsed: false,
            setSidebarWidth: (width) => set({ sidebarWidth: width }),
            setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
            setConnectionsSidebarWidth: (width) => set({ connectionsSidebarWidth: width }),
            setConnectionsSidebarCollapsed: (collapsed) =>
                set({ connectionsSidebarCollapsed: collapsed }),
        }),
        { name: 'openrdb-workspace-ui' }
    )
)
