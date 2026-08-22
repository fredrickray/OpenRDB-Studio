import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useConnectionStore, type ConnectionColor } from "@/stores/connectionStore"
import { useTableStore } from "@/stores/tableStore"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { AlertCircle, Loader2, Trash2, AlertTriangle } from "lucide-react"
import { buildPostgresUri, parsePostgresUri } from "@/lib/pgUri"
import { api } from "@/lib/api"

const COLORS: { value: ConnectionColor; label: string; className: string }[] = [
    { value: "none", label: "No Color", className: "bg-muted" },
    { value: "blue", label: "Blue", className: "bg-blue-500" },
    { value: "green", label: "Green", className: "bg-green-500" },
    { value: "purple", label: "Purple", className: "bg-purple-500" },
    { value: "yellow", label: "Yellow", className: "bg-yellow-500" },
    { value: "red", label: "Red", className: "bg-red-500" },
]

export function ConnectionModal() {
    const {
        isModalOpen,
        closeModal,
        editingConnection,
        addConnection,
        updateConnection,
        deleteConnection,
        connectToDatabase,
        refreshDatabases,
        setExpanded,
        setActiveConnection,
    } = useConnectionStore()
    const setActiveTableConnection = useTableStore((s) => s.setActiveConnection)
    const navigate = useNavigate()

    const [editUri, setEditUri] = useState(true)
    const [uri, setUri] = useState("postgresql://postgres@localhost:5432/")
    const [name, setName] = useState("")
    const [color, setColor] = useState<ConnectionColor>("none")
    const [favorite, setFavorite] = useState(false)
    const [sslRequired, setSslRequired] = useState(false)
    const [readOnly, setReadOnly] = useState(false)
    const [password, setPassword] = useState("")
    const [host, setHost] = useState("localhost")
    const [port, setPort] = useState(5432)
    const [username, setUsername] = useState("postgres")
    const [database, setDatabase] = useState("")

    const [isSaving, setIsSaving] = useState(false)
    const [isConnecting, setIsConnecting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [uriError, setUriError] = useState<string | null>(null)

    useEffect(() => {
        if (!isModalOpen) return
        setError(null)
        setUriError(null)
        setShowDeleteConfirm(false)
        setIsSaving(false)
        setIsConnecting(false)

        if (editingConnection) {
            setName(editingConnection.name)
            setHost(editingConnection.host)
            setPort(editingConnection.port)
            setUsername(editingConnection.username)
            setPassword(editingConnection.password)
            setDatabase(editingConnection.database || "")
            setSslRequired(editingConnection.sslRequired)
            setReadOnly(editingConnection.readOnly)
            setColor(editingConnection.color === "blue" && !editingConnection.favorite ? editingConnection.color : editingConnection.color)
            setFavorite(editingConnection.favorite)
            setUri(
                buildPostgresUri({
                    host: editingConnection.host,
                    port: editingConnection.port,
                    username: editingConnection.username,
                    password: editingConnection.password,
                    database: editingConnection.database,
                    sslRequired: editingConnection.sslRequired,
                })
            )
            setEditUri(true)
        } else {
            setName("")
            setHost("localhost")
            setPort(5432)
            setUsername("postgres")
            setPassword("")
            setDatabase("")
            setSslRequired(false)
            setReadOnly(false)
            setColor("none")
            setFavorite(false)
            setUri("postgresql://postgres@localhost:5432/")
            setEditUri(true)
        }
    }, [isModalOpen, editingConnection])

    // Keep URI in sync when field mode is used
    useEffect(() => {
        if (editUri) return
        setUri(
            buildPostgresUri({
                host,
                port,
                username,
                password,
                database,
                sslRequired,
            })
        )
    }, [editUri, host, port, username, password, database, sslRequired])

    const applyUriToFields = (value: string) => {
        setUri(value)
        const parsed = parsePostgresUri(value)
        if (!parsed) {
            setUriError("Invalid connection URI")
            return
        }
        setUriError(null)
        setHost(parsed.host)
        setPort(parsed.port)
        setUsername(parsed.username)
        setPassword(parsed.password)
        setDatabase(parsed.database)
        setSslRequired(parsed.sslRequired)
    }

    const resolveFields = () => {
        if (editUri) {
            const parsed = parsePostgresUri(uri)
            if (!parsed) {
                setUriError("Invalid connection URI")
                return null
            }
            setUriError(null)
            return {
                host: parsed.host,
                port: parsed.port,
                username: parsed.username,
                password: parsed.password,
                database: parsed.database,
                sslRequired: parsed.sslRequired,
            }
        }
        return { host, port, username, password, database, sslRequired }
    }

    const payload = useMemo(
        () => ({
            name: name.trim() || `${host}:${port}`,
            host,
            port,
            username,
            password,
            database,
            sslRequired,
            readOnly,
            color: color === "none" ? ("blue" as ConnectionColor) : color,
            favorite,
        }),
        [name, host, port, username, password, database, sslRequired, readOnly, color, favorite]
    )

    const saveConnection = (): string => {
        const fields = resolveFields()
        if (!fields) throw new Error("Invalid connection URI")

        const data = {
            ...payload,
            ...fields,
            name: name.trim() || `${fields.host}:${fields.port}`,
            color: color === "none" ? ("blue" as const) : color,
        }

        if (editingConnection) {
            updateConnection(editingConnection.id, data)
            return editingConnection.id
        }
        return addConnection({ ...data, status: "disconnected" })
    }

    const handleSave = async () => {
        setIsSaving(true)
        setError(null)
        try {
            const id = saveConnection()
            setActiveConnection(id)
            closeModal()
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to save")
        } finally {
            setIsSaving(false)
        }
    }

    const handleConnect = async (andSave: boolean) => {
        setIsConnecting(true)
        setError(null)
        try {
            const fields = resolveFields()
            if (!fields) throw new Error("Invalid connection URI")

            let id: string
            if (andSave || editingConnection) {
                id = saveConnection()
            } else {
                // ephemeral path still saves so the tree can show it
                id = saveConnection()
            }

            // Probe server + list DBs first (bootstrap)
            const test = await api.testConnection({
                host: fields.host,
                port: fields.port,
                username: fields.username,
                password: fields.password,
                database: fields.database || "postgres",
                ssl_required: fields.sslRequired,
            })
            if (!test.success) {
                throw new Error(test.message)
            }

            setExpanded(id, true)
            await refreshDatabases(id)

            const targetDb = fields.database?.trim()
            if (targetDb) {
                const info = await connectToDatabase(id, targetDb)
                if (info) {
                    setActiveTableConnection(info.id, targetDb)
                    closeModal()
                    navigate("/workspace")
                    return
                }
            }

            // No specific DB in URI — stay on connections page with tree expanded
            setActiveConnection(id)
            closeModal()
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to connect")
        } finally {
            setIsConnecting(false)
        }
    }

    const handleDelete = () => {
        if (!editingConnection) return
        deleteConnection(editingConnection.id)
        setShowDeleteConfirm(false)
        closeModal()
    }

    return (
        <>
            <Dialog open={isModalOpen} onOpenChange={(open) => !open && closeModal()}>
                <DialogContent className="sm:max-w-[560px]">
                    <DialogHeader>
                        <DialogTitle>
                            {editingConnection ? "Edit Connection" : "New Connection"}
                        </DialogTitle>
                        <DialogDescription>
                            Save a server connection. Multiple databases on the same host can live under one connection.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-5 py-2">
                        <div className="flex items-center justify-between gap-3">
                            <Label htmlFor="edit-uri" className="text-sm">
                                Edit Connection String
                            </Label>
                            <Switch
                                id="edit-uri"
                                checked={editUri}
                                onCheckedChange={setEditUri}
                            />
                        </div>

                        {editUri ? (
                            <div className="space-y-2">
                                <Label htmlFor="uri">URI</Label>
                                <textarea
                                    id="uri"
                                    value={uri}
                                    onChange={(e) => applyUriToFields(e.target.value)}
                                    rows={3}
                                    className="w-full rounded-md border border-input bg-input px-3 py-2 text-sm font-mono resize-y min-h-[72px]"
                                    placeholder="postgresql://user:password@localhost:5432/mydb"
                                />
                                {uriError && (
                                    <p className="text-xs text-destructive">{uriError}</p>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2 col-span-2">
                                    <Label>Host</Label>
                                    <Input value={host} onChange={(e) => setHost(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Port</Label>
                                    <Input
                                        type="number"
                                        value={port}
                                        onChange={(e) => setPort(parseInt(e.target.value) || 5432)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Database (optional)</Label>
                                    <Input
                                        value={database}
                                        onChange={(e) => setDatabase(e.target.value)}
                                        placeholder="leave empty to pick later"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Username</Label>
                                    <Input value={username} onChange={(e) => setUsername(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Password</Label>
                                    <Input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-[1fr_140px] gap-3">
                            <div className="space-y-2">
                                <Label htmlFor="conn-name">Name</Label>
                                <Input
                                    id="conn-name"
                                    placeholder="Localhost"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="conn-color">Color</Label>
                                <select
                                    id="conn-color"
                                    className="w-full h-9 rounded-md border border-input bg-input px-2 text-sm"
                                    value={color}
                                    onChange={(e) => setColor(e.target.value as ConnectionColor)}
                                >
                                    {COLORS.map((c) => (
                                        <option key={c.value} value={c.value}>
                                            {c.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <label className="flex items-start gap-3 cursor-pointer">
                            <Checkbox
                                checked={favorite}
                                onCheckedChange={(v) => setFavorite(v === true)}
                                className="mt-0.5"
                            />
                            <span>
                                <span className="text-sm font-medium block">Favorite this connection</span>
                                <span className="text-xs text-muted-foreground">
                                    Pins it to the top of the connections list.
                                </span>
                            </span>
                        </label>

                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2">
                                <Switch id="ssl-m" checked={sslRequired} onCheckedChange={setSslRequired} />
                                <Label htmlFor="ssl-m" className="text-sm font-normal cursor-pointer">
                                    SSL Required
                                </Label>
                            </div>
                            <div className="flex items-center gap-2">
                                <Switch id="ro-m" checked={readOnly} onCheckedChange={setReadOnly} />
                                <Label htmlFor="ro-m" className="text-sm font-normal cursor-pointer">
                                    Read-only
                                </Label>
                            </div>
                        </div>

                        {error && (
                            <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="flex-row items-center gap-2 sm:justify-between">
                        <div>
                            {editingConnection && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setShowDeleteConfirm(true)}
                                    aria-label="Delete connection"
                                >
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" onClick={closeModal}>
                                Cancel
                            </Button>
                            <Button variant="outline" onClick={handleSave} disabled={isSaving || isConnecting}>
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => handleConnect(false)}
                                disabled={isConnecting}
                            >
                                Connect
                            </Button>
                            <Button onClick={() => handleConnect(true)} disabled={isConnecting}>
                                {isConnecting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                        Connecting…
                                    </>
                                ) : (
                                    "Save & Connect"
                                )}
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="w-5 h-5" />
                            Delete connection?
                        </DialogTitle>
                        <DialogDescription>
                            Removes “{editingConnection?.name}” from saved connections. Databases on the server are not dropped.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDelete}>
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
