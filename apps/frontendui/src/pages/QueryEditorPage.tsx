import {
    ResizablePanelGroup,
    ResizablePanel,
    ResizableHandle,
} from "@/components/ui/resizable"
import { AppSidebar } from "@/components/layout/AppSidebar"
import { SchemaExplorer } from "@/components/query/SchemaExplorer"
import { QueryTabs } from "@/components/query/QueryTabs"
import { QueryToolbar } from "@/components/query/QueryToolbar"
import { SqlEditor } from "@/components/query/SqlEditor"
import { ResultsPanel } from "@/components/query/ResultsPanel"
import { useConnectionStore } from "@/stores/connectionStore"
import { Button } from "@/components/ui/button"
import { Settings, Bell, Search } from "lucide-react"
import { Input } from "@/components/ui/input"

export function QueryEditorPage() {
    const { connections, activeConnectionId } = useConnectionStore()
    const activeConnection = connections.find((c) => c.id === activeConnectionId)

    return (
        <div className="flex h-screen bg-background">
            {/* Navigation Sidebar */}
            <AppSidebar />

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Top Header with Menu Bar Style */}
                <header className="h-10 border-b border-border flex items-center justify-between px-3 bg-card shrink-0">
                    <div className="flex items-center gap-4">
                        <span className="text-sm font-semibold">OpenRDB Studio</span>
                        <nav className="flex items-center gap-1 text-sm text-muted-foreground">
                            <button className="px-2 py-1 hover:text-foreground">File</button>
                            <button className="px-2 py-1 hover:text-foreground">Edit</button>
                            <button className="px-2 py-1 hover:text-foreground">Database</button>
                            <button className="px-2 py-1 hover:text-foreground">Terminal</button>
                            <button className="px-2 py-1 hover:text-foreground">Help</button>
                        </nav>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                            <Input
                                placeholder="Search tables or logs..."
                                className="w-48 h-7 text-xs pl-7"
                            />
                        </div>
                        <Button variant="ghost" size="icon" className="w-7 h-7">
                            <Bell className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="w-7 h-7">
                            <Settings className="w-4 h-4" />
                        </Button>
                        <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
                            JD
                        </div>
                    </div>
                </header>

                {/* Main Content Area */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Schema Explorer */}
                    <div className="w-64 shrink-0 border-r border-border overflow-hidden">
                        <SchemaExplorer />
                    </div>

                    {/* Editor + Results (Vertical Stack) */}
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
                </div>
            </div>
        </div>
    )
}
