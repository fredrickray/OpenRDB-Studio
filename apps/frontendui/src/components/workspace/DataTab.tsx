import { useTableStore } from "@/stores/tableStore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChevronLeft, ChevronRight, RefreshCw, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"

export function DataTab() {
    const {
        tableData,
        columns,
        currentPage,
        rowsPerPage,
        filter,
        setFilter,
        setCurrentPage,
        setRowsPerPage,
        refreshData,
        isLoadingData,
        selectedTable
    } = useTableStore()

    const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())

    const totalRows = tableData?.total_rows || 0
    const rows = tableData?.rows || []
    const columnNames = tableData?.columns || []

    const startRow = rows.length > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0
    const endRow = Math.min(currentPage * rowsPerPage, totalRows)
    const totalPages = Math.ceil(totalRows / rowsPerPage)

    const toggleRow = (idx: number) => {
        const next = new Set(selectedRows)
        if (next.has(idx)) next.delete(idx)
        else next.add(idx)
        setSelectedRows(next)
    }

    const toggleAll = () => {
        if (selectedRows.size === rows.length) {
            setSelectedRows(new Set())
        } else {
            setSelectedRows(new Set(rows.map((_, i) => i)))
        }
    }

    const handleRowsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setRowsPerPage(parseInt(e.target.value, 10))
    }

    // Find column info for a specific column name
    const getColumnInfo = (colName: string) => {
        return columns.find(c => c.name === colName)
    }

    if (!selectedTable) {
        return (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <p>Select a table to view data</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full">
            {/* Filter Bar */}
            <div className="p-3 border-b border-border flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-medium">FILTER</span>
                    <Input
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        placeholder="WHERE clause..."
                        className="w-80 h-8 text-sm bg-input font-mono"
                    />
                </div>
                <div className="flex-1" />
                <Button
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={() => refreshData()}
                    disabled={isLoadingData}
                >
                    {isLoadingData ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <RefreshCw className="w-4 h-4" />
                    )}
                </Button>
            </div>

            {/* Loading State */}
            {isLoadingData && rows.length === 0 && (
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                        <p className="text-sm text-muted-foreground">Loading data...</p>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {!isLoadingData && rows.length === 0 && (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                    <p>No data in this table</p>
                </div>
            )}

            {/* Data Grid */}
            {rows.length > 0 && (
                <div className="flex-1 overflow-auto">
                    <table className="w-full text-sm min-w-max">
                        <thead className="bg-muted/30 sticky top-0 z-10">
                            <tr className="border-b border-border">
                                <th className="w-10 p-3 text-left sticky left-0 bg-muted/30">
                                    <Checkbox
                                        checked={selectedRows.size === rows.length && rows.length > 0}
                                        onCheckedChange={toggleAll}
                                    />
                                </th>
                                {columnNames.map((colName) => {
                                    const colInfo = getColumnInfo(colName)
                                    return (
                                        <th key={colName} className="p-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">
                                            <div className="flex items-center gap-1">
                                                {colInfo?.is_primary_key && <span className="text-yellow-400">⚿</span>}
                                                {colInfo?.is_foreign_key && <span className="text-blue-400">↗</span>}
                                                {colName.toUpperCase()}
                                            </div>
                                        </th>
                                    )
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, rowIdx) => (
                                <tr
                                    key={rowIdx}
                                    className={cn(
                                        "border-b border-border hover:bg-accent/50 transition-colors",
                                        selectedRows.has(rowIdx) && "bg-primary/10"
                                    )}
                                >
                                    <td className="p-3 sticky left-0 bg-background">
                                        <Checkbox
                                            checked={selectedRows.has(rowIdx)}
                                            onCheckedChange={() => toggleRow(rowIdx)}
                                        />
                                    </td>
                                    {row.map((cell, colIdx) => (
                                        <td key={colIdx} className="p-3 whitespace-nowrap">
                                            {cell === null ? (
                                                <span className="text-muted-foreground italic">NULL</span>
                                            ) : cell === 'true' || cell === 'false' ? (
                                                <span className={cn(
                                                    "px-2 py-0.5 rounded text-xs font-medium",
                                                    cell === 'true' ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                                                )}>
                                                    {cell.toUpperCase()}
                                                </span>
                                            ) : (
                                                <span title={cell}>{cell}</span>
                                            )}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination */}
            <div className="p-3 border-t border-border flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">
                        Rows per page:
                    </span>
                    <select
                        className="bg-input border border-border rounded px-2 py-1 text-sm"
                        value={rowsPerPage}
                        onChange={handleRowsPerPageChange}
                    >
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                        {rows.length > 0 ? (
                            `Displaying ${startRow}-${endRow} of ${totalRows.toLocaleString()}`
                        ) : (
                            'No rows'
                        )}
                    </span>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8"
                        disabled={currentPage === 1 || isLoadingData}
                        onClick={() => setCurrentPage(currentPage - 1)}
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8"
                        disabled={currentPage >= totalPages || isLoadingData}
                        onClick={() => setCurrentPage(currentPage + 1)}
                    >
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </div>
    )
}
