import { ConnectionSidebar } from "@/components/connections/ConnectionSidebar"
import { ConnectionModal } from "@/components/connections/ConnectionModal"
import { ConnectionEditForm } from "@/components/connections/ConnectionEditForm"
import { useConnectionStore } from "@/stores/connectionStore"
import { Database } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ConnectionsPage() {
    const { activeConnectionId, connections } = useConnectionStore()
    const activeConnection = connections.find(c => c.id === activeConnectionId)

    return (
        <div className="flex h-screen bg-background">
            <ConnectionSidebar />

            <div className="flex-1 flex flex-col">
                <header className="h-14 border-b border-border flex items-center justify-between px-4">
                    <div className="flex items-center gap-2">
                        <Database className="w-4 h-4 text-primary" />
                        <span className="text-sm font-semibold">OpenRDB Studio</span>
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                            v0.1.0
                        </span>
                    </div>
                </header>

                {activeConnection ? (
                    <ConnectionEditForm connection={activeConnection} />
                ) : (
                    <main className="flex-1 flex items-center justify-center">
                        <div className="text-center max-w-md">
                            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                                <Database className="w-8 h-8 text-primary" />
                            </div>
                            <h2 className="text-2xl font-semibold text-foreground mb-2">
                                Welcome to OpenRDB Studio
                            </h2>
                            <p className="text-muted-foreground mb-6">
                                Select a connection from the sidebar or create a new one to get started.
                            </p>
                            <Button onClick={() => useConnectionStore.getState().openModal()}>
                                Create Your First Connection
                            </Button>
                        </div>
                    </main>
                )}
            </div>

            <ConnectionModal />
        </div>
    )
}
