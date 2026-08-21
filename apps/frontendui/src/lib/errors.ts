/** Map raw Postgres/sqlx errors to shorter user-facing messages. */
export function friendlyDbError(raw: string): string {
    const msg = raw.trim()
    const lower = msg.toLowerCase()

    if (lower.includes('unique') || lower.includes('duplicate key')) {
        return 'Duplicate value — that row already exists (unique constraint).'
    }
    if (lower.includes('not-null') || lower.includes('null value') || lower.includes('violates not-null')) {
        return 'A required (NOT NULL) column was left empty.'
    }
    if (lower.includes('foreign key') || lower.includes('violates foreign key')) {
        return 'Foreign key violation — referenced row is missing or still in use.'
    }
    if (lower.includes('permission denied') || lower.includes('insufficient privilege')) {
        return 'Permission denied for this operation.'
    }
    if (lower.includes('connection refused') || lower.includes('could not connect')) {
        return 'Could not reach the database server. Check host and port.'
    }
    if (lower.includes('password authentication failed')) {
        return 'Authentication failed — check username and password.'
    }
    if (lower.includes('does not exist') && lower.includes('database')) {
        return 'Database does not exist.'
    }
    if (lower.includes('connection not found')) {
        return 'Connection lost — reconnect from the Connections page.'
    }
    if (lower.includes('syntax error')) {
        return 'SQL syntax error. Check the query and try again.'
    }

    // Keep it readable: first line, capped length
    const firstLine = msg.split('\n')[0]
    return firstLine.length > 180 ? `${firstLine.slice(0, 177)}…` : firstLine
}
