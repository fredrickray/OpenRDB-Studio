import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { listen } from '@tauri-apps/api/event'
import { handleMenuAction, isMenuAction } from '@/lib/menuActions'

export function useMenuActions(): void {
    const navigate = useNavigate()

    useEffect(() => {
        let unlisten: (() => void) | undefined

        void listen<string>('menu-action', (event) => {
            const action = event.payload
            if (isMenuAction(action)) {
                handleMenuAction(action, navigate)
            }
        }).then((fn) => {
            unlisten = fn
        })

        return () => {
            unlisten?.()
        }
    }, [navigate])
}
