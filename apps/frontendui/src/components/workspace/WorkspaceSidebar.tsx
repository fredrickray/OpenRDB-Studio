import { ChevronDown, ChevronRight, Database, Table, RefreshCw, Loader2, AlertCircle } from "lucide-react"
import { useState, useEffect } from "react"
import { useTableStore } from "@/stores/tableStore"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { useNavigate } from "react-router-dom"

export function WorkspaceSidebar() {
    const {
        tables,
        selectedTable,
        selectedSchema,
        connectedDatabase,
        activeConnectionId,
        isLoadingTables,
        error,
        setSelectedTable,
        fetchTables
    } = useTableStore()

    const navigate = useNavigate()
    const [expandedSchemas, setExpandedSchemas] = useState<Set<string>>(new Set(['public']))

    // Group tables by schema
    const tablesBySchema = tables.reduce((acc, table) => {
        const schema = table.schema || 'public'
        if (!acc[schema]) acc[schema] = []
        acc[schema].push(table)
        return acc
    }, {} as Record<string, typeof tables>)

    const toggleSchema = (schemaName: string) => {
        const next = new Set(expandedSchemas)
        if (next.has(schemaName)) next.delete(schemaName)
        else next.add(schemaName)
        setExpandedSchemas(next)
    }

    const handleTableClick = (schema: string | null, tableName: string | null) => {
        setSelectedTable(schema, tableName)
    }

    const handleNewConnection = () => {
        navigate('/')
    }

    if (!activeConnectionId) {
        return (
            <div className="w-64 h-full bg-sidebar border-r border-border flex flex-col items-center justify-center p-4">
                <Database className="w-8 h-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground text-center mb-4">
                    No active connection
                </p>
                <Button onClick={handleNewConnection} size="sm">
                    Connect to Database
                </Button>
            </div>
        )
    }

    return (
        <div className="w-64 h-full bg-sidebar border-r border-border flex flex-col">
            {/* Connection Header */}
            <div className="p-3 border-b border-border">
                <div className="flex items-center gap-2 mb-3">
                    <Database className="w-4 h-4 text-primary" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                            {connectedDatabase || 'Connected'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                            {tables.length} tables
                        </p>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={handleNewConnection}>
                        Connections
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => fetchTables()}
                        disabled={isLoadingTables}
                    >
                        {isLoadingTables ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <RefreshCw className="w-4 h-4" />
                        )}
                    </Button>
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div className="p-2 bg-red-500/10 border-b border-red-500/20">
                    <div className="flex items-start gap-2 text-red-500 text-xs">
                        <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                        <span>{error}</span>
                    </div>
                </div>
            )}

            {/* Loading State */}
            {isLoadingTables && tables.length === 0 && (
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                        <p className="text-xs text-muted-foreground">Loading tables...</p>
                    </div>
                </div>
            )}

            {/* Database Tree */}
            {!isLoadingTables && tables.length === 0 && !error && (
                <div className="flex-1 flex items-center justify-center p-4">
                    <p className="text-sm text-muted-foreground text-center">
                        No tables found in this database
                    </p>
                </div>
            )}

            {tables.length > 0 && (
                <ScrollArea className="flex-1">
                    <div className="p-2">
                        {Object.entries(tablesBySchema).map(([schema, schemaTables]) => (
                            <div key={schema}>
                                {/* Schema */}
                                <button
                                    onClick={() => toggleSchema(schema)}
                                    className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-accent text-left"
                                >
                                    {expandedSchemas.has(schema) ? (
                                        <ChevronDown className="w-3 h-3 text-muted-foreground" />
                                    ) : (
                                        <ChevronRight className="w-3 h-3 text-muted-foreground" />
                                    )}
                                    <Database className="w-4 h-4 text-primary" />
                                    <span className="flex-1 truncate">{schema}</span>
                                    <span className="text-xs text-muted-foreground">
                                        {schemaTables.length}
                                    </span>
                                </button>

                                {/* Tables */}
                                {expandedSchemas.has(schema) && (
                                    <div className="ml-4">
                                        {schemaTables.map((table) => (
                                            <button
                                                key={`${schema}.${table.name}`}
                                                onClick={() => handleTableClick(schema, table.name)}
                                                className={cn(
                                                    "w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-accent text-left ml-2",
                                                    selectedTable === table.name && selectedSchema === schema &&
                                                    "bg-primary/20 text-primary"
                                                )}
                                            >
                                                <Table className="w-3 h-3" />
                                                <span className="flex-1 truncate">{table.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            )}
        </div>
    )
}
