import { useRegisterSW } from 'virtual:pwa-register/react'
import { Button } from './ui/button'
import { RefreshCw } from 'lucide-react'

export function PWAUpdatePrompt() {
    const {
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r: ServiceWorkerRegistration | undefined) {
            console.log('SW Registered: ', r)
        },
        onRegisterError(error: unknown) {
            console.error('SW registration error', error)
        },
    })

    const close = () => {
        setNeedRefresh(false)
    }

    if (!needRefresh) return null

    return (
        <div className="fixed bottom-16 right-4 z-50 p-4 bg-primary text-primary-foreground rounded-lg shadow-xl flex items-center gap-3 border animate-in slide-in-from-bottom-5">
            <RefreshCw className="h-5 w-5 animate-spin shrink-0" />
            <div className="text-xs font-semibold">
                新しいバージョンが利用可能です！
            </div>
            <div className="flex items-center gap-1.5 ml-2">
                <Button
                    size="sm"
                    variant="secondary"
                    className="h-7 text-xs font-bold px-3"
                    onClick={() => updateServiceWorker(true)}
                >
                    更新する
                </Button>
                <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs px-2 text-primary-foreground/80 hover:text-primary-foreground"
                    onClick={close}
                >
                    閉じる
                </Button>
            </div>
        </div>
    )
}
