import { useState, useMemo } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { db } from "../db"
import { ELEVATION_SYSTEMS, convertElevation, getConversionOffset } from "../utils/elevationSystems"
import { ArrowRightLeft, Save, AlertTriangle, ArrowDown } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card"
import { Button } from "./ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Checkbox } from "./ui/checkbox"
import { Label } from "./ui/label"

export function ElevationConversion() {
    const points = useLiveQuery(() => db.points.toArray())

    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
    const [fromSystemIdx, setFromSystemIdx] = useState(0) // T.P.
    const [toSystemIdx, setToSystemIdx] = useState(1)     // O.P.
    const [previewResults, setPreviewResults] = useState<any[] | null>(null)

    const fromSystem = ELEVATION_SYSTEMS[fromSystemIdx]
    const toSystem = ELEVATION_SYSTEMS[toSystemIdx]
    const offset = useMemo(() => getConversionOffset(fromSystem, toSystem), [fromSystemIdx, toSystemIdx])

    const toggleSelection = (id: number) => {
        const newSet = new Set(selectedIds)
        if (newSet.has(id)) {
            newSet.delete(id)
        } else {
            newSet.add(id)
        }
        setSelectedIds(newSet)
    }

    const selectAll = () => {
        if (points) setSelectedIds(new Set(points.map(p => p.id!)))
    }

    const deselectAll = () => setSelectedIds(new Set())

    const handleConvert = () => {
        if (!points || selectedIds.size === 0) return

        const targets = points.filter(p => selectedIds.has(p.id!))
        const results = targets.map(p => {
            const oldZ = p.z || 0
            const newZ = convertElevation(oldZ, fromSystem, toSystem)
            return { ...p, oldZ, newZ, diff: newZ - oldZ }
        })

        setPreviewResults(results)
    }

    const handleSave = async () => {
        if (!previewResults) return

        let count = 0
        try {
            await db.transaction('rw', db.points, async () => {
                for (const item of previewResults) {
                    await db.points.update(item.id, {
                        z: item.newZ
                    })
                    count++
                }
            })
            alert(`${count}件のZ座標を更新しました。`)
            setPreviewResults(null)
            setSelectedIds(new Set())
        } catch (e) {
            console.error("更新エラー:", e)
            alert("データの更新に失敗しました。")
        }
    }

    const swapSystems = () => {
        setFromSystemIdx(toSystemIdx)
        setToSystemIdx(fromSystemIdx)
        setPreviewResults(null)
    }

    return (
        <Card className="border-0 shadow-none sm:border sm:shadow-sm">
            <CardHeader className="px-0 pt-0 pb-4 sm:px-6 sm:pt-6">
                <CardTitle className="text-lg font-bold flex items-center">
                    <ArrowRightLeft className="h-5 w-5 mr-2 text-primary" />
                    標高系変換
                </CardTitle>
                <CardDescription>
                    日本の代表的な標高系（T.P., O.P., A.P., Y.P. 等）を相互に変換します。<br />
                    変換結果を確認し、Z座標へ一括反映させることができます。
                </CardDescription>
            </CardHeader>

            <CardContent className="px-0 sm:px-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 左ペイン：設定と対象選択 */}
                    <div className="border rounded-lg bg-card shadow-sm flex flex-col h-[500px]">
                        <div className="p-4 border-b bg-muted/20 space-y-3">
                            <h3 className="text-sm font-semibold mb-3">1. 標高系の選択</h3>

                            {/* 変換元 */}
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground font-medium">変換元</Label>
                                <select
                                    value={fromSystemIdx}
                                    onChange={e => { setFromSystemIdx(Number(e.target.value)); setPreviewResults(null) }}
                                    className="w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                >
                                    {ELEVATION_SYSTEMS.map((sys, idx) => (
                                        <option key={idx} value={idx}>
                                            {sys.abbr}（{sys.name}）
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* 入れ替えボタン */}
                            <div className="flex justify-center">
                                <Button variant="outline" size="sm" onClick={swapSystems} className="h-7 text-xs px-3">
                                    <ArrowRightLeft className="h-3 w-3 mr-1" /> 入れ替え
                                </Button>
                            </div>

                            {/* 変換先 */}
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground font-medium">変換先</Label>
                                <select
                                    value={toSystemIdx}
                                    onChange={e => { setToSystemIdx(Number(e.target.value)); setPreviewResults(null) }}
                                    className="w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                >
                                    {ELEVATION_SYSTEMS.map((sys, idx) => (
                                        <option key={idx} value={idx}>
                                            {sys.abbr}（{sys.name}）
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* オフセット表示 */}
                            <div className="text-xs text-center mt-2 py-1.5 px-3 rounded bg-primary/5 border border-primary/20 font-mono">
                                <span className="text-muted-foreground">換算差: </span>
                                <span className="font-bold text-primary">{offset >= 0 ? "+" : ""}{offset.toFixed(4)} m</span>
                                <span className="text-muted-foreground ml-1">
                                    （{fromSystem.abbr} → {toSystem.abbr}）
                                </span>
                            </div>
                        </div>

                        <div className="flex-1 p-4 flex flex-col overflow-hidden">
                            <div className="flex justify-between items-center mb-2 text-xs">
                                <h3 className="font-semibold">2. 対象点の選択</h3>
                                <div className="space-x-2">
                                    <Button variant="link" size="sm" onClick={selectAll} className="h-auto p-0">全選択</Button>
                                    <span className="text-muted-foreground">|</span>
                                    <Button variant="link" size="sm" onClick={deselectAll} className="h-auto p-0">全解除</Button>
                                </div>
                            </div>
                            <span className="font-mono bg-muted px-2 py-0.5 rounded text-xs w-max mb-2">{selectedIds.size} 点選択中</span>
                            <div className="flex-1 overflow-y-auto border rounded bg-background p-2 space-y-1">
                                {points?.map(p => (
                                    <label key={p.id} className="flex items-center p-2 hover:bg-muted/50 rounded cursor-pointer transition-colors border border-transparent hover:border-border">
                                        <Checkbox
                                            checked={selectedIds.has(p.id!)}
                                            onCheckedChange={() => toggleSelection(p.id!)}
                                            className="mr-3"
                                        />
                                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-1 md:gap-4 text-xs">
                                            <div className="font-semibold truncate">{p.name}</div>
                                            <div className="text-muted-foreground font-mono md:text-right">
                                                Z: {p.z !== undefined ? p.z.toFixed(4) : "未設定"}
                                            </div>
                                        </div>
                                    </label>
                                ))}
                                {(!points || points.length === 0) && (
                                    <div className="text-center text-muted-foreground text-xs py-10">データがありません</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 右ペイン：プレビューと実行 */}
                    <div className="border rounded-lg bg-card shadow-sm flex flex-col h-[500px]">
                        <div className="p-4 border-b flex justify-between items-center bg-muted/30">
                            <h3 className="text-sm font-semibold">3. プレビュー・実行</h3>
                            <Button size="sm" onClick={handleConvert} disabled={selectedIds.size === 0 || fromSystemIdx === toSystemIdx}>
                                <ArrowDown className="h-4 w-4 mr-2" /> 変換
                            </Button>
                        </div>

                        <div className="flex-1 p-4 flex flex-col overflow-hidden">
                            {previewResults ? (
                                <>
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="text-sm font-bold text-primary">変換結果プレビュー</div>
                                        <div className="text-xs text-amber-600 bg-amber-500/10 px-2 py-1 rounded font-semibold flex items-center">
                                            <AlertTriangle className="h-3 w-3 mr-1" />
                                            まだDBに保存されていません
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-auto border rounded-md mb-4 bg-background">
                                        <Table className="text-xs sm:text-sm">
                                            <TableHeader className="bg-muted/50 sticky top-0">
                                                <TableRow>
                                                    <TableHead className="w-[100px]">点名</TableHead>
                                                    <TableHead className="text-right">変換前Z<br /><span className="text-[10px] font-normal">({fromSystem.abbr})</span></TableHead>
                                                    <TableHead className="text-right text-indigo-600">換算差</TableHead>
                                                    <TableHead className="text-right text-primary font-bold">変換後Z<br /><span className="text-[10px] font-normal">({toSystem.abbr})</span></TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {previewResults.map((r, idx) => (
                                                    <TableRow key={idx}>
                                                        <TableCell className="font-medium truncate max-w-[100px]" title={r.name}>{r.name}</TableCell>
                                                        <TableCell className="text-right font-mono">{r.oldZ.toFixed(4)}</TableCell>
                                                        <TableCell className="text-right font-mono text-indigo-600 font-medium">
                                                            {r.diff >= 0 ? "+" : ""}{r.diff.toFixed(4)}
                                                        </TableCell>
                                                        <TableCell className="text-right font-mono text-primary font-bold">
                                                            {r.newZ.toFixed(4)}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>

                                    <div className="pt-2 border-t flex justify-end">
                                        <Button onClick={handleSave} className="w-full sm:w-auto">
                                            <Save className="h-4 w-4 mr-2" />
                                            Z座標を更新して保存
                                        </Button>
                                    </div>
                                </>
                            ) : (
                                <div className="flex-1 flex items-center justify-center text-muted-foreground flex-col h-full bg-muted/10">
                                    <ArrowRightLeft className="h-10 w-10 mb-3 opacity-20" />
                                    {fromSystemIdx === toSystemIdx ? (
                                        <p className="text-xs text-amber-600">変換元と変換先が同じです。異なる標高系を選択してください。</p>
                                    ) : (
                                        <p className="text-xs">対象を選択して「変換」を押してください</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
