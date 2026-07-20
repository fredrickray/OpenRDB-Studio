import { cn } from "@/lib/utils"
import type { Connection } from "@/stores/connectionStore"
import { useConnectionStore } from "@/stores/connectionStore"
import { useTableStore } from "@/stores/tableStore"
import {
    ChevronRight,
    ChevronDown,
    Server,
    Database,
    Star,
    RefreshCw,
    Plus,
    MoreHorizontal,
    Loader2,
    AlertCircle,
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { useState } from "react"

interface ConnectionTreeItemProps {
    connection: Connection
}

const colorDot: Record<string, string> = {
    red: "bg-red-500",
    yellow: "bg-yellow-500",
    purple: "bg-purple-500",
    blue: "bg-blue-500",
    green: "bg-green-500",
    none: "bg-transparent",
}

export function ConnectionTreeItem({ connection }: ConnectionTreeItemProps) {
    const navigate = useNavigate()
    const {
        activeConnectionId,
        setActiveConnection,
        toggleExpanded,
        refreshDatabases,
        connectToDatabase,
        openCreateDbModal,
        openModal,
    } = useConnectionStore()
    const setActiveTableConnection = useTableStore((s) => s.setActiveConnection)
    const [isConnectingDb, setIsConnectingDb] = useState<string | null>(null)

    const isActive = activeConnectionId === connection.id
    const expanded = !!connection.expanded
    const databases = connection.databases || []

    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation()
        toggleExpanded(connection.id)
    }

    const handleSelectConnection = () => {
        setActiveConnection(connection.id)
        if (!expanded) {
            toggleExpanded(connection.id)
        }
    }

    const handleRefresh = async (e: React.MouseEvent) => {
        e.stopPropagation()
        setActiveConnection(connection.id)
        await refreshDatabases(connection.id)
    }

    const handleCreateDb = (e: React.MouseEvent) => {
        e.stopPropagation()
        openCreateDbModal(connection.id)
    }

    const handleOpenDb = async (dbName: string) => {
        setIsConnectingDb(dbName)
        setActiveConnection(connection.id)
        try {
            const info = await connectToDatabase(connection.id, dbName)
            if (info) {
                setActiveTableConnection(info.id, dbName)
                navigate('/workspace')
            }
        } finally {
            setIsConnectingDb(null)
        }
    }

    return (
        <div className="select-none">
            <div
                className={cn(
                    "group flex items-center gap-1 px-2 py-1.5 mx-1 rounded-md cursor-pointer transition-colors",
                    isActive ? "bg-accent/80" : "hover:bg-accent/40"
                )}
                onClick={handleSelectConnection}
                onDoubleClick={() => openModal(connection)}
            >
                <button
                    type="button"
                    className="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0"
                    onClick={handleToggle}
                    aria-label={expanded ? "Collapse" : "Expand"}
                >
                    {expanded ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                    )}
                </button>

                <div className="relative shrink-0">
                    {connection.favorite ? (
                        <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                    ) : (
                        <Server className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                    <span
                        className={cn(
                            "absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full ring-1 ring-background",
                            connection.status === "connected" && "bg-green-500",
                            connection.status === "error" && "bg-red-500",
                            connection.status === "connecting" && "bg-blue-500",
                            connection.status === "testing" && "bg-yellow-500",
                            connection.status === "disconnected" && "bg-muted-foreground/50"
                        )}
                    />
                </div>

                {connection.color !== "none" && (
                    <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", colorDot[connection.color])} />
                )}

                <span className="text-sm truncate flex-1 min-w-0">{connection.name}</span>

                <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        title="Refresh databases"
                        onClick={handleRefresh}
                    >
                        <RefreshCw className={cn("w-3 h-3", connection.isLoadingDatabases && "animate-spin")} />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        title="Create database"
                        onClick={handleCreateDb}
                    >
                        <Plus className="w-3 h-3" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        title="Edit connection"
                        onClick={(e) => {
                            e.stopPropagation()
                            openModal(connection)
                        }}
                    >
                        <MoreHorizontal className="w-3 h-3" />
                    </Button>
                </div>
            </div>

            {expanded && (
                <div className="ml-4 pl-2 border-l border-border/60">
                    {connection.isLoadingDatabases && databases.length === 0 && (
                        <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Loading databases…
                        </div>
                    )}

                    {!connection.isLoadingDatabases && connection.errorMessage && databases.length === 0 && (
                        <div className="flex items-start gap-2 px-3 py-2 text-xs text-destructive">
                            <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                            <span className="break-words">{connection.errorMessage}</span>
                        </div>
                    )}

                    {!connection.isLoadingDatabases && !connection.errorMessage && databases.length === 0 && (
                        <div className="px-3 py-2 text-xs text-muted-foreground">
                            No databases found
                        </div>
                    )}

                    {databases.map((db) => {
                        const isActiveDb =
                            isActive &&
                            connection.activeDatabase === db.name &&
                            connection.status === "connected"
                        const connecting = isConnectingDb === db.name

                        return (
                            <button
                                key={db.name}
                                type="button"
                                className={cn(
                                    "w-full flex items-center gap-2 px-2 py-1.5 mx-1 rounded-md text-left transition-colors",
                                    isActiveDb
                                        ? "bg-primary/15 text-foreground"
                                        : "hover:bg-accent/40 text-muted-foreground hover:text-foreground"
                                )}
                                onClick={() => handleOpenDb(db.name)}
                                disabled={connecting}
                            >
                                <span className="w-4" />
                                {connecting ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                                ) : (
                                    <Database className="w-3.5 h-3.5 shrink-0 text-emerald-500/80" />
                                )}
                                <span className="text-sm truncate flex-1">{db.name}</span>
                                {db.size && (
                                    <span className="text-[10px] text-muted-foreground/70 shrink-0">
                                        {db.size}
                                    </span>
                                )}
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
