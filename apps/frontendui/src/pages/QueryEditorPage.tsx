import { WorkspaceSidebar } from "@/components/workspace/WorkspaceSidebar"
import { StatusBar } from "@/components/workspace/StatusBar"
import { QueryTabs } from "@/components/query/QueryTabs"
import { QueryToolbar } from "@/components/query/QueryToolbar"
import { SqlEditor } from "@/components/query/SqlEditor"
import { ResultsPanel } from "@/components/query/ResultsPanel"
import { useTableStore } from "@/stores/tableStore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Database, RefreshCw, Search, Bell, Table, Columns, Code, Eye } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import { cn } from "@/lib/utils"

export function QueryEditorPage() {
    const {
        selectedTable,
        selectedSchema,
        connectedDatabase,
        setActiveTab,
        refreshData
    } = useTableStore()
    const navigate = useNavigate()

    const handleDataTab = () => {
        navigate('/workspace')
        setTimeout(() => setActiveTab('data'), 0)
    }

    const handleStructureTab = () => {
        navigate('/workspace')
        setTimeout(() => setActiveTab('structure'), 0)
    }

    const handleErdTab = () => {
        navigate('/erd')
    }

    return (
        <div className="flex h-screen bg-background">
            {/* Sidebar */}
            <WorkspaceSidebar />

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Top Header */}
                <header className="h-10 border-b border-border flex items-center justify-between px-3 bg-card shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Database className="w-4 h-4 text-primary" />
                            <span className="text-sm font-semibold">OpenRDB Studio</span>
                        </div>
                        <nav className="flex items-center gap-1 text-sm">
                            <Link to="/" className="px-2 py-1 text-primary hover:underline">Connections</Link>
                            <button className="px-2 py-1 text-muted-foreground hover:text-foreground">History</button>
                            <button className="px-2 py-1 text-muted-foreground hover:text-foreground">Settings</button>
                        </nav>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                            <Input
                                placeholder="Search objects..."
                                className="w-48 h-7 text-xs pl-7"
                            />
                        </div>
                        <Button variant="ghost" size="icon" className="w-7 h-7">
                            <Bell className="w-4 h-4" />
                        </Button>
                        <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-xs font-medium text-primary-foreground">
                            JD
                        </div>
                    </div>
                </header>

                {/* Breadcrumb and Actions */}
                <div className="h-12 border-b border-border flex items-center justify-between px-4 bg-card/50">
                    <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">{connectedDatabase || 'Database'}</span>
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
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={refreshData}>
                            <RefreshCw className="w-3 h-3 mr-1" />
                            Refresh
                        </Button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-border bg-card/30">
                    <div className="flex items-center gap-1 px-4">
                        <button
                            onClick={handleDataTab}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                                "border-transparent text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Table className="w-4 h-4" />
                            Data
                        </button>
                        <button
                            onClick={handleStructureTab}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                                "border-transparent text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Columns className="w-4 h-4" />
                            Structure
                        </button>
                        <button
                            className={cn(
                                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                                "border-primary text-primary"
                            )}
                        >
                            <Code className="w-4 h-4" />
                            SQL
                        </button>
                        <button
                            onClick={handleErdTab}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                                "border-transparent text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Eye className="w-4 h-4" />
                            ERD View
                        </button>
                    </div>
                </div>

                {/* SQL Editor Content */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Editor Section - Top */}
                    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                        <QueryTabs />
                        <QueryToolbar />
                        <div className="flex-1 overflow-hidden">
                            <SqlEditor />
                        </div>
                    </div>

                    {/* Resizable Divider */}
                    <div className="h-1 bg-border cursor-row-resize hover:bg-primary/50 shrink-0" />

                    {/* Results Section - Bottom */}
                    <div className="h-[280px] shrink-0 overflow-hidden">
                        <ResultsPanel />
                    </div>
                </div>

                {/* Status Bar */}
                <StatusBar />
            </div>
        </div>
    )
}
