import { useState, useRef, useCallback, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import {
    ZoomIn,
    ZoomOut,
    Maximize2,
    Sparkles,
    Loader2,
    KeyRound,
    Link2,
    GripVertical,
    X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useTableStore } from "@/stores/tableStore"
import { api, type ColumnInfo, type ForeignKeyInfo } from "@/lib/api"

const CARD_WIDTH = 240
const HEADER_HEIGHT = 44
const ROW_HEIGHT = 28
const CARD_PAD_Y = 6

interface TableColumn {
    name: string
    type: string
    isPrimaryKey: boolean
    isForeignKey: boolean
}

interface TablePosition {
    id: string
    name: string
    schema: string
    x: number
    y: number
    columns: TableColumn[]
}

interface Relationship {
    id: string
    from: string
    fromColumn: string
    to: string
    toColumn: string
    label: string
}

interface TableCardProps {
    table: TablePosition
    zoom: number
    pan: { x: number; y: number }
    onMouseDown: (e: React.MouseEvent, id: string) => void
    isDragging: boolean
    isSelected: boolean
    highlightedColumns: Set<string>
    compact: boolean
}

function TableCard({
    table,
    zoom,
    pan,
    onMouseDown,
    isDragging,
    isSelected,
    highlightedColumns,
    compact,
}: TableCardProps) {
    return (
        <div
            className={cn(
                "absolute select-none rounded-lg border overflow-hidden",
                "bg-[#0f1a1c]/95 backdrop-blur-sm",
                !isDragging && "transition-[box-shadow,border-color] duration-150 ease-out",
                isDragging ? "cursor-grabbing shadow-2xl border-emerald-400/80" : "cursor-grab",
                isSelected
                    ? "border-emerald-400/70 shadow-[0_0_0_1px_rgba(52,211,153,0.25)]"
                    : "border-emerald-900/60 hover:border-emerald-700/70"
            )}
            style={{
                transform: `translate(${table.x * zoom + pan.x}px, ${table.y * zoom + pan.y}px) scale(${zoom})`,
                transformOrigin: "top left",
                width: CARD_WIDTH,
                zIndex: isDragging ? 100 : isSelected ? 40 : 2,
                willChange: isDragging ? "transform" : "auto",
            }}
            onMouseDown={(e) => onMouseDown(e, table.id)}
        >
            <div
                className={cn(
                    "flex items-center gap-2 px-2.5 border-b border-emerald-900/50",
                    isSelected ? "bg-emerald-500/15" : "bg-[#132226]"
                )}
                style={{ height: HEADER_HEIGHT }}
            >
                <GripVertical className="w-3.5 h-3.5 text-emerald-700/80 shrink-0" />
                <div className="min-w-0 flex-1">
                    {!compact && (
                        <div className="text-[10px] text-emerald-700/80 truncate leading-none mb-0.5">
                            {table.schema}
                        </div>
                    )}
                    <div className="text-[13px] font-semibold text-emerald-50 truncate leading-tight">
                        {table.name}
                    </div>
                </div>
                <span className="text-[10px] text-emerald-600/90 tabular-nums shrink-0">
                    {table.columns.length}
                </span>
            </div>

            <div style={{ paddingTop: CARD_PAD_Y, paddingBottom: CARD_PAD_Y }}>
                {table.columns.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-emerald-700/70 italic">Loading…</div>
                ) : (
                    table.columns.map((col) => {
                        const highlighted = highlightedColumns.has(col.name)
                        return (
                            <div
                                key={col.name}
                                data-col={col.name}
                                className={cn(
                                    "relative flex items-center justify-between gap-2 px-3 text-[11px]",
                                    highlighted
                                        ? "text-sky-50"
                                        : col.isForeignKey
                                          ? "text-sky-300/90"
                                          : "text-emerald-100/85"
                                )}
                                style={{ height: ROW_HEIGHT }}
                            >
                                {highlighted && (
                                    <span
                                        aria-hidden
                                        className="pointer-events-none absolute left-1 right-1 top-[3px] bottom-[3px] rounded-full border-[1.5px] border-dashed border-sky-300/90 bg-sky-400/10"
                                    />
                                )}
                                <div className="relative z-[1] flex items-center gap-1.5 min-w-0">
                                    {col.isPrimaryKey ? (
                                        <KeyRound className="w-3 h-3 text-emerald-400 shrink-0" />
                                    ) : col.isForeignKey ? (
                                        <Link2 className="w-3 h-3 text-sky-400 shrink-0" />
                                    ) : (
                                        <span className="w-3 shrink-0" />
                                    )}
                                    <span className="font-medium truncate">{col.name}</span>
                                </div>
                                {!compact && (
                                    <span className="relative z-[1] text-[10px] text-emerald-700/90 truncate max-w-[40%] text-right">
                                        {col.type}
                                    </span>
                                )}
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}

function getColumnCenterY(table: TablePosition, columnName: string): number {
    const idx = table.columns.findIndex((c) => c.name === columnName)
    const row = idx >= 0 ? idx : 0
    return table.y + HEADER_HEIGHT + CARD_PAD_Y + row * ROW_HEIGHT + ROW_HEIGHT / 2
}

function orthogonalPath(
    x1: number,
    y1: number,
    x2: number,
    y2: number
): string {
    const midX = x1 + (x2 - x1) / 2
    return `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`
}

export function ErdView() {
    const { tables, selectedTable, selectedSchema, activeConnectionId } = useTableStore()

    const [zoom, setZoom] = useState(0.55)
    const [pan, setPan] = useState({ x: 40, y: 40 })
    const [tablePositions, setTablePositions] = useState<TablePosition[]>([])
    const [draggingId, setDraggingId] = useState<string | null>(null)
    const [dragStart, setDragStart] = useState({ x: 0, y: 0, tableX: 0, tableY: 0, zoom: 1 })
    const [isLoading, setIsLoading] = useState(false)
    const [tableColumns, setTableColumns] = useState<Record<string, ColumnInfo[]>>({})
    const [foreignKeys, setForeignKeys] = useState<ForeignKeyInfo[]>([])
    const [isPanning, setIsPanning] = useState(false)
    const [panStart, setPanStart] = useState({ x: 0, y: 0, panX: 0, panY: 0 })
    const [selectedRelId, setSelectedRelId] = useState<string | null>(null)
    const [hoveredRelId, setHoveredRelId] = useState<string | null>(null)
    const canvasRef = useRef<HTMLDivElement>(null)
    const pointerMovedRef = useRef(false)

    const getTableId = (schema: string, name: string) => `${schema}.${name}`
    const compact = zoom < 0.45

    useEffect(() => {
        if (!activeConnectionId || tables.length === 0) return

        const loadAllColumns = async () => {
            setIsLoading(true)
            const columnsMap: Record<string, ColumnInfo[]> = {}

            try {
                const fks = await api.listForeignKeys(activeConnectionId)
                setForeignKeys(fks)
            } catch (error) {
                console.error("Failed to load foreign keys:", error)
                setForeignKeys([])
            }

            for (const table of tables) {
                if (!table.name) continue
                const schema = table.schema || "public"
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

    useEffect(() => {
        if (tables.length === 0) {
            setTablePositions([])
            return
        }

        const COLS = Math.max(3, Math.ceil(Math.sqrt(tables.length)))
        const GAP_X = 80
        const GAP_Y = 56

        setTablePositions((prev) => {
            const prevById = new Map(prev.map((t) => [t.id, t]))

            return tables
                .filter((table) => table.name != null)
                .map((table, index) => {
                    const schema = table.schema || "public"
                    const tableName = table.name as string
                    const tableId = getTableId(schema, tableName)
                    const cols = tableColumns[tableId] || []
                    const existing = prevById.get(tableId)
                    const col = index % COLS
                    const row = Math.floor(index / COLS)

                    return {
                        id: tableId,
                        name: tableName,
                        schema,
                        x: existing?.x ?? col * (CARD_WIDTH + GAP_X) + 48,
                        y: existing?.y ?? row * (220 + GAP_Y) + 48,
                        columns: cols.map((c) => ({
                            name: c.name || "unknown",
                            type: c.data_type || "unknown",
                            isPrimaryKey: c.is_primary_key,
                            isForeignKey: c.is_foreign_key,
                        })),
                    }
                })
        })
    }, [tables, tableColumns])

    useEffect(() => {
        if (!selectedTable || !selectedSchema) return
        const tableId = getTableId(selectedSchema, selectedTable)
        const table = tablePositions.find((t) => t.id === tableId)
        if (table && canvasRef.current) {
            const canvasWidth = canvasRef.current.clientWidth
            const canvasHeight = canvasRef.current.clientHeight
            setPan({
                x: canvasWidth / 2 - (table.x + CARD_WIDTH / 2) * zoom,
                y: canvasHeight / 2 - (table.y + 80) * zoom,
            })
        }
    }, [selectedTable, selectedSchema])

    const relationships: Relationship[] = useMemo(() => {
        return foreignKeys.map((fk, i) => ({
            id: `${fk.constraint_name}-${i}`,
            // line drawn from referenced PK table → FK table (semantic direction)
            from: getTableId(fk.to_schema, fk.to_table),
            fromColumn: fk.to_column,
            to: getTableId(fk.from_schema, fk.from_table),
            toColumn: fk.from_column,
            label: `${fk.from_table}.${fk.from_column} → ${fk.to_table}.${fk.to_column}`,
        }))
    }, [foreignKeys])

    const selectedRel = relationships.find((r) => r.id === selectedRelId) ?? null

    const highlightsByTable = useMemo(() => {
        const map = new Map<string, Set<string>>()
        if (!selectedRel) return map
        map.set(selectedRel.from, new Set([selectedRel.fromColumn]))
        map.set(selectedRel.to, new Set([selectedRel.toColumn]))
        return map
    }, [selectedRel])

    const handleZoomIn = () => setZoom((z) => Math.min(z + 0.1, 2))
    const handleZoomOut = () => setZoom((z) => Math.max(z - 0.1, 0.1))

    const handleFitToScreen = useCallback(() => {
        if (!canvasRef.current || tablePositions.length === 0) return
        const bounds = tablePositions.reduce(
            (acc, t) => ({
                minX: Math.min(acc.minX, t.x),
                minY: Math.min(acc.minY, t.y),
                maxX: Math.max(acc.maxX, t.x + CARD_WIDTH),
                maxY: Math.max(
                    acc.maxY,
                    t.y + HEADER_HEIGHT + CARD_PAD_Y * 2 + Math.max(t.columns.length, 1) * ROW_HEIGHT
                ),
            }),
            { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
        )
        const w = canvasRef.current.clientWidth - 80
        const h = canvasRef.current.clientHeight - 80
        const contentW = bounds.maxX - bounds.minX
        const contentH = bounds.maxY - bounds.minY
        const nextZoom = Math.max(0.1, Math.min(1.2, Math.min(w / contentW, h / contentH) * 0.9))
        setZoom(nextZoom)
        setPan({
            x: 40 - bounds.minX * nextZoom + (w - contentW * nextZoom) / 2,
            y: 40 - bounds.minY * nextZoom + (h - contentH * nextZoom) / 2,
        })
    }, [tablePositions])

    const handleMouseDown = useCallback(
        (e: React.MouseEvent, tableId: string) => {
            e.preventDefault()
            e.stopPropagation()
            const table = tablePositions.find((t) => t.id === tableId)
            if (!table) return
            // Keep relationship selection while repositioning tables
            pointerMovedRef.current = false
            setDraggingId(tableId)
            setDragStart({
                x: e.clientX,
                y: e.clientY,
                tableX: table.x,
                tableY: table.y,
                zoom,
            })
        },
        [tablePositions, zoom]
    )

    const handleMouseMove = useCallback(
        (e: React.MouseEvent) => {
            if (isPanning) {
                const dx = e.clientX - panStart.x
                const dy = e.clientY - panStart.y
                if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
                    pointerMovedRef.current = true
                }
                setPan({
                    x: panStart.panX + dx,
                    y: panStart.panY + dy,
                })
                return
            }
            if (!draggingId) return
            const canvasDeltaX = (e.clientX - dragStart.x) / dragStart.zoom
            const canvasDeltaY = (e.clientY - dragStart.y) / dragStart.zoom
            if (Math.abs(canvasDeltaX) > 0.5 || Math.abs(canvasDeltaY) > 0.5) {
                pointerMovedRef.current = true
            }
            setTablePositions((prev) =>
                prev.map((t) =>
                    t.id === draggingId
                        ? { ...t, x: dragStart.tableX + canvasDeltaX, y: dragStart.tableY + canvasDeltaY }
                        : t
                )
            )
        },
        [draggingId, dragStart, isPanning, panStart]
    )

    const handleMouseUp = useCallback(() => {
        // Only clear selection on a true empty-canvas click (no drag/pan movement)
        if (isPanning && !pointerMovedRef.current) {
            setSelectedRelId(null)
        }
        setDraggingId(null)
        setIsPanning(false)
        pointerMovedRef.current = false
    }, [isPanning])

    const handleCanvasMouseDown = useCallback(
        (e: React.MouseEvent) => {
            if (e.button === 0 || e.button === 1) {
                if ((e.target as HTMLElement).closest("[data-rel-hit]")) return
                // Do not deselect here — wait for mouseup so pan keeps the selection
                pointerMovedRef.current = false
                setIsPanning(true)
                setPanStart({ x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y })
            }
        },
        [pan]
    )

    const handleWheel = useCallback((e: WheelEvent) => {
        e.preventDefault()
        if (e.ctrlKey) {
            const delta = -e.deltaY * 0.01
            setZoom((z) => Math.min(2, Math.max(0.1, z + delta)))
        } else {
            setPan((p) => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }))
        }
    }, [])

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        canvas.addEventListener("wheel", handleWheel, { passive: false })
        return () => canvas.removeEventListener("wheel", handleWheel)
    }, [handleWheel])

    const getRelationshipGeometry = (rel: Relationship) => {
        const fromTable = tablePositions.find((t) => t.id === rel.from)
        const toTable = tablePositions.find((t) => t.id === rel.to)
        if (!fromTable || !toTable) return null

        const fromYWorld = getColumnCenterY(fromTable, rel.fromColumn)
        const toYWorld = getColumnCenterY(toTable, rel.toColumn)

        // Exit right of PK table, enter left of FK table (or flip if needed)
        let x1 = fromTable.x + CARD_WIDTH
        let y1 = fromYWorld
        let x2 = toTable.x
        let y2 = toYWorld

        if (toTable.x + CARD_WIDTH < fromTable.x) {
            x1 = fromTable.x
            x2 = toTable.x + CARD_WIDTH
        }

        return {
            x1: x1 * zoom + pan.x,
            y1: y1 * zoom + pan.y,
            x2: x2 * zoom + pan.x,
            y2: y2 * zoom + pan.y,
        }
    }

    const handleAutoLayout = () => {
        const COLS = Math.max(3, Math.ceil(Math.sqrt(tablePositions.length)))
        const GAP_X = 80
        const GAP_Y = 56
        setTablePositions((prev) =>
            prev.map((table, index) => ({
                ...table,
                x: (index % COLS) * (CARD_WIDTH + GAP_X) + 48,
                y: Math.floor(index / COLS) * (220 + GAP_Y) + 48,
            }))
        )
        setPan({ x: 40, y: 40 })
        setZoom(0.55)
    }

    const currentSelectedId =
        selectedTable && selectedSchema ? getTableId(selectedSchema, selectedTable) : null

    // Dot grid: world-locked, becomes clearer as you zoom in
    const dotSpacing = 18 * zoom
    const dotOpacity = Math.min(0.55, 0.12 + zoom * 0.28)
    const dotSize = Math.max(0.8, Math.min(2.2, 0.7 + zoom * 0.9))

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
        <div className="flex h-full bg-[#0b1416] relative overflow-hidden">
            <div className="flex-1 flex flex-col relative overflow-hidden min-w-0">
                {/* Floating top tools */}
                <div className="absolute top-3 left-3 z-20 flex items-center gap-1 rounded-md border border-emerald-900/50 bg-[#0f1a1c]/90 px-1.5 py-1 shadow-lg backdrop-blur-sm">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 text-emerald-200/80 hover:text-emerald-50 hover:bg-emerald-500/10"
                        onClick={handleAutoLayout}
                        title="Auto-layout"
                    >
                        <Sparkles className="w-3.5 h-3.5" />
                    </Button>
                </div>

                <div
                    ref={canvasRef}
                    className="flex-1 relative overflow-hidden"
                    style={{
                        cursor: isPanning || draggingId ? "grabbing" : "grab",
                    }}
                    onMouseDown={handleCanvasMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                >
                    {/* Spaced dot grid — clearer when zoomed in */}
                    <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                            backgroundColor: "#0b1416",
                            backgroundImage: `radial-gradient(circle, rgba(148, 210, 189, ${dotOpacity}) ${dotSize}px, transparent ${dotSize + 0.5}px)`,
                            backgroundSize: `${dotSpacing}px ${dotSpacing}px`,
                            backgroundPosition: `${pan.x}px ${pan.y}px`,
                        }}
                    />

                    {/* Relationship lines */}
                    <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 1 }}>
                        <defs>
                            <marker
                                id="erd-arrow"
                                markerWidth="8"
                                markerHeight="6"
                                refX="7"
                                refY="3"
                                orient="auto"
                            >
                                <polygon points="0 0, 8 3, 0 6" fill="rgba(125, 211, 252, 0.75)" />
                            </marker>
                            <marker
                                id="erd-arrow-active"
                                markerWidth="8"
                                markerHeight="6"
                                refX="7"
                                refY="3"
                                orient="auto"
                            >
                                <polygon points="0 0, 8 3, 0 6" fill="rgb(56, 189, 248)" />
                            </marker>
                        </defs>

                        {relationships.map((rel) => {
                            const geo = getRelationshipGeometry(rel)
                            if (!geo) return null
                            const path = orthogonalPath(geo.x1, geo.y1, geo.x2, geo.y2)
                            const active = selectedRelId === rel.id
                            const hovered = hoveredRelId === rel.id
                            return (
                                <g key={rel.id}>
                                    {/* Wide invisible hit target */}
                                    <path
                                        data-rel-hit=""
                                        d={path}
                                        fill="none"
                                        stroke="transparent"
                                        strokeWidth={14}
                                        className="cursor-pointer"
                                        onMouseEnter={() => setHoveredRelId(rel.id)}
                                        onMouseLeave={() => setHoveredRelId(null)}
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            setSelectedRelId(rel.id)
                                        }}
                                    />
                                    <path
                                        d={path}
                                        fill="none"
                                        stroke={
                                            active
                                                ? "rgb(56, 189, 248)"
                                                : hovered
                                                  ? "rgba(125, 211, 252, 0.85)"
                                                  : "rgba(94, 134, 148, 0.55)"
                                        }
                                        strokeWidth={active ? 2.25 : hovered ? 1.75 : 1.25}
                                        markerEnd={active ? "url(#erd-arrow-active)" : "url(#erd-arrow)"}
                                        className="pointer-events-none transition-[stroke,stroke-width] duration-150"
                                    />
                                </g>
                            )
                        })}
                    </svg>

                    {/* Tables */}
                    <div className="relative" style={{ zIndex: 2 }}>
                        {tablePositions.map((table) => (
                            <TableCard
                                key={table.id}
                                table={table}
                                zoom={zoom}
                                pan={pan}
                                onMouseDown={handleMouseDown}
                                isDragging={draggingId === table.id}
                                isSelected={currentSelectedId === table.id}
                                highlightedColumns={highlightsByTable.get(table.id) ?? new Set()}
                                compact={compact}
                            />
                        ))}
                    </div>
                </div>

                {/* Bottom-left zoom chrome */}
                <div className="absolute bottom-3 left-3 z-20 flex items-center gap-1 rounded-md border border-emerald-900/50 bg-[#0f1a1c]/92 px-1.5 py-1 shadow-lg backdrop-blur-sm">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 text-emerald-200/80 hover:bg-emerald-500/10"
                        onClick={handleZoomIn}
                        aria-label="Zoom in"
                    >
                        <ZoomIn className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 text-emerald-200/80 hover:bg-emerald-500/10"
                        onClick={handleZoomOut}
                        aria-label="Zoom out"
                    >
                        <ZoomOut className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 text-emerald-200/80 hover:bg-emerald-500/10"
                        onClick={handleFitToScreen}
                        aria-label="Fit to screen"
                    >
                        <Maximize2 className="w-3.5 h-3.5" />
                    </Button>
                    <span className="px-2 text-[11px] tabular-nums text-emerald-300/80 min-w-[3rem]">
                        {Math.round(zoom * 100)}%
                    </span>
                    <span className="pr-2 text-[11px] text-emerald-700/90 border-l border-emerald-900/60 pl-2">
                        {tablePositions.length} tables · {relationships.length} links
                    </span>
                </div>

                {/* Mini-map */}
                <div className="absolute bottom-3 right-3 z-20 w-40 h-24 rounded-md border border-emerald-900/50 bg-[#0f1a1c]/90 overflow-hidden shadow-lg backdrop-blur-sm">
                    <div className="relative w-full h-full bg-[#0b1416]/80">
                        {tablePositions.map((table) => (
                            <div
                                key={table.id}
                                className={cn(
                                    "absolute rounded-[2px]",
                                    table.id === currentSelectedId
                                        ? "bg-emerald-400"
                                        : highlightsByTable.has(table.id)
                                          ? "bg-sky-400"
                                          : "bg-emerald-700/70"
                                )}
                                style={{
                                    left: `${4 + (table.x / 14)}px`,
                                    top: `${4 + (table.y / 16)}px`,
                                    width: 14,
                                    height: 8,
                                }}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Relationship inspector */}
            {selectedRel && (
                <aside className="w-72 shrink-0 border-l border-emerald-900/50 bg-[#0f1a1c] flex flex-col">
                    <div className="flex items-start justify-between gap-2 px-4 py-3 border-b border-emerald-900/50">
                        <div className="min-w-0">
                            <div className="text-[10px] uppercase tracking-wider text-emerald-700/90 mb-1">
                                Relationship
                            </div>
                            <div className="text-sm font-medium text-emerald-50 break-words leading-snug">
                                {selectedRel.label}
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="w-7 h-7 shrink-0 text-emerald-400/70 hover:text-emerald-50"
                            onClick={() => setSelectedRelId(null)}
                            aria-label="Close"
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                    <div className="p-4 space-y-4 text-sm">
                        <div>
                            <div className="text-[11px] text-emerald-700/90 mb-1">Referenced table</div>
                            <div className="rounded-md border border-emerald-900/50 bg-[#0b1416] px-3 py-2 text-emerald-100">
                                <div className="font-medium">{selectedRel.from}</div>
                                <div className="text-xs text-sky-300 mt-0.5">{selectedRel.fromColumn}</div>
                            </div>
                        </div>
                        <div>
                            <div className="text-[11px] text-emerald-700/90 mb-1">Foreign key table</div>
                            <div className="rounded-md border border-emerald-900/50 bg-[#0b1416] px-3 py-2 text-emerald-100">
                                <div className="font-medium">{selectedRel.to}</div>
                                <div className="text-xs text-sky-300 mt-0.5">{selectedRel.toColumn}</div>
                            </div>
                        </div>
                        <p className="text-[11px] text-emerald-700/90 leading-relaxed">
                            Connected fields are marked with a dashed circle on the diagram.
                        </p>
                    </div>
                </aside>
            )}
        </div>
    )
}
