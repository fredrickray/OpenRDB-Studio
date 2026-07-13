import { create } from 'zustand'

export type ToastType = 'error' | 'success' | 'info'

export interface Toast {
    id: string
    message: string
    type: ToastType
}

interface ToastStore {
    toasts: Toast[]
    showToast: (message: string, type?: ToastType) => void
    dismissToast: (id: string) => void
}

export const useToastStore = create<ToastStore>((set) => ({
    toasts: [],

    showToast: (message, type = 'info') => {
        const id = crypto.randomUUID()
        set((state) => ({
            toasts: [...state.toasts, { id, message, type }],
        }))
        window.setTimeout(() => {
            set((state) => ({
                toasts: state.toasts.filter((t) => t.id !== id),
            }))
        }, 4500)
    },

    dismissToast: (id) =>
        set((state) => ({
            toasts: state.toasts.filter((t) => t.id !== id),
        })),
}))
