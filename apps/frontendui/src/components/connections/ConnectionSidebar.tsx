import { Search, Plus, Star } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ConnectionListItem } from "./ConnectionListItem"
import { useConnectionStore } from "@/stores/connectionStore"
import { useState } from "react"

export function ConnectionSidebar() {
    const { connections, openModal } = useConnectionStore()
    const [searchQuery, setSearchQuery] = useState("")

    const filteredConnections = connections.filter((conn) =>
        conn.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conn.host.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="w-72 h-full bg-sidebar border-r border-border flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-border">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-lg font-semibold text-foreground">OpenRDB Studio</h1>
                    <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                            v0.1.0
                        </span>
                    </div>
                </div>
                <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                    Connections
                </h2>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search connections..."
                        className="pl-9 bg-input"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Connection List */}
            <ScrollArea className="flex-1">
                <div className="py-2">
                    {filteredConnections.length > 0 ? (
                        filteredConnections.map((connection) => (
                            <ConnectionListItem key={connection.id} connection={connection} />
                        ))
                    ) : (
                        <div className="px-4 py-8 text-center text-muted-foreground text-sm">
                            No connections found
                        </div>
                    )}
                </div>
            </ScrollArea>

            {/* New Connection Button */}
            <div className="p-4 border-t border-border">
                <Button
                    onClick={() => openModal()}
                    className="w-full"
                    variant="default"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    New Connection
                </Button>
            </div>

            {/* Favorites */}
            <div className="p-4 pt-0">
                <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground cursor-pointer">
                    <Star className="w-4 h-4" />
                    <span className="text-sm">Favorites</span>
                </div>
            </div>
        </div>
    )
}
