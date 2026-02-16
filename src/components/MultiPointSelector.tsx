import { useState, useMemo } from "react"
import { Search, ListChecks } from "lucide-react"
import type { Point } from "../db"
import { Button } from "./ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "./ui/dialog"
import { Input } from "./ui/input"
import { ScrollArea } from "./ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Checkbox } from "./ui/checkbox"
import { Badge } from "./ui/badge"
import { PointSelector } from "./PointSelector"
import { cn } from "@/lib/utils"

interface MultiPointSelectorProps {
    points: Point[] | undefined
    selectedIds: Set<number>
    onSelectionChange: (ids: Set<number>) => void
    triggerLabel?: string
}

export function MultiPointSelector({ points, selectedIds, onSelectionChange, triggerLabel = "点を選択" }: MultiPointSelectorProps) {
    const [open, setOpen] = useState(false)
    const [search, setSearch] = useState("")

    // Range Selection State
    const [rangeStart, setRangeStart] = useState<string>("")
    const [rangeEnd, setRangeEnd] = useState<string>("")

    const filteredPoints = useMemo(() => {
        if (!points) return []
        if (!search) return points
        const lower = search.toLowerCase()
        return points.filter(p =>
            p.name.toLowerCase().includes(lower) ||
            String(p.id).includes(lower)
        )
    }, [points, search])

    const toggleSelection = (id: number) => {
        const newSet = new Set(selectedIds)
        if (newSet.has(id)) {
            newSet.delete(id)
        } else {
            newSet.add(id)
        }
        onSelectionChange(newSet)
    }

    const selectAllFiltered = () => {
        const newSet = new Set(selectedIds)
        filteredPoints.forEach(p => {
            if (p.id !== undefined) newSet.add(p.id)
        })
        onSelectionChange(newSet)
    }

    const deselectAllFiltered = () => {
        const newSet = new Set(selectedIds)
        filteredPoints.forEach(p => {
            if (p.id !== undefined) newSet.delete(p.id)
        })
        onSelectionChange(newSet)
    }

    const handleRangeSelect = () => {
        if (!points || !rangeStart || !rangeEnd) return

        const startId = Number(rangeStart)
        const endId = Number(rangeEnd)

        // Find indices in the FULL list (assuming range is based on data order, not filter)
        const startIndex = points.findIndex(p => p.id === startId)
        const endIndex = points.findIndex(p => p.id === endId)

        if (startIndex === -1 || endIndex === -1) return

        const start = Math.min(startIndex, endIndex)
        const end = Math.max(startIndex, endIndex)

        const newSet = new Set(selectedIds)
        for (let i = start; i <= end; i++) {
            const p = points[i]
            if (p.id !== undefined) newSet.add(p.id)
        }
        onSelectionChange(newSet)

        // Reset range inputs
        setRangeStart("")
        setRangeEnd("")
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                    <span className="flex items-center gap-2">
                        <ListChecks className="h-4 w-4" />
                        {selectedIds.size > 0 ? `${selectedIds.size}点 選択中` : triggerLabel}
                    </span>
                    <Badge variant="secondary" className="ml-2">{selectedIds.size}</Badge>
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] md:max-w-4xl h-[90vh] flex flex-col p-0 gap-0">
                <DialogHeader className="p-4 pb-2 border-b space-y-4">
                    <DialogTitle>一括変換 点選択</DialogTitle>

                    {/* Tools Area */}
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Search */}
                        <div className="relative flex-1">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="名前で検索..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-8"
                            />
                        </div>

                        {/* Range Select */}
                        <div className="flex items-center gap-2 bg-muted/30 p-2 rounded-md border text-xs overflow-x-auto">
                            <span className="font-semibold whitespace-nowrap">範囲選択:</span>
                            <div className="w-32">
                                <PointSelector
                                    points={points}
                                    value={rangeStart}
                                    onSelect={setRangeStart}
                                    placeholder="開始点"
                                />
                            </div>
                            <span>~</span>
                            <div className="w-32">
                                <PointSelector
                                    points={points}
                                    value={rangeEnd}
                                    onSelect={setRangeEnd}
                                    placeholder="終了点"
                                />
                            </div>
                            <Button
                                size="sm"
                                variant="secondary"
                                disabled={!rangeStart || !rangeEnd}
                                onClick={handleRangeSelect}
                                className="whitespace-nowrap"
                            >
                                追加
                            </Button>
                        </div>
                    </div>

                    <div className="flex justify-between items-center text-xs text-muted-foreground pt-2">
                        <div>
                            {filteredPoints.length} 件表示 / {selectedIds.size} 件選択中
                        </div>
                        <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={selectAllFiltered} className="h-6 px-2 text-xs">すべて選択</Button>
                            <Button variant="ghost" size="sm" onClick={deselectAllFiltered} className="h-6 px-2 text-xs">選択解除</Button>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-hidden relative bg-muted/5">
                    <ScrollArea className="h-full">
                        <Table>
                            <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                                <TableRow>
                                    <TableHead className="w-[50px] text-center">選択</TableHead>
                                    <TableHead>点名</TableHead>
                                    <TableHead className="text-right">X (North)</TableHead>
                                    <TableHead className="text-right">Y (East)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredPoints.length > 0 ? (
                                    filteredPoints.map((p, index) => {
                                        const isSelected = selectedIds.has(p.id!)
                                        return (
                                            <TableRow
                                                key={p.id}
                                                onClick={() => toggleSelection(p.id!)}
                                                className={cn(
                                                    "cursor-pointer transition-colors",
                                                    isSelected
                                                        ? "bg-amber-200 dark:bg-amber-900/60 hover:bg-amber-300 dark:hover:bg-amber-900/80"
                                                        : index % 2 === 0 ? "bg-muted/10" : "bg-muted/30 hover:bg-muted/50"
                                                )}
                                            >
                                                <TableCell className="w-[50px]">
                                                    <Checkbox
                                                        checked={isSelected}
                                                        onCheckedChange={() => toggleSelection(p.id!)}
                                                        className={isSelected ? "border-amber-600 data-[state=checked]:bg-amber-600 data-[state=checked]:text-white dark:border-amber-400 dark:data-[state=checked]:bg-amber-400 dark:data-[state=checked]:text-black" : ""}
                                                    />
                                                </TableCell>
                                                <TableCell className={cn("font-medium", isSelected ? "text-amber-900 dark:text-amber-100 font-bold" : "")}>
                                                    {p.name}
                                                </TableCell>
                                                <TableCell className={cn("text-right font-mono text-xs text-muted-foreground", isSelected ? "text-amber-800 dark:text-amber-200" : "")}>
                                                    {p.x?.toFixed(3) ?? "-"}
                                                </TableCell>
                                                <TableCell className={cn("text-right font-mono text-xs text-muted-foreground", isSelected ? "text-amber-800 dark:text-amber-200" : "")}>
                                                    {p.y?.toFixed(3) ?? "-"}
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center">
                                            データが見つかりません
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </div>

                <DialogFooter className="p-4 border-t">
                    <Button onClick={() => setOpen(false)} className="w-full sm:w-auto">
                        決定 ({selectedIds.size}点)
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
