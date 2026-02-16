import { useState, useMemo } from "react"
import { Search, X, Check } from "lucide-react"
import type { Point } from "../db"
import { Button } from "./ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog"
import { Input } from "./ui/input"
import { ScrollArea } from "./ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { cn } from "@/lib/utils"

interface PointSelectorProps {
    points: Point[] | undefined
    value: string // ID as string
    onSelect: (value: string) => void
    label?: string
    placeholder?: string
    disabled?: boolean
}

export function PointSelector({ points, value, onSelect, label, placeholder = "点を選択", disabled }: PointSelectorProps) {
    const [open, setOpen] = useState(false)
    const [search, setSearch] = useState("")

    const selectedPoint = useMemo(() => {
        return points?.find(p => String(p.id) === value)
    }, [points, value])

    const filteredPoints = useMemo(() => {
        if (!points) return []
        if (!search) return points
        const lower = search.toLowerCase()
        return points.filter(p =>
            p.name.toLowerCase().includes(lower) ||
            String(p.id).includes(lower)
        )
    }, [points, search])

    const handleSelect = (id: string) => {
        onSelect(id)
        setOpen(false)
    }

    const clearSelection = (e: React.MouseEvent) => {
        e.stopPropagation()
        onSelect("")
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between h-10 px-3 text-sm bg-background font-normal"
                    disabled={disabled}
                >
                    {selectedPoint ? (
                        <span className="truncate mr-2 font-medium">{selectedPoint.name}</span>
                    ) : (
                        <span className="text-muted-foreground truncate">{label || placeholder}</span>
                    )}
                    {selectedPoint ? (
                        <div
                            role="button"
                            onClick={clearSelection}
                            className="ml-auto h-4 w-4 shrink-0 opacity-50 hover:opacity-100 p-0.5 rounded-full hover:bg-muted"
                        >
                            <X className="h-full w-full" />
                        </div>
                    ) : (
                        <Search className="ml-auto h-3 w-3 shrink-0 opacity-50" />
                    )}
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[90vw] md:max-w-2xl h-[80vh] flex flex-col p-0 gap-0">
                <DialogHeader className="p-4 pb-2 border-b">
                    <DialogTitle>{label || "点を選択"}</DialogTitle>
                    <div className="relative mt-2">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="名前で検索..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-hidden relative">
                    <ScrollArea className="h-full">
                        <Table>
                            <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                                <TableRow>
                                    <TableHead className="w-[40%] text-xs sm:text-sm">点名</TableHead>
                                    <TableHead className="text-right text-xs sm:text-sm">X (North)</TableHead>
                                    <TableHead className="text-right text-xs sm:text-sm">Y (East)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredPoints.length > 0 ? (
                                    filteredPoints.map((p, index) => (
                                        <TableRow
                                            key={p.id}
                                            onClick={() => handleSelect(String(p.id))}
                                            className={cn(
                                                "cursor-pointer transition-colors h-12", // Increased height
                                                String(p.id) === value
                                                    ? "bg-amber-100 dark:bg-amber-900/60 hover:bg-amber-200 dark:hover:bg-amber-900/80"
                                                    : index % 2 === 0 ? "bg-muted/5" : "bg-muted/20 hover:bg-muted/40"
                                            )}
                                        >
                                            <TableCell className="font-medium flex items-center gap-2 text-sm">
                                                {String(p.id) === value && <Check className="h-4 w-4 text-amber-600 dark:text-amber-400" />}
                                                <span className={cn(String(p.id) === value ? "text-amber-900 dark:text-amber-100 font-bold" : "text-foreground")}>
                                                    {p.name}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-sm text-foreground/80">
                                                {p.x?.toFixed(3) ?? "-"}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-sm text-foreground/80">
                                                {p.y?.toFixed(3) ?? "-"}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={3} className="h-24 text-center text-sm">
                                            データが見つかりません
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </div>

                <div className="p-3 border-t text-sm text-center text-muted-foreground bg-muted/10">
                    {filteredPoints.length} 件表示中
                </div>
            </DialogContent>
        </Dialog>
    )
}
