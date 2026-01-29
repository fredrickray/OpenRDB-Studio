import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { ZoomIn, ZoomOut, Hand, Maximize2, LayoutGrid, Sparkles, Move, Search, Download } from "lucide-react"
import { cn } from "@/lib/utils"

// Mock table data for ERD
const initialTables = [
    {
        id: 'users',
        name: 'users',
        x: 80,
        y: 100,
        columns: [
            { name: 'id', type: 'UUID', isPrimaryKey: true, isForeignKey: false },
            { name: 'username', type: 'VARCHAR(50)', isPrimaryKey: false, isForeignKey: false },
            { name: 'email', type: 'VARCHAR(255)', isPrimaryKey: false, isForeignKey: false },
            { name: 'created_at', type: 'TIMESTAMP', isPrimaryKey: false, isForeignKey: false },
        ]
    },
    {
        id: 'profiles',
        name: 'profiles',
        x: 380,
        y: 160,
        columns: [
            { name: 'id', type: 'UUID', isPrimaryKey: true, isForeignKey: false },
            { name: 'user_id', type: 'UUID', isPrimaryKey: false, isForeignKey: true },
            { name: 'bio', type: 'TEXT', isPrimaryKey: false, isForeignKey: false },
        ]
    },
    {
        id: 'orders',
        name: 'orders',
        x: 80,
        y: 320,
        columns: [
            { name: 'id', type: 'BIGINT', isPrimaryKey: true, isForeignKey: false },
            { name: 'user_id', type: 'UUID', isPrimaryKey: false, isForeignKey: true },
            { name: 'total', type: 'DECIMAL(10,2)', isPrimaryKey: false, isForeignKey: false },
        ]
    },
]

// Relationships between tables
const mockRelationships = [
    { from: 'users', fromColumn: 'id', to: 'profiles', toColumn: 'user_id' },
    { from: 'users', fromColumn: 'id', to: 'orders', toColumn: 'user_id' },
]

interface TableData {
    id: string
    name: string
    x: number
    y: number
    columns: { name: string; type: string; isPrimaryKey: boolean; isForeignKey: boolean }[]
}

interface TableCardProps {
    table: TableData
    zoom: number
    onMouseDown: (e: React.MouseEvent, id: string) => void
    isDragging: boolean
}

