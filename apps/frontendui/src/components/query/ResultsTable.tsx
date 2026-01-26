import { ScrollArea } from "@/components/ui/scroll-area"
import type { QueryResult } from "@/stores/queryStore"

interface ResultsTableProps {
    result: QueryResult
}

export function ResultsTable({ result }: ResultsTableProps) {
    if (result.error) {
        return (
            <div className="p-4 text-red-400 bg-red-500/10 rounded-md m-2">
                <p className="font-medium">Error executing query:</p>
                <p className="text-sm mt-1">{result.error}</p>
            </div>
        )
    }

    if (result.rows.length === 0) {
        return (
            <div className="p-4 text-muted-foreground text-center">
                Query executed successfully. No rows returned.
            </div>
        )
    }

    return (
        <ScrollArea className="h-full">
            <div className="min-w-max">
                <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-card border-b border-border">
                        <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground w-12">
                                #
                            </th>
                            {result.columns.map((col, i) => (
                                <th
                                    key={i}
                                    className="px-3 py-2 text-left text-xs font-medium text-muted-foreground border-l border-border"
                                >
                                    {col}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {result.rows.map((row, rowIndex) => (
                            <tr
                                key={rowIndex}
                                className="border-b border-border/50 hover:bg-accent/50"
                            >
                                <td className="px-3 py-1.5 text-xs text-muted-foreground">
                                    {rowIndex + 1}
                                </td>
                                {row.map((cell, cellIndex) => (
                                    <td
                                        key={cellIndex}
                                        className="px-3 py-1.5 text-foreground border-l border-border/50 font-mono"
                                    >
                                        {cell === null || cell === "NULL" ? (
                                            <span className="text-muted-foreground italic">NULL</span>
                                        ) : (
                                            cell
                                        )}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </ScrollArea>
    )
}
