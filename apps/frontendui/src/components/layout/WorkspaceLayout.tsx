import type { ReactNode } from "react"
import { WorkspaceSidebar } from "@/components/workspace/WorkspaceSidebar"
import { StatusBar } from "@/components/workspace/StatusBar"
import { AppLogo } from "@/components/AppLogo"
import { useTableStore } from "@/stores/tableStore"
import { useConnectionStore } from "@/stores/connectionStore"
import { useWorkspaceUiStore } from "@/stores/workspaceUiStore"
import { Button } from "@/components/ui/button"
import { RefreshCw, Table, Columns, Code, Eye } from "lucide-react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { cn } from "@/lib/utils"

export type WorkspaceSection = 'data' | 'structure' | 'sql' | 'erd'

interface WorkspaceLayoutProps {
    section: WorkspaceSection
    children: ReactNode
    breadcrumbExtra?: ReactNode
    actions?: ReactNode
    onRefresh?: () => void
    refreshDisabled?: boolean
}

export function WorkspaceLayout({
    section,
    children,
    breadcrumbExtra,
    actions,
    onRefresh,
    refreshDisabled,
}: WorkspaceLayoutProps) {
    const {
        selectedTable,
        selectedSchema,
        connectedDatabase,
        setActiveTab,
        tableData,
        refreshData,
        activeConnectionId: backendId,
    } = useTableStore()
    const connections = useConnectionStore((s) => s.connections)
    const activeServer = connections.find((c) => c.backendId === backendId)
    const { sidebarWidth, sidebarCollapsed, setSidebarWidth, setSidebarCollapsed } = useWorkspaceUiStore()
    const navigate = useNavigate()
    const location = useLocation()

    const totalRows = tableData?.total_rows || 0

    const goData = () => {
        setActiveTab('data')
        if (location.pathname !== '/workspace') navigate('/workspace')
    }

    const goStructure = () => {
        setActiveTab('structure')
        if (location.pathname !== '/workspace') navigate('/workspace')
    }

    const goSql = () => navigate('/query')
    const goErd = () => navigate('/erd')

    const handleRefresh = () => {
        if (onRefresh) onRefresh()
        else refreshData()
    }

    return (
        <div className="flex h-screen bg-background">
            <WorkspaceSidebar
                width={sidebarWidth}
                isCollapsed={sidebarCollapsed}
                onWidthChange={setSidebarWidth}
                onCollapsedChange={setSidebarCollapsed}
            />

            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="h-10 border-b border-border flex items-center justify-between px-3 bg-card shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <AppLogo size="xs" />
                            <span className="text-sm font-semibold">OpenRDB Studio</span>
                        </div>
                        <nav className="flex items-center gap-1 text-sm">
                            <Link to="/" className="px-2 py-1 text-primary hover:underline">
                                Connections
                            </Link>
                        </nav>
                    </div>
                </header>

                <div className="h-12 border-b border-border flex items-center justify-between px-4 bg-card/50">
                    <div className="flex items-center gap-2 text-sm min-w-0">
                        {activeServer && (
                            <>
                                <span className="text-muted-foreground truncate">{activeServer.name}</span>
                                <span className="text-muted-foreground">/</span>
                            </>
                        )}
                        <span className="text-muted-foreground truncate">{connectedDatabase || 'Database'}</span>
                        {section === 'erd' ? (
                            <>
                                <span className="text-muted-foreground">/</span>
                                <span className="font-semibold">ERD View</span>
                            </>
                        ) : (
                            <>
                                {selectedSchema && (
                                    <>
                                        <span className="text-muted-foreground">/</span>
                                        <span className="text-muted-foreground">{selectedSchema}</span>
                                    </>
                                )}
                                {selectedTable && (
                                    <>
                                        <span className="text-muted-foreground">/</span>
                                        <span className="font-semibold">{selectedTable}</span>
                                    </>
                                )}
                                {section !== 'sql' && (
                                    <span className="text-muted-foreground text-xs ml-2 shrink-0">
                                        {totalRows > 0 ? `${totalRows.toLocaleString()} rows` : 'Select a table'}
                                    </span>
                                )}
                            </>
                        )}
                        {breadcrumbExtra}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleRefresh}
                            disabled={refreshDisabled}
                        >
                            <RefreshCw className="w-3 h-3 mr-1" />
                            Refresh
                        </Button>
                        {actions}
                    </div>
                </div>

                <div className="border-b border-border bg-card/30" role="tablist" aria-label="Workspace views">
                    <div className="flex items-center gap-1 px-4">
                        <button
                            role="tab"
                            aria-selected={section === 'data'}
                            onClick={goData}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                                section === 'data'
                                    ? "border-primary text-primary"
                                    : "border-transparent text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Table className="w-4 h-4" />
                            Data
                        </button>
                        <button
                            role="tab"
                            aria-selected={section === 'structure'}
                            onClick={goStructure}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                                section === 'structure'
                                    ? "border-primary text-primary"
                                    : "border-transparent text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Columns className="w-4 h-4" />
                            Structure
                        </button>
                        <button
                            role="tab"
                            aria-selected={section === 'sql'}
                            onClick={goSql}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                                section === 'sql'
                                    ? "border-primary text-primary"
                                    : "border-transparent text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Code className="w-4 h-4" />
                            SQL
                        </button>
                        <button
                            role="tab"
                            aria-selected={section === 'erd'}
                            onClick={goErd}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                                section === 'erd'
                                    ? "border-primary text-primary"
                                    : "border-transparent text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Eye className="w-4 h-4" />
                            ERD View
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden">
                    {children}
                </div>

                <StatusBar />
            </div>
        </div>
    )
}
