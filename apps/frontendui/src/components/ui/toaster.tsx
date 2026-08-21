import { useToastStore } from '@/stores/toastStore'
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const icons = {
    error: AlertCircle,
    success: CheckCircle,
    info: Info,
}

export function Toaster() {
    const { toasts, dismissToast } = useToastStore()

    if (toasts.length === 0) return null

    return (
        <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
            {toasts.map((toast) => {
                const Icon = icons[toast.type]
                return (
                    <div
                        key={toast.id}
                        className={cn(
                            'pointer-events-auto flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg bg-card text-sm',
                            toast.type === 'error' && 'border-destructive/40 text-destructive',
                            toast.type === 'success' && 'border-green-500/40 text-green-400',
                            toast.type === 'info' && 'border-border text-foreground'
                        )}
                    >
                        <Icon className="w-4 h-4 mt-0.5 shrink-0" />
                        <p className="flex-1 break-words">{toast.message}</p>
                        <button
                            type="button"
                            aria-label="Dismiss"
                            className="text-muted-foreground hover:text-foreground shrink-0"
                            onClick={() => dismissToast(toast.id)}
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )
            })}
        </div>
    )
}
