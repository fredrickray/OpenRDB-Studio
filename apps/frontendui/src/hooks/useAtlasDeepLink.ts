import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { listen } from '@tauri-apps/api/event'
import { useConnectionStore } from '@/stores/connectionStore'
import { useToastStore } from '@/stores/toastStore'

export interface AtlasConnectPayload {
    name: string
    host: string
    port: number
    username: string
    password: string
    database: string
    sslRequired: boolean
}

/** Normalize payloads from deep link query params or localhost bridge JSON. */
export function normalizeAtlasPayload(raw: Record<string, unknown>): AtlasConnectPayload | null {
    const host = String(raw.host || '').trim()
    const username = String(raw.username || raw.user || '').trim()
    if (!host || !username) return null

    const port = Number(raw.port ?? 5432)
    if (!Number.isFinite(port) || port < 1) return null

    const sslRaw = raw.sslRequired ?? raw.ssl
    const sslRequired =
        sslRaw === true || sslRaw === 1 || sslRaw === '1' || sslRaw === 'true'

    return {
        name: String(raw.name || '').trim() || `${host}/${String(raw.database || 'postgres')}`,
        host,
        port,
        username,
        password: String(raw.password ?? ''),
        database: String(raw.database || 'postgres').trim() || 'postgres',
        sslRequired,
    }
}

export function parseOpenrdbConnectUrl(urlString: string): AtlasConnectPayload | null {
    let url: URL
    try {
        url = new URL(urlString)
    } catch {
        return null
    }

    if (url.protocol !== 'openrdb:') return null

    const path = `${url.hostname}${url.pathname}`.replace(/\/+$/, '')
    if (path !== 'connect' && !urlString.includes('://connect')) {
        return null
    }

    return normalizeAtlasPayload({
        host: url.searchParams.get('host'),
        user: url.searchParams.get('user'),
        port: url.searchParams.get('port'),
        password: url.searchParams.get('password'),
        database: url.searchParams.get('database'),
        ssl: url.searchParams.get('ssl'),
        name: url.searchParams.get('name'),
    })
}

function applyPayload(payload: AtlasConnectPayload, navigate: (path: string) => void) {
    const apply = () => {
        useConnectionStore.getState().upsertAtlasConnection(payload)
        navigate('/connections')
        useToastStore.getState().showToast(`Added “${payload.name}” from Atlas`, 'success')
    }

    if (useConnectionStore.getState().isLoaded) {
        apply()
        return
    }

    const started = Date.now()
    const timer = window.setInterval(() => {
        if (useConnectionStore.getState().isLoaded || Date.now() - started > 5000) {
            window.clearInterval(timer)
            apply()
        }
    }, 50)
}

/**
 * Listens for Atlas handoffs:
 * - localhost bridge event `atlas-connect` (works with tauri:dev)
 * - `openrdb://` deep links (works when the scheme is registered / app installed)
 */
export function useAtlasDeepLink(): void {
    const navigate = useNavigate()
    const handledStart = useRef(false)

    useEffect(() => {
        const isTauri = typeof window !== 'undefined' && '__TAURI__' in window
        if (!isTauri) return

        const unlisteners: Array<() => void> = []

        void (async () => {
            try {
                const unlistenBridge = await listen<Record<string, unknown>>('atlas-connect', (event) => {
                    const payload = normalizeAtlasPayload(event.payload)
                    if (payload) applyPayload(payload, navigate)
                })
                unlisteners.push(unlistenBridge)
            } catch (err) {
                console.warn('Atlas bridge listener unavailable:', err)
            }

            try {
                const { getCurrent, onOpenUrl } = await import('@tauri-apps/plugin-deep-link')

                if (!handledStart.current) {
                    handledStart.current = true
                    const startUrls = await getCurrent()
                    if (startUrls?.length) {
                        for (const u of startUrls) {
                            const payload = parseOpenrdbConnectUrl(u)
                            if (payload) applyPayload(payload, navigate)
                        }
                    }
                }

                const unlistenDeep = await onOpenUrl((urls) => {
                    for (const u of urls) {
                        const payload = parseOpenrdbConnectUrl(u)
                        if (payload) applyPayload(payload, navigate)
                    }
                })
                unlisteners.push(unlistenDeep)
            } catch (err) {
                console.warn('Deep link plugin unavailable:', err)
            }
        })()

        return () => {
            unlisteners.forEach((fn) => fn())
        }
    }, [navigate])
}
