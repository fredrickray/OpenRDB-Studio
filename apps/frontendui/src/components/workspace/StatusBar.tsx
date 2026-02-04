import { useTableStore } from "@/stores/tableStore"
import { useConnectionStore } from "@/stores/connectionStore"
import { Circle } from "lucide-react"

export function StatusBar() {
    const { rowsPerPage, currentPage, tableData } = useTableStore()
    const { activeConnectionId, connections } = useConnectionStore()
    const activeConnection = connections.find(c => c.id === activeConnectionId)

    const totalRows = tableData?.total_rows || 0
    const startRow = totalRows > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0
    const endRow = Math.min(currentPage * rowsPerPage, totalRows)

    return (
        <div className="h-7 bg-card border-t border-border flex items-center justify-between px-3 text-xs">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                    <Circle className="w-2 h-2 fill-green-500 text-green-500" />
                    <span className="text-muted-foreground">
                        Connected to {activeConnection?.host || 'localhost'}:{activeConnection?.port || 5432}
                    </span>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <span className="text-muted-foreground">
                    Rows per page: <span className="text-foreground">{rowsPerPage}</span>
                </span>
                <span className="text-muted-foreground">
                    Displaying <span className="text-foreground">{startRow}-{endRow}</span> of <span className="text-foreground">{totalRows.toLocaleString()}</span>
                </span>
            </div>
        </div>
    )
}
