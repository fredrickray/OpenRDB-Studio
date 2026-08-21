import { useState } from "react"
import { X, Plus, FileCode } from "lucide-react"
import { useQueryStore } from "@/stores/queryStore"
import { cn } from "@/lib/utils"
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

export function QueryTabs() {
    const { tabs, activeTabId, setActiveTab, closeTab, addTab, renameTab } = useQueryStore()
    const [renamingId, setRenamingId] = useState<string | null>(null)
    const [renameValue, setRenameValue] = useState('')
    const [pendingCloseId, setPendingCloseId] = useState<string | null>(null)

    const startRename = (id: string, name: string) => {
        setRenamingId(id)
        setRenameValue(name)
    }

    const commitRename = () => {
        if (renamingId && renameValue.trim()) {
            renameTab(renamingId, renameValue.trim())
        }
        setRenamingId(null)
    }

    const requestClose = (id: string) => {
        const tab = tabs.find((t) => t.id === id)
        if (tab?.isModified && tab.sql.trim()) {
            setPendingCloseId(id)
            return
        }
        closeTab(id)
    }

    return (
        <>
            <div className="flex items-center bg-card border-b border-border overflow-x-auto">
                {tabs.map((tab) => (
                    <div
                        key={tab.id}
                        className={cn(
                            "group flex items-center gap-2 px-3 py-2 border-r border-border cursor-pointer transition-colors min-w-[120px] max-w-[200px]",
                            activeTabId === tab.id
                                ? "bg-background text-foreground"
                                : "bg-card text-muted-foreground hover:bg-background/50"
                        )}
                        onClick={() => setActiveTab(tab.id)}
                        onDoubleClick={(e) => {
                            e.stopPropagation()
                            startRename(tab.id, tab.name)
                        }}
                    >
                        <FileCode className="w-4 h-4 shrink-0 text-blue-400" />
                        {renamingId === tab.id ? (
                            <Input
                                value={renameValue}
                                autoFocus
                                className="h-6 text-sm px-1 py-0"
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => setRenameValue(e.target.value)}
                                onBlur={commitRename}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') commitRename()
                                    if (e.key === 'Escape') setRenamingId(null)
                                }}
                            />
                        ) : (
                            <span className="text-sm truncate flex-1" title="Double-click to rename">
                                {tab.name}
                            </span>
                        )}
                        {tab.isModified && (
                            <span className="w-2 h-2 rounded-full bg-primary shrink-0" title="Unsaved changes" />
                        )}
                        {tabs.length > 1 && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    requestClose(tab.id)
                                }}
                                className="opacity-0 group-hover:opacity-100 hover:bg-muted rounded p-0.5"
                                aria-label={`Close ${tab.name}`}
                            >
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                ))}
                <button
                    onClick={addTab}
                    className="p-2 hover:bg-accent text-muted-foreground hover:text-foreground"
                    title="New Query"
                    aria-label="New query tab"
                >
                    <Plus className="w-4 h-4" />
                </button>
            </div>

            <Dialog open={!!pendingCloseId} onOpenChange={(open) => !open && setPendingCloseId(null)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Close tab?</DialogTitle>
                        <DialogDescription>
                            This query has unsaved edits. Closing will discard them.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPendingCloseId(null)}>
                            Keep open
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => {
                                if (pendingCloseId) closeTab(pendingCloseId)
                                setPendingCloseId(null)
                            }}
                        >
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
