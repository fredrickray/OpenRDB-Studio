import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { listen } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/core'
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

function inTauriShell(): boolean {
    if (typeof window === 'undefined') return false
    return (
        '__TAURI_INTERNALS__' in window ||
        '__TAURI__' in window ||
        // Vite/Tauri injects this in desktop builds
        Boolean((window as unknown as { isTauri?: boolean }).isTauri)
    )
}

/** Normalize payloads from deep link query params or localhost bridge JSON. */
export function normalizeAtlasPayload(raw: unknown): AtlasConnectPayload | null {
    if (!raw || typeof raw !== 'object') return null
    const data = raw as Record<string, unknown>

    const host = String(data.host || '').trim()
    const username = String(data.username || data.user || '').trim()
    if (!host || !username) return null

    const port = Number(data.port ?? 5432)
    if (!Number.isFinite(port) || port < 1) return null

    const sslRaw = data.sslRequired ?? data.ssl_required ?? data.ssl
    const sslRequired =
        sslRaw === true || sslRaw === 1 || sslRaw === '1' || sslRaw === 'true'

    return {
        name: String(data.name || '').trim() || `${host}/${String(data.database || 'postgres')}`,
        host,
        port,
        username,
        password: String(data.password ?? ''),
        database: String(data.database || 'postgres').trim() || 'postgres',
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
        const id = useConnectionStore.getState().upsertAtlasConnection(payload)
        navigate('/connections')
        useConnectionStore.getState().setActiveConnection(id)
        useToastStore.getState().showToast(`Added “${payload.name}” from Atlas`, 'success')
        console.info('[Atlas] imported connection', payload.name, payload.host, id)
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

async function drainPending(onItem: (payload: AtlasConnectPayload) => void) {
    try {
        const pending = await invoke<unknown[]>('take_pending_atlas_connects')
        if (!Array.isArray(pending) || pending.length === 0) return
        for (const item of pending) {
            const payload = normalizeAtlasPayload(item)
            if (payload) onItem(payload)
        }
    } catch (err) {
        // Not in Tauri, or command not ready yet
        console.debug('[Atlas] pending poll skipped', err)
    }
}

/**
 * Listens for Atlas handoffs:
 * - pending queue via invoke (reliable with tauri:dev)
 * - localhost bridge event `atlas-connect`
 * - `openrdb://` deep links
 */
export function useAtlasDeepLink(): void {
    const navigate = useNavigate()
    const handledStart = useRef(false)
    const recentKeys = useRef(new Map<string, number>())

    useEffect(() => {
        let cancelled = false
        const unlisteners: Array<() => void> = []

        const applyOnce = (payload: AtlasConnectPayload) => {
            const key = `${payload.host}|${payload.port}|${payload.username}|${payload.database}`
            const now = Date.now()
            const last = recentKeys.current.get(key) || 0
            // Dedupe event + pending-poll double delivery within 2s
            if (now - last < 2000) return
            recentKeys.current.set(key, now)
            applyPayload(payload, navigate)
        }

        void (async () => {
            // Always try invoke/event — do not gate on __TAURI__ (unreliable on Tauri 2).
            await drainPending(applyOnce)
            if (cancelled) return

            const poll = window.setInterval(() => {
                if (!cancelled) void drainPending(applyOnce)
            }, 750)
            unlisteners.push(() => window.clearInterval(poll))

            try {
                const unlistenBridge = await listen<unknown>('atlas-connect', (event) => {
                    const payload = normalizeAtlasPayload(event.payload)
                    if (payload) applyOnce(payload)
                })
                if (cancelled) {
                    unlistenBridge()
                    return
                }
                unlisteners.push(unlistenBridge)
            } catch (err) {
                console.warn('Atlas bridge listener unavailable:', err)
            }

            if (!inTauriShell()) return

            try {
                const { getCurrent, onOpenUrl } = await import('@tauri-apps/plugin-deep-link')

                if (!handledStart.current) {
                    handledStart.current = true
                    const startUrls = await getCurrent()
                    if (startUrls?.length) {
                        for (const u of startUrls) {
                            const payload = parseOpenrdbConnectUrl(u)
                            if (payload) applyOnce(payload)
                        }
                    }
                }

                const unlistenDeep = await onOpenUrl((urls) => {
                    for (const u of urls) {
                        const payload = parseOpenrdbConnectUrl(u)
                        if (payload) applyOnce(payload)
                    }
                })
                if (cancelled) {
                    unlistenDeep()
                    return
                }
                unlisteners.push(unlistenDeep)
            } catch (err) {
                console.warn('Deep link plugin unavailable:', err)
            }
        })()

        return () => {
            cancelled = true
            unlisteners.forEach((fn) => fn())
        }
    }, [navigate])
}
