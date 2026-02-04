import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useConnectionStore, type Connection } from "@/stores/connectionStore"
import { useTableStore } from "@/stores/tableStore"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Database, Eye, EyeOff, Trash2, CheckCircle, Loader2, AlertCircle, ArrowRight } from "lucide-react"
import { api } from "@/lib/api"
import type { DatabaseInfo } from "@/lib/api"

export function ConnectionModal() {
    const { isModalOpen, closeModal, editingConnection, addConnection, updateConnection, deleteConnection } = useConnectionStore()
    const [showPassword, setShowPassword] = useState(false)
    const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
    const [testMessage, setTestMessage] = useState('')
    const [serverVersion, setServerVersion] = useState<string | null>(null)
    const [showDatabaseList, setShowDatabaseList] = useState(false)
    const [databaseList, setDatabaseList] = useState<DatabaseInfo[]>([])
    const [isListingDatabases, setIsListingDatabases] = useState(false)
    const [listError, setListError] = useState<string | null>(null)
    const [isConnecting, setIsConnecting] = useState(false)
    const [connectError, setConnectError] = useState<string | null>(null)

    const navigate = useNavigate()
    const setActiveConnection = useTableStore((state) => state.setActiveConnection)

    const [formData, setFormData] = useState<Omit<Connection, 'id' | 'status'>>({
        name: editingConnection?.name || '',
        host: editingConnection?.host || 'localhost',
        port: editingConnection?.port || 5432,
        username: editingConnection?.username || 'postgres',
        password: editingConnection?.password || '',
        database: editingConnection?.database || '',
        sslRequired: editingConnection?.sslRequired || false,
        readOnly: editingConnection?.readOnly || false,
        color: editingConnection?.color || 'blue',
    })

    // Reset form when modal opens with different connection
    useState(() => {
        if (editingConnection) {
            setFormData({
                name: editingConnection.name,
                host: editingConnection.host,
                port: editingConnection.port,
                username: editingConnection.username,
                password: editingConnection.password,
                database: editingConnection.database,
                sslRequired: editingConnection.sslRequired,
                readOnly: editingConnection.readOnly,
                color: editingConnection.color,
            })
        } else {
            setFormData({
                name: '',
                host: 'localhost',
                port: 5432,
                username: 'postgres',
                password: '',
                database: '',
                sslRequired: false,
                readOnly: false,
                color: 'blue',
            })
        }
    })

    const handleTestConnection = async () => {
        setTestStatus('testing')
        setTestMessage('')
        setServerVersion(null)

        try {
            const config = {
                host: formData.host,
                port: formData.port,
                username: formData.username,
                password: formData.password,
                database: formData.database,
                ssl_required: formData.sslRequired,
            }

            const result = await api.testConnection(config)

            if (result.success) {
                setTestStatus('success')
                setTestMessage(result.message)
                setServerVersion(result.server_version)
            } else {
                setTestStatus('error')
                setTestMessage(result.message)
            }
        } catch (error) {
            setTestStatus('error')
            setTestMessage(error instanceof Error ? error.message : 'Connection test failed')
        }
    }

    const handleListDatabases = async () => {
        setIsListingDatabases(true)
        setListError(null)
        setShowDatabaseList(true)

        try {
            const config = {
                host: formData.host,
                port: formData.port,
                username: formData.username,
                password: formData.password,
                database: 'postgres', // Connect to postgres to list databases
                ssl_required: formData.sslRequired,
            }

            const databases = await api.listDatabases(config)
            setDatabaseList(databases)
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

    const handleSave = () => {
        if (editingConnection) {
            updateConnection(editingConnection.id, formData)
        } else {
            addConnection({ ...formData, status: 'disconnected' })
        }
        closeModal()
    }

    const handleDelete = () => {
        if (editingConnection) {
            deleteConnection(editingConnection.id)
            closeModal()
        }
    }

    const handleConnectNow = async () => {
        setIsConnecting(true)
        setConnectError(null)

        try {
            const config = {
                host: formData.host,
                port: formData.port,
                username: formData.username,
                password: formData.password,
                database: formData.database,
                ssl_required: formData.sslRequired,
            }

            // First save the connection if it's new
            if (!editingConnection) {
                addConnection({ ...formData, status: 'connected' })
            } else {
                updateConnection(editingConnection.id, { ...formData, status: 'connected' })
            }

            // Establish the connection
            const connectionInfo = await api.connect(config)

            // Set the active connection in the table store
            setActiveConnection(connectionInfo.id, formData.database)

            // Close modal and navigate to workspace
            closeModal()
            navigate('/workspace')
        } catch (error) {
            setConnectError(error instanceof Error ? error.message : 'Failed to connect')
        } finally {
            setIsConnecting(false)
        }
    }

    return (
        <Dialog open={isModalOpen} onOpenChange={(open) => !open && closeModal()}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                            <Database className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <DialogTitle>
                                {editingConnection ? 'Edit Connection' : 'New Connection'}
                            </DialogTitle>
                            <DialogDescription>
                                Configure your PostgreSQL connection settings.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Connection Name */}
                    <div className="space-y-2">
                        <Label htmlFor="name">Connection Name</Label>
                        <Input
                            id="name"
                            placeholder="My Database"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    {/* Server Info */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <span className="w-4 h-px bg-border" />
                            SERVER INFO
                        </h4>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="col-span-2 space-y-2">
                                <Label htmlFor="host">Host</Label>
                                <Input
                                    id="host"
                                    placeholder="localhost"
                                    value={formData.host}
                                    onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="port">Port</Label>
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

                    {/* Authentication */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <span className="w-4 h-px bg-border" />
                            AUTHENTICATION
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label htmlFor="username">Username</Label>
                                <Input
                                    id="username"
                                    placeholder="postgres"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
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
                    <div className="space-y-2">
                        <Label htmlFor="database">Initial Database</Label>
                        <div className="flex gap-2">
                            <Input
                                id="database"
                                placeholder="main_production"
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
                                {isListingDatabases ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Find List'}
                            </Button>
                        </div>
                    </div>

                    {/* Toggles */}
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <Switch
                                id="ssl"
                                checked={formData.sslRequired}
                                onCheckedChange={(checked) => setFormData({ ...formData, sslRequired: checked })}
                            />
                            <Label htmlFor="ssl" className="text-sm font-normal cursor-pointer">
                                SSL Required
                            </Label>
                        </div>
                        <div className="flex items-center gap-2">
                            <Switch
                                id="readonly"
                                checked={formData.readOnly}
                                onCheckedChange={(checked) => setFormData({ ...formData, readOnly: checked })}
                            />
                            <Label htmlFor="readonly" className="text-sm font-normal cursor-pointer">
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

                {/* Connection Error Display */}
                {connectError && (
                    <div className="flex items-center gap-2 text-red-500 text-sm bg-red-500/10 px-3 py-2 rounded-md">
                        <AlertCircle className="w-4 h-4" />
                        <span>{connectError}</span>
                    </div>
                )}

                {/* Footer */}
                <div className="flex items-center gap-3">
                    <Button
                        onClick={handleConnectNow}
                        className="flex-1"
                        disabled={isConnecting || !formData.database}
                    >
                        {isConnecting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                Connecting...
                            </>
                        ) : (
                            <>
                                Connect Now
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </>
                        )}
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleTestConnection}
                        disabled={testStatus === 'testing' || isConnecting}
                    >
                        {testStatus === 'testing' ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Testing...
                            </>
                        ) : (
                            'Test'
                        )}
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={handleSave}
                        disabled={isConnecting}
                    >
                        Save
                    </Button>
                    {editingConnection && (
                        <Button variant="ghost" size="icon" onClick={handleDelete}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                    )}
                </div>
            </DialogContent>

            {/* Database List Dialog */}
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
        </Dialog>
    )
}
