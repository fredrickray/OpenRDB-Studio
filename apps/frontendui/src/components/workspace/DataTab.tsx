import { useTableStore } from "@/stores/tableStore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChevronLeft, ChevronRight, RefreshCw, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"

export function DataTab() {
    const { tableData, databases, selectedDatabase, selectedTable, currentPage, rowsPerPage, totalRows, filter, setFilter, setCurrentPage, refreshData } = useTableStore()
    const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())

    const selectedDb = databases.find(db => db.name === selectedDatabase)
    const selectedTbl = selectedDb?.tables.find(t => t.name === selectedTable)
    const columns = selectedTbl?.columns || []

    const startRow = (currentPage - 1) * rowsPerPage + 1
    const endRow = Math.min(currentPage * rowsPerPage, totalRows)
    const totalPages = Math.ceil(totalRows / rowsPerPage)

    const toggleRow = (id: string) => {
        const next = new Set(selectedRows)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        setSelectedRows(next)
    }

    const toggleAll = () => {
        if (selectedRows.size === tableData.length) {
            setSelectedRows(new Set())
        } else {
            setSelectedRows(new Set(tableData.map(r => r.id)))
        }
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
                        placeholder='{ status: "active", category: "electronics" }'
                        className="w-80 h-8 text-sm bg-input font-mono"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-medium">PROJECT</span>
                    <Input
                        placeholder="{ name: 1, stock: 1 }"
                        className="w-40 h-8 text-sm bg-input font-mono"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-medium">SORT</span>
                    <Input
                        placeholder="{ created_at: -1 }"
                        className="w-32 h-8 text-sm bg-input font-mono"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-medium">LIMIT</span>
                    <Input
                        placeholder=""
                        className="w-16 h-8 text-sm bg-input font-mono"
                    />
                </div>
                <div className="flex-1" />
                <Button size="sm" className="h-8">
                    FIND
                </Button>
                <Button variant="outline" size="sm" className="h-8">
                    RESET
                </Button>
            </div>

            {/* Data Grid */}
            <ScrollArea className="flex-1">
                <table className="w-full text-sm">
                    <thead className="bg-muted/30 sticky top-0">
                        <tr className="border-b border-border">
                            <th className="w-10 p-3 text-left">
                                <Checkbox
                                    checked={selectedRows.size === tableData.length && tableData.length > 0}
                                    onCheckedChange={toggleAll}
                                />
                            </th>
                            {columns.map((col) => (
                                <th key={col.name} className="p-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">
                                    <div className="flex items-center gap-1">
                                        {col.isPrimaryKey && <span className="text-yellow-400">⚿</span>}
                                        {col.name.toUpperCase()}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {tableData.map((row, idx) => (
                            <tr
                                key={row.id}
                                className={cn(
                                    "border-b border-border hover:bg-accent/50 transition-colors",
                                    selectedRows.has(row.id) && "bg-primary/10"
                                )}
                            >
                                <td className="p-3">
                                    <Checkbox
                                        checked={selectedRows.has(row.id)}
                                        onCheckedChange={() => toggleRow(row.id)}
                                    />
                                </td>
                                {columns.map((col) => (
                                    <td key={col.name} className="p-3 whitespace-nowrap">
                                        {col.name === 'is_active' ? (
                                            <span className={cn(
                                                "px-2 py-0.5 rounded text-xs font-medium",
                                                row[col.name] ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                                            )}>
                                                {row[col.name] ? 'TRUE' : 'FALSE'}
                                            </span>
                                        ) : col.name === 'stock' && row[col.name] === 0 ? (
                                            <span className="text-red-400">{row[col.name]}</span>
                                        ) : row[col.name] === 'NULL' ? (
                                            <span className="text-muted-foreground italic">NULL</span>
                                        ) : (
                                            <span>{String(row[col.name] ?? '')}</span>
                                        )}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </ScrollArea>

            {/* Pagination */}
            <div className="p-3 border-t border-border flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">
                        Rows per page:
                    </span>
                    <select className="bg-input border border-border rounded px-2 py-1 text-sm">
                        <option>20</option>
                        <option>50</option>
                        <option>100</option>
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                        Displaying {startRow}-{endRow} of {totalRows.toLocaleString()}
                    </span>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(currentPage - 1)}
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8"
                        disabled={currentPage >= totalPages}
                        onClick={() => setCurrentPage(currentPage + 1)}
                    >
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </div>
    )
}
