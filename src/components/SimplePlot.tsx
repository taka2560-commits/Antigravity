import { useLiveQuery } from "dexie-react-hooks"
import { db } from "../db"
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from "recharts"
import { useMemo, useState, useRef, useEffect } from "react"
import { RotateCcw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"

export function SimplePlot() {
    const points = useLiveQuery(() => db.points.toArray())
    const [showLabels, setShowLabels] = useState(true)
    const [highlightedPointId, setHighlightedPointId] = useState<string>("all")

    const data = useMemo(() => {
        if (!points) return []
        return points.map(p => ({
            ...p,
            // Mathematical Plot X = Survey Y (East)
            plotX: p.y,
            // Mathematical Plot Y = Survey X (North)
            plotY: p.x,
        }))
    }, [points])

    // Auto-zoom when highlighting a point
    useEffect(() => {
        if (highlightedPointId === "all" || !data.length) return

        const target = data.find(d => String(d.id) === highlightedPointId)
        if (target) {
            // Define a zoom window (e.g., 50 meters wide)
            const zoomCheck = 50
            const x = target.plotX ?? 0
            const y = target.plotY ?? 0

            // Validate coordinates exist
            if (target.plotX === undefined || target.plotY === undefined) return

            setDomainX([x - zoomCheck / 2, x + zoomCheck / 2])
            setDomainY([y - zoomCheck / 2, y + zoomCheck / 2])
        }
    }, [highlightedPointId, data])

    // Initial domain calculation with 0.85 aspect ratio (taller)
    const initialDomains = useMemo(() => {
        if (!data || data.length === 0) return { x: [0, 100], y: [0, 100] }

        const xValues = data.map(d => d.plotX)
        const yValues = data.map(d => d.plotY)

        const minX = Math.min(...xValues)
        const maxX = Math.max(...xValues)
        const minY = Math.min(...yValues)
        const maxY = Math.max(...yValues)

        const rangeX = maxX - minX
        const rangeY = maxY - minY

        const ASPECT_RATIO = 0.75

        // Determine the necessary plot size to fit data while maintaining aspect ratio and 1:1 scale
        // We need: PlotWidth / PlotHeight = ASPECT_RATIO
        // And: PlotWidth >= rangeX, PlotHeight >= rangeY

        // Try fitting based on Y (height)
        let plotHeight = Math.max(rangeY, rangeX / ASPECT_RATIO) || 100
        let plotWidth = plotHeight * ASPECT_RATIO

        // Add 10% padding
        const padY = plotHeight * 0.1
        const padX = plotWidth * 0.1

        const midX = (minX + maxX) / 2
        const midY = (minY + maxY) / 2

        return {
            x: [midX - plotWidth / 2 - padX, midX + plotWidth / 2 + padX],
            y: [midY - plotHeight / 2 - padY, midY + plotHeight / 2 + padY]
        }
    }, [data])

    const [domainX, setDomainX] = useState<number[] | null>(null)
    const [domainY, setDomainY] = useState<number[] | null>(null)

    // Reset domains when data changes (or initial load)
    useEffect(() => {
        if (initialDomains) {
            setDomainX(initialDomains.x)
            setDomainY(initialDomains.y)
        }
    }, [initialDomains])

    // State for Pan/Zoom
    const [isDragging, setIsDragging] = useState(false)
    const lastMousePos = useRef({ x: 0, y: 0 })

    const niceNum = (range: number, round: boolean) => {
        const exponent = Math.floor(Math.log10(range))
        const fraction = range / Math.pow(10, exponent)
        let niceFraction

        if (round) {
            if (fraction < 1.5) niceFraction = 1
            else if (fraction < 3) niceFraction = 2
            else if (fraction < 7) niceFraction = 5
            else niceFraction = 10
        } else {
            if (fraction <= 1) niceFraction = 1
            else if (fraction <= 2) niceFraction = 2
            else if (fraction <= 5) niceFraction = 5
            else niceFraction = 10
        }

        return niceFraction * Math.pow(10, exponent)
    }

    // Helper to calculate nice ticks
    const getNiceTicks = (min: number, max: number, maxTicks = 10) => {
        const range = niceNum(max - min, false)
        const tickSpacing = niceNum(range / (maxTicks - 1), true)
        const niceMin = Math.floor(min / tickSpacing) * tickSpacing
        const niceMax = Math.ceil(max / tickSpacing) * tickSpacing

        const ticks = []
        for (let t = niceMin; t <= niceMax + 0.0000001; t += tickSpacing) {
            ticks.push(t)
        }
        return { min: niceMin, max: niceMax, ticks }
    }

    // Memoize ticks based on current domain
    const axisInfo = useMemo(() => {
        if (!domainX || !domainY) return {
            x: { min: 0, max: 100, ticks: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100] },
            y: { min: 0, max: 100, ticks: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100] }
        }

        const xInfo = getNiceTicks(domainX[0], domainX[1], 5) // Reduced ticks for mobile
        const yInfo = getNiceTicks(domainY[0], domainY[1], 5) // Reduced ticks for mobile

        return { x: xInfo, y: yInfo }
    }, [domainX, domainY])

    const handleReset = () => {
        if (!data || data.length === 0) return

        // Recalculate nice default domains
        const xValues = data.map(d => d.plotX)
        const yValues = data.map(d => d.plotY)
        const minX = Math.min(...xValues)
        const maxX = Math.max(...xValues)
        const minY = Math.min(...yValues)
        const maxY = Math.max(...yValues)

        const rangeX = maxX - minX
        const rangeY = maxY - minY

        const ASPECT_RATIO = 0.75

        let plotHeight = Math.max(rangeY, rangeX / ASPECT_RATIO) || 100
        let plotWidth = plotHeight * ASPECT_RATIO

        const padY = plotHeight * 0.1
        const padX = plotWidth * 0.1

        const midX = (minX + maxX) / 2
        const midY = (minY + maxY) / 2

        const niceX = getNiceTicks(midX - plotWidth / 2 - padX, midX + plotWidth / 2 + padX, 5)
        const niceY = getNiceTicks(midY - plotHeight / 2 - padY, midY + plotHeight / 2 + padY, 8)

        setDomainX([niceX.min, niceX.max])
        setDomainY([niceY.min, niceY.max])
    }

    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault()
        e.stopPropagation()

        if (!domainX || !domainY) return

        const scale = e.deltaY > 0 ? 1.1 : 0.9

        // Simple zoom from center
        const xRange = domainX[1] - domainX[0]
        const yRange = domainY[1] - domainY[0]
        const xCenter = (domainX[0] + domainX[1]) / 2
        const yCenter = (domainY[0] + domainY[1]) / 2
        const newXRange = xRange * scale
        const newYRange = yRange * scale

        setDomainX([xCenter - newXRange / 2, xCenter + newXRange / 2])
        setDomainY([yCenter - newYRange / 2, yCenter + newYRange / 2])
    }

    // Touch State
    const lastTouchDistance = useRef<number | null>(null)
    const lastTouchCenter = useRef<{ x: number; y: number } | null>(null)

    const getTouchDistance = (touches: React.TouchList) => {
        if (touches.length < 2) return null
        const dx = touches[0].clientX - touches[1].clientX
        const dy = touches[0].clientY - touches[1].clientY
        return Math.sqrt(dx * dx + dy * dy)
    }

    const handleTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length === 1) {
            lastTouchCenter.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
        } else if (e.touches.length === 2) {
            lastTouchDistance.current = getTouchDistance(e.touches)
            // Store center for potential pan during zoom? simplified for now
        }
    }

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!domainX || !domainY) return

        // Pan (1 finger)
        if (e.touches.length === 1 && lastTouchCenter.current) {
            const currentX = e.touches[0].clientX
            const currentY = e.touches[0].clientY
            const dx = currentX - lastTouchCenter.current.x
            const dy = currentY - lastTouchCenter.current.y

            const chartContainer = e.currentTarget as HTMLElement
            const validChartWidth = chartContainer.clientWidth
            const validChartHeight = chartContainer.clientHeight

            const xRange = domainX[1] - domainX[0]
            const yRange = domainY[1] - domainY[0]

            const domainDx = -dx * (xRange / validChartWidth)
            const domainDy = dy * (yRange / validChartHeight)

            setDomainX([domainX[0] + domainDx, domainX[1] + domainDx])
            setDomainY([domainY[0] + domainDy, domainY[1] + domainDy])

            lastTouchCenter.current = { x: currentX, y: currentY }
        }
        // Pinch Zoom (2 fingers)
        else if (e.touches.length === 2 && lastTouchDistance.current) {
            const currentDist = getTouchDistance(e.touches)
            if (currentDist) {
                const scale = lastTouchDistance.current / currentDist

                const xRange = domainX[1] - domainX[0]
                const yRange = domainY[1] - domainY[0]
                // Zoom from center of view for simplicity
                const xCenter = (domainX[0] + domainX[1]) / 2
                const yCenter = (domainY[0] + domainY[1]) / 2

                const newXRange = xRange * scale
                const newYRange = yRange * scale

                setDomainX([xCenter - newXRange / 2, xCenter + newXRange / 2])
                setDomainY([yCenter - newYRange / 2, yCenter + newYRange / 2])

                lastTouchDistance.current = currentDist
            }
        }
    }

    const handleTouchEnd = () => {
        lastTouchDistance.current = null
        lastTouchCenter.current = null
    }

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true)
        lastMousePos.current = { x: e.clientX, y: e.clientY }
    }

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !domainX || !domainY) return

        const dx = e.clientX - lastMousePos.current.x
        const dy = e.clientY - lastMousePos.current.y

        // We need to convert pixel delta to domain delta.
        const chartContainer = e.currentTarget as HTMLElement;
        const validChartWidth = chartContainer.clientWidth;
        const validChartHeight = chartContainer.clientHeight;

        const xRange = domainX[1] - domainX[0]
        const yRange = domainY[1] - domainY[0]

        const domainDx = -dx * (xRange / validChartWidth)
        const domainDy = dy * (yRange / validChartHeight)

        setDomainX([domainX[0] + domainDx, domainX[1] + domainDx])
        setDomainY([domainY[0] + domainDy, domainY[1] + domainDy])

        lastMousePos.current = { x: e.clientX, y: e.clientY }
    }

    const handleMouseUp = () => {
        setIsDragging(false)
    }

    if (!points || points.length === 0) {
        return (
            <Card className="border-0 shadow-none sm:border sm:shadow-sm h-full">
                <CardContent className="flex h-[400px] items-center justify-center">
                    <p className="text-muted-foreground">データがありません</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="border-0 shadow-none sm:border sm:shadow-sm h-full flex flex-col">
            <CardHeader className="px-0 pt-16 pb-4 sm:px-6 sm:pt-6 flex-none bg-background/50 backdrop-blur-sm z-10">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-bold hidden sm:block">簡易プロット</CardTitle>
                    <div className="flex gap-1 w-full sm:w-auto justify-end">
                        <Select value={highlightedPointId} onValueChange={setHighlightedPointId}>
                            <SelectTrigger className="w-[85px] h-7 text-[10px] px-1">
                                <SelectValue placeholder="点選択" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                                <SelectItem value="all" className="text-xs">
                                    (解除)
                                </SelectItem>
                                {points?.map(p => (
                                    <SelectItem key={p.id} value={String(p.id)} className="text-xs">
                                        {p.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Button
                            variant={showLabels ? "secondary" : "outline"}
                            size="sm"
                            onClick={() => setShowLabels(!showLabels)}
                            className="h-7 text-[10px] px-2 whitespace-nowrap"
                        >
                            {showLabels ? "点名ON" : "点名OFF"}
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleReset} className="h-7 px-2 whitespace-nowrap">
                            <RotateCcw className="h-3 w-3 sm:mr-1" />
                            <span className="hidden sm:inline text-[10px]">リセット</span>
                        </Button>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="px-1 sm:px-6 flex-1 min-h-0 relative flex items-center justify-center">
                <div
                    className="w-full h-full max-w-[800px] border rounded-lg bg-card relative overflow-hidden touch-none mx-auto"
                    onWheel={handleWheel}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                >
                    <ResponsiveContainer width="100%" height="100%" aspect={0.75}>
                        <ScatterChart margin={{ top: 10, right: 10, bottom: 30, left: 0 }}>
                            <CartesianGrid strokeDasharray="5 5" stroke="#888888" strokeOpacity={0.4} />
                            <XAxis
                                type="number"
                                dataKey="plotX"
                                name="Y座標"
                                domain={domainX || ['auto', 'auto']}
                                ticks={axisInfo.x.ticks}
                                allowDataOverflow={true}
                                label={{ value: 'Y座標', position: 'insideBottom', offset: -20, fill: 'currentColor', fontSize: 10 }}
                                tick={{ fill: 'currentColor', fontSize: 9 }}
                                stroke="currentColor"
                                className="text-muted-foreground"
                                tickLine={false}
                                axisLine={{ strokeWidth: 1 }}
                            />
                            <YAxis
                                type="number"
                                dataKey="plotY"
                                name="X座標"
                                domain={domainY || ['auto', 'auto']}
                                ticks={axisInfo.y.ticks}
                                allowDataOverflow={true}
                                label={{ value: 'X座標', angle: -90, position: 'insideLeft', offset: 10, fill: 'currentColor', fontSize: 10 }}
                                tick={{ fill: 'currentColor', fontSize: 9 }}
                                stroke="currentColor"
                                className="text-muted-foreground"
                                width={35}
                                tickLine={false}
                                axisLine={{ strokeWidth: 1 }}
                            />
                            <Tooltip
                                cursor={{ strokeDasharray: '3 3', stroke: '#E07A5F', strokeWidth: 1.5 }}
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const data = payload[0].payload;
                                        return (
                                            <div className="bg-popover text-popover-foreground p-2 border shadow-md rounded text-xs z-50 pointer-events-none whitespace-nowrap">
                                                <p className="font-bold">{data.name}</p>
                                                <p>X: {(data.x ?? 0).toFixed(3)}</p>
                                                <p>Y: {(data.y ?? 0).toFixed(3)}</p>
                                                {data.note && <p className="text-muted-foreground text-xs">{data.note}</p>}
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <ZAxis range={[30, 30]} />
                            <Scatter name="Points" data={data} fill="#ef4444">
                                {data.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={String(entry.id) === highlightedPointId ? "#2563eb" : "#ef4444"}
                                    />
                                ))}
                                {showLabels && (
                                    <LabelList dataKey="name" position="top" offset={5} style={{ fill: 'hsl(var(--foreground))', fontSize: '9px', fontWeight: 500 }} />
                                )}
                            </Scatter>
                        </ScatterChart>
                    </ResponsiveContainer>
                    <div className="absolute bottom-1 right-1 text-[9px] text-muted-foreground/70 bg-background/50 p-0.5 rounded pointer-events-none">
                        Zoom: Scroll/Pinch | Pan: Drag
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