function TableCard({ table, zoom, onMouseDown, isDragging }: TableCardProps) {
    return (
        <div
            className={cn(
                "absolute bg-card border border-border rounded-lg shadow-lg overflow-hidden select-none",
                isDragging ? "cursor-grabbing shadow-2xl ring-2 ring-primary" : "cursor-grab hover:shadow-xl"
            )}
            style={{
                left: table.x * zoom,
                top: table.y * zoom,
                transform: `scale(${zoom})`,
                transformOrigin: 'top left',
                minWidth: 180,
                zIndex: isDragging ? 100 : 1,
            }}
            onMouseDown={(e) => onMouseDown(e, table.id)}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b border-border">
                <span className="text-sm font-semibold">{table.name}</span>
                <button className="text-muted-foreground hover:text-foreground" onClick={(e) => e.stopPropagation()}>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                    </svg>
                </button>
            </div>

            {/* Columns */}
            <div className="py-1">
                {table.columns.map((col) => (
                    <div
                        key={col.name}
                        className={cn(
                            "flex items-center justify-between px-3 py-1 text-xs hover:bg-accent/50",
                            col.isForeignKey && "text-primary"
                        )}
                    >
                        <div className="flex items-center gap-2">
                            {col.isPrimaryKey && <span className="text-yellow-400">🔑</span>}
                            {col.isForeignKey && <span className="text-primary">🔗</span>}
                            {!col.isPrimaryKey && !col.isForeignKey && <span className="w-4 text-center">☐</span>}
                            <span className={cn(col.isForeignKey && "text-primary")}>{col.name}</span>
                        </div>
                        <span className="text-muted-foreground text-[10px]">{col.type}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}

export function ErdView() {
    const [zoom, setZoom] = useState(1)
    const [pan, setPan] = useState({ x: 0, y: 0 })
    const [tables, setTables] = useState<TableData[]>(initialTables)
    const [draggingId, setDraggingId] = useState<string | null>(null)
    const [dragStart, setDragStart] = useState({ x: 0, y: 0, tableX: 0, tableY: 0 })
    const [selectedTable, setSelectedTable] = useState<string>('users')
    const canvasRef = useRef<HTMLDivElement>(null)

    const handleZoomIn = () => setZoom(z => Math.min(z + 0.1, 2))
    const handleZoomOut = () => setZoom(z => Math.max(z - 0.1, 0.5))
    const handleFitToScreen = () => setZoom(0.85)

    const handleMouseDown = useCallback((e: React.MouseEvent, tableId: string) => {
        e.preventDefault()
        const table = tables.find(t => t.id === tableId)
        if (!table) return

        setDraggingId(tableId)
        setSelectedTable(tableId)
        setDragStart({
            x: e.clientX,
            y: e.clientY,
            tableX: table.x,
            tableY: table.y,
        })
    }, [tables])

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!draggingId) return

        const dx = (e.clientX - dragStart.x) / zoom
        const dy = (e.clientY - dragStart.y) / zoom

        setTables(prevTables =>
            prevTables.map(t =>
                t.id === draggingId
                    ? { ...t, x: dragStart.tableX + dx, y: dragStart.tableY + dy }
                    : t
            )
        )
    }, [draggingId, dragStart, zoom])

    const handleMouseUp = useCallback(() => {
        setDraggingId(null)
    }, [])

    // Draw relationship lines
    const getRelationshipPath = (rel: typeof mockRelationships[0]) => {
        const fromTable = tables.find(t => t.id === rel.from)
        const toTable = tables.find(t => t.id === rel.to)
        if (!fromTable || !toTable) return ''

        const fromX = (fromTable.x + 180) * zoom + pan.x
        const fromY = (fromTable.y + 50) * zoom + pan.y
        const toX = toTable.x * zoom + pan.x
        const toY = (toTable.y + 50) * zoom + pan.y

        const midX = (fromX + toX) / 2
        return `M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`
    }

    const handleAutoLayout = () => {
        setTables([
            { ...tables[0], x: 80, y: 100 },
            { ...tables[1], x: 380, y: 160 },
            { ...tables[2], x: 80, y: 320 },
        ])
    }

    return (
        <div className="flex flex-col h-full bg-background relative overflow-hidden">
            {/* Toolbar */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 bg-card border border-border rounded-lg px-2 py-1 shadow-lg">
                <Button variant="ghost" size="icon" className="w-8 h-8" onClick={handleZoomIn}>
                    <ZoomIn className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="w-8 h-8" onClick={handleZoomOut}>
                    <ZoomOut className="w-4 h-4" />
                </Button>
                <div className="w-px h-6 bg-border mx-1" />
                <Button variant="ghost" size="icon" className="w-8 h-8">
                    <Hand className="w-4 h-4" />
                </Button>
                <div className="w-px h-6 bg-border mx-1" />
                <Button variant="ghost" size="icon" className="w-8 h-8" onClick={handleFitToScreen}>
                    <Maximize2 className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="w-8 h-8">
                    <LayoutGrid className="w-4 h-4" />
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
                className="flex-1 relative overflow-hidden"
                style={{ cursor: draggingId ? 'grabbing' : 'default' }}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                {/* Relationship Lines SVG */}
                <svg
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    style={{ zIndex: 1 }}
                >
                    {mockRelationships.map((rel, i) => (
                        <path
                            key={i}
                            d={getRelationshipPath(rel)}
                            fill="none"
                            stroke="#3b82f6"
                            strokeWidth={2}
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
                                fill="#3b82f6"
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
                    {tables.map((table) => (
                        <TableCard
                            key={table.id}
                            table={table}
                            zoom={zoom}
                            onMouseDown={handleMouseDown}
                            isDragging={draggingId === table.id}
                        />
                    ))}
                </div>
            </div>

            {/* Mini-map */}
            <div className="absolute bottom-20 right-4 w-40 h-24 bg-card border border-border rounded-lg overflow-hidden shadow-lg">
                <div className="px-2 py-1 text-[10px] text-muted-foreground border-b border-border">
                    MINI-MAP
                </div>
                <div className="relative w-full h-16 bg-muted/30">
                    {tables.map((table) => (
                        <div
                            key={table.id}
                            className={cn(
                                "absolute rounded transition-all",
                                table.id === selectedTable ? "bg-primary" : "bg-primary/50"
                            )}
                            style={{
                                left: table.x / 8,
                                top: table.y / 10,
                                width: 20,
                                height: 12,
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* Bottom Controls */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 bg-card border border-border rounded-lg px-2 py-1 shadow-lg">
                <Button variant="ghost" size="icon" className="w-8 h-8">
                    <Move className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="w-8 h-8">
                    <Hand className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="w-8 h-8">
                    <Search className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="w-8 h-8">
                    <Download className="w-4 h-4" />
                </Button>
            </div>

            {/* Status Bar - Left */}
            <div className="absolute bottom-4 left-4 flex items-center gap-4 text-xs text-muted-foreground">
                <span>{Math.round(zoom * 100)}%</span>
                <span>TABLES: {tables.length}</span>
                <span>LINES: {mockRelationships.length}</span>
            </div>

            {/* Status Bar - Right */}
            <div className="absolute bottom-4 right-48 text-xs text-primary">
                SELECTION: {selectedTable.toUpperCase()}.ID
            </div>

            {/* Zoom Slider */}
            <div className="absolute bottom-4 left-28 flex items-center gap-2">
                <input
                    type="range"
                    min="50"
                    max="200"
                    value={zoom * 100}
                    onChange={(e) => setZoom(Number(e.target.value) / 100)}
                    className="w-20 h-1 appearance-none bg-muted rounded cursor-pointer"
                />
            </div>
        </div>
    )
}
