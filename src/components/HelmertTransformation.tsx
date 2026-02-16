import { useState, useMemo, useEffect } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { db } from "../db"
import { calculateHelmertParams, type ControlPointPair, type HelmertParams, transformPoint } from "../utils/helmert"
import { Plus, Trash2, AlertCircle, Save, ClipboardList, Grid } from "lucide-react"

import { SimplePlot } from "./SimplePlot"
import { PointSelector } from "./PointSelector"
import { MultiPointSelector } from "./MultiPointSelector"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"

import { Checkbox } from "./ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Badge } from "./ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog"
import { useCalculationHistory, type HistoryItem } from "../hooks/useCalculationHistory"

export function HelmertTransformation({ historyData }: { historyData: HistoryItem | null }) {
    const points = useLiveQuery(() => db.points.toArray())
    const { addHistory } = useCalculationHistory()

    // State for control points
    const [pairs, setPairs] = useState<ControlPointPair[]>([
        { source: { x: 0, y: 0 }, target: { x: 0, y: 0 }, use: true },
        { source: { x: 0, y: 0 }, target: { x: 0, y: 0 }, use: true }
    ])

    // Helper to update a pair
    const updatePair = (index: number, field: 'source' | 'target', axis: 'x' | 'y', value: string) => {
        const newPairs = [...pairs]
        const numVal = parseFloat(value) || 0
        newPairs[index][field][axis] = numVal
        // Clear ID because manual edit might detach it from the point
        newPairs[index][field].id = undefined
        setPairs(newPairs)
    }

    const setPairFromPoint = (index: number, field: 'source' | 'target', pointId: string) => {
        const point = points?.find(p => p.id === Number(pointId))
        if (point) {
            const newPairs = [...pairs]
            newPairs[index][field] = { x: point.x, y: point.y, id: pointId }
            setPairs(newPairs)
        }
    }

    const toggleUse = (index: number) => {
        const newPairs = [...pairs]
        newPairs[index].use = !newPairs[index].use
        setPairs(newPairs)
    }

    const addPair = () => {
        setPairs([...pairs, { source: { x: 0, y: 0 }, target: { x: 0, y: 0 }, use: true }])
    }

    const removePair = (index: number) => {
        setPairs(pairs.filter((_, i) => i !== index))
    }

    const [fixScale, setFixScale] = useState(false)

    // Calculate Params
    const params: HelmertParams | null = useMemo(() => {
        return calculateHelmertParams(pairs, fixScale)
    }, [pairs, fixScale])

    // Transformation Test / Save
    const [transformMode, setTransformMode] = useState<"single" | "batch">("single")
    const [testPointId, setTestPointId] = useState<string>("")
    const [testPoint, setTestPoint] = useState({ x: 0, y: 0, name: "" })

    // Batch Mode State
    const [selectedBatchIds, setSelectedBatchIds] = useState<Set<number>>(new Set())
    const [batchPreview, setBatchPreview] = useState<{ id: number, originalName: string, x: number, y: number, newX: number, newY: number }[] | null>(null)

    // Plot Selection State
    // Type: 'control' for input pairs, 'test' for single point test
    const [plotSelectTarget, setPlotSelectTarget] = useState<{
        type: 'control' | 'test',
        index: number,
        field?: 'source' | 'target'
    } | null>(null)

    // Restore from history
    useEffect(() => {
        if (historyData && historyData.type === 'helmert' && historyData.details) {
            const { input, pairs: savedPairs } = historyData.details;

            if (savedPairs && Array.isArray(savedPairs)) {
                setPairs(savedPairs);
            }
            if (input) {
                setTestPoint({
                    x: input.x || 0,
                    y: input.y || 0,
                    name: input.name || ""
                });
            }
            // Ensure we are in single mode to see the result
            setTransformMode("single");
            // Clear selected test point ID
            setTestPointId("");
        }
    }, [historyData])

    // Update manual input when db selection changes (Single Mode)
    useEffect(() => {
        if (testPointId) {
            const p = points?.find(pt => pt.id === Number(testPointId))
            if (p) {
                setTestPoint({ x: p.x, y: p.y, name: p.name })
            }
        }
    }, [testPointId, points])

    // Reset preview when switching modes
    useEffect(() => {
        setBatchPreview(null)
    }, [transformMode])

    // Single Result
    const transformedTestPoint = useMemo(() => {
        if (!params) return null
        return transformPoint(testPoint.x, testPoint.y, params)
    }, [params, testPoint])

    const handleRecord = () => {
        if (!transformedTestPoint || !params) return

        addHistory({
            type: 'helmert',
            title: `ヘルマート変換: ${testPoint.name || '未登録点'}`,
            summary: `X: ${transformedTestPoint.x.toFixed(4)}\nY: ${transformedTestPoint.y.toFixed(4)}`,
            details: {
                input: { ...testPoint },
                result: { ...transformedTestPoint },
                params: { ...params },
                pairs: [...pairs] // Save the control points configuration
            }
        })
        alert("変換結果を履歴に保存しました")
    }

    const handleSaveResult = async () => {
        if (!transformedTestPoint) return

        const newName = testPoint.name ? `${testPoint.name}_H` : "変換点"

        try {
            await db.points.add({
                name: newName,
                x: transformedTestPoint.x,
                y: transformedTestPoint.y,
                z: 0,
                note: "ヘルマート変換点"
            })
            alert(`変換点を保存しました: ${newName}`)
        } catch (error) {
            console.error(error)
            alert("保存に失敗しました")
        }
    }

    // Batch Actions


    const handleBatchPreview = () => {
        if (!params || !points) return
        if (selectedBatchIds.size === 0) return

        const targets = points.filter(p => selectedBatchIds.has(p.id!))

        const results = targets.map(p => {
            const px = p.x ?? 0
            const py = p.y ?? 0
            const res = transformPoint(px, py, params)
            return {
                id: p.id!,
                originalName: p.name,
                x: px,
                y: py,
                newX: res.x,
                newY: res.y
            }
        })
        setBatchPreview(results)
    }

    const handleBatchSave = async () => {
        if (!batchPreview) return

        let count = 0
        try {
            await db.transaction('rw', db.points, async () => {
                for (const p of batchPreview) {
                    await db.points.add({
                        name: `${p.originalName}_H`,
                        x: p.newX,
                        y: p.newY,
                        z: 0,
                        note: "ヘルマート変換点 (一括)"
                    })
                    count++
                }
            })
            alert(`${count}点の変換・保存が完了しました。`)
            setSelectedBatchIds(new Set())
            setBatchPreview(null)
        } catch (error) {
            console.error(error)
            alert("一括保存に失敗しました。")
        }
    }

    return (
        <Card className="border-0 shadow-none sm:border sm:shadow-sm bg-card">
            <CardHeader className="px-0 pt-0 pb-4 sm:px-6 sm:pt-6">
                <CardTitle className="text-lg font-bold">ヘルマート変換</CardTitle>
                <CardDescription>
                    公共座標への変換パラメータを計算し、座標変換を行います。
                </CardDescription>
            </CardHeader>
            <CardContent className="px-0 sm:px-6 space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Col: Control Points Input */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">公共点 (Control Points)</h3>
                            <Button variant="ghost" size="sm" onClick={addPair} className="h-8 text-xs text-primary">
                                <Plus className="h-3 w-3 mr-1" /> 追加
                            </Button>
                        </div>

                        <div className="space-y-4">
                            {pairs.map((pair, idx) => (
                                <div key={idx} className="relative flex flex-col gap-3 p-4 bg-muted/40 rounded-lg border">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="secondary" className="font-mono text-[10px]">#{idx + 1}</Badge>
                                            <div className="flex items-center space-x-2">
                                                <Checkbox id={`use-${idx}`} checked={pair.use} onCheckedChange={() => toggleUse(idx)} />
                                                <Label htmlFor={`use-${idx}`} className="text-xs text-muted-foreground">計算に使用</Label>
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="icon" onClick={() => removePair(idx)} className="h-6 w-6 text-muted-foreground hover:text-destructive">
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Source */}
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center h-6">
                                                <Label className="text-xs font-semibold text-muted-foreground uppercase">変換元 (Source)</Label>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    title="プロットから選択"
                                                    onClick={() => {
                                                        setPlotSelectTarget({ type: 'control', index: idx, field: 'source' })
                                                    }}
                                                >
                                                    <Grid className="h-4 w-4 text-primary" />
                                                </Button>
                                            </div>

                                            <PointSelector
                                                points={points}
                                                value={pair.source.id || ""}
                                                onSelect={(v) => v && setPairFromPoint(idx, 'source', v)}
                                                label="引用..."
                                                placeholder="引用..."
                                            />

                                            <div className="grid grid-cols-2 gap-2 mt-2">
                                                <div className="space-y-1">
                                                    <Input
                                                        type="number"
                                                        placeholder="X"
                                                        value={pair.source.x ?? ""}
                                                        onChange={(e) => updatePair(idx, 'source', 'x', e.target.value)}
                                                        className="h-9 text-sm bg-background"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <Input
                                                        type="number"
                                                        placeholder="Y"
                                                        value={pair.source.y ?? ""}
                                                        onChange={(e) => updatePair(idx, 'source', 'y', e.target.value)}
                                                        className="h-9 text-sm bg-background"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Target */}
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center h-6">
                                                <Label className="text-xs font-semibold text-muted-foreground uppercase">変換先 (Target)</Label>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    title="プロットから選択"
                                                    onClick={() => {
                                                        setPlotSelectTarget({ type: 'control', index: idx, field: 'target' })
                                                    }}
                                                >
                                                    <Grid className="h-4 w-4 text-primary" />
                                                </Button>
                                            </div>

                                            <PointSelector
                                                points={points}
                                                value={pair.target.id || ""}
                                                onSelect={(v) => v && setPairFromPoint(idx, 'target', v)}
                                                label="引用..."
                                                placeholder="引用..."
                                            />

                                            <div className="grid grid-cols-2 gap-2 mt-2">
                                                <div className="space-y-1">
                                                    <Input
                                                        type="number"
                                                        placeholder="X"
                                                        value={pair.target.x ?? ""}
                                                        onChange={(e) => updatePair(idx, 'target', 'x', e.target.value)}
                                                        className="h-9 text-sm bg-background"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <Input
                                                        type="number"
                                                        placeholder="Y"
                                                        value={pair.target.y ?? ""}
                                                        onChange={(e) => updatePair(idx, 'target', 'y', e.target.value)}
                                                        className="h-9 text-sm bg-background"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Col: Parameters & Calculation */}
                    <div className="space-y-6">
                        {/* Parameters Result */}
                        <div className="p-4 rounded-lg border bg-card shadow-sm space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-foreground">変換パラメータ</h3>
                                <div className="flex items-center space-x-2">
                                    <Checkbox id="fix-scale" checked={fixScale} onCheckedChange={(c) => setFixScale(!!c)} />
                                    <Label htmlFor="fix-scale" className="text-xs">縮尺=1.0固定</Label>
                                </div>
                            </div>

                            {params ? (
                                <div className="space-y-2 text-sm font-mono bg-muted/30 p-3 rounded">
                                    <div className="flex justify-between border-b pb-1 border-dashed">
                                        <span className="text-muted-foreground">Scale</span>
                                        <span className="font-semibold">{params.scale.toFixed(6)}</span>
                                    </div>
                                    <div className="flex justify-between border-b pb-1 border-dashed">
                                        <span className="text-muted-foreground">Rot(deg)</span>
                                        <span className="font-semibold">{params.rotation.toFixed(5)}°</span>
                                    </div>
                                    <div className="flex justify-between border-b pb-1 border-dashed">
                                        <span className="text-muted-foreground">Trans X</span>
                                        <span className="font-semibold">{params.c.toFixed(4)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Trans Y</span>
                                        <span className="font-semibold">{params.d.toFixed(4)}</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-xs text-muted-foreground py-4 text-center">
                                    <AlertCircle className="h-6 w-6 mx-auto mb-2 opacity-20" />
                                    有効な点が2点以上必要です
                                </div>
                            )}
                        </div>

                        {/* Test Transform & Save */}
                        {params && (
                            <div className="bg-muted/10 p-4 rounded-lg border space-y-4">
                                <h3 className="text-sm font-semibold text-foreground mb-2">座標変換・保存</h3>

                                <Tabs defaultValue="single" className="w-full" onValueChange={(v) => setTransformMode(v as any)}>
                                    <TabsList className="grid w-full grid-cols-2 h-8">
                                        <TabsTrigger value="single" className="text-xs h-6">単点変換</TabsTrigger>
                                        <TabsTrigger value="batch" className="text-xs h-6">一括変換</TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="single" className="space-y-4 mt-4">
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <Label className="text-xs">点を選択 (任意)</Label>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6"
                                                    title="プロットから選択"
                                                    onClick={() => {
                                                        setPlotSelectTarget({ type: 'test', index: 0 })
                                                    }}
                                                >
                                                    <Grid className="h-3 w-3 text-primary" />
                                                </Button>
                                            </div>
                                            <PointSelector
                                                points={points}
                                                value={testPointId}
                                                onSelect={(v) => {
                                                    // Handle manual clearing or selection
                                                    setTestPointId(v)
                                                }}
                                                label="手動入力"
                                                placeholder="点を選択..."
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-1">
                                                <Label className="text-[10px] text-muted-foreground">入力 X</Label>
                                                <Input
                                                    type="number"
                                                    value={testPoint.x}
                                                    onChange={(e) => setTestPoint({ ...testPoint, x: parseFloat(e.target.value) })}
                                                    className="h-8 text-xs bg-background"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[10px] text-muted-foreground">入力 Y</Label>
                                                <Input
                                                    type="number"
                                                    value={testPoint.y}
                                                    onChange={(e) => setTestPoint({ ...testPoint, y: parseFloat(e.target.value) })}
                                                    className="h-8 text-xs bg-background"
                                                />
                                            </div>
                                        </div>

                                        {transformedTestPoint && (
                                            <div className="bg-primary/5 p-4 rounded-lg space-y-4 text-center border border-primary/10 relative group">
                                                <div className="absolute top-2 right-2">
                                                    <Button variant="outline" size="sm" onClick={handleRecord} title="計算結果を一時記録" className="h-7 text-xs bg-background/50">
                                                        <ClipboardList className="h-3 w-3 mr-1" />
                                                        一時記録
                                                    </Button>
                                                </div>

                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <div className="text-[10px] text-primary/70 font-bold uppercase tracking-wider mb-1">X (North)</div>
                                                        <div className="text-lg font-bold font-mono text-primary tracking-tight">
                                                            {transformedTestPoint.x.toFixed(4)}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="text-[10px] text-primary/70 font-bold uppercase tracking-wider mb-1">Y (East)</div>
                                                        <div className="text-lg font-bold font-mono text-primary tracking-tight">
                                                            {transformedTestPoint.y.toFixed(4)}
                                                        </div>
                                                    </div>
                                                </div>

                                                <Button size="sm" onClick={handleSaveResult} className="w-full text-xs font-bold">
                                                    <Save className="h-3 w-3 mr-2" />
                                                    保存
                                                </Button>
                                                <p className="text-[10px] text-muted-foreground">
                                                    保存名: {testPoint.name ? `${testPoint.name}_H` : "変換点"}
                                                </p>
                                            </div>
                                        )}
                                    </TabsContent>

                                    <TabsContent value="batch" className="space-y-4 mt-4">
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label className="text-xs">変換する点を選択</Label>
                                                <MultiPointSelector
                                                    points={points}
                                                    selectedIds={selectedBatchIds}
                                                    onSelectionChange={(newSet) => {
                                                        setSelectedBatchIds(newSet)
                                                        setBatchPreview(null)
                                                    }}
                                                />
                                            </div>

                                            <Button
                                                variant="default"
                                                size="sm"
                                                className="w-full text-xs"
                                                onClick={handleBatchPreview}
                                                disabled={selectedBatchIds.size === 0}
                                            >
                                                <Save className="h-3 w-3 mr-2" />
                                                プレビューを表示
                                            </Button>
                                        </div>
                                    </TabsContent>
                                </Tabs>
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>

            <Dialog open={!!batchPreview} onOpenChange={(open) => !open && setBatchPreview(null)}>
                <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>変換結果プレビュー</DialogTitle>
                    </DialogHeader>

                    <div className="flex-1 overflow-auto border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[100px]">点名</TableHead>
                                    <TableHead className="text-right">変換後 X</TableHead>
                                    <TableHead className="text-right">変換後 Y</TableHead>
                                    <TableHead className="text-right text-muted-foreground font-light text-xs hidden sm:table-cell">元 X</TableHead>
                                    <TableHead className="text-right text-muted-foreground font-light text-xs hidden sm:table-cell">元 Y</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {batchPreview?.map(row => (
                                    <TableRow key={row.id}>
                                        <TableCell className="font-medium">{row.originalName}_H</TableCell>
                                        <TableCell className="text-right text-primary font-bold">{row.newX.toFixed(4)}</TableCell>
                                        <TableCell className="text-right text-primary font-bold">{row.newY.toFixed(4)}</TableCell>
                                        <TableCell className="text-right text-muted-foreground text-xs hidden sm:table-cell">{row.x.toFixed(3)}</TableCell>
                                        <TableCell className="text-right text-muted-foreground text-xs hidden sm:table-cell">{row.y.toFixed(3)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setBatchPreview(null)}>キャンセル</Button>
                        <Button onClick={handleBatchSave}>確定して保存 ({batchPreview?.length}点)</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Plot Selector Dialog */}
            <Dialog open={!!plotSelectTarget} onOpenChange={(open) => !open && setPlotSelectTarget(null)}>
                <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-1">
                    <div className="flex-1 overflow-hidden relative rounded-md">
                        <SimplePlot onPointSelect={(point) => {
                            if (!plotSelectTarget) return

                            // Handle selection based on target type
                            if (plotSelectTarget.type === 'control' && plotSelectTarget.field) {
                                setPairFromPoint(plotSelectTarget.index, plotSelectTarget.field, String(point.id))
                            } else if (plotSelectTarget.type === 'test') {
                                setTestPointId(String(point.id))
                            }

                            setPlotSelectTarget(null)
                        }} />
                        <div className="absolute top-2 left-2 pointer-events-none bg-background/80 backdrop-blur px-2 py-1 rounded text-xs border shadow">
                            点をクリックして選択
                        </div>
                    </div>
                    <DialogFooter className="p-2">
                        <Button variant="outline" size="sm" onClick={() => setPlotSelectTarget(null)}>キャンセル</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog >
        </Card >
    )
}
