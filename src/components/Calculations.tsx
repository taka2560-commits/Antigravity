import { useState, useMemo, useEffect } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { db } from "../db"
import { Compass, ArrowRightLeft, Ruler, Calculator, ArrowRight, BookOpen, ClipboardList } from "lucide-react"
import { HelmertTransformation } from "./HelmertTransformation"
import { CoordinateConversion } from "./CoordinateConversion"
import { TrueNorthCalculation } from "./TrueNorthCalculation"
import { PointSelector } from "./PointSelector"
import { LevelingBook } from "./LevelingBook"
import { CalculationHistory } from "./CalculationHistory"
import { ConstructionCalculator } from "./ConstructionCalculator"
import { AltitudeCorrection } from "./AltitudeCorrection"
import { useCalculationHistory, type HistoryItem } from "../hooks/useCalculationHistory"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Button } from "./ui/button"

// Types for calculation results
interface CalculationResult {
    distance: number
    azimuth: number // Direction angle in degrees
    azimuthDMS: string // Direction angle in DMS format (ddd-mm-ss)
    dx: number
    dy: number
    dz: number
}

export function Calculations() {
    const [mode, setMode] = useState<"general" | "helmert">("general")
    const [activeTab, setActiveTab] = useState("inverse")
    const [historyData, setHistoryData] = useState<HistoryItem | null>(null)

    const handleHistorySelect = (item: HistoryItem) => {
        setHistoryData({ ...item }) // Clone to ensure effect triggers even if same item selected

        // Switch mode and tab based on history type
        if (item.type === 'helmert') {
            setMode("helmert")
        } else {
            setMode("general")
            switch (item.type) {
                case 'st': setActiveTab("inverse"); break;
                case 'coord': setActiveTab("coords"); break;
                case 'north': setActiveTab("truenorth"); break;
                case 'point':
                    // Point history might be best shown in CoordinateTable, but that's a different component.
                    // For now, maybe switch to inverse or just stay? 
                    // The requirement implies restoring calculation inputs.
                    break;
            }
        }
    }

    return (
        <div className="space-y-4 h-full overflow-y-auto bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-1 md:p-4 rounded-lg shadow-sm">
            <div className="flex flex-col gap-4 px-1">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg sm:text-xl font-bold tracking-tight">計算機能</h2>
                        <CalculationHistory onSelect={handleHistorySelect} />
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-muted p-1 rounded-lg">
                        <Button
                            variant={mode === "general" ? "ghost" : "ghost"}
                            size="sm"
                            onClick={() => setMode("general")}
                            className={`text-xs md:text-sm font-medium shadow-sm ${mode === "general" ? "bg-[var(--sage)] text-[var(--sage-foreground)] hover:bg-[var(--sage)]/90" : "hover:bg-muted/50"}`}
                        >
                            一般計算
                        </Button>
                        <Button
                            variant={mode === "helmert" ? "ghost" : "ghost"}
                            size="sm"
                            onClick={() => setMode("helmert")}
                            className={`text-xs md:text-sm font-medium shadow-sm ${mode === "helmert" ? "bg-[var(--sage)] text-[var(--sage-foreground)] hover:bg-[var(--sage)]/90" : "hover:bg-muted/50"}`}
                        >
                            ヘルマート変換
                        </Button>
                    </div>
                </div>

                {mode === "general" ? (
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-6 h-auto p-1 bg-muted/50">
                            <TabsTrigger value="inverse" className="flex-col gap-1 py-1 text-[10px] md:text-xs data-[state=active]:bg-[var(--sage)] data-[state=active]:text-[var(--sage-foreground)]">
                                <Ruler className="h-4 w-4 md:h-5 md:w-5" />
                                <span>ST計算</span>
                            </TabsTrigger>
                            <TabsTrigger value="coords" className="flex-col gap-1 py-1 text-[10px] md:text-xs data-[state=active]:bg-[var(--sage)] data-[state=active]:text-[var(--sage-foreground)]">
                                <ArrowRightLeft className="h-4 w-4 md:h-5 md:w-5" />
                                <span>座標変換</span>
                            </TabsTrigger>
                            <TabsTrigger value="truenorth" className="flex-col gap-1 py-1 text-[10px] md:text-xs data-[state=active]:bg-[var(--sage)] data-[state=active]:text-[var(--sage-foreground)]">
                                <Compass className="h-4 w-4 md:h-5 md:w-5" />
                                <span>真北角</span>
                            </TabsTrigger>
                            <TabsTrigger value="leveling" className="flex-col gap-1 py-1 text-[10px] md:text-xs data-[state=active]:bg-[var(--sage)] data-[state=active]:text-[var(--sage-foreground)]">
                                <BookOpen className="h-4 w-4 md:h-5 md:w-5" />
                                <span>水準測量</span>
                            </TabsTrigger>
                            <TabsTrigger value="calculator" className="flex-col gap-1 py-1 text-[10px] md:text-xs data-[state=active]:bg-[var(--sage)] data-[state=active]:text-[var(--sage-foreground)]">
                                <Calculator className="h-4 w-4 md:h-5 md:w-5" />
                                <span>建設電卓</span>
                            </TabsTrigger>
                            <TabsTrigger value="altitude" className="flex-col gap-1 py-1 text-[10px] md:text-xs data-[state=active]:bg-[var(--sage)] data-[state=active]:text-[var(--sage-foreground)]">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 md:h-5 md:w-5"><path d="m8 3 4 8 5-5 5 15H2L8 3z" /></svg>
                                <span>標高補正</span>
                            </TabsTrigger>
                        </TabsList>

                        <div className="mt-4">
                            <TabsContent value="inverse" className="m-0 space-y-4">
                                <InverseCalculation historyData={historyData?.type === 'st' ? historyData : null} />
                            </TabsContent>
                            <TabsContent value="coords" className="m-0 space-y-4">
                                <CoordinateConversion historyData={historyData?.type === 'coord' ? historyData : null} />
                            </TabsContent>
                            <TabsContent value="truenorth" className="m-0 space-y-4">
                                <TrueNorthCalculation historyData={historyData?.type === 'north' ? historyData : null} />
                            </TabsContent>
                            <TabsContent value="leveling" className="m-0 space-y-4">
                                <LevelingBook />
                            </TabsContent>
                            <TabsContent value="calculator" className="m-0 space-y-4">
                                <ConstructionCalculator />
                            </TabsContent>
                            <TabsContent value="altitude" className="m-0 space-y-4">
                                <AltitudeCorrection />
                            </TabsContent>
                        </div>
                    </Tabs>
                ) : (
                    <HelmertTransformation historyData={historyData?.type === 'helmert' ? historyData : null} />
                )}
            </div>
        </div>
    )
}

