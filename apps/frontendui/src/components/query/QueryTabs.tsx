import { X, Plus, FileCode } from "lucide-react"
import { useQueryStore } from "@/stores/queryStore"
import { cn } from "@/lib/utils"

export function QueryTabs() {
    const { tabs, activeTabId, setActiveTab, closeTab, addTab } = useQueryStore()

    return (
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
                >
                    <FileCode className="w-4 h-4 shrink-0 text-blue-400" />
                    <span className="text-sm truncate flex-1">{tab.name}</span>
                    {tab.isModified && (
                        <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                    )}
                    {tabs.length > 1 && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                closeTab(tab.id)
                            }}
                            className="opacity-0 group-hover:opacity-100 hover:bg-muted rounded p-0.5"
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
            >
                <Plus className="w-4 h-4" />
            </button>
        </div>
    )
}
