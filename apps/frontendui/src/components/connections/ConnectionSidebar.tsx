import { Search, Plus, GripVertical } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ConnectionTreeItem } from "./ConnectionTreeItem"
import { useConnectionStore } from "@/stores/connectionStore"
import { useWorkspaceUiStore } from "@/stores/workspaceUiStore"
import { useCallback, useMemo, useRef, useState } from "react"

const MIN_WIDTH = 200
const MAX_WIDTH = 480

export function ConnectionSidebar() {
    const { connections, openModal, isLoaded } = useConnectionStore()
    const { connectionsSidebarWidth, connectionsSidebarCollapsed, setConnectionsSidebarWidth } =
        useWorkspaceUiStore()
    const [searchQuery, setSearchQuery] = useState("")
    const isResizing = useRef(false)

    const filtered = useMemo(() => {
        const q = searchQuery.trim().toLowerCase()
        if (!q) return connections
        return connections.filter(
            (conn) =>
                conn.name.toLowerCase().includes(q) ||
                conn.host.toLowerCase().includes(q) ||
                (conn.databases || []).some((db) => db.name.toLowerCase().includes(q))
        )
    }, [connections, searchQuery])

    const emptyMessage = !isLoaded
        ? "Loading connections…"
        : searchQuery
          ? "No connections match your search"
          : "No connections yet"

    const startResizing = useCallback(
        (e: React.MouseEvent) => {
            isResizing.current = true
            e.preventDefault()

            const startX = e.clientX
            const startWidth = connectionsSidebarWidth

            const handleMouseMove = (moveEvent: MouseEvent) => {
                if (!isResizing.current) return
                const next = Math.min(
                    MAX_WIDTH,
                    Math.max(MIN_WIDTH, startWidth + (moveEvent.clientX - startX))
                )
                setConnectionsSidebarWidth(next)
            }

            const handleMouseUp = () => {
                isResizing.current = false
                document.removeEventListener("mousemove", handleMouseMove)
                document.removeEventListener("mouseup", handleMouseUp)
                document.body.style.cursor = ""
                document.body.style.userSelect = ""
            }

            document.addEventListener("mousemove", handleMouseMove)
            document.addEventListener("mouseup", handleMouseUp)
            document.body.style.cursor = "col-resize"
            document.body.style.userSelect = "none"
        },
        [connectionsSidebarWidth, setConnectionsSidebarWidth]
    )

    if (connectionsSidebarCollapsed) {
        return null
    }

    return (
        <div
            className="h-full bg-sidebar border-r border-border flex flex-col relative shrink-0"
            style={{ width: `${connectionsSidebarWidth}px`, minWidth: `${MIN_WIDTH}px` }}
        >
            <div className="p-3 border-b border-border space-y-3">
                <div className="flex items-center justify-between gap-2">
                    <h2 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                        Connections ({connections.length})
                    </h2>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openModal()}
                        aria-label="New connection"
                        title="New connection"
                    >
                        <Plus className="w-4 h-4" />
                    </Button>
                </div>
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                        placeholder="Search connections"
                        className="pl-8 h-8 text-sm bg-input"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        aria-label="Search connections"
                    />
                </div>
            </div>

            <ScrollArea className="flex-1">
                <div className="py-2">
                    {filtered.length > 0 ? (
                        filtered.map((connection) => (
                            <ConnectionTreeItem key={connection.id} connection={connection} />
                        ))
                    ) : (
                        <div className="px-4 py-8 text-center text-muted-foreground text-sm">
                            {emptyMessage}
                        </div>
                    )}
                </div>
            </ScrollArea>

            <div className="p-3 border-t border-border">
                <Button onClick={() => openModal()} className="w-full" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    New Connection
                </Button>
            </div>

            <div
                role="separator"
                aria-orientation="vertical"
                aria-label="Resize connections sidebar"
                title="Drag to resize"
                className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/50 transition-colors group"
                onMouseDown={startResizing}
            >
                <div className="absolute top-1/2 -translate-y-1/2 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <GripVertical className="w-3 h-3 text-muted-foreground" />
                </div>
            </div>
        </div>
    )
}
