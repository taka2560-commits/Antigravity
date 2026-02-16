import { Trash2, X, ClipboardList, Ruler, MapPin, Compass, Shuffle, Info, History, Copy, Check, RotateCcw } from "lucide-react"
import { Button } from "./ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "./ui/dialog"
import { useCalculationHistory, type HistoryItem } from "../hooks/useCalculationHistory"
import { ScrollArea } from "./ui/scroll-area"
import { useState } from "react"

const HistoryIcon = ({ type }: { type: HistoryItem['type'] }) => {
    switch (type) {
        case 'st': return <Ruler className="h-4 w-4 text-primary" />;
        case 'coord': return <MapPin className="h-4 w-4 text-green-600" />;
        case 'north': return <Compass className="h-4 w-4 text-amber-600" />;
        case 'helmert': return <Shuffle className="h-4 w-4 text-purple-600" />;
        case 'point': return <MapPin className="h-4 w-4 text-blue-600" />;
        default: return <Info className="h-4 w-4 text-muted-foreground" />;
    }
}

const HistoryCard = ({ item, onRemove, onSelect }: { item: HistoryItem, onRemove: (id: string) => void, onSelect: (item: HistoryItem) => void }) => {
    const [copied, setCopied] = useState(false)

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(`${item.title}\n${item.summary}`)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch (err) {
            console.error('Failed to copy text: ', err)
        }
    }

    return (
        <div className="border rounded-lg p-3 bg-card shadow-sm hover:bg-muted/30 transition-colors relative group">
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 w-full">
                    <div className="mt-1 p-1.5 bg-muted rounded-full flex-shrink-0">
                        <HistoryIcon type={item.type} />
                    </div>
                    <div className="space-y-1 w-full min-w-0">
                        <div className="flex items-center justify-between gap-2 pr-8">
                            <h4 className="font-semibold text-sm truncate">{item.title}</h4>
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap flex-shrink-0">
                                {new Date(item.timestamp).toLocaleTimeString()}
                            </span>
                        </div>
                        <div className="text-xs text-muted-foreground whitespace-pre-wrap font-mono bg-muted/30 p-2 rounded border border-muted/50 select-text">
                            {item.summary}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-1 absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm rounded-md p-1 shadow-sm border">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-primary"
                        onClick={() => onSelect(item)}
                        title="復元"
                    >
                        <RotateCcw className="h-3 w-3" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                        onClick={handleCopy}
                        title="コピー"
                    >
                        {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => onRemove(item.id)}
                        title="削除"
                    >
                        <X className="h-3 w-3" />
                    </Button>
                </div>
            </div>
        </div>
    )
}

export function CalculationHistory({ onSelect }: { onSelect?: (item: HistoryItem) => void }) {
    const { history, removeHistory, clearHistory } = useCalculationHistory()
    const [isConfirmOpen, setIsConfirmOpen] = useState(false)

    const handleClear = () => {
        clearHistory()
        setIsConfirmOpen(false)
    }

    return (
        <>
            <Dialog>
                <DialogTrigger asChild>
                    <Button variant="outline" size="icon" className="h-8 w-8 relative">
                        <History className="h-4 w-4" />
                        {history.length > 0 && (
                            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-destructive border-[1.5px] border-background" />
                        )}
                    </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md max-h-[80vh] flex flex-col p-0">
                    <DialogHeader className="p-4 border-b">
                        <div className="flex items-center justify-between mr-6">
                            <DialogTitle className="flex items-center gap-2">
                                <History className="h-5 w-5" /> 計算履歴
                            </DialogTitle>
                            {history.length > 0 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 text-destructive hover:bg-destructive/10"
                                    onClick={() => setIsConfirmOpen(true)}
                                >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    全削除
                                </Button>
                            )}
                        </div>
                        <DialogDescription>
                            計算結果や座標の一時的な記録です。<br />
                            <span className="text-xs text-muted-foreground">※最大50件まで保存されます。リロードしても保持されます。</span>
                        </DialogDescription>
                    </DialogHeader>

                    <ScrollArea className="flex-1 p-4">
                        <div className="space-y-4">
                            {history.length === 0 ? (
                                <div className="text-center py-10 text-muted-foreground">
                                    <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-20" />
                                    <p className="text-sm">履歴はありません</p>
                                </div>
                            ) : (
                                history.map((item) => (
                                    <HistoryCard
                                        key={item.id}
                                        item={item}
                                        onRemove={removeHistory}
                                        onSelect={(item) => {
                                            onSelect?.(item)
                                        }}
                                    />
                                ))
                            )}
                        </div>
                    </ScrollArea>
                </DialogContent>
            </Dialog>

            <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>履歴をすべて削除しますか？</DialogTitle>
                        <DialogDescription>
                            この操作は取り消せません。保存されている計算履歴がすべて失われます。
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsConfirmOpen(false)}>キャンセル</Button>
                        <Button variant="destructive" onClick={handleClear}>削除する</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
