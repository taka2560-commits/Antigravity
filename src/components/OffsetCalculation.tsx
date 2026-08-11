import { useState, useMemo } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { db } from "../db"
import { PointSelector } from "./PointSelector"
import { calculateOffsets, type OffsetCalculationResult } from "../utils/offsetCalc"
import { GitCommit, Save, Plus, Trash2 } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group"

interface TargetInput {
    id: string; // for list re-rendering
    pointName: string;
    station: number;
    width: number;
    direction: 'right' | 'left';
}

export function OffsetCalculation() {
    const points = useLiveQuery(() => db.points.toArray())

    const [pointAId, setPointAId] = useState<string>("")
    const [pointBId, setPointBId] = useState<string>("")

    const [targets, setTargets] = useState<TargetInput[]>([
        { id: crypto.randomUUID(), pointName: "No.1", station: 5, width: 3, direction: "right" }
    ])

    const pA = useMemo(() => points?.find(p => p.id === Number(pointAId)), [points, pointAId])
    const pB = useMemo(() => points?.find(p => p.id === Number(pointBId)), [points, pointBId])

    const addTarget = () => {
        setTargets([
            ...targets,
            { id: crypto.randomUUID(), pointName: `No.${targets.length + 1}`, station: 0, width: 0, direction: "right" }
        ])
    }

    const removeTarget = (id: string) => {
        setTargets(targets.filter(t => t.id !== id))
    }

    const updateTarget = (id: string, field: keyof TargetInput, value: string | number) => {
        setTargets(targets.map(t => t.id === id ? { ...t, [field]: value } : t))
    }

    const previewResults: OffsetCalculationResult[] | null = useMemo(() => {
        if (!pA || !pB || pA.x === undefined || pA.y === undefined || pB.x === undefined || pB.y === undefined) {
            return null
        }
        if (pA.x === pB.x && pA.y === pB.y) {
            return null // 同座標エラー回避
        }

        try {
            // TargetInputをユーティリティの引数型に変換
            const inputData = targets.map(t => ({
                pointName: t.pointName,
                station: t.station,
                offsetParams: [{ width: t.width, direction: t.direction }]
            }))

            return calculateOffsets(pA.x, pA.y, pB.x, pB.y, inputData)
        } catch (e) {
            console.error(e)
            return null
        }
    }, [pA, pB, targets])

    const handleSave = async () => {
        if (!previewResults || previewResults.length === 0) return

        let count = 0
        try {
            await db.transaction('rw', db.points, async () => {
                for (const res of previewResults) {
                    await db.points.add({
                        name: res.name,
                        x: res.x,
                        y: res.y,
                        z: 0,
                        note: `幅杭: 基準(${pA?.name ?? ''}→${pB?.name ?? ''}) 前進${res.station}m 幅${res.width}m(${res.direction === 'right' ? '右' : '左'})`
                    })
                    count++
                }
            })
            alert(`${count}件の座標を新しく登録しました。`)
            setTargets([]) // 保存後にクリア
        } catch (e) {
            console.error("保存エラー:", e)
            alert("データの保存に失敗しました。")
        }
    }

    return (
        <Card className="border-0 shadow-none sm:border sm:shadow-sm">
            <CardHeader className="px-0 pt-0 pb-4 sm:px-6 sm:pt-6">
                <CardTitle className="text-lg font-bold flex items-center">
                    <GitCommit className="h-5 w-5 mr-2 text-primary" />
                    幅杭計算（オフセット）
                </CardTitle>
                <CardDescription>
                    基準線（始点A〜終点B）からの前進距離と左右の幅をもとに、新しい座標を計算します。
                </CardDescription>
            </CardHeader>

            <CardContent className="px-0 sm:px-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 左ペイン：設定エリア */}
                    <div className="border rounded-lg bg-card shadow-sm flex flex-col min-h-[500px]">
                        {/* 1. 基準線 */}
                        <div className="p-4 border-b bg-muted/20 space-y-3">
                            <h3 className="text-sm font-semibold mb-2">1. 基準線の選択</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">始点A</Label>
                                    <PointSelector
                                        points={points}
                                        value={pointAId}
                                        onSelect={setPointAId}
                                        placeholder="始点..."
                                    />
                                    {pA && <div className="text-[10px] text-muted-foreground truncate font-mono">X:{pA.x} Y:{pA.y}</div>}
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">終点B</Label>
                                    <PointSelector
                                        points={points}
                                        value={pointBId}
                                        onSelect={setPointBId}
                                        placeholder="終点..."
                                    />
                                    {pB && <div className="text-[10px] text-muted-foreground truncate font-mono">X:{pB.x} Y:{pB.y}</div>}
                                </div>
                            </div>
                        </div>

                        {/* 2. 入力パラメータリスト */}
                        <div className="flex-1 p-4 flex flex-col overflow-hidden">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-sm font-semibold">2. 追加する点の入力</h3>
                                <Button size="sm" variant="outline" className="h-8" onClick={addTarget}>
                                    <Plus className="h-4 w-4 mr-1" /> 行を追加
                                </Button>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                                {targets.length === 0 ? (
                                    <div className="text-center text-muted-foreground text-xs py-10">
                                        ターゲットがありません。「行を追加」してください。
                                    </div>
                                ) : (
                                    targets.map(t => (
                                        <div key={t.id} className="border rounded-md p-3 bg-background shadow-sm space-y-3 relative group">
                                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:bg-destructive/10" onClick={() => removeTarget(t.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <Label className="text-[10px] text-muted-foreground">点名 (任意)</Label>
                                                    <Input className="h-8 text-xs" value={t.pointName} onChange={e => updateTarget(t.id, 'pointName', e.target.value)} />
                                                </div>
                                                <div className="space-y-1 pr-6">
                                                    <Label className="text-[10px] text-muted-foreground">始点からの前進距離(m)</Label>
                                                    <Input type="number" step="0.001" className="h-8 text-xs font-mono" value={t.station} onChange={e => updateTarget(t.id, 'station', parseFloat(e.target.value) || 0)} />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-[1fr_120px] gap-3">
                                                <div className="space-y-1">
                                                    <Label className="text-[10px] text-muted-foreground">離れ / 幅 (m)</Label>
                                                    <Input type="number" step="0.001" className="h-8 text-xs font-mono" value={t.width} onChange={e => updateTarget(t.id, 'width', Math.abs(parseFloat(e.target.value) || 0))} />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-[10px] text-muted-foreground">左右方向</Label>
                                                    <ToggleGroup type="single" value={t.direction} onValueChange={(val: string) => { if(val) updateTarget(t.id, 'direction', val as 'right'|'left') }} className="justify-start h-8">
                                                        <ToggleGroupItem value="left" aria-label="Toggle left" className={`h-8 px-2 text-xs border border-r-0 rounded-r-none ${t.direction === 'left' ? 'bg-primary text-primary-foreground data-[state=on]:bg-primary' : ''}`}>
                                                            左
                                                        </ToggleGroupItem>
                                                        <ToggleGroupItem value="right" aria-label="Toggle right" className={`h-8 px-2 text-xs border rounded-l-none ${t.direction === 'right' ? 'bg-primary text-primary-foreground data-[state=on]:bg-primary' : ''}`}>
                                                            右
                                                        </ToggleGroupItem>
                                                    </ToggleGroup>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 右ペイン：プレビューと実行 */}
                    <div className="border rounded-lg bg-card shadow-sm flex flex-col min-h-[500px]">
                        <div className="p-4 border-b flex justify-between items-center bg-muted/30">
                            <h3 className="text-sm font-semibold">3. 計算結果プレビュー</h3>
                        </div>

                        <div className="flex-1 p-4 flex flex-col overflow-hidden">
                            {previewResults && previewResults.length > 0 ? (
                                <>
                                    <div className="flex-1 overflow-auto border rounded-md mb-4 bg-background">
                                        <Table className="text-xs sm:text-sm">
                                            <TableHeader className="bg-muted/50 sticky top-0">
                                                <TableRow>
                                                    <TableHead className="w-[80px]">点名</TableHead>
                                                    <TableHead className="text-right">前進・幅</TableHead>
                                                    <TableHead className="text-right text-primary">新X座標</TableHead>
                                                    <TableHead className="text-right text-primary">新Y座標</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {previewResults.map((r, idx) => (
                                                    <TableRow key={idx}>
                                                        <TableCell className="font-medium truncate max-w-[80px]" title={r.name}>{r.name}</TableCell>
                                                        <TableCell className="text-right text-[10px] text-muted-foreground leading-tight">
                                                            {r.station.toFixed(3)}<br />
                                                            {r.direction === 'right' ? '右' : '左'} {r.width.toFixed(3)}
                                                        </TableCell>
                                                        <TableCell className="text-right font-mono text-primary font-semibold">
                                                            {r.x.toFixed(4)}
                                                        </TableCell>
                                                        <TableCell className="text-right font-mono text-primary font-semibold">
                                                            {r.y.toFixed(4)}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>

                                    <div className="pt-2 border-t flex justify-end">
                                        <Button onClick={handleSave} className="w-full sm:w-auto">
                                            <Save className="h-4 w-4 mr-2" />
                                            DBに新規座標として保存
                                        </Button>
                                    </div>
                                </>
                            ) : (
                                <div className="flex-1 flex items-center justify-center text-muted-foreground flex-col h-full bg-muted/10 p-6 text-center">
                                    <GitCommit className="h-10 w-10 mb-3 opacity-20" />
                                    <p className="text-sm font-medium mb-1">基準線とターゲットを入力してください</p>
                                    <p className="text-xs opacity-70">
                                        始点Aと終点Bを選択し、前進距離・幅を入力すると、ここに結果座標がリアルタイムで表示されます。
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
