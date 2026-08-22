/** Build / parse PostgreSQL connection URIs for the connection modal. */

export interface ParsedPgUri {
    host: string
    port: number
    username: string
    password: string
    database: string
    sslRequired: boolean
}

export function buildPostgresUri(parts: {
    host: string
    port: number
    username: string
    password: string
    database?: string
    sslRequired?: boolean
}): string {
    const user = encodeURIComponent(parts.username || 'postgres')
    const pass = parts.password ? `:${encodeURIComponent(parts.password)}` : ''
    const host = parts.host || 'localhost'
    const port = parts.port || 5432
    const db = parts.database ? `/${encodeURIComponent(parts.database)}` : '/'
    const ssl = parts.sslRequired ? '?sslmode=require' : ''
    return `postgresql://${user}${pass}@${host}:${port}${db}${ssl}`
}

export function parsePostgresUri(uri: string): ParsedPgUri | null {
    const trimmed = uri.trim()
    if (!trimmed) return null

    try {
        // Normalize postgres:// → postgresql:// for URL parser
        const normalized = trimmed.replace(/^postgres(ql)?:\/\//i, 'http://')
        const url = new URL(normalized)

        const sslmode = url.searchParams.get('sslmode')
        const sslRequired = sslmode === 'require' || sslmode === 'verify-full' || sslmode === 'verify-ca'

        return {
            host: url.hostname || 'localhost',
            port: url.port ? parseInt(url.port, 10) : 5432,
            username: decodeURIComponent(url.username || 'postgres'),
            password: decodeURIComponent(url.password || ''),
            database: decodeURIComponent((url.pathname || '/').replace(/^\//, '')),
            sslRequired,
        }
    } catch {
        return null
    }
}
