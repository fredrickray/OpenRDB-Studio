import { Search, Plus } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ConnectionTreeItem } from "./ConnectionTreeItem"
import { useConnectionStore } from "@/stores/connectionStore"
import { useMemo, useState } from "react"

export function ConnectionSidebar() {
    const { connections, openModal, isLoaded } = useConnectionStore()
    const [searchQuery, setSearchQuery] = useState("")

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

    return (
        <div className="w-72 h-full bg-sidebar border-r border-border flex flex-col">
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
        </div>
    )
}
