import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout"
import { QueryTabs } from "@/components/query/QueryTabs"
import { QueryToolbar } from "@/components/query/QueryToolbar"
import { SqlEditor } from "@/components/query/SqlEditor"
import { ResultsPanel } from "@/components/query/ResultsPanel"
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable"

export function QueryEditorPage() {
    return (
        <WorkspaceLayout section="sql" refreshDisabled>
            <div className="h-full overflow-hidden">
                <ResizablePanelGroup orientation="vertical" className="h-full">
                    <ResizablePanel defaultSize={58} minSize={25}>
                        <div className="h-full flex flex-col overflow-hidden">
                            <QueryTabs />
                            <QueryToolbar />
                            <div className="flex-1 overflow-hidden min-h-0">
                                <SqlEditor />
                            </div>
                        </div>
                    </ResizablePanel>
                    <ResizableHandle withHandle />
                    <ResizablePanel defaultSize={42} minSize={18}>
                        <div className="h-full overflow-hidden">
                            <ResultsPanel />
                        </div>
                    </ResizablePanel>
                </ResizablePanelGroup>
            </div>
        </WorkspaceLayout>
    )
}
