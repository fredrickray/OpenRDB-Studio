import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface WorkspaceUiStore {
    sidebarWidth: number
    sidebarCollapsed: boolean
    setSidebarWidth: (width: number) => void
    setSidebarCollapsed: (collapsed: boolean) => void
}

export const useWorkspaceUiStore = create<WorkspaceUiStore>()(
    persist(
        (set) => ({
            sidebarWidth: 256,
            sidebarCollapsed: false,
            setSidebarWidth: (width) => set({ sidebarWidth: width }),
            setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
        }),
        { name: 'openrdb-workspace-ui' }
    )
)
