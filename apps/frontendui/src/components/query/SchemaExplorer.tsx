import { useState } from "react"
import {
    ChevronRight,
    ChevronDown,
    Database,
    Table,
    Eye,
    FunctionSquare,
    History,
    Bookmark,
    Search
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { useConnectionStore } from "@/stores/connectionStore"

interface TreeItemProps {
    label: string
    icon: React.ReactNode
    children?: React.ReactNode
    depth?: number
}

function TreeItem({ label, icon, children, depth = 0 }: TreeItemProps) {
    const [isOpen, setIsOpen] = useState(depth < 2)
    const hasChildren = !!children

    return (
        <div>
            <button
                onClick={() => hasChildren && setIsOpen(!isOpen)}
                className={cn(
                    "flex items-center gap-2 w-full px-2 py-1 text-sm hover:bg-accent rounded-sm text-left",
                    depth > 0 && "pl-" + (depth * 4 + 2)
                )}
                style={{ paddingLeft: `${depth * 16 + 8}px` }}
            >
                {hasChildren ? (
                    isOpen ? (
                        <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
                    ) : (
                        <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
                    )
                ) : (
                    <span className="w-3" />
                )}
                <span className="shrink-0">{icon}</span>
                <span className="truncate">{label}</span>
            </button>
            {isOpen && children}
        </div>
    )
}

// Sample schema data
const sampleSchema = {
    databases: [
        {
            name: "PostgreSQL Production",
            schemas: [
                {
                    name: "public",
                    tables: ["users", "orders", "products", "orders_archive", "product_pricing"],
                    views: ["user_stats", "order_summary"],
                },
            ],
        },
    ],
}

const queryHistory = [
    "SELECT * FROM users LIMIT 10",
    "SELECT o.*, u.name FROM orders o JOIN users u...",
    "UPDATE products SET price = price * 1.1",
]

const savedSnippets = [
    "Get User Orders",
    "Monthly Revenue",
    "Active Users Count",
]

export function SchemaExplorer() {
    const [searchQuery, setSearchQuery] = useState("")
    const { connections, activeConnectionId } = useConnectionStore()
    const activeConnection = connections.find(c => c.id === activeConnectionId)

    return (
        <div className="h-full flex flex-col bg-sidebar border-r border-border">
            {/* Header */}
            <div className="p-3 border-b border-border">
                <div className="flex items-center gap-2 mb-3">
                    <Database className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium truncate">
                        {activeConnection?.name || "No Connection"}
                    </span>
                </div>
                <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                    <Input
                        placeholder="Search objects..."
                        className="pl-7 h-7 text-xs"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Tree View */}
            <ScrollArea className="flex-1">
                <div className="p-2">
                    {sampleSchema.databases.map((db) => (
                        <TreeItem
                            key={db.name}
                            label={db.name}
                            icon={<Database className="w-4 h-4 text-blue-400" />}
                            depth={0}
                        >
                            {db.schemas.map((schema) => (
                                <TreeItem
                                    key={schema.name}
                                    label={schema.name}
                                    icon={<span className="text-xs text-muted-foreground">S</span>}
                                    depth={1}
                                >
                                    <TreeItem
                                        label={`Tables (${schema.tables.length})`}
                                        icon={<Table className="w-3 h-3 text-green-400" />}
                                        depth={2}
                                    >
                                        {schema.tables.map((table) => (
                                            <TreeItem
                                                key={table}
                                                label={table}
                                                icon={<Table className="w-3 h-3 text-muted-foreground" />}
                                                depth={3}
                                            />
                                        ))}
                                    </TreeItem>
                                    <TreeItem
                                        label={`Views (${schema.views.length})`}
                                        icon={<Eye className="w-3 h-3 text-purple-400" />}
                                        depth={2}
                                    >
                                        {schema.views.map((view) => (
                                            <TreeItem
                                                key={view}
                                                label={view}
                                                icon={<Eye className="w-3 h-3 text-muted-foreground" />}
                                                depth={3}
                                            />
                                        ))}
                                    </TreeItem>
                                    <TreeItem
                                        label="Functions (0)"
                                        icon={<FunctionSquare className="w-3 h-3 text-yellow-400" />}
                                        depth={2}
                                    />
                                </TreeItem>
                            ))}
                        </TreeItem>
                    ))}
                </div>
            </ScrollArea>

            {/* Query History */}
            <div className="border-t border-border">
                <TreeItem
                    label="Query History"
                    icon={<History className="w-4 h-4 text-muted-foreground" />}
                >
                    <div className="px-2 pb-2">
                        {queryHistory.map((query, i) => (
                            <button
                                key={i}
                                className="w-full text-left text-xs text-muted-foreground hover:text-foreground p-1 pl-6 truncate hover:bg-accent rounded"
                            >
                                {query}
                            </button>
                        ))}
                    </div>
                </TreeItem>
            </div>

            {/* Saved Snippets */}
            <div className="border-t border-border">
                <TreeItem
                    label="Saved Snippets"
                    icon={<Bookmark className="w-4 h-4 text-muted-foreground" />}
                >
                    <div className="px-2 pb-2">
                        {savedSnippets.map((snippet, i) => (
                            <button
                                key={i}
                                className="w-full text-left text-xs text-muted-foreground hover:text-foreground p-1 pl-6 truncate hover:bg-accent rounded"
                            >
                                {snippet}
                            </button>
                        ))}
                    </div>
                </TreeItem>
            </div>
        </div>
    )
}
