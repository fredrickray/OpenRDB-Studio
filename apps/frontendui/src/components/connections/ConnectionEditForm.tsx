import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useConnectionStore, type Connection } from "@/stores/connectionStore"
import { useTableStore } from "@/stores/tableStore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Database, Eye, EyeOff, Trash2, CheckCircle, Loader2, Lock, Shield, AlertCircle, AlertTriangle } from "lucide-react"
import type { DatabaseInfo } from "@/lib/api"

interface ConnectionEditFormProps {
    connection: Connection
}

export function ConnectionEditForm({ connection }: ConnectionEditFormProps) {
    const navigate = useNavigate()
    const {
        updateConnection,
        deleteConnection,
        setActiveConnection,
        connectToDatabase,
        testConnection,
        listDatabases,
    } = useConnectionStore()
    const setActiveTableConnection = useTableStore((state) => state.setActiveConnection)
    const [showPassword, setShowPassword] = useState(false)
    const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
    const [testMessage, setTestMessage] = useState('')
    const [isConnecting, setIsConnecting] = useState(false)
    const [connectError, setConnectError] = useState('')
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
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
        setConnectError('')
        setShowDeleteConfirm(false)
    }, [connection])

    const handleTestConnection = async () => {
        updateConnection(connection.id, formData)

        setTestStatus('testing')
        setTestMessage('')

        try {
            const result = await testConnection(connection.id)
            if (result.success) {
                setTestStatus('success')
                setTestMessage(`Connected! Server: ${result.server_version || 'PostgreSQL'}`)
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
        updateConnection(connection.id, formData)

        setIsConnecting(true)
        setConnectError('')

        try {
            const connectionInfo = await connectToDatabase(connection.id)

            if (connectionInfo) {
                setActiveTableConnection(connectionInfo.id, formData.database)
                navigate('/workspace')
            } else {
                const err = useConnectionStore.getState().connections.find((c) => c.id === connection.id)?.errorMessage
                setConnectError(err || 'Failed to connect to database')
            }
        } catch (error) {
            setConnectError(error instanceof Error ? error.message : 'Connection failed')
        } finally {
            setIsConnecting(false)
        }
    }

    const handleListDatabases = async () => {
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

    const handleConfirmDelete = () => {
        deleteConnection(connection.id)
        setActiveConnection(null)
        setShowDeleteConfirm(false)
    }

    return (
        <div className="flex-1 flex items-center justify-center p-8">
            <div className="w-full max-w-3xl">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center">
                        <Database className="w-7 h-7 text-primary" />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-2xl font-semibold">Edit Connection</h2>
                        <p className="text-sm text-muted-foreground">
                            Configure your PostgreSQL connection settings.
                        </p>
                    </div>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                        POSTGRESQL
                    </span>
                </div>

                <div className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="name-form" className="text-xs text-muted-foreground">CONNECTION NAME</Label>
                        <Input
                            id="name-form"
                            placeholder="My Database"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="bg-input"
                        />
                    </div>

                    <div className="space-y-4">
                        <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-primary" />
                            SERVER INFO
                        </h4>
                        <div className="grid grid-cols-4 gap-4">
                            <div className="col-span-3 space-y-2">
                                <Label htmlFor="host" className="text-xs text-muted-foreground">HOST</Label>
                                <Input
                                    id="host"
                                    placeholder="localhost"
                                    value={formData.host}
                                    onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                                    className="bg-input"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="port" className="text-xs text-muted-foreground">PORT</Label>
                                <Input
                                    id="port"
                                    type="number"
                                    placeholder="5432"
                                    value={formData.port}
                                    onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) || 5432 })}
                                    className="bg-input"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                            <Lock className="w-3 h-3" />
                            AUTHENTICATION
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="username" className="text-xs text-muted-foreground">USERNAME</Label>
                                <Input
                                    id="username"
                                    placeholder="postgres"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    className="bg-input"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-xs text-muted-foreground">PASSWORD</Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••••"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="pr-10 bg-input"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="database" className="text-xs text-muted-foreground">INITIAL DATABASE</Label>
                        <div className="flex gap-3">
                            <Input
                                id="database"
                                placeholder="main_production"
                                value={formData.database}
                                onChange={(e) => setFormData({ ...formData, database: e.target.value })}
                                className="flex-1 bg-input"
                            />
                            <Button
                                variant="outline"
                                size="sm"
                                className="shrink-0"
                                onClick={handleListDatabases}
                                disabled={isListingDatabases}
                            >
                                {isListingDatabases ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Fetch List'}
                            </Button>
                        </div>
                    </div>

                    <div className="flex items-center gap-8 py-2">
                        <div className="flex items-center gap-3 bg-muted/50 px-4 py-3 rounded-lg">
                            <Shield className="w-4 h-4 text-primary" />
                            <div>
                                <span className="text-sm font-medium">SSL Required</span>
                                <p className="text-xs text-muted-foreground">Encrypted connection</p>
                            </div>
                            <Switch
                                id="ssl-form"
                                checked={formData.sslRequired}
                                onCheckedChange={(checked) => setFormData({ ...formData, sslRequired: checked })}
                            />
                        </div>
                        <div className="flex items-center gap-3 bg-muted/50 px-4 py-3 rounded-lg">
                            <Lock className="w-4 h-4 text-orange-400" />
                            <div>
                                <span className="text-sm font-medium">Read-only mode</span>
                                <p className="text-xs text-muted-foreground">Prevent data writes</p>
                            </div>
                            <Switch
                                id="readonly-form"
                                checked={formData.readOnly}
                                onCheckedChange={(checked) => setFormData({ ...formData, readOnly: checked })}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3 pt-4">
                        <Button
                            onClick={handleConnect}
                            className="flex-1 h-11"
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
                            disabled={testStatus === 'testing' || isConnecting}
                            className="h-11"
                        >
                            {testStatus === 'testing' ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                    Testing...
                                </>
                            ) : (
                                'Test Connection'
                            )}
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowDeleteConfirm(true)}
                            className="h-11 w-11"
                            aria-label="Delete connection"
                        >
                            <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                    </div>

                    {connectError && (
                        <div className="flex items-center gap-3 text-red-500 text-sm bg-red-500/10 px-4 py-3 rounded-lg">
                            <AlertCircle className="w-5 h-5" />
                            <span>{connectError}</span>
                        </div>
                    )}

                    {testStatus === 'success' && (
                        <div className="flex items-center gap-3 text-green-500 text-sm bg-green-500/10 px-4 py-3 rounded-lg">
                            <CheckCircle className="w-5 h-5" />
                            <div>
                                <span className="font-medium">Connection test successful</span>
                                {testMessage && (
                                    <p className="text-xs text-muted-foreground">{testMessage}</p>
                                )}
                            </div>
                        </div>
                    )}

                    {testStatus === 'error' && (
                        <div className="flex items-center gap-3 text-red-500 text-sm bg-red-500/10 px-4 py-3 rounded-lg">
                            <AlertCircle className="w-5 h-5" />
                            <span>{testMessage || 'Connection test failed'}</span>
                        </div>
                    )}
                </div>
            </div>

            <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="w-5 h-5" />
                            Delete connection?
                        </DialogTitle>
                        <DialogDescription>
                            This removes “{connection.name}” from saved connections. It does not drop any database.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleConfirmDelete}>
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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
                                    className="w-full text-left px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground text-sm flex items-center justify-between"
                                    onClick={() => {
                                        setFormData({ ...formData, database: db.name })
                                        setShowDatabaseList(false)
                                    }}
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
