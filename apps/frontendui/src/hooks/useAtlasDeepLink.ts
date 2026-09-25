import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
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

export function parseOpenrdbConnectUrl(urlString: string): AtlasConnectPayload | null {
    let url: URL
    try {
        url = new URL(urlString)
    } catch {
        return null
    }

    if (url.protocol !== 'openrdb:') return null

    // openrdb://connect?... → hostname is "connect"
    const path = `${url.hostname}${url.pathname}`.replace(/\/+$/, '')
    if (path !== 'connect' && !urlString.includes('://connect')) {
        return null
    }

    const host = url.searchParams.get('host')?.trim()
    const user = url.searchParams.get('user')?.trim()
    if (!host || !user) return null

    const portRaw = url.searchParams.get('port') || '5432'
    const port = Number(portRaw)
    if (!Number.isFinite(port) || port < 1) return null

    return {
        name: url.searchParams.get('name')?.trim() || `${host}/${url.searchParams.get('database') || 'postgres'}`,
        host,
        port,
        username: user,
        password: url.searchParams.get('password') || '',
        database: url.searchParams.get('database')?.trim() || 'postgres',
        sslRequired:
            url.searchParams.get('ssl') === '1' ||
            url.searchParams.get('ssl') === 'true',
    }
}

function applyPayload(payload: AtlasConnectPayload, navigate: (path: string) => void) {
    const apply = () => {
        useConnectionStore.getState().upsertAtlasConnection(payload)
        navigate('/connections')
        useToastStore.getState().showToast(
            `Added “${payload.name}” from Atlas`,
            'success'
        )
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
 * Listens for Atlas `openrdb://connect?...` deep links (Tauri only).
 */
export function useAtlasDeepLink(): void {
    const navigate = useNavigate()
    const handledStart = useRef(false)

    useEffect(() => {
        const isTauri = typeof window !== 'undefined' && '__TAURI__' in window
        if (!isTauri) return

        let unlisten: (() => void) | undefined

        void (async () => {
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

                unlisten = await onOpenUrl((urls) => {
                    for (const u of urls) {
                        const payload = parseOpenrdbConnectUrl(u)
                        if (payload) applyPayload(payload, navigate)
                    }
                })
            } catch (err) {
                console.warn('Deep link plugin unavailable:', err)
            }
        })()

        return () => {
            unlisten?.()
        }
    }, [navigate])
}
