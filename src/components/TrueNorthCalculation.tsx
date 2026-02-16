import { useState, useEffect, useMemo } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { db } from "../db"
import { calculateMeridianConvergence, decimalToDms, xyToLatLon, ZONES } from "../utils/coordinates"
import { Compass, MapPin, ClipboardList } from "lucide-react"

import { PointSelector } from "./PointSelector"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Button } from "./ui/button"
import { useCalculationHistory, type HistoryItem } from "../hooks/useCalculationHistory"

export function TrueNorthCalculation({ historyData }: { historyData: HistoryItem | null }) {
    const points = useLiveQuery(() => db.points.toArray())
    const { addHistory } = useCalculationHistory()

    const [zone, setZone] = useState<number>(9)
    const [selectedPointId, setSelectedPointId] = useState<string>("")
    const [input, setInput] = useState({ lat: 0, lon: 0, name: "" })

    // State for grid azimuth input (for converting to true north)
    const [gridAzimuth, setGridAzimuth] = useState<number>(0)

    // Restore from history
    useEffect(() => {
        if (historyData && historyData.type === 'north' && historyData.details) {
            const { input: savedInput, zone: savedZone } = historyData.details;

            if (savedZone) setZone(savedZone);
            if (savedInput) {
                setInput({
                    lat: savedInput.lat || 0,
                    lon: savedInput.lon || 0,
                    name: savedInput.name || ""
                });
                if (savedInput.gridAzimuth !== undefined) {
                    setGridAzimuth(savedInput.gridAzimuth);
                }
            }
            // Clear selected point ID as we are restoring raw values
            setSelectedPointId("");
        }
    }, [historyData])

    // Update input when point selected
    useEffect(() => {
        if (selectedPointId && points) {
            const p = points.find(pt => pt.id === Number(selectedPointId))
            if (p) {
                // If point has Lat/Lon, use it. If not, convert X/Y to Lat/Lon
                if (p.lat !== undefined && p.lon !== undefined) {
                    setInput({ lat: p.lat, lon: p.lon, name: p.name })
                } else {
                    try {
                        const ll = xyToLatLon(p.x ?? 0, p.y ?? 0, zone) // Use current zone
                        setInput({ lat: ll.lat, lon: ll.lon, name: p.name })
                    } catch (e) {
                        // Fallback or error
                    }
                }
            }
        } else if (selectedPointId === "") { // Manual input selected
            if (!historyData) { // Only reset if not restoring history
                setInput({ lat: 0, lon: 0, name: "" })
            }
        }
    }, [selectedPointId, points, zone])

    // Calculate Convergence
    const convergence = useMemo(() => {
        try {
            return calculateMeridianConvergence(input.lat, input.lon, zone)
        } catch (e) {
            return 0
        }
    }, [input.lat, input.lon, zone])

    // Calculate True North Azimuth
    const trueNorthAzimuth = useMemo(() => {
        return gridAzimuth + convergence
    }, [gridAzimuth, convergence])

    const handleRecord = () => {
        addHistory({
            type: 'north',
            title: `真北計算: ${input.name || '未登録点'}`,
            summary: `真北: ${decimalToDms(trueNorthAzimuth)}\n収差: ${decimalToDms(convergence)}`,
            details: {
                input: { ...input, gridAzimuth },
                result: { convergence, trueNorthAzimuth },
                zone
            }
        })
        alert("計算結果を履歴に保存しました")
    }

    return (
        <Card className="border-0 shadow-none sm:border sm:shadow-sm">
            <CardHeader className="px-0 pt-0 pb-4 sm:px-6 sm:pt-6">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-bold">真北方向角計算</CardTitle>
                </div>
                <CardDescription>
                    平面直角座標上の方向角から、真北方向角を計算します。
                </CardDescription>
            </CardHeader>
            <CardContent className="px-0 sm:px-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Settings & Input */}
                    <div className="space-y-6">
                        <div className="space-y-3">
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">計算対象の点 (Point)</Label>
                            <PointSelector
                                points={points}
                                value={selectedPointId}
                                onSelect={(v) => setSelectedPointId(v)}
                                placeholder="(手動入力)"
                                label="点を選択"
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-[10px] text-muted-foreground">緯度 (Lat)</Label>
                                    <Input
                                        type="number"
                                        value={input.lat}
                                        onChange={(e) => setInput({ ...input, lat: parseFloat(e.target.value) })}
                                        className="h-9 text-sm bg-muted/20"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] text-muted-foreground">経度 (Lon)</Label>
                                    <Input
                                        type="number"
                                        value={input.lon}
                                        onChange={(e) => setInput({ ...input, lon: parseFloat(e.target.value) })}
                                        className="h-9 text-sm bg-muted/20"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-medium">系番号 (Zone)</Label>
                            <Select value={String(zone)} onValueChange={(v) => setZone(Number(v))}>
                                <SelectTrigger className="bg-background">
                                    <SelectValue placeholder="系番号を選択" />
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

                        <div className="pt-4 border-t space-y-2">
                            <Label className="text-sm font-medium">座標北の方位角 (Grid Azimuth)</Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    type="number"
                                    value={gridAzimuth}
                                    onChange={(e) => setGridAzimuth(parseFloat(e.target.value))}
                                    className="flex-1 bg-background"
                                    placeholder="例: 45.0"
                                />
                                <span className="text-sm text-muted-foreground">度</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                ※2点間計算で求めた方向角を入力してください
                            </p>
                        </div>
                    </div>

                    {/* Results */}
                    <div className="space-y-6 relative group">
                        <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            <Button variant="ghost" size="icon" onClick={handleRecord} title="計算結果を一時記録">
                                <ClipboardList className="h-4 w-4 text-muted-foreground" />
                            </Button>
                        </div>

                        <div className="bg-amber-50/50 p-6 rounded-lg border border-amber-100 dark:bg-amber-950/20 dark:border-amber-900">
                            <div className="flex items-center gap-2 mb-4 justify-center">
                                <MapPin className="h-4 w-4 text-amber-600" />
                                <span className="text-sm font-bold text-amber-800 dark:text-amber-500">子午線収差角 (Meridian Convergence)</span>
                            </div>
                            <div className="text-2xl font-mono font-bold text-amber-700 dark:text-amber-400 text-center">
                                {decimalToDms(convergence)}
                            </div>
                            <div className="text-xs text-center text-amber-600 dark:text-amber-500 font-mono mt-1">
                                ({convergence.toFixed(6)}°)
                            </div>
                            <p className="text-[10px] text-amber-700/60 dark:text-amber-500/60 mt-3 text-center font-mono">
                                T = (λ - λ0) * sin(φ)
                            </p>
                        </div>

                        <div className="bg-primary/5 p-6 rounded-lg border border-primary/10">
                            <div className="flex items-center gap-2 mb-4 justify-center">
                                <Compass className="h-4 w-4 text-primary" />
                                <span className="text-sm font-bold text-foreground">真北方向角 (True North Azimuth)</span>
                            </div>
                            <div className="text-2xl font-mono font-bold text-primary text-center">
                                {decimalToDms(trueNorthAzimuth)}
                            </div>
                            <div className="text-xs text-center text-muted-foreground font-mono mt-1">
                                ({trueNorthAzimuth.toFixed(6)}°)
                            </div>
                            <p className="text-[10px] text-muted-foreground/60 mt-3 text-center">
                                真北 = 座標北 + 子午線収差角
                            </p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
