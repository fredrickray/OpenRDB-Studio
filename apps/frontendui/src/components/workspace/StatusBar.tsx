import { useTableStore } from "@/stores/tableStore"
import { useConnectionStore } from "@/stores/connectionStore"
import { Circle } from "lucide-react"

export function StatusBar() {
    const { queryTime, rowsPerPage, currentPage, totalRows } = useTableStore()
    const { activeConnectionId, connections } = useConnectionStore()
    const activeConnection = connections.find(c => c.id === activeConnectionId)

    const startRow = (currentPage - 1) * rowsPerPage + 1
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
                <span className="text-muted-foreground">|</span>
                <span className="text-muted-foreground">
                    Query time: {queryTime}ms
                </span>
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
