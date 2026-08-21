import { DataTab } from "@/components/workspace/DataTab"
import { StructureTab } from "@/components/workspace/StructureTab"
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout"
import { useTableStore } from "@/stores/tableStore"

export function TableWorkspacePage() {
    const { activeTab, selectedTable, refreshData } = useTableStore()
    const section = activeTab === 'structure' ? 'structure' : 'data'

    return (
        <WorkspaceLayout
            section={section}
            onRefresh={refreshData}
            refreshDisabled={!selectedTable}
        >
            {section === 'data' ? <DataTab /> : <StructureTab />}
        </WorkspaceLayout>
    )
}
