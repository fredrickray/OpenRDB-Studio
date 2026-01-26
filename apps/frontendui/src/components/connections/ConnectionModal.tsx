import { useState } from "react"
import { useConnectionStore, type Connection } from "@/stores/connectionStore"
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
import { Database, Eye, EyeOff, Trash2, CheckCircle, Loader2 } from "lucide-react"

export function ConnectionModal() {
    const { isModalOpen, closeModal, editingConnection, addConnection, updateConnection, deleteConnection } = useConnectionStore()
    const [showPassword, setShowPassword] = useState(false)
    const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')

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
        // Simulate testing - in real app, this would call the Tauri backend
        await new Promise(resolve => setTimeout(resolve, 1500))
        setTestStatus('success')
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
                            <Button variant="outline" size="sm" className="shrink-0">
                                Find List
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
                            <span>Connection test successful</span>
                            <span className="text-muted-foreground text-xs ml-auto">
                                Server version: PostgreSQL 14.2 (arm-apple-darwin23.2)
                            </span>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center gap-3">
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
                    {editingConnection && (
                        <Button variant="ghost" size="icon" onClick={handleDelete}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
