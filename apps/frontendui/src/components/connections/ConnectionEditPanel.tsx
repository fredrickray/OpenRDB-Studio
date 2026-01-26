import { useState, useEffect } from "react"
import { useConnectionStore, type Connection } from "@/stores/connectionStore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Database, Eye, EyeOff, Trash2, CheckCircle, Loader2, X } from "lucide-react"

interface ConnectionEditPanelProps {
    connection: Connection
    onClose: () => void
}

export function ConnectionEditPanel({ connection, onClose }: ConnectionEditPanelProps) {
    const { updateConnection, deleteConnection } = useConnectionStore()
    const [showPassword, setShowPassword] = useState(false)
    const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')

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
    }, [connection])

    const handleTestConnection = async () => {
        setTestStatus('testing')
        await new Promise(resolve => setTimeout(resolve, 1500))
        setTestStatus('success')
    }

    const handleSave = () => {
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
                                placeholder="main_production"
                                value={formData.database}
                                onChange={(e) => setFormData({ ...formData, database: e.target.value })}
                                className="flex-1"
                            />
                            <Button variant="outline" size="sm" className="shrink-0">
                                Find List
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
                            <span>Connection test successful</span>
                            <span className="text-muted-foreground text-xs ml-auto">
                                Server version: PostgreSQL 14.2 (arm-apple-darwin23.2)
                            </span>
                        </div>
                    )}
                </div>
            </ScrollArea>

            {/* Footer Actions */}
            <div className="p-4 border-t border-border flex items-center gap-3 shrink-0">
                <Button onClick={handleSave} className="flex-1">
                    Connect Now
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
        </div>
    )
}
