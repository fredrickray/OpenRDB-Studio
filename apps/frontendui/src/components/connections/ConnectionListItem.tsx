import { cn } from "@/lib/utils"
import type { Connection } from "@/stores/connectionStore"
import { useConnectionStore } from "@/stores/connectionStore"
import { Database } from "lucide-react"

interface ConnectionListItemProps {
    connection: Connection
}

const colorMap = {
    red: "border-l-red-500",
    yellow: "border-l-yellow-500",
    purple: "border-l-purple-500",
    blue: "border-l-blue-500",
    green: "border-l-green-500",
}

const statusColors = {
    connected: "bg-green-500",
    disconnected: "bg-gray-500",
    error: "bg-red-500",
}

export function ConnectionListItem({ connection }: ConnectionListItemProps) {
    const { activeConnectionId, setActiveConnection } = useConnectionStore()
    const isActive = activeConnectionId === connection.id

    return (
        <div
            className={cn(
                "group relative flex items-start gap-3 p-3 cursor-pointer border-l-4 transition-all",
                colorMap[connection.color],
                isActive
                    ? "bg-card"
                    : "bg-transparent hover:bg-card/50"
            )}
            onClick={() => setActiveConnection(connection.id)}
        >
            <div className="flex-shrink-0 mt-0.5">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                    <Database className="w-4 h-4 text-muted-foreground" />
                </div>
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-foreground truncate">
                        {connection.name}
                    </h3>
                    <span
                        className={cn(
                            "w-2 h-2 rounded-full flex-shrink-0",
                            statusColors[connection.status]
                        )}
                    />
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {connection.host}:{connection.port}
                </p>
            </div>

            {isActive && (
                <span className="text-xs text-primary font-medium">
                    SELECTED
                </span>
            )}
        </div>
    )
}

