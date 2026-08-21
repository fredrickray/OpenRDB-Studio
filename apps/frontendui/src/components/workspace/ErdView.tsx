import { useState, useRef, useCallback, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { ZoomIn, ZoomOut, Maximize2, Sparkles, Loader2, KeyRound, Link2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTableStore } from "@/stores/tableStore"
import { api, type ColumnInfo, type ForeignKeyInfo } from "@/lib/api"

interface TablePosition {
    id: string
    name: string
    schema: string
    x: number
    y: number
    columns: { name: string; type: string; isPrimaryKey: boolean; isForeignKey: boolean }[]
}

interface TableCardProps {
    table: TablePosition
    zoom: number
    onMouseDown: (e: React.MouseEvent, id: string) => void
    isDragging: boolean
    isSelected: boolean
}

function TableCard({ table, zoom, onMouseDown, isDragging, isSelected }: TableCardProps) {
    return (
        <div
            className={cn(
                "absolute bg-card border rounded-lg shadow-lg overflow-hidden select-none",
                // Only apply transitions when NOT dragging for smooth drag performance
                !isDragging && "transition-shadow transition-colors duration-150",
                isDragging ? "cursor-grabbing shadow-2xl ring-2 ring-primary" : "cursor-grab hover:shadow-xl",
                isSelected ? "border-primary ring-2 ring-primary/50" : "border-border"
            )}
            style={{
                // Use transform for GPU-accelerated positioning
                transform: `translate(${table.x * zoom}px, ${table.y * zoom}px) scale(${zoom})`,
                transformOrigin: 'top left',
                minWidth: 220,
                zIndex: isDragging ? 100 : isSelected ? 50 : 1,
                // Disable pointer events on children during drag to prevent lag
                willChange: isDragging ? 'transform' : 'auto',
            }}
            onMouseDown={(e) => onMouseDown(e, table.id)}
        >
            {/* Header */}
            <div className={cn(
                "flex items-center justify-between px-3 py-2 border-b border-border",
                isSelected ? "bg-primary/20" : "bg-muted/50"
            )}>
                <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">{table.schema}</span>
                    <span className="text-sm font-semibold">{table.name}</span>
                </div>
                <div className="flex items-center gap-1">
                    <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {table.columns.length} cols
                    </span>
                </div>
            </div>

            {/* Columns */}
            <div className="py-1 max-h-52 overflow-y-auto">
                {table.columns.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-muted-foreground italic">
                        Loading columns...
                    </div>
                ) : (
                    table.columns.map((col) => (
                        <div
                            key={col.name}
                            className={cn(
                                "flex items-center justify-between px-3 py-1.5 text-xs hover:bg-accent/50",
                                col.isForeignKey && "text-primary"
                            )}
                        >
                            <div className="flex items-center gap-2">
                                {col.isPrimaryKey && <KeyRound className="w-3.5 h-3.5 text-yellow-400" />}
                                {col.isForeignKey && <Link2 className="w-3.5 h-3.5 text-blue-400" />}
                                {!col.isPrimaryKey && !col.isForeignKey && <span className="w-3.5 text-center text-muted-foreground">○</span>}
                                <span className={cn("font-medium", col.isForeignKey && "text-primary")}>{col.name}</span>
                            </div>
                            <span className="text-muted-foreground text-[10px] ml-2">{col.type}</span>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}

export function ErdView() {
    const { tables, selectedTable, selectedSchema, activeConnectionId, columns } = useTableStore()

    const [zoom, setZoom] = useState(1)
    const [pan, setPan] = useState({ x: 20, y: 20 })
    const [tablePositions, setTablePositions] = useState<TablePosition[]>([])
    const [draggingId, setDraggingId] = useState<string | null>(null)
    const [dragStart, setDragStart] = useState({ x: 0, y: 0, tableX: 0, tableY: 0, zoom: 1 })
    const [isLoading, setIsLoading] = useState(false)
    const [tableColumns, setTableColumns] = useState<Record<string, ColumnInfo[]>>({})
    const [foreignKeys, setForeignKeys] = useState<ForeignKeyInfo[]>([])
    const [isPanning, setIsPanning] = useState(false)
    const [panStart, setPanStart] = useState({ x: 0, y: 0, panX: 0, panY: 0 })
    const canvasRef = useRef<HTMLDivElement>(null)

    // Create stable table ID
    const getTableId = (schema: string, name: string) => `${schema}.${name}`

    // Load columns + foreign keys when tables change
    useEffect(() => {
        if (!activeConnectionId || tables.length === 0) return

        const loadAllColumns = async () => {
            setIsLoading(true)
            const columnsMap: Record<string, ColumnInfo[]> = {}

            try {
                const fks = await api.listForeignKeys(activeConnectionId)
                setForeignKeys(fks)
            } catch (error) {
                console.error('Failed to load foreign keys:', error)
                setForeignKeys([])
            }

            for (const table of tables) {
                if (!table.name) continue
                const schema = table.schema || 'public'
                try {
                    const cols = await api.listColumns(activeConnectionId, schema, table.name)
                    columnsMap[getTableId(schema, table.name)] = cols
                } catch (error) {
                    console.error(`Failed to load columns for ${table.name}:`, error)
                }
            }

            setTableColumns(columnsMap)
            setIsLoading(false)
        }

        loadAllColumns()
    }, [activeConnectionId, tables])

    // Calculate initial positions for tables in a grid layout
    useEffect(() => {
        if (tables.length === 0) {
            setTablePositions([])
            return
        }

        const CARD_WIDTH = 220
        const CARD_HEIGHT = 180
        const GAP_X = 60
        const GAP_Y = 40
        const COLS = 3

        const positions: TablePosition[] = tables
            .filter(table => table.name != null)
            .map((table, index) => {
                const col = index % COLS
                const row = Math.floor(index / COLS)
                const schema = table.schema || 'public'
                const tableName = table.name as string
                const tableId = getTableId(schema, tableName)
                const cols = tableColumns[tableId] || []

                return {
                    id: tableId,
                    name: tableName,
                    schema: schema,
                    x: col * (CARD_WIDTH + GAP_X) + 40,
                    y: row * (CARD_HEIGHT + GAP_Y) + 40,
                    columns: cols.map(c => ({
                        name: c.name || 'unknown',
                        type: c.data_type || 'unknown',
                        isPrimaryKey: c.is_primary_key,
                        isForeignKey: c.is_foreign_key
                    }))
                }
            })

        setTablePositions(positions)
    }, [tables, tableColumns])

    // Auto-scroll to selected table
    useEffect(() => {
        if (!selectedTable || !selectedSchema) return

        const tableId = getTableId(selectedSchema, selectedTable)
        const table = tablePositions.find(t => t.id === tableId)

        if (table && canvasRef.current) {
            // Center the selected table in view
            const canvasWidth = canvasRef.current.clientWidth
            const canvasHeight = canvasRef.current.clientHeight
            const newPanX = canvasWidth / 2 - (table.x + 100) * zoom
            const newPanY = canvasHeight / 2 - (table.y + 90) * zoom
            setPan({ x: Math.min(20, newPanX), y: Math.min(20, newPanY) })
        }
    }, [selectedTable, selectedSchema, tablePositions, zoom])

    // Compute relationships from real foreign key metadata
    const relationships = useMemo(() => {
        return foreignKeys.map((fk) => ({
            from: getTableId(fk.to_schema, fk.to_table),
            fromColumn: fk.to_column,
            to: getTableId(fk.from_schema, fk.from_table),
            toColumn: fk.from_column,
        }))
    }, [foreignKeys])

    const handleZoomIn = () => setZoom(z => Math.min(z + 0.1, 2))
    const handleZoomOut = () => setZoom(z => Math.max(z - 0.1, 0.3))
    const handleFitToScreen = () => {
        setZoom(0.7)
        setPan({ x: 20, y: 20 })
    }

    const handleMouseDown = useCallback((e: React.MouseEvent, tableId: string) => {
        e.preventDefault()
        e.stopPropagation() // Prevent bubbling to canvas (which would trigger panning)
        const table = tablePositions.find(t => t.id === tableId)
        if (!table) return

        setDraggingId(tableId)
        setDragStart({
            x: e.clientX,
            y: e.clientY,
            tableX: table.x,
            tableY: table.y,
            zoom: zoom, // Store zoom at drag start for consistent calculations
        })
    }, [tablePositions, zoom])

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        // Handle panning
        if (isPanning) {
            const dx = e.clientX - panStart.x
            const dy = e.clientY - panStart.y
            setPan({ x: panStart.panX + dx, y: panStart.panY + dy })
            return
        }

        // Handle table dragging
        if (!draggingId) return

        // Calculate screen delta
        const screenDeltaX = e.clientX - dragStart.x
        const screenDeltaY = e.clientY - dragStart.y

        // Convert screen delta to canvas coordinates using the zoom level at drag start
        const canvasDeltaX = screenDeltaX / dragStart.zoom
        const canvasDeltaY = screenDeltaY / dragStart.zoom

        setTablePositions(prevTables =>
            prevTables.map(t =>
                t.id === draggingId
                    ? { ...t, x: dragStart.tableX + canvasDeltaX, y: dragStart.tableY + canvasDeltaY }
                    : t
            )
        )
    }, [draggingId, dragStart, isPanning, panStart])

    const handleMouseUp = useCallback(() => {
        setDraggingId(null)
        setIsPanning(false)
    }, [])

    // Handle background click for panning - always pan when clicking on background
    const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
        // Left click or middle mouse button starts panning when clicking on canvas background
        if (e.button === 0 || e.button === 1) {
            e.preventDefault()
            setIsPanning(true)
            setPanStart({
                x: e.clientX,
                y: e.clientY,
                panX: pan.x,
                panY: pan.y
            })
        }
    }, [pan])

    // Handle trackpad/mouse wheel zoom
    const handleWheel = useCallback((e: WheelEvent) => {
        e.preventDefault()

        // Check if it's a pinch gesture (ctrlKey is true for pinch on trackpad)
        if (e.ctrlKey) {
            // Pinch zoom
            const delta = -e.deltaY * 0.01
            setZoom(z => Math.min(2, Math.max(0.3, z + delta)))
        } else {
            // Regular scroll for panning
            setPan(p => ({
                x: p.x - e.deltaX,
                y: p.y - e.deltaY
            }))
        }
    }, [])

    // Attach wheel event listener
    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        canvas.addEventListener('wheel', handleWheel, { passive: false })
        return () => canvas.removeEventListener('wheel', handleWheel)
    }, [handleWheel])

    // Draw relationship lines
    const getRelationshipPath = (rel: typeof relationships[0]) => {
        const fromTable = tablePositions.find(t => t.id === rel.from)
        const toTable = tablePositions.find(t => t.id === rel.to)
        if (!fromTable || !toTable) return ''

        const fromX = (fromTable.x + 200) * zoom + pan.x
        const fromY = (fromTable.y + 50) * zoom + pan.y
        const toX = toTable.x * zoom + pan.x
        const toY = (toTable.y + 50) * zoom + pan.y

        const midX = (fromX + toX) / 2
        return `M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`
    }

    const handleAutoLayout = () => {
        const CARD_WIDTH = 220
        const CARD_HEIGHT = 180
        const GAP_X = 60
        const GAP_Y = 40
        const COLS = 3

        setTablePositions(prev => prev.map((table, index) => ({
            ...table,
            x: (index % COLS) * (CARD_WIDTH + GAP_X) + 40,
            y: Math.floor(index / COLS) * (CARD_HEIGHT + GAP_Y) + 40,
        })))
        setPan({ x: 20, y: 20 })
    }

    const currentSelectedId = selectedTable && selectedSchema
        ? getTableId(selectedSchema, selectedTable)
        : null

    // Loading state
    if (!activeConnectionId) {
        return (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <p>Connect to a database to view ERD</p>
            </div>
        )
    }

    if (isLoading && tablePositions.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                    <p className="text-sm text-muted-foreground">Loading table structure...</p>
                </div>
            </div>
        )
    }

    if (tables.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <p>No tables in database</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full bg-background relative overflow-hidden">
            {/* Toolbar */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 bg-card border border-border rounded-lg px-2 py-1 shadow-lg">
                <Button variant="ghost" size="icon" className="w-8 h-8" onClick={handleZoomIn} title="Zoom In">
                    <ZoomIn className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="w-8 h-8" onClick={handleZoomOut} title="Zoom Out">
                    <ZoomOut className="w-4 h-4" />
                </Button>
                <div className="w-px h-6 bg-border mx-1" />
                <Button variant="ghost" size="icon" className="w-8 h-8" onClick={handleFitToScreen} title="Fit to Screen">
                    <Maximize2 className="w-4 h-4" />
                </Button>
                <div className="w-px h-6 bg-border mx-1" />
                <Button size="sm" className="h-8 gap-1" onClick={handleAutoLayout}>
                    <Sparkles className="w-3 h-3" />
                    Auto-layout
                </Button>
            </div>

            {/* Canvas */}
            <div
                ref={canvasRef}
                className="flex-1 relative overflow-hidden cursor-grab"
                style={{ cursor: isPanning ? 'grabbing' : draggingId ? 'grabbing' : 'grab' }}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                {/* Grid background */}
                <div
                    className="absolute inset-0 opacity-20"
                    style={{
                        backgroundImage: 'radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)',
                        backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
                        backgroundPosition: `${pan.x}px ${pan.y}px`
                    }}
                />

                {/* Relationship Lines SVG */}
                <svg
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    style={{ zIndex: 1 }}
                >
                    {relationships.map((rel, i) => (
                        <path
                            key={i}
                            d={getRelationshipPath(rel)}
                            fill="none"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            strokeOpacity={0.6}
                            markerEnd="url(#arrowhead)"
                        />
                    ))}
                    <defs>
                        <marker
                            id="arrowhead"
                            markerWidth="10"
                            markerHeight="7"
                            refX="9"
                            refY="3.5"
                            orient="auto"
                        >
                            <polygon
                                points="0 0, 10 3.5, 0 7"
                                fill="hsl(var(--primary))"
                                fillOpacity={0.6}
                            />
                        </marker>
                    </defs>
                </svg>

                {/* Table Cards */}
                <div
                    className="relative"
                    style={{
                        transform: `translate(${pan.x}px, ${pan.y}px)`,
                        zIndex: 2,
                    }}
                >
                    {tablePositions.map((table) => (
                        <TableCard
                            key={table.id}
                            table={table}
                            zoom={zoom}
                            onMouseDown={handleMouseDown}
                            isDragging={draggingId === table.id}
                            isSelected={currentSelectedId === table.id}
                        />
                    ))}
                </div>
            </div>

            {/* Mini-map */}
            <div className="absolute bottom-20 right-4 w-48 h-28 bg-card border border-border rounded-lg overflow-hidden shadow-lg">
                <div className="px-2 py-1 text-[10px] text-muted-foreground border-b border-border flex justify-between">
                    <span>MINI-MAP</span>
                    {currentSelectedId && (
                        <span className="text-primary truncate max-w-24">
                            {selectedTable}
                        </span>
                    )}
                </div>
                <div className="relative w-full h-20 bg-muted/30">
                    {tablePositions.map((table) => (
                        <div
                            key={table.id}
                            className={cn(
                                "absolute rounded transition-all",
                                table.id === currentSelectedId ? "bg-primary ring-1 ring-primary" : "bg-primary/40"
                            )}
                            style={{
                                left: table.x / 10 + 4,
                                top: table.y / 12 + 4,
                                width: 18,
                                height: 10,
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* Status Bar */}
            <div className="absolute bottom-4 left-4 flex items-center gap-4 text-xs text-muted-foreground">
                <span>{Math.round(zoom * 100)}%</span>
                <span>TABLES: {tablePositions.length}</span>
                <span>RELATIONSHIPS: {relationships.length}</span>
            </div>

            {/* Selected Table Info */}
            {currentSelectedId && (
                <div className="absolute bottom-4 right-56 text-xs text-primary font-medium">
                    SELECTED: {selectedSchema}.{selectedTable}
                </div>
            )}

            {/* Zoom Slider */}
            <div className="absolute bottom-4 left-36 flex items-center gap-2">
                <input
                    type="range"
                    min="30"
                    max="200"
                    value={zoom * 100}
                    onChange={(e) => setZoom(Number(e.target.value) / 100)}
                    className="w-24 h-1 appearance-none bg-muted rounded cursor-pointer"
                />
            </div>
        </div>
    )
}
