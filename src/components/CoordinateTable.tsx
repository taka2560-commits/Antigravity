import { useState, useRef } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { db, type Point } from "../db"
import { CoordinateForm } from "./CoordinateForm"
import { Pencil, Trash2, Plus, Upload, FileDown, MoreHorizontal, ClipboardList } from "lucide-react"
import Papa from "papaparse"
import { saveAs } from "file-saver"
import { parseSima, generateSima } from "../utils/sima"
import { generateCoordinateListPDF } from "../utils/reports/coordinateList"
import { Button } from "./ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "./ui/table"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "./ui/dialog"
import { Label } from "./ui/label"

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import { useCalculationHistory } from "../hooks/useCalculationHistory"

export function CoordinateTable() {
    const points = useLiveQuery(() => db.points.toArray())
    const { addHistory } = useCalculationHistory()
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [editingPoint, setEditingPoint] = useState<Point | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Range Delete State
    const [isRangeDeleteOpen, setIsRangeDeleteOpen] = useState(false)
    const [rangeStartId, setRangeStartId] = useState<number | string>("")
    const [rangeEndId, setRangeEndId] = useState<number | string>("")

    const handleEdit = (point: Point) => {
        setEditingPoint(point)
        setIsFormOpen(true)
    }

    const handleRecordPoint = (point: Point) => {
        addHistory({
            type: 'point',
            title: `座標記録: ${point.name}`,
            summary: `X: ${point.x.toFixed(3)}\nY: ${point.y.toFixed(3)}\nZ: ${point.z?.toFixed(3) ?? '-'}`,
            details: { ...point }
        })
        alert("座標を履歴に記録しました")
    }

    const handleDelete = async (id: number) => {
        if (confirm("本当に削除しますか？")) {
            await db.points.delete(id)
        }
    }

    const handleRangeDelete = async () => {
        if (!points || !rangeStartId || !rangeEndId) return

        const startIdx = points.findIndex(p => p.id === Number(rangeStartId))
        const endIdx = points.findIndex(p => p.id === Number(rangeEndId))

        if (startIdx === -1 || endIdx === -1) {
            alert("点が見つかりません")
            return
        }

        const realStart = Math.min(startIdx, endIdx)
        const realEnd = Math.max(startIdx, endIdx)

        // Include the end point
        const pointsToDelete = points.slice(realStart, realEnd + 1)

        if (confirm(`${pointsToDelete[0].name} から ${pointsToDelete[pointsToDelete.length - 1].name} までの ${pointsToDelete.length} 点を削除しますか？`)) {
            const ids = pointsToDelete.map(p => p.id!)
            await db.points.bulkDelete(ids)
            setIsRangeDeleteOpen(false)
            setRangeStartId("")
            setRangeEndId("")
        }
    }

    const handleDeleteAll = async () => {
        if (!points || points.length === 0) return

        if (confirm("【警告】すべての座標データを削除します。\nこの操作は取り消せません。\n\n本当によろしいですか？")) {
            if (confirm("全てのデータが失われます。最終確認です。\n実行しますか？")) {
                await db.points.clear()
                alert("全データを削除しました。")
            }
        }
    }

    const handleCreate = () => {
        setEditingPoint(null)
        setIsFormOpen(true)
    }

    const handleImportClick = () => {
        fileInputRef.current?.click()
    }
    // ... (inside the return JSX)
    <DropdownMenu>
        <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 text-destructive border-destructive/20 hover:bg-destructive/10">
                <Trash2 className="mr-2 h-4 w-4" />
                整理
            </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setIsRangeDeleteOpen(true)} className="text-destructive focus:text-destructive">
                範囲削除...
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleDeleteAll} className="text-destructive focus:text-destructive font-bold">
                全データ削除
            </DropdownMenuItem>
        </DropdownMenuContent>
    </DropdownMenu>

    const readFile = (file: File, encoding: string): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = (e) => resolve(e.target?.result as string)
            reader.onerror = (e) => reject(e)
            reader.readAsText(file, encoding)
        })
    }

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        const filename = file.name.toLowerCase()

        try {
            if (filename.endsWith(".csv")) {
                // For CSV, try Shift_JIS first
                const text = await readFile(file, "Shift_JIS")
                Papa.parse(text, {
                    header: false, // Parse as array of arrays first
                    skipEmptyLines: true,
                    complete: async (results) => {
                        const rows = results.data as any[][]
                        if (rows.length === 0) return

                        // Heuristic: Check if first row is header
                        const firstRow = rows[0].map(c => String(c).trim())
                        const isHeader = ["name", "点名", "名称", "x", "y"].some(k =>
                            firstRow.some(cell => cell.toLowerCase() === k || cell === "X" || cell === "Y" || cell.includes("座標"))
                        )

                        let importedPoints: any[] = []

                        if (isHeader) {
                            // Map by header name
                            const headers = firstRow.map(h => h.toLowerCase())
                            const nameIdx = headers.findIndex(h => ["name", "点名", "名称"].includes(h))
                            const xIdx = headers.findIndex(h => ["x", "x座標", "ｘ"].includes(h))
                            const yIdx = headers.findIndex(h => ["y", "y座標", "ｙ"].includes(h))
                            const zIdx = headers.findIndex(h => ["z", "z座標", "ｚ"].includes(h))
                            const noteIdx = headers.findIndex(h => ["note", "備考"].includes(h))

                            importedPoints = rows.slice(1).map(row => ({
                                name: row[nameIdx],
                                x: parseFloat(row[xIdx]),
                                y: parseFloat(row[yIdx]),
                                z: zIdx >= 0 ? parseFloat(row[zIdx]) : 0,
                                note: noteIdx >= 0 ? row[noteIdx] : ""
                            }))
                        } else {
                            // Assume standard order: Name, X, Y, Z, Note
                            importedPoints = rows.map(row => ({
                                name: row[0],
                                x: parseFloat(row[1]),
                                y: parseFloat(row[2]),
                                z: parseFloat(row[3]) || 0,
                                note: row[4] || ""
                            }))
                        }

                        // Filter valid points
                        const validPoints = importedPoints.filter(p => p.name && !isNaN(p.x) && !isNaN(p.y))

                        if (validPoints.length > 0) {
                            await db.points.bulkAdd(validPoints as any)
                            alert(`${validPoints.length} 件インポートしました`)
                        } else {
                            alert("有効なデータが見つかりませんでした。\nCSVは「点名,X,Y,Z」の順序、またはヘッダーありで作成してください。")
                        }
                    }
                })
            } else if (filename.endsWith(".sim") || filename.endsWith(".sima")) {
                // Release 1: Try Shift_JIS
                let text = await readFile(file, "Shift_JIS")

                let importedPoints = parseSima(text)

                // Release 2: If failed, try UTF-8
                if (importedPoints.length === 0) {
                    text = await readFile(file, "UTF-8")
                    importedPoints = parseSima(text)
                }

                if (importedPoints.length > 0) {
                    await db.points.bulkAdd(importedPoints as any)
                    alert(`${importedPoints.length} 件インポートしました`)
                } else {
                    const snippet = text.substring(0, 200)
                    alert(`有効なSIMAデータが見つかりませんでした。\n\n【読み込みデータ先頭】\n${snippet}\n\n文字化けしている場合は、ファイルの文字コードを確認してください。データ区分 A01 が必要です。`)
                }
            } else {
                alert("対応していないファイル形式です (.csv, .sim, .sima)")
            }
        } catch (error) {
            console.error("Import failed:", error)
            alert("インポートに失敗しました")
        }

        // Reset input
        event.target.value = ""
    }

    const handleExportCSV = () => {
        if (!points || points.length === 0) return
        const csv = Papa.unparse(points.map(p => ({
            "点名": p.name,
            "X座標": p.x,
            "Y座標": p.y,
            "Z座標": p.z,
            "備考": p.note
        })))
        const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: "text/csv;charset=utf-8;" })
        saveAs(blob, "coordinates.csv")
    }

    const handleExportSIMA = () => {
        if (!points || points.length === 0) return
        const sima = generateSima(points)
        const blob = new Blob([sima], { type: "text/plain;charset=shift_jis;" })
        saveAs(blob, "coordinates.sima")
    }

    return (
        <Card className="border-0 shadow-none sm:border sm:shadow-sm bg-card">
            <CardHeader className="px-0 pt-0 pb-4 sm:px-6 sm:pt-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <CardTitle className="text-xl font-bold">座標一覧</CardTitle>
                    <div className="flex flex-wrap gap-2">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                            accept=".csv,.sim,.sima"
                        />
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleImportClick}
                            className="h-9"
                        >
                            <Upload className="mr-2 h-4 w-4" />
                            インポート
                        </Button>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-9">
                                    <FileDown className="mr-2 h-4 w-4" />
                                    エクスポート
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>形式を選択</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => generateCoordinateListPDF(points || [])}>
                                    PDF形式 (一覧表)
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleExportCSV}>
                                    CSV形式 (.csv)
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleExportSIMA}>
                                    SIMA形式 (.sim)
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-9 text-destructive border-destructive/20 hover:bg-destructive/10">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    整理
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setIsRangeDeleteOpen(true)} className="text-destructive focus:text-destructive">
                                    範囲削除...
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleDeleteAll} className="text-destructive focus:text-destructive font-bold">
                                    全データ削除
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <Button
                            onClick={handleCreate}
                            size="sm"
                            className="h-9 bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            新規登録
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="px-0 sm:px-6">
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[100px]">点名</TableHead>
                                <TableHead className="text-right">X</TableHead>
                                <TableHead className="text-right">Y</TableHead>
                                <TableHead className="text-right hidden sm:table-cell">Z</TableHead>
                                <TableHead className="hidden md:table-cell">備考</TableHead>
                                <TableHead className="w-[80px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {points?.map((point, index) => (
                                <TableRow
                                    key={point.id}
                                    className={index % 2 === 0 ? "bg-muted/20" : "bg-muted/50 hover:bg-muted/60"}
                                >
                                    <TableCell className="font-medium">{point.name}</TableCell>
                                    <TableCell className="text-right font-mono">{(point.x ?? 0).toFixed(3)}</TableCell>
                                    <TableCell className="text-right font-mono">{(point.y ?? 0).toFixed(3)}</TableCell>
                                    <TableCell className="text-right font-mono hidden sm:table-cell">{(point.z ?? 0).toFixed(3)}</TableCell>
                                    <TableCell className="hidden md:table-cell text-muted-foreground">{point.note}</TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <span className="sr-only">メニューを開く</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleRecordPoint(point)}>
                                                    <ClipboardList className="mr-2 h-4 w-4" /> 履歴に記録
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={() => handleEdit(point)}>
                                                    <Pencil className="mr-2 h-4 w-4" /> 編集
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() => handleDelete(point.id!)}
                                                    className="text-destructive focus:text-destructive"
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" /> 削除
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {points?.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        データがありません。
                                        <br />
                                        <span className="text-xs text-muted-foreground">「新規登録」または「インポート」からデータを追加してください。</span>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>

            <CoordinateForm
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                initialData={editingPoint}
            />

            <Dialog open={isRangeDeleteOpen} onOpenChange={setIsRangeDeleteOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>範囲削除</DialogTitle>
                        <DialogDescription>
                            削除する範囲の開始点と終了点を選択してください。
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="start-point" className="text-right">
                                開始点
                            </Label>
                            <select
                                id="start-point"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 col-span-3"
                                value={rangeStartId}
                                onChange={(e) => setRangeStartId(e.target.value)}
                            >
                                <option value="">選択してください</option>
                                {points?.map(p => (
                                    <option key={`start-${p.id}`} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="end-point" className="text-right">
                                終了点
                            </Label>
                            <select
                                id="end-point"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 col-span-3"
                                value={rangeEndId}
                                onChange={(e) => setRangeEndId(e.target.value)}
                            >
                                <option value="">選択してください</option>
                                {points?.map(p => (
                                    <option key={`end-${p.id}`} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsRangeDeleteOpen(false)}>
                            キャンセル
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleRangeDelete}
                            disabled={!rangeStartId || !rangeEndId}
                        >
                            削除実行
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    )
}
