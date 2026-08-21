import { useState } from "react"
import { useTableStore } from "@/stores/tableStore"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Key, Type, Hash, ToggleLeft, Calendar, RefreshCw, Loader2, KeyRound, Link2 } from "lucide-react"
import { cn } from "@/lib/utils"

const typeIcons: Record<string, React.ReactNode> = {
    uuid: <Key className="w-4 h-4 text-yellow-400" />,
    'character varying': <Type className="w-4 h-4 text-green-400" />,
    'varchar': <Type className="w-4 h-4 text-green-400" />,
    'text': <Type className="w-4 h-4 text-green-400" />,
    integer: <Hash className="w-4 h-4 text-blue-400" />,
    bigint: <Hash className="w-4 h-4 text-blue-400" />,
    smallint: <Hash className="w-4 h-4 text-blue-400" />,
    numeric: <Hash className="w-4 h-4 text-blue-400" />,
    boolean: <ToggleLeft className="w-4 h-4 text-purple-400" />,
    timestamp: <Calendar className="w-4 h-4 text-orange-400" />,
    'timestamp with time zone': <Calendar className="w-4 h-4 text-orange-400" />,
    'timestamp without time zone': <Calendar className="w-4 h-4 text-orange-400" />,
    date: <Calendar className="w-4 h-4 text-orange-400" />,
}

function getTypeIcon(type: string | null | undefined) {
    if (!type) return <Type className="w-4 h-4 text-muted-foreground" />
    const lowerType = type.toLowerCase()
    for (const [key, icon] of Object.entries(typeIcons)) {
        if (lowerType.includes(key)) return icon
    }
    return <Type className="w-4 h-4 text-muted-foreground" />
}

export function StructureTab() {
    const {
        columns,
        selectedTable,
        selectedSchema,
        tableData,
        isLoadingColumns,
        fetchColumns
    } = useTableStore()

    const totalRows = tableData?.total_rows || 0

    if (!selectedTable) {
        return (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <p>Select a table to view structure</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <h2 className="text-xl font-semibold">
                            {selectedSchema}.{selectedTable}
                        </h2>
                        <span className="px-2 py-0.5 text-xs font-medium bg-green-500/20 text-green-400 rounded">
                            {columns.length} columns
                        </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                        {totalRows.toLocaleString()} rows
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchColumns()}
                        disabled={isLoadingColumns}
                    >
                        {isLoadingColumns ? (
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        ) : (
                            <RefreshCw className="w-3 h-3 mr-1" />
                        )}
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Loading State */}
            {isLoadingColumns && columns.length === 0 && (
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                        <p className="text-sm text-muted-foreground">Loading columns...</p>
                    </div>
                </div>
            )}

            {/* Columns Table */}
            {columns.length > 0 && (
                <ScrollArea className="flex-1 p-4">
                    <div className="mb-6">
                        <h3 className="text-sm font-semibold mb-3">Columns</h3>
                        <div className="border border-border rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/30">
                                    <tr className="border-b border-border">
                                        <th className="p-3 text-left text-xs font-medium text-muted-foreground w-16">KEYS</th>
                                        <th className="p-3 text-left text-xs font-medium text-muted-foreground">NAME</th>
                                        <th className="p-3 text-left text-xs font-medium text-muted-foreground">TYPE</th>
                                        <th className="p-3 text-left text-xs font-medium text-muted-foreground w-20">NULLABLE</th>
                                        <th className="p-3 text-left text-xs font-medium text-muted-foreground">DEFAULT</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {columns.map((col, idx) => (
                                        <tr key={col.name || idx} className="border-b border-border hover:bg-accent/50">
                                            <td className="p-3">
                                                <div className="flex gap-1">
                                                    {col.is_primary_key && (
                                                        <KeyRound className="w-3.5 h-3.5 text-yellow-400" aria-label="Primary key" />
                                                    )}
                                                    {col.is_foreign_key && (
                                                        <Link2 className="w-3.5 h-3.5 text-blue-400" aria-label="Foreign key" />
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-3 font-medium">{col.name}</td>
                                            <td className="p-3">
                                                <div className="flex items-center gap-2">
                                                    {getTypeIcon(col.data_type)}
                                                    <code className="text-xs text-primary">
                                                        {col.data_type?.toUpperCase() || 'UNKNOWN'}
                                                    </code>
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                {col.is_nullable ? (
                                                    <span className="text-green-400 text-xs">YES</span>
                                                ) : (
                                                    <span className="text-muted-foreground text-xs">NO</span>
                                                )}
                                            </td>
                                            <td className="p-3">
                                                {col.default_value ? (
                                                    <code className="text-xs text-muted-foreground max-w-[200px] truncate block" title={col.default_value}>
                                                        {col.default_value}
                                                    </code>
                                                ) : (
                                                    <span className="text-muted-foreground/50 text-xs">NULL</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Summary Section */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="border border-border rounded-lg p-4">
                            <h4 className="text-sm font-medium mb-2">Primary Keys</h4>
                            <div className="space-y-1">
                                {columns.filter(c => c.is_primary_key).map(c => (
                                    <div key={c.name} className="text-xs text-muted-foreground flex items-center gap-2">
                                        <KeyRound className="w-3.5 h-3.5 text-yellow-400" />
                                        {c.name}
                                    </div>
                                ))}
                                {columns.filter(c => c.is_primary_key).length === 0 && (
                                    <div className="text-xs text-muted-foreground">No primary keys</div>
                                )}
                            </div>
                        </div>

                        <div className="border border-border rounded-lg p-4">
                            <h4 className="text-sm font-medium mb-2">Foreign Keys</h4>
                            <div className="space-y-1">
                                {columns.filter(c => c.is_foreign_key).map(c => (
                                    <div key={c.name} className="text-xs text-muted-foreground flex items-center gap-2">
                                        <Link2 className="w-3.5 h-3.5 text-blue-400" />
                                        {c.name}
                                    </div>
                                ))}
                                {columns.filter(c => c.is_foreign_key).length === 0 && (
                                    <div className="text-xs text-muted-foreground">No foreign keys</div>
                                )}
                            </div>
                        </div>

                        <div className="border border-border rounded-lg p-4">
                            <h4 className="text-sm font-medium mb-2">Nullable Columns</h4>
                            <div className="text-2xl font-bold text-primary">
                                {columns.filter(c => c.is_nullable).length}
                                <span className="text-sm font-normal text-muted-foreground"> / {columns.length}</span>
                            </div>
                        </div>
                    </div>
                </ScrollArea>
            )}

            {/* Empty State */}
            {!isLoadingColumns && columns.length === 0 && (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                    <p>No columns found for this table</p>
                </div>
            )}
        </div>
    )
}
