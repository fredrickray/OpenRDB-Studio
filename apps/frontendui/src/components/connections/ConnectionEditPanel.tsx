import { useState, useEffect } from "react"
import { useConnectionStore, type Connection } from "@/stores/connectionStore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Database, Eye, EyeOff, Trash2, CheckCircle, Loader2, X, AlertCircle } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import type { DatabaseInfo } from "@/lib/api"

interface ConnectionEditPanelProps {
    connection: Connection
    onClose: () => void
}

export function ConnectionEditPanel({ connection, onClose }: ConnectionEditPanelProps) {
    const { updateConnection, deleteConnection, testConnection, connectToDatabase, listDatabases } = useConnectionStore()
    const navigate = useNavigate()
    const [showPassword, setShowPassword] = useState(false)
    const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
    const [testMessage, setTestMessage] = useState('')
    const [serverVersion, setServerVersion] = useState<string | null>(null)
    const [isConnecting, setIsConnecting] = useState(false)
    const [showDatabaseList, setShowDatabaseList] = useState(false)
    const [databaseList, setDatabaseList] = useState<DatabaseInfo[]>([])
    const [isListingDatabases, setIsListingDatabases] = useState(false)
    const [listError, setListError] = useState<string | null>(null)

    const [formData, setFormData] = useState<Omit<Connection, 'id' | 'status'>>({
        name: connection.name,
        host: connection.host,
        port: connection.port,
        username: connection.username,
        password: connection.password,
        database: connection.database,
        sslRequired: connection.sslRequired,
        readOnly: connection.readOnly,
        color: connection.color,
    })

    // Update form when connection changes
    useEffect(() => {
        setFormData({
            name: connection.name,
            host: connection.host,
            port: connection.port,
            username: connection.username,
            password: connection.password,
            database: connection.database,
            sslRequired: connection.sslRequired,
            readOnly: connection.readOnly,
            color: connection.color,
        })
        setTestStatus('idle')
        setTestMessage('')
        setServerVersion(null)
    }, [connection])

    const handleTestConnection = async () => {
        // Save form data first
        updateConnection(connection.id, formData)

        setTestStatus('testing')
        setTestMessage('')
        setServerVersion(null)

        try {
            const result = await testConnection(connection.id)

            if (result.success) {
                setTestStatus('success')
                setTestMessage('Connection test successful')
                setServerVersion(result.server_version)
            } else {
                setTestStatus('error')
                setTestMessage(result.message || 'Connection failed')
            }
        } catch (error) {
            setTestStatus('error')
            setTestMessage(error instanceof Error ? error.message : 'Connection test failed')
        }
    }

    const handleConnect = async () => {
        // Save form data first
        updateConnection(connection.id, formData)

        setIsConnecting(true)

        try {
            const success = await connectToDatabase(connection.id)

            if (success) {
                // Navigate to workspace on successful connection
                navigate('/workspace')
            } else {
                setTestStatus('error')
                setTestMessage('Failed to connect')
            }
        } catch (error) {
            setTestStatus('error')
            setTestMessage(error instanceof Error ? error.message : 'Connection failed')
        } finally {
            setIsConnecting(false)
        }
    }

    const handleListDatabases = async () => {
        // Save form data first
        updateConnection(connection.id, formData)

        setIsListingDatabases(true)
        setListError(null)
        setShowDatabaseList(true)

        try {
            const result = await listDatabases(connection.id)
            if (result.success) {
                setDatabaseList(result.databases)
            } else {
                setListError(result.message || 'Failed to list databases')
            }
        } catch (error) {
            setListError(error instanceof Error ? error.message : 'Failed to list databases')
        } finally {
            setIsListingDatabases(false)
        }
    }

    const handleSelectDatabase = (dbName: string) => {
        setFormData({ ...formData, database: dbName })
        setShowDatabaseList(false)
    }

    const _handleSave = () => {
        updateConnection(connection.id, formData)
    }

    const handleDelete = () => {
        deleteConnection(connection.id)
        onClose()
    }

    return (
        <div className="h-full flex flex-col bg-card border-l border-border">
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                        <Database className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold">Edit Connection</h2>
                        <p className="text-sm text-muted-foreground">
                            Configure your PostgreSQL connection settings.
                        </p>
                    </div>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose}>
                    <X className="w-4 h-4" />
                </Button>
            </div>

            {/* Form Content */}
            <ScrollArea className="flex-1">
                <div className="p-4 space-y-6">
                    {/* Connection Name */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-primary" />
                            CONNECTION NAME
                        </h4>
                        <Input
                            placeholder="My Connection"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    {/* Server Info Section */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-primary" />
                            SERVER INFO
                        </h4>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="col-span-2 space-y-2">
                                <Label htmlFor="host">HOST</Label>
                                <Input
                                    id="host"
                                    placeholder="localhost"
                                    value={formData.host}
                                    onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="port">PORT</Label>
                                <Input
                                    id="port"
                                    type="number"
                                    placeholder="5432"
                                    value={formData.port}
                                    onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) || 5432 })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Authentication Section */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-primary" />
                            AUTHENTICATION
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label htmlFor="username">USERNAME</Label>
                                <Input
                                    id="username"
                                    placeholder="postgres"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">PASSWORD</Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••••"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Initial Database */}
                    <div className="space-y-3">
                        <Label htmlFor="database">INITIAL DATABASE</Label>
                        <div className="flex gap-2">
                            <Input
                                id="database"
                                placeholder="postgres"
                                value={formData.database}
                                onChange={(e) => setFormData({ ...formData, database: e.target.value })}
                                className="flex-1"
                            />
                            <Button
                                variant="outline"
                                size="sm"
                                className="shrink-0"
                                onClick={handleListDatabases}
                                disabled={isListingDatabases}
                            >
                                {isListingDatabases ? <Loader2 className="w-4 h-4 animate-spin" /> : "Find List"}
                            </Button>
                        </div>
                    </div>

                    {/* Toggles */}
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <Switch
                                id="ssl-panel"
                                checked={formData.sslRequired}
                                onCheckedChange={(checked) => setFormData({ ...formData, sslRequired: checked })}
                            />
                            <Label htmlFor="ssl-panel" className="text-sm font-normal cursor-pointer">
                                SSL Required
                            </Label>
                        </div>
                        <div className="flex items-center gap-2">
                            <Switch
                                id="readonly-panel"
                                checked={formData.readOnly}
                                onCheckedChange={(checked) => setFormData({ ...formData, readOnly: checked })}
                            />
                            <Label htmlFor="readonly-panel" className="text-sm font-normal cursor-pointer">
                                Read-only mode
                            </Label>
                        </div>
                    </div>

                    {/* Test Status */}
                    {testStatus === 'success' && (
                        <div className="flex items-center gap-2 text-green-500 text-sm bg-green-500/10 px-3 py-2 rounded-md">
                            <CheckCircle className="w-4 h-4" />
                            <span>{testMessage}</span>
                            {serverVersion && (
                                <span className="text-muted-foreground text-xs ml-auto">
                                    {serverVersion}
                                </span>
                            )}
                        </div>
                    )}

                    {testStatus === 'error' && (
                        <div className="flex items-center gap-2 text-red-500 text-sm bg-red-500/10 px-3 py-2 rounded-md">
                            <AlertCircle className="w-4 h-4" />
                            <span>{testMessage}</span>
                        </div>
                    )}
                </div>
            </ScrollArea>

            {/* Footer Actions */}
            <div className="p-4 border-t border-border flex items-center gap-3 shrink-0">
                <Button
                    onClick={handleConnect}
                    className="flex-1"
                    disabled={isConnecting}
                >
                    {isConnecting ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            Connecting...
                        </>
                    ) : (
                        'Connect Now'
                    )}
                </Button>
                <Button
                    variant="outline"
                    onClick={handleTestConnection}
                    disabled={testStatus === 'testing'}
                >
                    {testStatus === 'testing' ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Testing...
                        </>
                    ) : (
                        'Test Connection'
                    )}
                </Button>
                <Button variant="ghost" size="icon" onClick={handleDelete}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
            </div>

            <Dialog open={showDatabaseList} onOpenChange={setShowDatabaseList}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Select Database</DialogTitle>
                        <DialogDescription>
                            Select a database to use for this connection.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[300px] overflow-y-auto space-y-2">
                        {isListingDatabases ? (
                            <div className="flex justify-center p-4"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                        ) : listError ? (
                            <div className="text-red-500 p-2 text-sm">{listError}</div>
                        ) : databaseList.length === 0 ? (
                            <div className="text-muted-foreground p-2 text-sm">No databases found</div>
                        ) : (
                            databaseList.map((db, i) => (
                                <button
                                    key={`${db.name}-${i}`}
                                    className="w-full text-left px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground text-sm flex items-center justify-between group transition-colors"
                                    onClick={() => handleSelectDatabase(db.name)}
                                >
                                    <span className="font-medium">{db.name}</span>
                                    <div className="text-xs text-muted-foreground flex gap-2">
                                        {db.owner && <span>{db.owner}</span>}
                                        {db.size && <span>{db.size}</span>}
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
