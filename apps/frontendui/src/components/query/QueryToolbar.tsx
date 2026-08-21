import { Play, Square, Wand2, Save, Download, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useQueryStore } from "@/stores/queryStore"
import { useToastStore } from "@/stores/toastStore"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { format } from "sql-formatter"

function escapeCsv(value: string | null): string {
    if (value == null) return ''
    if (/[",\n\r]/.test(value)) {
        return `"${value.replace(/"/g, '""')}"`
    }
    return value
}

export function QueryToolbar() {
    const {
        activeTabId,
        tabs,
        results,
        executeQuery,
        cancelQuery,
        isExecuting,
        executingTabId,
        autoLimit,
        setAutoLimit,
        updateSql,
    } = useQueryStore()
    const showToast = useToastStore((s) => s.showToast)

    const isCurrentTabExecuting = isExecuting && executingTabId === activeTabId
    const activeTab = tabs.find((t) => t.id === activeTabId)
    const activeResult = activeTabId ? results[activeTabId] : undefined

    const handleRun = () => {
        if (activeTabId) {
            executeQuery(activeTabId)
        }
    }

    const handleFormat = () => {
        if (!activeTabId || !activeTab?.sql.trim()) return
        try {
            const formatted = format(activeTab.sql, {
                language: 'postgresql',
                tabWidth: 2,
                keywordCase: 'upper',
            })
            updateSql(activeTabId, formatted)
            showToast('SQL formatted', 'success')
        } catch (error) {
            showToast(
                error instanceof Error ? error.message : 'Could not format SQL',
                'error'
            )
        }
    }

    const handleSave = () => {
        if (!activeTab) return
        try {
            const key = 'openrdb-saved-queries'
            const existing = JSON.parse(localStorage.getItem(key) || '[]') as Array<{
                id: string
                name: string
                sql: string
                savedAt: string
            }>
            const entry = {
                id: activeTab.id,
                name: activeTab.name,
                sql: activeTab.sql,
                savedAt: new Date().toISOString(),
            }
            const next = [entry, ...existing.filter((e) => e.id !== activeTab.id)].slice(0, 50)
            localStorage.setItem(key, JSON.stringify(next))
            showToast(`Saved “${activeTab.name}” locally`, 'success')
        } catch {
            showToast('Failed to save query', 'error')
        }
    }

    const handleExport = () => {
        if (!activeResult || activeResult.error || activeResult.rows.length === 0) {
            showToast('No results to export', 'info')
            return
        }

        const header = activeResult.columns.map(escapeCsv).join(',')
        const body = activeResult.rows
            .map((row) => row.map((cell) => escapeCsv(cell)).join(','))
            .join('\n')
        const csv = `${header}\n${body}`
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${activeTab?.name || 'query'}-results.csv`
        a.click()
        URL.revokeObjectURL(url)
        showToast('Exported CSV', 'success')
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
                title="Stop waiting for results (server query may still finish)"
            >
                <Square className="w-4 h-4" />
                Cancel
            </Button>

            <div className="w-px h-6 bg-border mx-1" />

            <Button size="sm" variant="outline" onClick={handleFormat} disabled={!activeTab?.sql.trim()}>
                <Wand2 className="w-4 h-4" />
                Format
            </Button>

            <Button size="sm" variant="outline" onClick={handleSave} disabled={!activeTab?.sql.trim()} title="Save query locally">
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

            <Button
                size="sm"
                variant="outline"
                onClick={handleExport}
                disabled={!activeResult || !!activeResult.error || activeResult.rows.length === 0}
            >
                <Download className="w-4 h-4" />
                Export
            </Button>
        </div>
    )
}
