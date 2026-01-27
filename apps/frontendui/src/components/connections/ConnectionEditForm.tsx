import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useConnectionStore, type Connection } from "@/stores/connectionStore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Database, Eye, EyeOff, Trash2, CheckCircle, Loader2, Lock, Shield } from "lucide-react"

interface ConnectionEditFormProps {
    connection: Connection
}

export function ConnectionEditForm({ connection }: ConnectionEditFormProps) {
    const navigate = useNavigate()
    const { updateConnection, deleteConnection, setActiveConnection } = useConnectionStore()
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

    const handleConnect = () => {
        updateConnection(connection.id, { ...formData, status: 'connected' })
        navigate('/workspace')
    }

    const handleDelete = () => {
        deleteConnection(connection.id)
        setActiveConnection(null)
    }

    return (
        <div className="flex-1 flex items-center justify-center p-8">
            <div className="w-full max-w-3xl">
                {/* Header */}
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

                {/* Form */}
                <div className="space-y-6">
                    {/* Server Info Section */}
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

                    {/* Authentication Section */}
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
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Initial Database */}
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
                            <Button variant="outline" size="sm" className="shrink-0">
                                Fetch List
                            </Button>
                        </div>
                    </div>

                    {/* Toggles */}
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

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3 pt-4">
                        <Button onClick={handleConnect} className="flex-1 h-11">
                            Connect Now
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleTestConnection}
                            disabled={testStatus === 'testing'}
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
                        <Button variant="ghost" size="icon" onClick={handleDelete} className="h-11 w-11">
                            <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                    </div>

                    {/* Test Status */}
                    {testStatus === 'success' && (
                        <div className="flex items-center gap-3 text-green-500 text-sm bg-green-500/10 px-4 py-3 rounded-lg">
                            <CheckCircle className="w-5 h-5" />
                            <div>
                                <span className="font-medium">Connection test successful</span>
                                <p className="text-xs text-muted-foreground">
                                    Server version: PostgreSQL 14.2 on x86_64-apple-darwin21.3.0
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
