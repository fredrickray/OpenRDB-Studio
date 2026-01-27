import { ChevronDown, ChevronRight, Database, Table, Columns, Key, Hash, Type, Calendar, ToggleLeft } from "lucide-react"
import { useState } from "react"
import { useTableStore } from "@/stores/tableStore"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useConnectionStore } from "@/stores/connectionStore"

const typeIcons: Record<string, React.ReactNode> = {
    uuid: <Key className="w-3 h-3 text-yellow-400" />,
    'varchar': <Type className="w-3 h-3 text-green-400" />,
    integer: <Hash className="w-3 h-3 text-blue-400" />,
    boolean: <ToggleLeft className="w-3 h-3 text-purple-400" />,
    timestamp: <Calendar className="w-3 h-3 text-orange-400" />,
}

function getTypeIcon(type: string) {
    if (type.startsWith('varchar')) return typeIcons['varchar']
    return typeIcons[type] || <Type className="w-3 h-3 text-muted-foreground" />
}

export function WorkspaceSidebar() {
    const { databases, selectedDatabase, selectedTable, setSelectedDatabase, setSelectedTable } = useTableStore()
    const { activeConnectionId, connections } = useConnectionStore()
    const activeConnection = connections.find(c => c.id === activeConnectionId)

    const [expandedDbs, setExpandedDbs] = useState<Set<string>>(new Set(['Inventory_DB']))
    const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set(['products_table']))

    const toggleDb = (dbName: string) => {
        const next = new Set(expandedDbs)
        if (next.has(dbName)) next.delete(dbName)
        else next.add(dbName)
        setExpandedDbs(next)
    }

    const toggleTable = (tableName: string) => {
        const next = new Set(expandedTables)
        if (next.has(tableName)) next.delete(tableName)
        else next.add(tableName)
        setExpandedTables(next)
    }

    const selectedDb = databases.find(db => db.name === selectedDatabase)
    const selectedTbl = selectedDb?.tables.find(t => t.name === selectedTable)

    return (
        <div className="w-64 h-full bg-sidebar border-r border-border flex flex-col">
            {/* Connection Header */}
            <div className="p-3 border-b border-border">
                <div className="flex items-center gap-2 mb-3">
                    <Database className="w-4 h-4 text-primary" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                            {activeConnection?.name || 'Localhost:5432'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                            PostgreSQL 15.2
                        </p>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                </div>
                <Button variant="default" size="sm" className="w-full">
                    NEW CONNECTION
                </Button>
            </div>

            {/* Database Tree */}
            <ScrollArea className="flex-1">
                <div className="p-2">
                    {databases.map((db) => (
                        <div key={db.name}>
                            {/* Database */}
                            <button
                                onClick={() => {
                                    toggleDb(db.name)
                                    setSelectedDatabase(db.name)
                                }}
                                className={cn(
                                    "w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-accent text-left",
                                    selectedDatabase === db.name && "bg-accent"
                                )}
                            >
                                {expandedDbs.has(db.name) ? (
                                    <ChevronDown className="w-3 h-3 text-muted-foreground" />
                                ) : (
                                    <ChevronRight className="w-3 h-3 text-muted-foreground" />
                                )}
                                <Database className="w-4 h-4 text-primary" />
                                <span className="flex-1 truncate">{db.name}</span>
                            </button>

                            {/* Tables */}
                            {expandedDbs.has(db.name) && (
                                <div className="ml-4">
                                    <div className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground">
                                        <ChevronDown className="w-3 h-3" />
                                        <span>Tables ({db.tables.length})</span>
                                    </div>
                                    {db.tables.map((table) => (
                                        <div key={table.name}>
                                            <button
                                                onClick={() => {
                                                    setSelectedTable(table.name)
                                                    toggleTable(table.name)
                                                }}
                                                className={cn(
                                                    "w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-accent text-left ml-2",
                                                    selectedTable === table.name && "bg-primary/20 text-primary"
                                                )}
                                            >
                                                <Table className="w-3 h-3" />
                                                <span className="flex-1 truncate">{table.name}</span>
                                            </button>

                                            {/* Columns */}
                                            {expandedTables.has(table.name) && selectedTable === table.name && (
                                                <div className="ml-6 border-l border-border pl-2 my-1">
                                                    {table.columns.map((col) => (
                                                        <div
                                                            key={col.name}
                                                            className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                                                        >
                                                            {getTypeIcon(col.type)}
                                                            <span className={cn(col.isPrimaryKey && "text-yellow-400")}>
                                                                {col.name}
                                                            </span>
                                                            <span className="text-muted-foreground/60">({col.type.split('(')[0]})</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </div>
    )
}
