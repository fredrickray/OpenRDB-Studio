import { useTableStore } from "@/stores/tableStore"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Key, Type, Hash, ToggleLeft, Calendar, Check, X } from "lucide-react"
import { cn } from "@/lib/utils"

const typeIcons: Record<string, React.ReactNode> = {
    uuid: <Key className="w-4 h-4 text-yellow-400" />,
    'varchar': <Type className="w-4 h-4 text-green-400" />,
    integer: <Hash className="w-4 h-4 text-blue-400" />,
    boolean: <ToggleLeft className="w-4 h-4 text-purple-400" />,
    timestamp: <Calendar className="w-4 h-4 text-orange-400" />,
}

function getTypeIcon(type: string) {
    if (type.startsWith('varchar')) return typeIcons['varchar']
    return typeIcons[type] || <Type className="w-4 h-4 text-muted-foreground" />
}

export function StructureTab() {
    const { databases, selectedDatabase, selectedTable } = useTableStore()

    const selectedDb = databases.find(db => db.name === selectedDatabase)
    const selectedTbl = selectedDb?.tables.find(t => t.name === selectedTable)
    const columns = selectedTbl?.columns || []

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b border-border">
                <h3 className="text-lg font-semibold">Table Structure</h3>
                <p className="text-sm text-muted-foreground">
                    {selectedTable} • {columns.length} columns
                </p>
            </div>

            <ScrollArea className="flex-1">
                <table className="w-full text-sm">
                    <thead className="bg-muted/30 sticky top-0">
                        <tr className="border-b border-border">
                            <th className="p-3 text-left text-xs font-medium text-muted-foreground">COLUMN NAME</th>
                            <th className="p-3 text-left text-xs font-medium text-muted-foreground">DATA TYPE</th>
                            <th className="p-3 text-left text-xs font-medium text-muted-foreground">NULLABLE</th>
                            <th className="p-3 text-left text-xs font-medium text-muted-foreground">DEFAULT VALUE</th>
                            <th className="p-3 text-left text-xs font-medium text-muted-foreground">CONSTRAINTS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {columns.map((col, idx) => (
                            <tr key={col.name} className="border-b border-border hover:bg-accent/50">
                                <td className="p-3">
                                    <div className="flex items-center gap-2">
                                        {getTypeIcon(col.type)}
                                        <span className={cn(col.isPrimaryKey && "text-yellow-400 font-medium")}>
                                            {col.name}
                                        </span>
                                    </div>
                                </td>
                                <td className="p-3">
                                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                                        {col.type}
                                    </code>
                                </td>
                                <td className="p-3">
                                    {col.nullable ? (
                                        <span className="text-muted-foreground">Yes</span>
                                    ) : (
                                        <span className="text-foreground font-medium">No</span>
                                    )}
                                </td>
                                <td className="p-3">
                                    {col.defaultValue ? (
                                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded text-primary">
                                            {col.defaultValue}
                                        </code>
                                    ) : (
                                        <span className="text-muted-foreground italic">None</span>
                                    )}
                                </td>
                                <td className="p-3">
                                    <div className="flex items-center gap-2">
                                        {col.isPrimaryKey && (
                                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-500/20 text-yellow-400">
                                                PRIMARY KEY
                                            </span>
                                        )}
                                        {col.isForeignKey && (
                                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-400">
                                                FOREIGN KEY
                                            </span>
                                        )}
                                        {!col.nullable && !col.isPrimaryKey && (
                                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-400">
                                                NOT NULL
                                            </span>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </ScrollArea>
        </div>
    )
}
