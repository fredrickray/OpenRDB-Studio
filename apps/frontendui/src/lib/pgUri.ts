import { engineDefaults, type DatabaseEngine } from '@/lib/engines'

/** Build / parse connection URIs for the connection modal. */

export interface ParsedPgUri {
    host: string
    port: number
    username: string
    password: string
    database: string
    sslRequired: boolean
}

export interface ParsedConnectionUri extends ParsedPgUri {
    engine: DatabaseEngine
}

export function buildPostgresUri(parts: {
    host: string
    port: number
    username: string
    password: string
    database?: string
    sslRequired?: boolean
}): string {
    return buildConnectionUri('postgres', parts)
}

export function buildConnectionUri(
    engine: DatabaseEngine,
    parts: {
        host: string
        port: number
        username: string
        password: string
        database?: string
        sslRequired?: boolean
    }
): string {
    const defaults = engineDefaults(engine)
    const scheme = engine === 'mysql' ? 'mysql' : 'postgresql'
    const user = encodeURIComponent(parts.username || defaults.username)
    const pass = parts.password ? `:${encodeURIComponent(parts.password)}` : ''
    const host = parts.host || 'localhost'
    const port = parts.port || defaults.port
    const db = parts.database ? `/${encodeURIComponent(parts.database)}` : '/'
    const ssl = parts.sslRequired
        ? engine === 'mysql'
            ? '?ssl-mode=REQUIRED'
            : '?sslmode=require'
        : ''
    return `${scheme}://${user}${pass}@${host}:${port}${db}${ssl}`
}

export function parsePostgresUri(uri: string): ParsedPgUri | null {
    const parsed = parseConnectionUri(uri)
    if (!parsed || parsed.engine !== 'postgres') return null
    return parsed
}

export function parseConnectionUri(uri: string): ParsedConnectionUri | null {
    const trimmed = uri.trim()
    if (!trimmed) return null

    const engine: DatabaseEngine | null = /^mysql:\/\//i.test(trimmed)
        ? 'mysql'
        : /^postgres(ql)?:\/\//i.test(trimmed)
            ? 'postgres'
            : null
    if (!engine) return null

    try {
        const normalized = trimmed.replace(/^(mysql|postgres(?:ql)?):\/\//i, 'http://')
        const url = new URL(normalized)
        const defaults = engineDefaults(engine)
        const sslmode = (url.searchParams.get('ssl-mode') || url.searchParams.get('sslmode') || '').toLowerCase()
        const sslRequired = sslmode === 'required' || sslmode === 'require' || sslmode === 'verify-full' || sslmode === 'verify-ca' || sslmode === 'verify_ca' || sslmode === 'verify_identity'

        return {
            engine,
            host: url.hostname || 'localhost',
            port: url.port ? parseInt(url.port, 10) : defaults.port,
            username: decodeURIComponent(url.username || defaults.username),
            password: decodeURIComponent(url.password || ''),
            database: decodeURIComponent((url.pathname || '/').replace(/^\//, '')),
            sslRequired,
        }
    } catch {
        return null
    }
}
