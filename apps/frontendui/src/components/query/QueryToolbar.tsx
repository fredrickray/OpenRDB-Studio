import { Play, Square, Wand2, Save, Download, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useQueryStore } from "@/stores/queryStore"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useState } from "react"

export function QueryToolbar() {
    const { activeTabId, executeQuery, cancelQuery, isExecuting, executingTabId } = useQueryStore()
    const [autoLimit, setAutoLimit] = useState(true)

    const isCurrentTabExecuting = isExecuting && executingTabId === activeTabId

    const handleRun = () => {
        if (activeTabId) {
            executeQuery(activeTabId)
        }
    }

    return (
        <div className="flex items-center gap-2 px-3 py-2 bg-card border-b border-border">
            <Button
                size="sm"
                onClick={handleRun}
                disabled={isCurrentTabExecuting}
                className="bg-green-600 hover:bg-green-700 text-white"
            >
                {isCurrentTabExecuting ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Running...
                    </>
                ) : (
                    <>
                        <Play className="w-4 h-4" />
                        Run
                    </>
                )}
            </Button>

            <Button
                size="sm"
                variant="destructive"
                onClick={cancelQuery}
                disabled={!isCurrentTabExecuting}
            >
                <Square className="w-4 h-4" />
                Cancel
            </Button>

            <div className="w-px h-6 bg-border mx-1" />

            <Button size="sm" variant="outline">
                <Wand2 className="w-4 h-4" />
                Format
            </Button>

            <Button size="sm" variant="outline">
                <Save className="w-4 h-4" />
            </Button>

            <div className="flex-1" />

            <div className="flex items-center gap-2">
                <Switch
                    id="auto-limit"
                    checked={autoLimit}
                    onCheckedChange={setAutoLimit}
                />
                <Label htmlFor="auto-limit" className="text-xs text-muted-foreground cursor-pointer">
                    Auto-limit 1000 rows
                </Label>
            </div>

            <div className="w-px h-6 bg-border mx-1" />

            <Button size="sm" variant="outline">
                <Download className="w-4 h-4" />
                Export
            </Button>
        </div>
    )
}
