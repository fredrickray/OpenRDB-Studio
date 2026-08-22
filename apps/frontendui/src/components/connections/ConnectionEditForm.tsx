import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useConnectionStore, type Connection } from "@/stores/connectionStore"
import { useTableStore } from "@/stores/tableStore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
    Database,
    Eye,
    EyeOff,
    Trash2,
    CheckCircle,
    Loader2,
    Lock,
    Shield,
    AlertCircle,
    AlertTriangle,
    RefreshCw,
    Plus,
    Server,
} from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

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
        refreshDatabases,
        openCreateDbModal,
        openModal,
    } = useConnectionStore()
    const setActiveTableConnection = useTableStore((state) => state.setActiveConnection)

    const [showPassword, setShowPassword] = useState(false)
    const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle")
    const [testMessage, setTestMessage] = useState("")
    const [isConnectingDb, setConnectingDb] = useState<string | null>(null)
    const [connectError, setConnectError] = useState("")
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

    const [formData, setFormData] = useState({
        name: connection.name,
        host: connection.host,
        port: connection.port,
        username: connection.username,
        password: connection.password,
        sslRequired: connection.sslRequired,
        readOnly: connection.readOnly,
    })

    useEffect(() => {
        setFormData({
            name: connection.name,
            host: connection.host,
            port: connection.port,
            username: connection.username,
            password: connection.password,
            sslRequired: connection.sslRequired,
            readOnly: connection.readOnly,
        })
        setTestStatus("idle")
        setTestMessage("")
        setConnectError("")
        setShowDeleteConfirm(false)
        void refreshDatabases(connection.id)
    }, [connection.id])

    const persistForm = () => {
        updateConnection(connection.id, formData)
    }

    const handleTestConnection = async () => {
        persistForm()
        setTestStatus("testing")
        setTestMessage("")
        try {
            const result = await testConnection(connection.id)
            if (result.success) {
                setTestStatus("success")
                setTestMessage(`Connected! Server: ${result.server_version || "PostgreSQL"}`)
            } else {
                setTestStatus("error")
                setTestMessage(result.message || "Connection failed")
            }
        } catch (error) {
            setTestStatus("error")
            setTestMessage(error instanceof Error ? error.message : "Connection test failed")
        }
    }

    const handleOpenDatabase = async (dbName: string) => {
        persistForm()
        setConnectingDb(dbName)
        setConnectError("")
        try {
            const info = await connectToDatabase(connection.id, dbName)
            if (info) {
                setActiveTableConnection(info.id, dbName)
                navigate("/workspace")
            } else {
                setConnectError("Failed to connect to database")
            }
        } catch (error) {
            setConnectError(error instanceof Error ? error.message : "Connection failed")
        } finally {
            setConnectingDb(null)
        }
    }

    const handleConnectDefault = async () => {
        const databases = connection.databases || []
        const target =
            connection.activeDatabase ||
            connection.database ||
            databases[0]?.name ||
            "postgres"
        await handleOpenDatabase(target)
    }

    return (
        <div className="flex-1 overflow-auto p-8">
            <div className="w-full max-w-3xl mx-auto space-y-8">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center">
                        <Server className="w-7 h-7 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-2xl font-semibold truncate">{connection.name}</h2>
                        <p className="text-sm text-muted-foreground">
                            {connection.host}:{connection.port} · PostgreSQL server connection
                        </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => openModal(connection)}>
                        Edit URI
                    </Button>
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">CONNECTION NAME</Label>
                        <Input
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            onBlur={persistForm}
                            className="bg-input"
                        />
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                        <div className="col-span-3 space-y-2">
                            <Label className="text-xs text-muted-foreground">HOST</Label>
                            <Input
                                value={formData.host}
                                onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                                onBlur={persistForm}
                                className="bg-input"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">PORT</Label>
                            <Input
                                type="number"
                                value={formData.port}
                                onChange={(e) =>
                                    setFormData({ ...formData, port: parseInt(e.target.value) || 5432 })
                                }
                                onBlur={persistForm}
                                className="bg-input"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">USERNAME</Label>
                            <Input
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                onBlur={persistForm}
                                className="bg-input"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">PASSWORD</Label>
                            <div className="relative">
                                <Input
                                    type={showPassword ? "text" : "password"}
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    onBlur={persistForm}
                                    className="pr-10 bg-input"
                                />
                                <button
                                    type="button"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3 bg-muted/50 px-4 py-3 rounded-lg flex-1">
                            <Shield className="w-4 h-4 text-primary" />
                            <div className="flex-1">
                                <span className="text-sm font-medium">SSL Required</span>
                            </div>
                            <Switch
                                checked={formData.sslRequired}
                                onCheckedChange={(checked) => {
                                    setFormData({ ...formData, sslRequired: checked })
                                    updateConnection(connection.id, { sslRequired: checked })
                                }}
                            />
                        </div>
                        <div className="flex items-center gap-3 bg-muted/50 px-4 py-3 rounded-lg flex-1">
                            <Lock className="w-4 h-4 text-orange-400" />
                            <div className="flex-1">
                                <span className="text-sm font-medium">Read-only</span>
                            </div>
                            <Switch
                                checked={formData.readOnly}
                                onCheckedChange={(checked) => {
                                    setFormData({ ...formData, readOnly: checked })
                                    updateConnection(connection.id, { readOnly: checked })
                                }}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button onClick={handleConnectDefault} disabled={!!isConnectingDb}>
                            {isConnectingDb ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                    Connecting…
                                </>
                            ) : (
                                "Connect"
                            )}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleTestConnection}
                            disabled={testStatus === "testing"}
                        >
                            {testStatus === "testing" ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                    Testing…
                                </>
                            ) : (
                                "Test Connection"
                            )}
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowDeleteConfirm(true)}
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
                    {testStatus === "success" && (
                        <div className="flex items-center gap-3 text-green-500 text-sm bg-green-500/10 px-4 py-3 rounded-lg">
                            <CheckCircle className="w-5 h-5" />
                            <span>{testMessage}</span>
                        </div>
                    )}
                    {testStatus === "error" && (
                        <div className="flex items-center gap-3 text-red-500 text-sm bg-red-500/10 px-4 py-3 rounded-lg">
                            <AlertCircle className="w-5 h-5" />
                            <span>{testMessage}</span>
                        </div>
                    )}
                </div>

                {/* Databases under this connection */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                            Databases
                        </h3>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => refreshDatabases(connection.id)}
                                disabled={connection.isLoadingDatabases}
                            >
                                {connection.isLoadingDatabases ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    <RefreshCw className="w-3.5 h-3.5" />
                                )}
                            </Button>
                            <Button size="sm" onClick={() => openCreateDbModal(connection.id)}>
                                <Plus className="w-3.5 h-3.5 mr-1" />
                                Create Database
                            </Button>
                        </div>
                    </div>

                    <div className="border border-border rounded-lg divide-y divide-border overflow-hidden">
                        {(connection.databases || []).length === 0 && !connection.isLoadingDatabases && (
                            <div className="px-4 py-6 text-sm text-muted-foreground text-center">
                                Expand this connection in the sidebar or refresh to load databases.
                            </div>
                        )}
                        {(connection.databases || []).map((db) => {
                            const active =
                                connection.activeDatabase === db.name && connection.status === "connected"
                            return (
                                <button
                                    key={db.name}
                                    type="button"
                                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent/40 transition-colors"
                                    onClick={() => handleOpenDatabase(db.name)}
                                    disabled={!!isConnectingDb}
                                >
                                    {isConnectingDb === db.name ? (
                                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                    ) : (
                                        <Database className="w-4 h-4 text-emerald-500" />
                                    )}
                                    <span className="flex-1 font-medium text-sm">{db.name}</span>
                                    {db.size && (
                                        <span className="text-xs text-muted-foreground">{db.size}</span>
                                    )}
                                    {active && (
                                        <span className="text-[10px] uppercase tracking-wide text-primary">
                                            Active
                                        </span>
                                    )}
                                </button>
                            )
                        })}
                    </div>
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
                            Removes “{connection.name}”. Databases on the server are not dropped.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => {
                                deleteConnection(connection.id)
                                setActiveConnection(null)
                                setShowDeleteConfirm(false)
                            }}
                        >
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
