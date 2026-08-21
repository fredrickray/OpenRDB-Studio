import { useTableStore } from "@/stores/tableStore"
import { useConnectionStore } from "@/stores/connectionStore"
import { useToastStore } from "@/stores/toastStore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { ChevronLeft, ChevronRight, RefreshCw, Loader2, ArrowUp, ArrowDown, ArrowUpDown, Plus, Trash2, X, Check, AlertTriangle, Lock } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { api } from "@/lib/api"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

// Editable cell component
function EditableCell({
    value,
    onSave,
    column,
    isEditing,
    onStartEdit,
    onCancelEdit,
    readOnly,
}: {
    value: string | null
    onSave: (newValue: string | null) => Promise<void>
    column: string
    isEditing: boolean
    onStartEdit: () => void
    onCancelEdit: () => void
    readOnly: boolean
}) {
    const [editValue, setEditValue] = useState(value ?? '')
    const [isSaving, setIsSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const isSavingRef = useRef(false)

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus()
            inputRef.current.select()
            setError(null)
        }
    }, [isEditing])

    useEffect(() => {
        setEditValue(value ?? '')
    }, [value])

    const handleSave = async () => {
        if (isSavingRef.current) return
        isSavingRef.current = true
        setIsSaving(true)
        setError(null)
        try {
            const newValue = editValue.trim() === '' ? null : editValue
            await onSave(newValue)
            onCancelEdit()
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to save'
            setError(message)
            console.error('Failed to save cell:', err)
        } finally {
            isSavingRef.current = false
            setIsSaving(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            handleSave()
        } else if (e.key === 'Escape') {
            setEditValue(value ?? '')
            onCancelEdit()
        }
    }

    if (isEditing) {
        return (
            <div className="flex flex-col gap-1 -m-1">
                <div className="flex items-center gap-1">
                    <Input
                        ref={inputRef}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onBlur={() => {
                            // Delay to allow button clicks to register
                            setTimeout(() => {
                                if (!isSavingRef.current) {
                                    setEditValue(value ?? '')
                                    setError(null)
                                    onCancelEdit()
                                }
                            }, 250)
                        }}
                        className={cn("h-7 text-sm px-2 w-full min-w-[100px]", error && "border-destructive")}
                        disabled={isSaving}
                    />
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 shrink-0 text-green-500"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={handleSave}
                        disabled={isSaving}
                    >
                        {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                    </Button>
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 shrink-0 text-muted-foreground"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                            setEditValue(value ?? '')
                            setError(null)
                            onCancelEdit()
                        }}
                        disabled={isSaving}
                    >
                        <X className="w-3 h-3" />
                    </Button>
                </div>
                {error && (
                    <span className="text-xs text-destructive max-w-[200px] truncate" title={error}>
                        {error}
                    </span>
                )}
            </div>
        )
    }

    const startEdit = readOnly ? undefined : onStartEdit

    // Display mode
    if (value === null) {
        return (
            <span
                className={cn(
                    "text-muted-foreground italic px-1 -mx-1 rounded",
                    !readOnly && "cursor-pointer hover:bg-muted/50"
                )}
                onDoubleClick={startEdit}
                title={readOnly ? 'Read-only connection' : undefined}
            >
                NULL
            </span>
        )
    }

    if (value === 'true' || value === 'false') {
        return (
            <span
                className={cn(
                    "px-2 py-0.5 rounded text-xs font-medium",
                    !readOnly && "cursor-pointer",
                    value === 'true' ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                )}
                onDoubleClick={startEdit}
                title={readOnly ? 'Read-only connection' : undefined}
            >
                {value.toUpperCase()}
            </span>
        )
    }

    return (
        <span
            title={readOnly ? 'Read-only connection' : value}
            className={cn(
                "px-1 -mx-1 rounded",
                !readOnly && "cursor-pointer hover:bg-muted/50"
            )}
            onDoubleClick={startEdit}
        >
            {value}
        </span>
    )
}

