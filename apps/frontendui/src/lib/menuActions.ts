import type { NavigateFunction } from 'react-router-dom'
import { formatSql } from '@/lib/formatSql'
import { saveQueryLocally } from '@/lib/savedQueries'
import { useConnectionStore } from '@/stores/connectionStore'
import { useQueryStore } from '@/stores/queryStore'
import { useToastStore } from '@/stores/toastStore'
import { useWorkspaceUiStore } from '@/stores/workspaceUiStore'

export type MenuAction =
    | 'new_connection'
    | 'refresh_connections'
    | 'go_connections'
    | 'go_workspace'
    | 'go_query'
    | 'go_erd'
    | 'toggle_connections_sidebar'
    | 'toggle_explorer_sidebar'
    | 'query_new_tab'
    | 'query_run'
    | 'query_cancel'
    | 'query_format'
    | 'query_save'

export function handleMenuAction(action: MenuAction, navigate: NavigateFunction): void {
    const showToast = useToastStore.getState().showToast

    switch (action) {
        case 'new_connection':
            useConnectionStore.getState().openModal()
            break

        case 'refresh_connections': {
            const { connections, refreshDatabases } = useConnectionStore.getState()
            const expanded = connections.filter((c) => c.expanded)
            if (expanded.length === 0) {
                showToast('Expand a connection to refresh its databases', 'info')
                break
            }
            void Promise.all(expanded.map((c) => refreshDatabases(c.id))).then(() => {
                showToast(`Refreshed ${expanded.length} connection${expanded.length === 1 ? '' : 's'}`, 'success')
            })
            break
        }

        case 'go_connections':
            navigate('/connections')
            break

        case 'go_workspace':
            navigate('/workspace')
            break

        case 'go_query':
            navigate('/query')
            break

        case 'go_erd':
            navigate('/erd')
            break

        case 'toggle_connections_sidebar': {
            const { connectionsSidebarCollapsed, setConnectionsSidebarCollapsed } =
                useWorkspaceUiStore.getState()
            setConnectionsSidebarCollapsed(!connectionsSidebarCollapsed)
            break
        }

        case 'toggle_explorer_sidebar': {
            const { sidebarCollapsed, setSidebarCollapsed } = useWorkspaceUiStore.getState()
            setSidebarCollapsed(!sidebarCollapsed)
            break
        }

        case 'query_new_tab': {
            navigate('/query')
            useQueryStore.getState().addTab()
            break
        }

        case 'query_run': {
            navigate('/query')
            const { activeTabId, executeQuery } = useQueryStore.getState()
            void executeQuery(activeTabId)
            break
        }

        case 'query_cancel':
            useQueryStore.getState().cancelQuery()
            break

        case 'query_format': {
            navigate('/query')
            const { activeTabId, tabs, updateSql } = useQueryStore.getState()
            const tab = tabs.find((t) => t.id === activeTabId)
            if (!tab?.sql.trim()) {
                showToast('Nothing to format', 'info')
                break
            }
            try {
                updateSql(activeTabId, formatSql(tab.sql))
                showToast('SQL formatted', 'success')
            } catch (error) {
                showToast(
                    error instanceof Error ? error.message : 'Could not format SQL',
                    'error'
                )
            }
            break
        }

        case 'query_save': {
            navigate('/query')
            const { activeTabId, tabs } = useQueryStore.getState()
            const tab = tabs.find((t) => t.id === activeTabId)
            if (!tab?.sql.trim()) {
                showToast('Nothing to save', 'info')
                break
            }
            try {
                saveQueryLocally(tab)
                showToast(`Saved “${tab.name}” locally`, 'success')
            } catch {
                showToast('Failed to save query', 'error')
            }
            break
        }
    }
}

export function isMenuAction(value: string): value is MenuAction {
    return [
        'new_connection',
        'refresh_connections',
        'go_connections',
        'go_workspace',
        'go_query',
        'go_erd',
        'toggle_connections_sidebar',
        'toggle_explorer_sidebar',
        'query_new_tab',
        'query_run',
        'query_cancel',
        'query_format',
        'query_save',
    ].includes(value)
}
