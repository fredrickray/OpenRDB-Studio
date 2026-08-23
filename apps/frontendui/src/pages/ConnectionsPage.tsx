import { ConnectionSidebar } from "@/components/connections/ConnectionSidebar"
import { ConnectionModal } from "@/components/connections/ConnectionModal"
import { CreateDatabaseModal } from "@/components/connections/CreateDatabaseModal"
import { ConnectionEditForm } from "@/components/connections/ConnectionEditForm"
import { AppLogo } from "@/components/AppLogo"
import { useConnectionStore } from "@/stores/connectionStore"
import { Button } from "@/components/ui/button"

export function ConnectionsPage() {
    const { activeConnectionId, connections, openModal } = useConnectionStore()
    const activeConnection = connections.find((c) => c.id === activeConnectionId)

    return (
        <div className="flex h-screen bg-background">
            <ConnectionSidebar />

            <div className="flex-1 flex flex-col min-w-0">
                <header className="h-14 border-b border-border flex items-center justify-between px-4 shrink-0">
                    <div className="flex items-center gap-2">
                        <AppLogo size="xs" />
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
                        <div className="text-center max-w-md px-4">
                            <AppLogo size="lg" className="mx-auto mb-6" />
                            <h2 className="text-2xl font-semibold text-foreground mb-2">
                                Welcome to OpenRDB Studio
                            </h2>
                            <p className="text-muted-foreground mb-6">
                                Add a server connection, then expand it to browse or create databases —
                                the same way Compass groups databases under one URI.
                            </p>
                            <Button onClick={() => openModal()}>New Connection</Button>
                        </div>
                    </main>
                )}
            </div>

            <ConnectionModal />
            <CreateDatabaseModal />
        </div>
    )
}
