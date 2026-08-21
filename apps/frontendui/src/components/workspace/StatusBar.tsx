import { useTableStore } from "@/stores/tableStore"
import { useConnectionStore } from "@/stores/connectionStore"
import { Circle } from "lucide-react"
import { cn } from "@/lib/utils"

export function StatusBar() {
    const { rowsPerPage, currentPage, tableData, connectedDatabase, activeConnectionId: backendId } = useTableStore()
    const { connections, activeConnectionId: frontendActiveId } = useConnectionStore()

    const activeConnection =
        connections.find((c) => c.backendId === backendId) ??
        connections.find((c) => c.id === frontendActiveId)

    const isConnected = activeConnection?.status === 'connected' && !!backendId
    const host = activeConnection?.host
    const port = activeConnection?.port
    const database = connectedDatabase || activeConnection?.database

    const totalRows = tableData?.total_rows || 0
    const startRow = totalRows > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0
    const endRow = Math.min(currentPage * rowsPerPage, totalRows)

    let statusLabel = 'Not connected'
    if (isConnected && host) {
        statusLabel = `Connected to ${host}:${port ?? 5432}${database ? ` / ${database}` : ''}`
    } else if (activeConnection?.status === 'connecting') {
        statusLabel = 'Connecting…'
    } else if (activeConnection?.status === 'error') {
        statusLabel = activeConnection.errorMessage || 'Connection error'
    } else if (host) {
        statusLabel = `Disconnected — ${host}:${port ?? 5432}`
    }

    return (
        <div className="h-7 bg-card border-t border-border flex items-center justify-between px-3 text-xs">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 min-w-0">
                    <Circle
                        className={cn(
                            "w-2 h-2 shrink-0",
                            isConnected && "fill-green-500 text-green-500",
                            activeConnection?.status === 'connecting' && "fill-yellow-500 text-yellow-500",
                            activeConnection?.status === 'error' && "fill-red-500 text-red-500",
                            !isConnected && activeConnection?.status !== 'connecting' && activeConnection?.status !== 'error' && "fill-muted-foreground text-muted-foreground"
                        )}
                    />
                    <span className="text-muted-foreground truncate" title={statusLabel}>
                        {statusLabel}
                    </span>
                    {activeConnection?.readOnly && isConnected && (
                        <span className="text-orange-400 shrink-0">· read-only</span>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-4 shrink-0">
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