export function DataTab() {
    const {
        tableData,
        columns,
        currentPage,
        rowsPerPage,
        filter,
        applyFilter,
        setCurrentPage,
        setRowsPerPage,
        refreshData,
        isLoadingData,
        error,
        selectedTable,
        selectedSchema,
        activeConnectionId,
        sortColumn,
        sortDirection,
        setSorting
    } = useTableStore()

    const connections = useConnectionStore((s) => s.connections)
    const showToast = useToastStore((s) => s.showToast)

    const isReadOnly = useMemo(() => {
        const conn = connections.find((c) => c.backendId === activeConnectionId)
        return conn?.readOnly ?? false
    }, [connections, activeConnectionId])

    const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())
    const [editingCell, setEditingCell] = useState<{ rowIdx: number, colIdx: number } | null>(null)
    const [showInsertDialog, setShowInsertDialog] = useState(false)
    const [showDeleteDialog, setShowDeleteDialog] = useState(false)
    const [insertValues, setInsertValues] = useState<Record<string, string>>({})
    const [isOperating, setIsOperating] = useState(false)
    const [filterDraft, setFilterDraft] = useState(filter)

    useEffect(() => {
        setFilterDraft(filter)
    }, [filter, selectedTable, selectedSchema])

    const totalRows = tableData?.total_rows || 0
    const rows = tableData?.rows || []
    const columnNames = tableData?.columns || []

    const startRow = rows.length > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0
    const endRow = Math.min(currentPage * rowsPerPage, totalRows)
    const totalPages = Math.ceil(totalRows / rowsPerPage)

    // Find primary key column
    const pkColumn = columns.find(c => c.is_primary_key)
    const pkColumnName = pkColumn?.name || columnNames[0]
    const pkColumnIndex = columnNames.findIndex(c => c === pkColumnName)

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

    const getColumnInfo = (colName: string) => {
        return columns.find(c => c.name === colName)
    }

    const handleApplyFilter = () => {
        applyFilter(filterDraft)
    }

    // Cell update handler
    const handleCellUpdate = useCallback(async (rowIdx: number, colIdx: number, newValue: string | null) => {
        if (isReadOnly) {
            throw new Error('Connection is read-only')
        }
        if (!activeConnectionId || !selectedSchema || !selectedTable || !pkColumnName) return

        const row = rows[rowIdx]
        const pkValue = row[pkColumnIndex]
        const column = columnNames[colIdx]

        if (pkValue === null) {
            throw new Error('Cannot update row without primary key value')
        }

        await api.updateRow(
            activeConnectionId,
            selectedSchema,
            selectedTable,
            pkColumnName,
            pkValue,
            column,
            newValue
        )

        await refreshData()
    }, [isReadOnly, activeConnectionId, selectedSchema, selectedTable, pkColumnName, pkColumnIndex, columnNames, rows, refreshData])

    // Insert row handler
    const handleInsertRow = async () => {
        if (isReadOnly) {
            showToast('Connection is read-only — inserts are disabled.', 'error')
            return
        }
        if (!activeConnectionId || !selectedSchema || !selectedTable) return

        setIsOperating(true)
        try {
            const cols = Object.keys(insertValues).filter(k => insertValues[k].trim() !== '')
            const vals = cols.map(k => insertValues[k].trim() || null)

            if (cols.length === 0) {
                throw new Error('Please fill in at least one field')
            }

            await api.insertRow(activeConnectionId, selectedSchema, selectedTable, cols, vals)
            await refreshData()
            setShowInsertDialog(false)
            setInsertValues({})
            showToast('Row inserted', 'success')
        } catch (error) {
            console.error('Failed to insert row:', error)
            showToast(error instanceof Error ? error.message : 'Failed to insert row', 'error')
        } finally {
            setIsOperating(false)
        }
    }

    // Delete rows handler
    const handleDeleteRows = async () => {
        if (isReadOnly) {
            showToast('Connection is read-only — deletes are disabled.', 'error')
            return
        }
        if (!activeConnectionId || !selectedSchema || !selectedTable || !pkColumnName) return

        setIsOperating(true)
        try {
            const pkValues = Array.from(selectedRows)
                .map(idx => rows[idx]?.[pkColumnIndex])
                .filter((v): v is string => v !== null && v !== undefined)

            if (pkValues.length === 0) {
                throw new Error('No valid rows selected for deletion')
            }

            await api.deleteRows(activeConnectionId, selectedSchema, selectedTable, pkColumnName, pkValues)
            await refreshData()
            setSelectedRows(new Set())
            setShowDeleteDialog(false)
            showToast(`Deleted ${pkValues.length} row(s)`, 'success')
        } catch (error) {
            console.error('Failed to delete rows:', error)
            showToast(error instanceof Error ? error.message : 'Failed to delete rows', 'error')
        } finally {
            setIsOperating(false)
        }
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
            {/* Toolbar */}
            <div className="p-3 border-b border-border flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                    {isReadOnly ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-orange-400 bg-orange-400/10 px-2 py-1.5 rounded-md">
                            <Lock className="w-3.5 h-3.5" />
                            Read-only
                        </span>
                    ) : (
                        <>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1"
                                onClick={() => {
                                    setInsertValues({})
                                    setShowInsertDialog(true)
                                }}
                            >
                                <Plus className="w-4 h-4" />
                                Insert Row
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1 text-destructive hover:text-destructive"
                                disabled={selectedRows.size === 0}
                                onClick={() => setShowDeleteDialog(true)}
                            >
                                <Trash2 className="w-4 h-4" />
                                Delete ({selectedRows.size})
                            </Button>
                        </>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-medium">FILTER</span>
                    <Input
                        value={filterDraft}
                        onChange={(e) => setFilterDraft(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleApplyFilter()
                        }}
                        placeholder="e.g. status = 'active'"
                        className="w-60 h-8 text-sm bg-input font-mono"
                    />
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8"
                        onClick={handleApplyFilter}
                        disabled={isLoadingData}
                    >
                        Apply
                    </Button>
                    {filter && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8"
                            onClick={() => {
                                setFilterDraft('')
                                applyFilter('')
                            }}
                        >
                            Clear
                        </Button>
                    )}
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

            {error && (
                <div className="px-3 py-2 text-sm text-destructive bg-destructive/10 border-b border-border">
                    {error}
                </div>
            )}

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
            {!isLoadingData && rows.length === 0 && !error && (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                        <p className="mb-2">{filter ? 'No rows match this filter' : 'No data in this table'}</p>
                        {!isReadOnly && !filter && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setInsertValues({})
                                    setShowInsertDialog(true)
                                }}
                            >
                                <Plus className="w-4 h-4 mr-1" />
                                Insert First Row
                            </Button>
                        )}
                    </div>
                </div>
            )}

            {/* Data Grid */}
            {rows.length > 0 && (
                <div className="flex-1 overflow-auto">
                    <table className="w-full text-sm min-w-max">
                        <thead className="bg-muted/30 sticky top-0 z-10">
                            <tr className="border-b border-border">
                                <th className="w-10 p-3 text-left sticky left-0 bg-muted/30">
                                    {!isReadOnly && (
                                        <Checkbox
                                            checked={selectedRows.size === rows.length && rows.length > 0}
                                            onCheckedChange={toggleAll}
                                        />
                                    )}
                                </th>
                                {columnNames.map((colName) => {
                                    const colInfo = getColumnInfo(colName)
                                    const isSorted = sortColumn === colName
                                    return (
                                        <th
                                            key={colName}
                                            className="p-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap cursor-pointer hover:bg-muted/50 transition-colors select-none"
                                            onClick={() => setSorting(colName)}
                                        >
                                            <div className="flex items-center gap-1.5">
                                                {colInfo?.is_primary_key && <span className="text-yellow-400">⚿</span>}
                                                {colInfo?.is_foreign_key && <span className="text-blue-400">↗</span>}
                                                <span className={cn(isSorted && "text-primary font-semibold")}>
                                                    {colName.toUpperCase()}
                                                </span>
                                                {isSorted ? (
                                                    sortDirection === 'asc' ? (
                                                        <ArrowUp className="w-3 h-3 text-primary" />
                                                    ) : (
                                                        <ArrowDown className="w-3 h-3 text-primary" />
                                                    )
                                                ) : (
                                                    <ArrowUpDown className="w-3 h-3 opacity-30" />
                                                )}
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
                                        {!isReadOnly && (
                                            <Checkbox
                                                checked={selectedRows.has(rowIdx)}
                                                onCheckedChange={() => toggleRow(rowIdx)}
                                            />
                                        )}
                                    </td>
                                    {row.map((cell, colIdx) => (
                                        <td key={colIdx} className="p-3 whitespace-nowrap">
                                            <EditableCell
                                                value={cell}
                                                column={columnNames[colIdx]}
                                                readOnly={isReadOnly}
                                                isEditing={!isReadOnly && editingCell?.rowIdx === rowIdx && editingCell?.colIdx === colIdx}
                                                onStartEdit={() => setEditingCell({ rowIdx, colIdx })}
                                                onCancelEdit={() => setEditingCell(null)}
                                                onSave={(newValue) => handleCellUpdate(rowIdx, colIdx, newValue)}
                                            />
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

            {/* Insert Row Dialog */}
            <Dialog open={showInsertDialog} onOpenChange={setShowInsertDialog}>
                <DialogContent className="max-w-md max-h-[80vh] overflow-auto">
                    <DialogHeader>
                        <DialogTitle>Insert New Row</DialogTitle>
                        <DialogDescription>
                            Fill in the values for the new row. Leave fields blank for NULL.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-4">
                        {columns.map((col) => (
                            <div key={col.name} className="grid grid-cols-3 items-center gap-4">
                                <Label className="text-right text-sm">
                                    {col.is_primary_key && <span className="text-yellow-400 mr-1">⚿</span>}
                                    {col.name}
                                </Label>
                                <Input
                                    className="col-span-2"
                                    placeholder={col.data_type || 'value'}
                                    value={insertValues[col.name || ''] || ''}
                                    onChange={(e) => setInsertValues({
                                        ...insertValues,
                                        [col.name || '']: e.target.value
                                    })}
                                />
                            </div>
                        ))}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowInsertDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleInsertRow} disabled={isOperating}>
                            {isOperating ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                            Insert
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="w-5 h-5" />
                            Delete {selectedRows.size} row(s)?
                        </DialogTitle>
                        <DialogDescription>
                            This action cannot be undone. The selected rows will be permanently deleted from the database.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteRows}
                            disabled={isOperating}
                        >
                            {isOperating ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
