import Editor from "@monaco-editor/react"
import { useQueryStore } from "@/stores/queryStore"

export function SqlEditor() {
    const { tabs, activeTabId, updateSql, executeQuery } = useQueryStore()
    const activeTab = tabs.find((t) => t.id === activeTabId)

    const handleEditorChange = (value: string | undefined) => {
        if (value !== undefined && activeTab) {
            updateSql(activeTab.id, value)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        // Ctrl/Cmd + Enter to run query
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
            e.preventDefault()
            if (activeTab) {
                executeQuery(activeTab.id)
            }
        }
    }

    if (!activeTab) {
        return (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
                No query tab open
            </div>
        )
    }

    return (
        <div className="flex-1 h-full" onKeyDown={handleKeyDown}>
            <Editor
                height="100%"
                defaultLanguage="sql"
                theme="vs-dark"
                value={activeTab.sql}
                onChange={handleEditorChange}
                options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    lineNumbers: "on",
                    scrollBeyondLastLine: false,
                    wordWrap: "on",
                    automaticLayout: true,
                    tabSize: 2,
                    padding: { top: 16 },
                    suggestOnTriggerCharacters: true,
                    quickSuggestions: true,
                }}
            />
        </div>
    )
}
