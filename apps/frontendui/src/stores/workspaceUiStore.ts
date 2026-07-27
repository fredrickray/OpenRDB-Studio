import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface WorkspaceUiStore {
    sidebarWidth: number
    sidebarCollapsed: boolean
    connectionsSidebarWidth: number
    setSidebarWidth: (width: number) => void
    setSidebarCollapsed: (collapsed: boolean) => void
    setConnectionsSidebarWidth: (width: number) => void
}

export const useWorkspaceUiStore = create<WorkspaceUiStore>()(
    persist(
        (set) => ({
            sidebarWidth: 256,
            sidebarCollapsed: false,
            connectionsSidebarWidth: 288,
            setSidebarWidth: (width) => set({ sidebarWidth: width }),
            setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
            setConnectionsSidebarWidth: (width) => set({ connectionsSidebarWidth: width }),
        }),
        { name: 'openrdb-workspace-ui' }
    )
)
