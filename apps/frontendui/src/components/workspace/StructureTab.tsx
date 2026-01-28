import { useState } from "react"
import { useTableStore } from "@/stores/tableStore"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Key, Type, Hash, ToggleLeft, Calendar, RefreshCw, Plus, ChevronDown, ChevronRight, Copy, Download, Pencil } from "lucide-react"
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

// Mock data for indexes and foreign keys
const mockIndexes = [
    { name: 'users_pkey', columns: 'id', type: 'PRIMARY' },
    { name: 'idx_users_email', columns: 'email', type: 'INDEX' },
]

const mockForeignKeys = [
    { name: 'fk_users_org', reference: 'organizations(id)', onDelete: 'CASCADE' },
]

const mockDDL = `CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  org_id UUID,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  
  CONSTRAINT fk_users_org
    FOREIGN KEY (org_id)
    REFERENCES organizations(id)
    ON DELETE CASCADE
);

-- Create optimized index for email searches
CREATE INDEX idx_users_email ON public.users(email);`

export function StructureTab() {
    const { databases, selectedDatabase, selectedTable, totalRows } = useTableStore()
    const [ddlExpanded, setDdlExpanded] = useState(true)
    const [viewMode, setViewMode] = useState<'add' | 'ddl'>('add')

    const selectedDb = databases.find(db => db.name === selectedDatabase)
    const selectedTbl = selectedDb?.tables.find(t => t.name === selectedTable)
    const columns = selectedTbl?.columns || []

    const copyDDL = () => {
        navigator.clipboard.writeText(mockDDL)
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <h2 className="text-xl font-semibold">Table: {selectedTable}</h2>
                        <span className="px-2 py-0.5 text-xs font-medium bg-green-500/20 text-green-400 rounded">
                            ACTIVE
                        </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                        Created on 2023-10-15 • {totalRows.toLocaleString()} rows • 450 MB size
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Refresh
                    </Button>
                    <Button size="sm">
                        <Plus className="w-3 h-3 mr-1" />
                        Add Column
                    </Button>
                </div>
            </div>

            <ScrollArea className="flex-1 p-4">
                {/* Columns Section */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold">Columns</h3>
                        <div className="flex gap-1">
                            <Button
                                variant={viewMode === 'add' ? 'default' : 'outline'}
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => setViewMode('add')}
                            >
                                Add View
                            </Button>
                            <Button
                                variant={viewMode === 'ddl' ? 'default' : 'outline'}
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => setViewMode('ddl')}
                            >
                                DDL View
                            </Button>
                        </div>
                    </div>

                    <div className="border border-border rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/30">
                                <tr className="border-b border-border">
                                    <th className="p-3 text-left text-xs font-medium text-muted-foreground w-16">KEYS</th>
                                    <th className="p-3 text-left text-xs font-medium text-muted-foreground">NAME</th>
                                    <th className="p-3 text-left text-xs font-medium text-muted-foreground">TYPE</th>
                                    <th className="p-3 text-left text-xs font-medium text-muted-foreground w-20">NULLABLE</th>
                                    <th className="p-3 text-left text-xs font-medium text-muted-foreground">DEFAULT</th>
                                    <th className="p-3 text-left text-xs font-medium text-muted-foreground">COMMENT</th>
                                    <th className="p-3 text-left text-xs font-medium text-muted-foreground w-16">ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {columns.map((col) => (
                                    <tr key={col.name} className="border-b border-border hover:bg-accent/50">
                                        <td className="p-3">
                                            {col.isPrimaryKey && (
                                                <span className="text-yellow-400 text-xs">🔑</span>
                                            )}
                                            {col.isForeignKey && (
                                                <span className="text-blue-400 text-xs">🔗</span>
                                            )}
                                        </td>
                                        <td className="p-3 font-medium">{col.name}</td>
                                        <td className="p-3">
                                            <div className="flex items-center gap-2">
                                                {getTypeIcon(col.type)}
                                                <code className="text-xs text-primary">{col.type.toUpperCase()}</code>
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            {col.nullable ? (
                                                <span className="text-green-400 text-xs">YES</span>
                                            ) : (
                                                <span className="text-muted-foreground text-xs">NO</span>
                                            )}
                                        </td>
                                        <td className="p-3">
                                            {col.defaultValue ? (
                                                <code className="text-xs text-muted-foreground">{col.defaultValue}</code>
                                            ) : (
                                                <span className="text-muted-foreground/50 text-xs">NULL</span>
                                            )}
                                        </td>
                                        <td className="p-3 text-xs text-muted-foreground">
                                            {col.isPrimaryKey ? 'Unique identifier' :
                                                col.name === 'email' ? 'Primary contact email' :
                                                    col.isForeignKey ? 'Reference to organizations' :
                                                        col.name === 'created_at' ? 'Row creation timestamp' : ''}
                                        </td>
                                        <td className="p-3">
                                            <Button variant="ghost" size="icon" className="w-6 h-6">
                                                <Pencil className="w-3 h-3" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Indexes & Foreign Keys Row */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    {/* Indexes */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold flex items-center gap-2">
                                <span className="text-muted-foreground">≡</span>
                                Indexes
                            </h3>
                            <Button variant="link" size="sm" className="text-primary text-xs h-auto p-0">
                                Add Index
                            </Button>
                        </div>
                        <div className="border border-border rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/30">
                                    <tr className="border-b border-border">
                                        <th className="p-2 text-left text-xs font-medium text-muted-foreground">NAME</th>
                                        <th className="p-2 text-left text-xs font-medium text-muted-foreground">COLUMNS</th>
                                        <th className="p-2 text-left text-xs font-medium text-muted-foreground">TYPE</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {mockIndexes.map((idx) => (
                                        <tr key={idx.name} className="border-b border-border last:border-b-0 hover:bg-accent/50">
                                            <td className="p-2 text-xs">{idx.name}</td>
                                            <td className="p-2 text-xs text-muted-foreground">{idx.columns}</td>
                                            <td className="p-2">
                                                <span className={cn(
                                                    "px-1.5 py-0.5 text-xs rounded",
                                                    idx.type === 'PRIMARY' ? "bg-yellow-500/20 text-yellow-400" : "bg-blue-500/20 text-blue-400"
                                                )}>
                                                    {idx.type}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Foreign Keys */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold flex items-center gap-2">
                                <span className="text-muted-foreground">🔗</span>
                                Foreign Keys
                            </h3>
                            <Button variant="link" size="sm" className="text-primary text-xs h-auto p-0">
                                Add Constraint
                            </Button>
                        </div>
                        <div className="border border-border rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/30">
                                    <tr className="border-b border-border">
                                        <th className="p-2 text-left text-xs font-medium text-muted-foreground">NAME</th>
                                        <th className="p-2 text-left text-xs font-medium text-muted-foreground">REFERENCE</th>
                                        <th className="p-2 text-left text-xs font-medium text-muted-foreground">ON DELETE</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {mockForeignKeys.map((fk) => (
                                        <tr key={fk.name} className="border-b border-border last:border-b-0 hover:bg-accent/50">
                                            <td className="p-2 text-xs">{fk.name}</td>
                                            <td className="p-2 text-xs text-muted-foreground">{fk.reference}</td>
                                            <td className="p-2 text-xs text-orange-400">{fk.onDelete}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* DDL Script Section */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <button
                            onClick={() => setDdlExpanded(!ddlExpanded)}
                            className="flex items-center gap-2 text-sm font-semibold"
                        >
                            {ddlExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            <span className="text-muted-foreground">&lt;/&gt;</span>
                            DDL Script
                        </button>
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={copyDDL}>
                                <Copy className="w-3 h-3 mr-1" />
                                Copy DDL
                            </Button>
                            <Button variant="ghost" size="sm" className="text-xs h-7">
                                <Download className="w-3 h-3 mr-1" />
                                Export .sql
                            </Button>
                        </div>
                    </div>

                    {ddlExpanded && (
                        <div className="border border-border rounded-lg bg-card p-4 font-mono text-xs overflow-x-auto">
                            <pre className="text-muted-foreground">
                                <code>
                                    {mockDDL.split('\n').map((line, i) => (
                                        <div key={i} className="leading-relaxed">
                                            {line.includes('CREATE TABLE') && <span className="text-purple-400">CREATE TABLE </span>}
                                            {line.includes('CREATE TABLE') && <span className="text-blue-400">public.users</span>}
                                            {line.includes('CREATE TABLE') && <span> {'('}</span>}
                                            {!line.includes('CREATE TABLE') && !line.includes('CREATE INDEX') && !line.includes('CONSTRAINT') && !line.includes('FOREIGN KEY') && !line.includes('REFERENCES') && !line.includes('ON DELETE') && !line.includes('--') && (
                                                <span>
                                                    {line.includes('UUID') && <><span className="text-foreground">{line.split('UUID')[0]}</span><span className="text-green-400">UUID</span><span>{line.split('UUID')[1]}</span></>}
                                                    {line.includes('VARCHAR') && <><span className="text-foreground">{line.split('VARCHAR')[0]}</span><span className="text-green-400">VARCHAR{line.match(/\(\d+\)/)?.[0]}</span><span>{line.split(/VARCHAR\(\d+\)/)[1]}</span></>}
                                                    {line.includes('TIMESTAMP') && <><span className="text-foreground">{line.split('TIMESTAMP')[0]}</span><span className="text-green-400">TIMESTAMP</span><span>{line.split('TIMESTAMP')[1]}</span></>}
                                                    {!line.includes('UUID') && !line.includes('VARCHAR') && !line.includes('TIMESTAMP') && line}
                                                </span>
                                            )}
                                            {line.includes('CONSTRAINT') && <><span className="text-purple-400">  CONSTRAINT </span><span className="text-yellow-400">{line.split('CONSTRAINT ')[1]}</span></>}
                                            {line.includes('FOREIGN KEY') && <><span className="text-purple-400">    FOREIGN KEY </span><span>{line.split('FOREIGN KEY ')[1]}</span></>}
                                            {line.includes('REFERENCES') && <><span className="text-purple-400">    REFERENCES </span><span className="text-blue-400">{line.split('REFERENCES ')[1]}</span></>}
                                            {line.includes('ON DELETE') && <><span className="text-purple-400">    ON DELETE </span><span className="text-orange-400">{line.split('ON DELETE ')[1]}</span></>}
                                            {line.includes('--') && <span className="text-muted-foreground">{line}</span>}
                                            {line.includes('CREATE INDEX') && <><span className="text-purple-400">CREATE INDEX </span><span className="text-yellow-400">{line.match(/idx_\w+/)?.[0]}</span><span> ON </span><span className="text-blue-400">public.users</span><span>(email);</span></>}
                                        </div>
                                    ))}
                                </code>
                            </pre>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    )
}
