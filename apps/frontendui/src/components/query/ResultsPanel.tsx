import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ResultsTable } from "./ResultsTable"
import { useQueryStore } from "@/stores/queryStore"
import { CheckCircle, AlertCircle, Clock, Rows3 } from "lucide-react"

export function ResultsPanel() {
    const { activeTabId, results, isExecuting } = useQueryStore()
    const result = activeTabId ? results[activeTabId] : null

    return (
        <div className="h-full flex flex-col bg-card">
            <Tabs defaultValue="results" className="flex flex-col h-full">
                <div className="flex items-center justify-between border-b border-border px-2">
                    <TabsList className="h-9 bg-transparent p-0">
                        <TabsTrigger
                            value="results"
                            className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
                        >
                            Query Results
                        </TabsTrigger>
                        <TabsTrigger
                            value="messages"
                            className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
                        >
                            Execution Messages
                        </TabsTrigger>
                    </TabsList>

                    {/* Status Bar */}
                    {result && !isExecuting && (
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                                {result.error ? (
                                    <AlertCircle className="w-3 h-3 text-red-400" />
                                ) : (
                                    <CheckCircle className="w-3 h-3 text-green-400" />
                                )}
                                <span>{result.error ? "Error" : "Success"}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Rows3 className="w-3 h-3" />
                                <span>{result.rowCount} rows</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>{result.executionTime}ms</span>
                            </div>
                        </div>
                    )}

                    {isExecuting && (
                        <div className="text-xs text-muted-foreground animate-pulse">
                            Executing query...
                        </div>
                    )}
                </div>

                <TabsContent value="results" className="flex-1 m-0 overflow-hidden">
                    {result ? (
                        <ResultsTable result={result} />
                    ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                            Run a query to see results
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="messages" className="flex-1 m-0 p-4 overflow-auto">
                    {result && (
                        <div className="space-y-2 text-sm font-mono">
                            <p className="text-muted-foreground">
                                [{result.timestamp.toLocaleTimeString()}] Query executed
                            </p>
                            {result.error ? (
                                <p className="text-red-400">ERROR: {result.error}</p>
                            ) : (
                                <>
                                    <p className="text-green-400">
                                        ✓ Query completed successfully
                                    </p>
                                    <p className="text-muted-foreground">
                                        Returned {result.rowCount} row(s) in {result.executionTime}ms
                                    </p>
                                </>
                            )}
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    )
}
