import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout"
import { ErdView } from "@/components/workspace/ErdView"
import { useTableStore } from "@/stores/tableStore"

export function ErdViewPage() {
    const fetchTables = useTableStore((s) => s.fetchTables)

    return (
        <WorkspaceLayout section="erd" onRefresh={() => { void fetchTables() }}>
            <ErdView />
        </WorkspaceLayout>
    )
}
