import { useState } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { db } from "../db"
import { fetchGeoidHeight } from "../utils/geoid"
import { decimalToDms } from "../utils/coordinates"
import { Globe, Calculator, Save, Loader2, AlertTriangle } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card"
import { Button } from "./ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Checkbox } from "./ui/checkbox"
import { RadioGroup, RadioGroupItem } from "./ui/radio-group"
import { Label } from "./ui/label"

export function GeoidCalculation() {
    const points = useLiveQuery(() => db.points.toArray())

    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
    const [previewResults, setPreviewResults] = useState<any[] | null>(null)
    const [isCalculating, setIsCalculating] = useState(false)
    const [calcMode, setCalcMode] = useState<"only" | "toOrtho" | "toEllipsoid">("only")
    const [progressStr, setProgressStr] = useState("")

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

    // 待ち時間用ユーティリティ
    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

    const handleCalculate = async () => {
        if (!points || selectedIds.size === 0) return

        setIsCalculating(true)
        setPreviewResults(null)
        const targets = points.filter(p => selectedIds.has(p.id!))
        const results = []

        let successCount = 0
        let errorCount = 0

        for (let i = 0; i < targets.length; i++) {
            const p = targets[i]
            setProgressStr(`${i + 1} / ${targets.length} 件目を計算中...`)

            if (p.lat !== undefined && p.lon !== undefined) {
                const geoidHeight = await fetchGeoidHeight(p.lat, p.lon)

                if (geoidHeight !== null) {
                    const oldZ = p.z || 0
                    let newZ = oldZ

                    if (calcMode === "toOrtho") {
                        // 楕円体高 -> 標高 (標高 = 楕円体高 - ジオイド高)
                        newZ = oldZ - geoidHeight
                    } else if (calcMode === "toEllipsoid") {
                        // 標高 -> 楕円体高 (楕円体高 = 標高 + ジオイド高)
                        newZ = oldZ + geoidHeight
                    }

                    results.push({ ...p, oldZ, geoidHeight, newZ, status: 'success' })
                    successCount++
                } else {
                    results.push({ ...p, oldZ: p.z || 0, status: 'error', msg: 'API取得エラー' })
                    errorCount++
                }

                // APIのアクセス制限（10回/10秒）対策として、1件ごとに1秒（1000ms）待機する
                if (i < targets.length - 1) {
                    await sleep(1000)
                }

            } else {
                results.push({ ...p, oldZ: p.z || 0, status: 'error', msg: '緯度経度なし' })
                errorCount++
            }
        }

        setPreviewResults(results)
        setIsCalculating(false)
        setProgressStr(`完了（成功: ${successCount}件, 失敗: ${errorCount}件）`)
    }

    const handleSave = async () => {
        if (!previewResults || calcMode === "only") return

        let count = 0
        try {
            await db.transaction('rw', db.points, async () => {
                for (const item of previewResults) {
                    if (item.status === 'success') {
                        await db.points.update(item.id, {
                            z: item.newZ
                        })
                        count++
                    }
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

    return (
        <Card className="border-0 shadow-none sm:border sm:shadow-sm">
            <CardHeader className="px-0 pt-0 pb-4 sm:px-6 sm:pt-6">
                <CardTitle className="text-lg font-bold flex items-center">
                    <Globe className="h-5 w-5 mr-2 text-primary" />
                    ジオイド高計算
                </CardTitle>
                <CardDescription>
                    国土地理院が提供するAPIを利用し、緯度・経度から正確なジオイド高を求めます。<br />
                    取得したジオイド高を基に、楕円体高と標高の相互変換を行うことも可能です。
                </CardDescription>
            </CardHeader>

            <CardContent className="px-0 sm:px-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[calc(100vh-[Headerの高さ+TabListの高さ])]">
                    {/* 左ペイン：設定と対象選択 */}
                    <div className="border rounded-lg bg-card shadow-sm flex flex-col h-[500px]">
                        <div className="p-4 border-b bg-muted/20">
                            <h3 className="text-sm font-semibold mb-3">1. 計算・更新モード設定</h3>
                            <RadioGroup value={calcMode} onValueChange={(v: any) => setCalcMode(v)} className="space-y-2">
                                <div className="flex items-center space-x-2 border p-2 rounded-md bg-background hover:bg-muted/50 cursor-pointer transition-colors" onClick={() => setCalcMode("only")}>
                                    <RadioGroupItem value="only" id="r1" />
                                    <Label htmlFor="r1" className="flex-1 cursor-pointer">
                                        <span className="block font-medium">ジオイド高の計算のみ</span>
                                        <span className="block text-xs text-muted-foreground">値を計算して画面に表示します（データの更新はしません）</span>
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2 border p-2 rounded-md bg-background hover:bg-muted/50 cursor-pointer transition-colors" onClick={() => setCalcMode("toOrtho")}>
                                    <RadioGroupItem value="toOrtho" id="r2" />
                                    <Label htmlFor="r2" className="flex-1 cursor-pointer">
                                        <span className="block font-medium">楕円体高 → 標高 に変換</span>
                                        <span className="block text-xs text-muted-foreground">現在のZ座標を楕円体高とみなし、標高(Z=Z-ジオイド高)に上書き更新します</span>
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2 border p-2 rounded-md bg-background hover:bg-muted/50 cursor-pointer transition-colors" onClick={() => setCalcMode("toEllipsoid")}>
                                    <RadioGroupItem value="toEllipsoid" id="r3" />
                                    <Label htmlFor="r3" className="flex-1 cursor-pointer">
                                        <span className="block font-medium">標高 → 楕円体高 に変換</span>
                                        <span className="block text-xs text-muted-foreground">現在のZ座標を標高とみなし、楕円体高(Z=Z+ジオイド高)に上書き更新します</span>
                                    </Label>
                                </div>
                            </RadioGroup>
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
                                                {p.lat && p.lon ? `Lat: ${decimalToDms(p.lat)} / Lon: ${decimalToDms(p.lon)}` : "⚠️緯度経度未設定"}
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
                            <Button size="sm" onClick={handleCalculate} disabled={selectedIds.size === 0 || isCalculating}>
                                {isCalculating ? (
                                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> 通信中</>
                                ) : (
                                    <><Calculator className="h-4 w-4 mr-2" /> 結果を取得</>
                                )}
                            </Button>
                        </div>

                        <div className="flex-1 p-4 flex flex-col overflow-hidden">
                            {isCalculating ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                                    <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" />
                                    <p className="text-sm font-bold text-primary animate-pulse">{progressStr}</p>
                                    <p className="text-xs mt-2 max-w-xs text-center">サーバー負荷軽減のため、1件ごとに1秒間隔を空けてリクエスト送信しています。</p>
                                </div>
                            ) : previewResults ? (
                                <>
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="text-sm font-bold text-primary">計算結果プレビュー</div>
                                        {calcMode !== "only" && (
                                            <div className="text-xs text-amber-600 bg-amber-500/10 px-2 py-1 rounded font-semibold flex items-center">
                                                <AlertTriangle className="h-3 w-3 mr-1" />
                                                まだDBに保存されていません
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-1 overflow-auto border rounded-md mb-4 bg-background">
                                        <Table className="text-xs sm:text-sm">
                                            <TableHeader className="bg-muted/50 sticky top-0">
                                                <TableRow>
                                                    <TableHead className="w-[100px]">点名</TableHead>
                                                    <TableHead className="text-right">現在のZ</TableHead>
                                                    <TableHead className="text-right text-indigo-600">ジオイド高</TableHead>
                                                    {calcMode !== "only" && (
                                                        <TableHead className="text-right text-primary font-bold">更新後Z</TableHead>
                                                    )}
                                                    <TableHead>判定</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {previewResults.map((r, idx) => (
                                                    <TableRow key={idx}>
                                                        <TableCell className="font-medium truncate max-w-[100px]" title={r.name}>{r.name}</TableCell>
                                                        <TableCell className="text-right font-mono">{r.oldZ.toFixed(4)}</TableCell>
                                                        {r.status === 'success' ? (
                                                            <>
                                                                <TableCell className="text-right font-mono text-indigo-600 font-medium">
                                                                    {r.geoidHeight?.toFixed(4)}
                                                                </TableCell>
                                                                {calcMode !== "only" && (
                                                                    <TableCell className="text-right font-mono text-primary font-bold">
                                                                        {r.newZ.toFixed(4)}
                                                                    </TableCell>
                                                                )}
                                                                <TableCell><span className="text-green-600 font-bold text-[10px] bg-green-500/10 px-1.5 py-0.5 rounded">成功</span></TableCell>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <TableCell className="text-right text-muted-foreground">-</TableCell>
                                                                {calcMode !== "only" && (
                                                                    <TableCell className="text-right text-muted-foreground">-</TableCell>
                                                                )}
                                                                <TableCell><span className="text-destructive text-[10px] bg-destructive/10 px-1.5 py-0.5 rounded">{r.msg}</span></TableCell>
                                                            </>
                                                        )}
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>

                                    {calcMode !== "only" && (
                                        <div className="pt-2 border-t flex justify-end">
                                            <Button onClick={handleSave} className="w-full sm:w-auto">
                                                <Save className="h-4 w-4 mr-2" />
                                                Z座標を更新して保存
                                            </Button>
                                        </div>
                                    )}
                                    {calcMode === "only" && (
                                        <div className="pt-2 border-t flex justify-end">
                                            <Button variant="outline" onClick={() => setPreviewResults(null)}>
                                                選択画面に戻る
                                            </Button>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="flex-1 flex items-center justify-center text-muted-foreground flex-col h-full bg-muted/10">
                                    <Globe className="h-10 w-10 mb-3 opacity-20" />
                                    <p className="text-xs">対象を選択して「結果を取得」を押してください</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
