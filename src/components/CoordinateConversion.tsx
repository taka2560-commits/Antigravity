import { useState, useEffect } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { db } from "../db"
import { xyToLatLon, latLonToXY, ZONES } from "../utils/coordinates"
import { Save, AlertCircle, ArrowDown, ClipboardList } from "lucide-react"

import { PointSelector } from "./PointSelector"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Checkbox } from "./ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog"
import { useCalculationHistory, type HistoryItem } from "../hooks/useCalculationHistory"

type ConversionMode = "single" | "batch"
type ConversionDirection = "xy2ll" | "ll2xy"

export function CoordinateConversion({ historyData }: { historyData: HistoryItem | null }) {
    const points = useLiveQuery(() => db.points.toArray())
    const { addHistory } = useCalculationHistory()
    const [mode, setMode] = useState<ConversionMode>("single")
    const [direction, setDirection] = useState<ConversionDirection>("xy2ll")
    const [zone, setZone] = useState<number>(9) // Default to Zone 9 (Tokyo)

    // Single Conversion State
    const [singleInput, setSingleInput] = useState({ x: 0, y: 0, lat: 0, lon: 0, name: "" })
    const [selectedPointId, setSelectedPointId] = useState<string>("")

    // Batch Conversion State
    const [selectedBatchIds, setSelectedBatchIds] = useState<Set<number>>(new Set())
    const [batchPreview, setBatchPreview] = useState<any[] | null>(null)

    // Restore from history
    useEffect(() => {
        if (historyData && historyData.type === 'coord' && historyData.details) {
            const { input, direction: savedDirection, zone: savedZone } = historyData.details;

            if (savedDirection) setDirection(savedDirection);
            if (savedZone) setZone(savedZone);
            if (input) {
                setSingleInput({
                    x: input.x || 0,
                    y: input.y || 0,
                    lat: input.lat || 0,
                    lon: input.lon || 0,
                    name: input.name || ""
                });
            }
            // Ensure we are in single mode to see the result
            setMode("single");
            // Clear selected point ID as we are restoring raw values
            setSelectedPointId("");
        }
    }, [historyData])

    // Update single input when point selected
    useEffect(() => {
        if (selectedPointId && points) {
            const p = points.find(pt => pt.id === Number(selectedPointId))
            if (p) {
                if (direction === "xy2ll") {
                    setSingleInput(prev => ({ ...prev, x: p.x, y: p.y, name: p.name }))
                } else {
                    // Try to populate lat/lon if available, else convert
                    if (p.lat && p.lon) {
                        setSingleInput(prev => ({ ...prev, lat: p.lat!, lon: p.lon!, name: p.name }))
                    } else {
                        // If no lat/lon stored, use conversion
                        try {
                            const ll = xyToLatLon(p.x, p.y, zone)
                            setSingleInput(prev => ({ ...prev, lat: ll.lat, lon: ll.lon, name: p.name }))
                        } catch (e) {
                            setSingleInput(prev => ({ ...prev, name: p.name }))
                        }
                    }
                }
            }
        }
    }, [selectedPointId, points, direction, zone])

    const singleResult = (() => {
        try {
            if (direction === "xy2ll") {
                const res = xyToLatLon(singleInput.x, singleInput.y, zone)
                return { type: 'll', ...res }
            } else {
                const res = latLonToXY(singleInput.lat, singleInput.lon, zone)
                return { type: 'xy', ...res }
            }
        } catch (e) {
            return null
        }
    })()

    const handleRecord = () => {
        if (!singleResult) return

        let summary = ""
        if (direction === "xy2ll") {
            const res = singleResult as { lat: number, lon: number }
            summary = `Lat: ${res.lat.toFixed(8)}\nLon: ${res.lon.toFixed(8)}`
        } else {
            const res = singleResult as { x: number, y: number }
            summary = `X: ${res.x.toFixed(4)}\nY: ${res.y.toFixed(4)}`
        }

        addHistory({
            type: 'coord',
            title: `座標変換 (${direction === 'xy2ll' ? 'XY→緯度経度' : '緯度経度→XY'}): ${singleInput.name || '未登録点'}`,
            summary: summary,
            details: {
                input: { ...singleInput },
                result: { ...singleResult },
                direction,
                zone
            }
        })
        alert("変換結果を履歴に保存しました")
    }

    const handleSaveSingle = async () => {
        if (!singleResult) return

        try {
            if (direction === "xy2ll" && singleResult.type === 'll') {
                const res = singleResult as { lat: number, lon: number }
                if (selectedPointId) {
                    await db.points.update(Number(selectedPointId), {
                        lat: res.lat,
                        lon: res.lon
                    })
                    alert("選択された点の緯度経度情報を更新しました")
                } else {
                    await db.points.add({
                        name: singleInput.name || "LatLon点",
                        x: singleInput.x,
                        y: singleInput.y,
                        z: 0,
                        lat: res.lat,
                        lon: res.lon,
                        note: "座標変換(XY->LL)"
                    })
                    alert("新しい点を追加しました")
                }
            } else if (direction === "ll2xy" && singleResult.type === 'xy') {
                const res = singleResult as { x: number, y: number }
                await db.points.add({
                    name: singleInput.name ? `${singleInput.name}_XY` : "XY点",
                    x: res.x,
                    y: res.y,
                    z: 0,
                    lat: singleInput.lat,
                    lon: singleInput.lon,
                    note: "座標変換(LL->XY)"
                })
                alert("変換点(XY)を保存しました")
            }
        } catch (e) {
            console.error(e)
            alert("保存に失敗しました")
        }
    }

    // Batch
    const toggleBatchSelection = (id: number) => {
        const newSet = new Set(selectedBatchIds)
        if (newSet.has(id)) {
            newSet.delete(id)
        } else {
            newSet.add(id)
        }
        setSelectedBatchIds(newSet)
    }

    const selectAll = () => {
        if (points) setSelectedBatchIds(new Set(points.map(p => p.id!)))
    }

    const deselectAll = () => setSelectedBatchIds(new Set())

    const handleBatchPreview = () => {
        if (!points) return
        const targets = points.filter(p => selectedBatchIds.has(p.id!))

        const results = targets.map(p => {
            try {
                if (direction === "xy2ll") {
                    const res = xyToLatLon(p.x, p.y, zone)
                    return { ...p, newLat: res.lat, newLon: res.lon, status: 'success' }
                } else {
                    // LL to XY (requires point to have lat/lon)
                    if (p.lat !== undefined && p.lon !== undefined) {
                        const res = latLonToXY(p.lat, p.lon, zone)
                        return { ...p, newX: res.x, newY: res.y, status: 'success' }
                    } else {
                        return { ...p, status: 'error', msg: '緯度経度なし' }
                    }
                }
            } catch (e) {
                return { ...p, status: 'error', msg: '計算エラー' }
            }
        })
        setBatchPreview(results)
    }

    const handleBatchSave = async () => {
        if (!batchPreview) return

        let count = 0
        try {
            await db.transaction('rw', db.points, async () => {
                for (const item of batchPreview) {
                    if (item.status !== 'success') continue

                    if (direction === "xy2ll") {
                        // Update existing points with Lat/Lon
                        await db.points.update(item.id, {
                            lat: item.newLat,
                            lon: item.newLon
                        })
                    } else {
                        // Create new points for XY
                        await db.points.add({
                            name: `${item.name}_XY`,
                            x: item.newX,
                            y: item.newY,
                            z: 0,
                            lat: item.lat,
                            lon: item.lon,
                            note: "一括変換(LL->XY)"
                        })
                    }
                    count++
                }
            })
            alert(`${count}件 処理しました`)
            setBatchPreview(null)
            setSelectedBatchIds(new Set())
        } catch (e) {
            console.error(e)
            alert("一括保存に失敗しました")
        }
    }

    return (
        <Card className="border-0 shadow-none sm:border sm:shadow-sm">
            <CardHeader className="px-0 pt-0 pb-4 sm:px-6 sm:pt-6">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-bold">座標変換 (緯度経度 ⇔ XY)</CardTitle>
                </div>
                <CardDescription>
                    平面直角座標と緯度経度の相互変換を行います。
                </CardDescription>
            </CardHeader>
            <CardContent className="px-0 sm:px-6 space-y-6">
                {/* Settings (Common) */}
                <div className="bg-muted/30 p-4 rounded-lg flex flex-col md:flex-row gap-4 items-end md:items-center justify-between border">
                    <div className="w-full md:w-auto flex-1 space-y-2">
                        <Label className="text-xs font-semibold uppercase text-muted-foreground">系番号 (Zone)</Label>
                        <Select value={String(zone)} onValueChange={(v) => setZone(Number(v))}>
                            <SelectTrigger className="bg-background">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {ZONES.map(z => (
                                    <SelectItem key={z.id} value={String(z.id)}>
                                        {z.id}系 ({z.prefectures})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="w-full md:w-auto flex gap-2 p-1 bg-background rounded-md border shadow-sm">
                        <Button
                            variant={direction === "xy2ll" ? "default" : "ghost"}
                            size="sm"
                            onClick={() => setDirection("xy2ll")}
                            className="flex-1"
                        >
                            XY <ArrowDown className="mx-1 h-3 w-3" /> 緯度経度
                        </Button>
                        <Button
                            variant={direction === "ll2xy" ? "default" : "ghost"}
                            size="sm"
                            onClick={() => setDirection("ll2xy")}
                            className="flex-1"
                        >
                            緯度経度 <ArrowDown className="mx-1 h-3 w-3" /> XY
                        </Button>
                    </div>
                </div>

                <Tabs defaultValue="single" value={mode} onValueChange={(v) => setMode(v as any)} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="single">単点変換</TabsTrigger>
                        <TabsTrigger value="batch">一括変換</TabsTrigger>
                    </TabsList>

                    <TabsContent value="single" className="space-y-6 mt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* INPUT */}
                            <div className="space-y-4">
                                <div>
                                    <Label className="text-xs mb-1.5 block">登録点から引用</Label>
                                    <PointSelector
                                        points={points}
                                        value={selectedPointId}
                                        onSelect={(v) => setSelectedPointId(v)}
                                        placeholder="(手動入力)"
                                        label="点を選択"
                                    />
                                </div>

                                {direction === "xy2ll" ? (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>X座標</Label>
                                            <Input
                                                type="number"
                                                value={singleInput.x}
                                                onChange={e => setSingleInput({ ...singleInput, x: parseFloat(e.target.value) })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Y座標</Label>
                                            <Input
                                                type="number"
                                                value={singleInput.y}
                                                onChange={e => setSingleInput({ ...singleInput, y: parseFloat(e.target.value) })}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>緯度 (Lat)</Label>
                                            <Input
                                                type="number"
                                                value={singleInput.lat}
                                                onChange={e => setSingleInput({ ...singleInput, lat: parseFloat(e.target.value) })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>経度 (Lon)</Label>
                                            <Input
                                                type="number"
                                                value={singleInput.lon}
                                                onChange={e => setSingleInput({ ...singleInput, lon: parseFloat(e.target.value) })}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* OUTPUT */}
                            <div className="bg-muted/10 p-6 rounded-lg border border-primary/10 flex flex-col justify-center items-center text-center relative group">
                                {singleResult ? (
                                    <>
                                        <div className="absolute top-2 right-2">
                                            <Button variant="outline" size="sm" onClick={handleRecord} title="計算結果を一時記録" className="h-7 text-xs bg-background/50">
                                                <ClipboardList className="h-3 w-3 mr-1" />
                                                一時記録
                                            </Button>
                                        </div>

                                        {singleResult.type === "ll" ? (
                                            <div className="space-y-4 w-full">
                                                <div>
                                                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">緯度 (Latitude)</div>
                                                    <div className="text-xl font-mono font-bold text-primary">{(singleResult as any).lat.toFixed(8)}</div>
                                                </div>
                                                <div>
                                                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">経度 (Longitude)</div>
                                                    <div className="text-xl font-mono font-bold text-primary">{(singleResult as any).lon.toFixed(8)}</div>
                                                </div>
                                                <div className="pt-2 text-[10px] text-muted-foreground">
                                                    ※世界測地系 (JGD2011)
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-4 w-full">
                                                <div>
                                                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">X座標 (North)</div>
                                                    <div className="text-xl font-mono font-bold text-primary">{(singleResult as any).x.toFixed(4)}</div>
                                                </div>
                                                <div>
                                                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Y座標 (East)</div>
                                                    <div className="text-xl font-mono font-bold text-primary">{(singleResult as any).y.toFixed(4)}</div>
                                                </div>
                                            </div>
                                        )}

                                        <Button onClick={handleSaveSingle} className="mt-6 w-full md:w-auto" size="sm">
                                            <Save className="h-4 w-4 mr-2" />
                                            {direction === "xy2ll" ? (selectedPointId ? "情報を更新" : "点として追加") : "点として保存"}
                                        </Button>
                                    </>
                                ) : (
                                    <div className="text-muted-foreground py-8">
                                        <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                        <p className="text-sm">入力値を設定すると<br />計算結果が表示されます</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="batch" className="space-y-4 mt-4">
                        <div className="flex justify-between items-center text-xs px-1">
                            <div className="space-x-2">
                                <Button variant="link" size="sm" onClick={selectAll} className="h-auto p-0 text-primary">全選択</Button>
                                <span className="text-muted-foreground">|</span>
                                <Button variant="link" size="sm" onClick={deselectAll} className="h-auto p-0 text-primary">全解除</Button>
                            </div>
                            <span className="font-mono">{selectedBatchIds.size}点 選択中</span>
                        </div>

                        <div className="h-48 overflow-y-auto border rounded bg-background p-2 space-y-1">
                            {points?.map(p => (
                                <label key={p.id} className="flex items-center p-2 hover:bg-muted/50 rounded cursor-pointer transition-colors">
                                    <Checkbox
                                        checked={selectedBatchIds.has(p.id!)}
                                        onCheckedChange={() => toggleBatchSelection(p.id!)}
                                        className="mr-3"
                                    />
                                    <div className="flex-1 text-xs grid grid-cols-2 gap-2">
                                        <span className="font-semibold truncate">{p.name}</span>
                                        {direction === "xy2ll" ? (
                                            <span className="text-muted-foreground font-mono text-right">X:{p.x?.toFixed(2) ?? '-'}, Y:{p.y?.toFixed(2) ?? '-'}</span>
                                        ) : (
                                            <span className="text-muted-foreground font-mono text-right">
                                                {p.lat && p.lon ? `Lat:${p.lat.toFixed(4)}...` : "Lat/Lon未設定"}
                                            </span>
                                        )}
                                    </div>
                                </label>
                            ))}
                            {(!points || points.length === 0) && (
                                <div className="text-center text-muted-foreground text-xs py-10">データがありません</div>
                            )}
                        </div>

                        <Button
                            className="w-full"
                            onClick={handleBatchPreview}
                            disabled={selectedBatchIds.size === 0}
                        >
                            プレビューを表示
                        </Button>
                    </TabsContent>
                </Tabs>
            </CardContent>

            <Dialog open={!!batchPreview} onOpenChange={(open) => !open && setBatchPreview(null)}>
                <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>変換結果プレビュー ({direction === "xy2ll" ? "XY → 緯度経度" : "緯度経度 → XY"})</DialogTitle>
                    </DialogHeader>

                    <div className="flex-1 overflow-auto border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[100px]">点名</TableHead>
                                    <TableHead>Status</TableHead>
                                    {direction === "xy2ll" ? (
                                        <>
                                            <TableHead className="text-right">変換後 緯度</TableHead>
                                            <TableHead className="text-right">変換後 経度</TableHead>
                                        </>
                                    ) : (
                                        <>
                                            <TableHead className="text-right">変換後 X</TableHead>
                                            <TableHead className="text-right">変換後 Y</TableHead>
                                        </>
                                    )}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {batchPreview?.map((row: any) => (
                                    <TableRow key={row.id}>
                                        <TableCell className="font-medium">{row.name}</TableCell>
                                        <TableCell>
                                            {row.status === 'success' ? (
                                                <span className="text-green-600 font-bold text-xs">OK</span>
                                            ) : (
                                                <span className="text-destructive font-bold text-xs">{row.msg}</span>
                                            )}
                                        </TableCell>
                                        {direction === "xy2ll" ? (
                                            <>
                                                <TableCell className="text-right font-mono">{row.newLat?.toFixed(7)}</TableCell>
                                                <TableCell className="text-right font-mono">{row.newLon?.toFixed(7)}</TableCell>
                                            </>
                                        ) : (
                                            <>
                                                <TableCell className="text-right font-mono">{row.newX?.toFixed(3)}</TableCell>
                                                <TableCell className="text-right font-mono">{row.newY?.toFixed(3)}</TableCell>
                                            </>
                                        )}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setBatchPreview(null)}>キャンセル</Button>
                        <Button onClick={handleBatchSave}>
                            {direction === "xy2ll" ? "情報を更新" : "新規追加して保存"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    )
}