export function InverseCalculation({ historyData }: { historyData: HistoryItem | null }) {
    const points = useLiveQuery(() => db.points.toArray())
    const { addHistory } = useCalculationHistory()

    const [point1Id, setPoint1Id] = useState<string>("")
    const [point2Id, setPoint2Id] = useState<string>("")

    // Custom coordinate inputs (if not selecting from DB)
    const [customP1, setCustomP1] = useState({ x: "", y: "", z: "" })
    const [customP2, setCustomP2] = useState({ x: "", y: "", z: "" })

    const [mode, setMode] = useState<"db" | "custom">("db")

    // Restore from history
    useEffect(() => {
        if (historyData && historyData.type === 'st' && historyData.details) {
            const { start, end } = historyData.details;

            const p1InDb = start.id && points?.some((p: any) => p.id === start.id);
            const p2InDb = end.id && points?.some((p: any) => p.id === end.id);

            if (p1InDb) {
                setPoint1Id(String(start.id));
            } else {
                setCustomP1({
                    x: String(start.x || ""),
                    y: String(start.y || ""),
                    z: String(start.z || "")
                });
            }

            if (p2InDb) {
                setPoint2Id(String(end.id));
            } else {
                setCustomP2({
                    x: String(end.x || ""),
                    y: String(end.y || ""),
                    z: String(end.z || "")
                });
            }

            if (p1InDb && p2InDb) {
                setMode("db");
            } else {
                setMode("custom");
                // Ensure custom values are set even if one was found in DB
                if (p1InDb) {
                    const p = points?.find((pt: any) => pt.id === start.id);
                    if (p) setCustomP1({ x: String(p.x), y: String(p.y), z: String(p.z) });
                }
                if (p2InDb) {
                    const p = points?.find((pt: any) => pt.id === end.id);
                    if (p) setCustomP2({ x: String(p.x), y: String(p.y), z: String(p.z) });
                }
            }
        }
    }, [historyData, points])

    const p1 = useMemo(() => {
        if (mode === "db") return points?.find(p => p.id === Number(point1Id))
        return {
            x: parseFloat(customP1.x) || 0,
            y: parseFloat(customP1.y) || 0,
            z: parseFloat(customP1.z) || 0,
            name: "任意点1"
        }
    }, [points, point1Id, mode, customP1])

    const p2 = useMemo(() => {
        if (mode === "db") return points?.find(p => p.id === Number(point2Id))
        return {
            x: parseFloat(customP2.x) || 0,
            y: parseFloat(customP2.y) || 0,
            z: parseFloat(customP2.z) || 0,
            name: "任意点2"
        }
    }, [points, point2Id, mode, customP2])

    const result: CalculationResult | null = useMemo(() => {
        if (!p1 || !p2) return null
        if (mode === "db" && (!point1Id || !point2Id)) return null

        const dx = (p2.x ?? 0) - (p1.x ?? 0)
        const dy = (p2.y ?? 0) - (p1.y ?? 0)
        const dz = (p2.z ?? 0) - (p1.z ?? 0)
        const distance = Math.sqrt(dx * dx + dy * dy)

        let rad = Math.atan2(dy, dx)
        if (rad < 0) rad += 2 * Math.PI

        const deg = rad * (180 / Math.PI)

        // Convert to DMS
        const d = Math.floor(deg)
        const mFloat = (deg - d) * 60
        const m = Math.floor(mFloat)
        const s = Math.round((mFloat - m) * 60)

        const dms = `${d}°${m.toString().padStart(2, '0')}′${s.toString().padStart(2, '0')}″`

        return {
            distance,
            azimuth: deg,
            azimuthDMS: dms,
            dx,
            dy,
            dz
        }
    }, [p1, p2, point1Id, point2Id, mode])

    const handleRecord = () => {
        if (!result || !p1 || !p2) return

        addHistory({
            type: 'st',
            title: `ST計算: ${p1.name} → ${p2.name}`,
            summary: `距離: ${result.distance.toFixed(4)}m\n角: ${result.azimuthDMS}`,
            details: {
                start: { ...p1 },
                end: { ...p2 },
                result: { ...result }
            }
        })
        alert("計算結果を履歴に保存しました")
    }

    return (
        <Card className="border-0 shadow-none sm:border sm:shadow-sm">
            <CardHeader className="px-0 pt-0 pb-4 sm:px-6 sm:pt-6">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-bold">2点間計算 (ST計算)</CardTitle>
                    <div className="flex bg-muted rounded-lg p-1 space-x-1">
                        <Button
                            variant={mode === "db" ? "secondary" : "ghost"}
                            size="sm"
                            onClick={() => setMode("db")}
                            className="h-7 text-xs"
                        >
                            選択
                        </Button>
                        <Button
                            variant={mode === "custom" ? "secondary" : "ghost"}
                            size="sm"
                            onClick={() => setMode("custom")}
                            className="h-7 text-xs"
                        >
                            入力
                        </Button>
                    </div>
                </div>
                <CardDescription>
                    始点から終点への距離と方向角を計算します。
                </CardDescription>
            </CardHeader>
            <CardContent className="px-0 sm:px-6 space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                    {/* Input Section */}
                    <div className="space-y-4">
                        <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">始点 (Start Point)</Label>
                            {mode === "db" ? (
                                <PointSelector
                                    points={points}
                                    value={point1Id}
                                    onSelect={(v) => setPoint1Id(v)}
                                    placeholder="点を選択..."
                                    label="点を選択"
                                />
                            ) : (
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="space-y-1">
                                        <Label className="text-[10px] text-muted-foreground">X</Label>
                                        <Input
                                            type="number"
                                            value={customP1.x}
                                            onChange={e => setCustomP1({ ...customP1, x: e.target.value })}
                                            className="h-8 text-xs bg-background"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] text-muted-foreground">Y</Label>
                                        <Input
                                            type="number"
                                            value={customP1.y}
                                            onChange={e => setCustomP1({ ...customP1, y: e.target.value })}
                                            className="h-8 text-xs bg-background"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] text-muted-foreground">Z</Label>
                                        <Input
                                            type="number"
                                            value={customP1.z}
                                            onChange={e => setCustomP1({ ...customP1, z: e.target.value })}
                                            className="h-8 text-xs bg-background"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-center -my-3 relative z-10">
                            <div className="bg-background p-1.5 rounded-full border shadow-sm text-muted-foreground">
                                <ArrowRight className="h-4 w-4 transform rotate-90" />
                            </div>
                        </div>

                        <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">終点 (End Point)</Label>
                            {mode === "db" ? (
                                <PointSelector
                                    points={points}
                                    value={point2Id}
                                    onSelect={(v) => setPoint2Id(v)}
                                    placeholder="点を選択..."
                                    label="点を選択"
                                />
                            ) : (
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="space-y-1">
                                        <Label className="text-[10px] text-muted-foreground">X</Label>
                                        <Input
                                            type="number"
                                            value={customP2.x}
                                            onChange={e => setCustomP2({ ...customP2, x: e.target.value })}
                                            className="h-8 text-xs bg-background"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] text-muted-foreground">Y</Label>
                                        <Input
                                            type="number"
                                            value={customP2.y}
                                            onChange={e => setCustomP2({ ...customP2, y: e.target.value })}
                                            className="h-8 text-xs bg-background"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] text-muted-foreground">Z</Label>
                                        <Input
                                            type="number"
                                            value={customP2.z}
                                            onChange={e => setCustomP2({ ...customP2, z: e.target.value })}
                                            className="h-8 text-xs bg-background"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Result Section */}
                    <div className="h-full relative group">
                        {result ? (
                            <div className="h-full border rounded-lg bg-card shadow-sm p-6 flex flex-col justify-center space-y-8 relative">
                                <div className="absolute top-2 right-2">
                                    <Button variant="outline" size="sm" onClick={handleRecord} title="計算結果を一時記録" className="h-7 text-xs bg-background/50">
                                        <ClipboardList className="h-3 w-3 mr-1" />
                                        一時記録
                                    </Button>
                                </div>

                                <div className="space-y-2">
                                    <div className="text-xs font-medium text-muted-foreground text-center uppercase tracking-wider">水平距離 (Distance)</div>
                                    <div className="text-2xl sm:text-3xl font-mono font-bold tracking-tighter text-center text-primary">
                                        {result.distance.toFixed(4)} <span className="text-lg text-muted-foreground font-normal">m</span>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="text-xs font-medium text-muted-foreground text-center uppercase tracking-wider">方向角 (Azimuth)</div>
                                    <div className="flex flex-col items-center">
                                        <div className="text-xl sm:text-2xl font-mono font-bold tracking-tight text-foreground">
                                            {result.azimuthDMS}
                                        </div>
                                        <div className="text-sm text-muted-foreground font-mono mt-1">
                                            ({result.azimuth.toFixed(5)}°)
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-6 border-t grid grid-cols-3 gap-4 text-center">
                                    <div className="space-y-1">
                                        <div className="text-[10px] text-muted-foreground font-medium uppercase">dX</div>
                                        <div className="font-mono text-sm font-semibold">{result.dx.toFixed(4)}</div>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="text-[10px] text-muted-foreground font-medium uppercase">dY</div>
                                        <div className="font-mono text-sm font-semibold">{result.dy.toFixed(4)}</div>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="text-[10px] text-muted-foreground font-medium uppercase">dZ</div>
                                        <div className="font-mono text-sm font-semibold">{result.dz.toFixed(4)}</div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full border rounded-lg border-dashed p-8 flex flex-col items-center justify-center text-muted-foreground bg-muted/10 min-h-[200px]">
                                <Calculator className="h-12 w-12 mb-4 opacity-20" />
                                <p className="text-sm text-center">始点と終点を選択すると<br />計算結果が表示されます</p>
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
