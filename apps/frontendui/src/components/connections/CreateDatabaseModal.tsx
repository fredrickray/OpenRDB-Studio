import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useConnectionStore } from "@/stores/connectionStore"
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
import { Loader2 } from "lucide-react"

export function CreateDatabaseModal() {
    const {
        isCreateDbModalOpen,
        createDbConnectionId,
        closeCreateDbModal,
        connections,
        createDatabase,
        connectToDatabase,
        setActiveConnection,
    } = useConnectionStore()
    const setActiveTableConnection = useTableStore((s) => s.setActiveConnection)
    const navigate = useNavigate()

    const connection = connections.find((c) => c.id === createDbConnectionId)
    const [name, setName] = useState("")
    const [isCreating, setIsCreating] = useState(false)
    const [connectAfter, setConnectAfter] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!isCreateDbModalOpen) return
        setName("")
        setError(null)
        setIsCreating(false)
        setConnectAfter(true)
    }, [isCreateDbModalOpen, createDbConnectionId])

    const handleCreate = async () => {
        if (!connection || !name.trim()) {
            setError("Database name is required")
            return
        }

        setIsCreating(true)
        setError(null)
        try {
            const result = await createDatabase(connection.id, name.trim())
            if (!result.success) {
                setError(result.message || "Failed to create database")
                return
            }

            if (connectAfter) {
                setActiveConnection(connection.id)
                const info = await connectToDatabase(connection.id, name.trim())
                if (info) {
                    setActiveTableConnection(info.id, name.trim())
                    closeCreateDbModal()
                    navigate("/workspace")
                    return
                }
            }

            closeCreateDbModal()
        } finally {
            setIsCreating(false)
        }
    }

    return (
        <Dialog open={isCreateDbModalOpen} onOpenChange={(open) => !open && closeCreateDbModal()}>
            <DialogContent className="sm:max-w-[420px]">
                <DialogHeader>
                    <DialogTitle>Create Database</DialogTitle>
                    <DialogDescription>
                        Create a database on{" "}
                        <span className="text-foreground font-medium">
                            {connection?.name || "this connection"}
                        </span>
                        {" "}({connection?.host}:{connection?.port}).
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label htmlFor="db-name">Database Name</Label>
                        <Input
                            id="db-name"
                            autoFocus
                            placeholder="my_app"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") void handleCreate()
                            }}
                        />
                    </div>

                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                            type="checkbox"
                            checked={connectAfter}
                            onChange={(e) => setConnectAfter(e.target.checked)}
                            className="rounded border-border"
                        />
                        Connect to this database after creating
                    </label>

                    {error && <p className="text-sm text-destructive">{error}</p>}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={closeCreateDbModal} disabled={isCreating}>
                        Cancel
                    </Button>
                    <Button onClick={handleCreate} disabled={isCreating || !name.trim()}>
                        {isCreating ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                Creating…
                            </>
                        ) : (
                            "Create Database"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
