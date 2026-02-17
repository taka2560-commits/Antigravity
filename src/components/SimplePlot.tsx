import { useLiveQuery } from "dexie-react-hooks"
import { db } from "../db"
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from "recharts"
import { useMemo, useState, useRef, useEffect, useCallback } from "react"
import { RotateCcw, ZoomIn, ZoomOut } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"

interface SimplePlotProps {
    onPointSelect?: (point: any) => void
}

export function SimplePlot({ onPointSelect }: SimplePlotProps) {
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

    // Sort data to ensure highlighted point renders last (on top)
    const sortedData = useMemo(() => {
        if (!data) return []
        return [...data].sort((a, b) => {
            const aIsHigh = String(a.id) === highlightedPointId
            const bIsHigh = String(b.id) === highlightedPointId
            if (aIsHigh && !bIsHigh) return 1
            if (!aIsHigh && bIsHigh) return -1
            return 0
        })
    }, [data, highlightedPointId])

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

    const handleZoom = (direction: 'in' | 'out') => {
        if (!domainX || !domainY) return
        const scale = direction === 'in' ? 0.8 : 1.25
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

        // Custom Pan Speed
        const domainDx = -dx * (xRange / validChartWidth)
        const domainDy = dy * (yRange / validChartHeight)

        setDomainX([domainX[0] + domainDx, domainX[1] + domainDx])
        setDomainY([domainY[0] + domainDy, domainY[1] + domainDy])

        lastMousePos.current = { x: e.clientX, y: e.clientY }
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



    const handleMouseUp = (e: React.MouseEvent) => {
        // Check for click (minimal movement)
        if (isDragging) {
            const dx = Math.abs(e.clientX - lastMousePos.current.x)
            const dy = Math.abs(e.clientY - lastMousePos.current.y)

            // If movement is small enough, treat as click. increased tolerance for easy selection
            if (dx < 10 && dy < 10 && onPointSelect && domainX && domainY) {
                handleChartClick(e.clientX, e.clientY)
            }
        }
        setIsDragging(false)
    }

    const handleChartClick = (clientX: number, clientY: number) => {
        if (!chartContainerRef.current || !data || !domainX || !domainY) return

        const rect = chartContainerRef.current.getBoundingClientRect()
        const clickX = clientX - rect.left
        const clickY = clientY - rect.top

        // Margins defined in ScatterChart
        const margin = { top: 10, right: 10, bottom: 40, left: 0 }

        const chartW = rect.width
        const chartH = rect.height
        const innerW = chartW - margin.left - margin.right
        const innerH = chartH - margin.top - margin.bottom

        if (innerW <= 0 || innerH <= 0) return

        const xRange = domainX[1] - domainX[0]
        const yRange = domainY[1] - domainY[0]

        // Find closest point
        let closest: any = null
        let minDist = 40 // Increased hit radius (px) for easier touch

        // Iterate REVERSE to prioritize top-drawn elements (if any overlap logic existed)
        // But here standard check is fine.
        data.forEach(d => {
            if (d.plotX === undefined || d.plotY === undefined) return

            // Project point to screen pixels
            const px = margin.left + ((d.plotX - domainX[0]) / xRange) * innerW
            const py = margin.top + ((domainY[1] - d.plotY) / yRange) * innerH

            const dist = Math.sqrt(Math.pow(clickX - px, 2) + Math.pow(clickY - py, 2))

            if (dist < minDist) {
                minDist = dist
                closest = d
            }
        })

        if (closest) {
            onPointSelect && onPointSelect(closest)
        }
    }

    const handleTouchEnd = () => {
        // Simple tap detection for touch is harder with current state (distances),
        // but let's try to simulate if needed. 
        // For now, rely on mouse events which often emulate touch taps, 
        // or add specific touch tap logic if 'onClick' fails on mobile.
        // Recharts might handle the tap-to-click on mobile better given no mouse drag.

        // However, disabling drag resets state
        lastTouchDistance.current = null
        lastTouchCenter.current = null
    }

    // Capture initial pos for click detection
    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true)
        lastMousePos.current = { x: e.clientX, y: e.clientY }
    }

    // State for chart dimensions
    const [chartSize, setChartSize] = useState({ width: 0, height: 0 })
    const chartContainerRef = useRef<HTMLDivElement>(null)

    // Measure chart size for label collision detection
    // 整数に丸めて微小変化によるリレンダリングループを防止
    useEffect(() => {
        if (!chartContainerRef.current) return

        let rafId: number | null = null
        const updateSize = () => {
            if (rafId) cancelAnimationFrame(rafId)
            rafId = requestAnimationFrame(() => {
                if (chartContainerRef.current) {
                    const w = Math.round(chartContainerRef.current.clientWidth)
                    const h = Math.round(chartContainerRef.current.clientHeight)
                    setChartSize(prev => {
                        if (prev.width === w && prev.height === h) return prev
                        return { width: w, height: h }
                    })
                }
            })
        }

        updateSize()
        const observer = new ResizeObserver(updateSize)
        observer.observe(chartContainerRef.current)

        return () => {
            observer.disconnect()
            if (rafId) cancelAnimationFrame(rafId)
        }
    }, [])

    // Determine visible labels based on overlap
    const visibleLabelIds = useMemo(() => {
        if (!sortedData || sortedData.length === 0 || !domainX || !domainY || chartSize.width === 0) {
            return new Set(sortedData?.map(d => String(d.id)))
        }

        const visible = new Set<string>()
        const placedPositions: { x: number, y: number }[] = []

        // Always show highlighted point
        if (highlightedPointId !== "all") {
            visible.add(highlightedPointId)
            const target = sortedData.find(d => String(d.id) === highlightedPointId)
            if (target && target.plotX !== undefined && target.plotY !== undefined) {
                const xRange = domainX[1] - domainX[0]
                const yRange = domainY[1] - domainY[0]
                const px = ((target.plotX - domainX[0]) / xRange) * chartSize.width
                const py = ((domainY[1] - target.plotY) / yRange) * chartSize.height // Y is inverted in screen coords
                placedPositions.push({ x: px, y: py })
            }
        }

        const xRange = domainX[1] - domainX[0]
        const yRange = domainY[1] - domainY[0]
        const minLabelDist = 50 // Minimum pixels between labels

        sortedData.forEach(d => {
            const strId = String(d.id)
            if (strId === highlightedPointId) return // Already handled

            if (d.plotX === undefined || d.plotY === undefined) return

            // Calculate screen position approx
            const px = ((d.plotX - domainX[0]) / xRange) * chartSize.width
            const py = ((domainY[1] - d.plotY) / yRange) * chartSize.height

            // Check collision with ANY placed label
            const isOverlapping = placedPositions.some(pos => {
                const dx = Math.abs(pos.x - px)
                const dy = Math.abs(pos.y - py)
                return Math.sqrt(dx * dx + dy * dy) < minLabelDist
            })

            if (!isOverlapping) {
                visible.add(strId)
                placedPositions.push({ x: px, y: py })
            }
        })

        return visible
    }, [sortedData, domainX, domainY, chartSize, highlightedPointId])

    // LabelListのcontent関数を安定化（インライン関数による再レンダリングループ防止）
    const renderLabel = useCallback((props: any) => {
        const { x, y, value, index } = props
        const point = sortedData[index]
        if (!point || !visibleLabelIds.has(String(point.id))) return null
        return (
            <text
                x={x}
                y={y - 5}
                fill="hsl(var(--foreground))"
                fontSize={11}
                fontWeight={600}
                textAnchor="middle"
            >
                {value}
            </text>
        )
    }, [sortedData, visibleLabelIds])

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
                    ref={chartContainerRef}
                    className="w-full h-full max-w-[800px] border rounded-lg bg-card relative overflow-hidden touch-none select-none outline-none mx-auto"
                    onWheel={handleWheel}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart
                            margin={{ top: 10, right: 10, bottom: 40, left: 0 }}
                            style={{ cursor: onPointSelect ? 'crosshair' : 'default' }}
                        >
                            <CartesianGrid strokeDasharray="5 5" stroke="#888888" strokeOpacity={0.4} />
                            <XAxis
                                type="number"
                                dataKey="plotX"
                                name="Y座標"
                                domain={domainX || ['auto', 'auto']}
                                ticks={axisInfo.x.ticks}
                                allowDataOverflow={true}
                                label={{ value: 'Y座標', position: 'insideBottom', offset: -30, fill: 'currentColor', fontSize: 10 }}
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
                                        const hoverData = payload[0].payload;

                                        // Dynamic tolerance based on current zoom level (e.g., 2% of the view width)
                                        const xRange = (domainX && domainX.length === 2) ? (domainX[1] - domainX[0]) : 100
                                        const yRange = (domainY && domainY.length === 2) ? (domainY[1] - domainY[0]) : 100
                                        const toleranceX = xRange * 0.02
                                        const toleranceY = yRange * 0.02

                                        // Find overlapping points (same coordinates within visual tolerance)
                                        const overlappingPoints = data.filter(d =>
                                            Math.abs((d.plotX ?? 0) - (hoverData.plotX ?? 0)) < toleranceX &&
                                            Math.abs((d.plotY ?? 0) - (hoverData.plotY ?? 0)) < toleranceY
                                        );

                                        // Sort by name for consistent display
                                        overlappingPoints.sort((a, b) => a.name.localeCompare(b.name));

                                        return (
                                            <div className="bg-popover text-popover-foreground p-2 border shadow-md rounded text-xs z-50 pointer-events-none whitespace-nowrap">
                                                {overlappingPoints.map((p, idx) => (
                                                    <div key={p.id} className={idx > 0 ? "mt-2 pt-2 border-t border-border" : ""}>
                                                        <p className="font-bold">{p.name}</p>
                                                        <p>X: {(p.x ?? 0).toFixed(3)}</p>
                                                        <p>Y: {(p.y ?? 0).toFixed(3)}</p>
                                                        {p.note && <p className="text-muted-foreground text-xs">{p.note}</p>}
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <ZAxis range={[30, 30]} />
                            <Scatter
                                name="Points"
                                data={sortedData}
                                fill="#ef4444"
                                isAnimationActive={false}
                            >
                                {sortedData.map((entry) => (
                                    <Cell
                                        key={`cell-${entry.id}`}
                                        fill={String(entry.id) === highlightedPointId ? "#2563eb" : "#ef4444"}
                                        cursor={onPointSelect ? 'pointer' : 'default'}
                                    />
                                ))}
                                {showLabels && (
                                    <LabelList
                                        dataKey="name"
                                        position="top"
                                        offset={5}
                                        content={renderLabel}
                                    />
                                )}
                            </Scatter>
                        </ScatterChart>
                    </ResponsiveContainer>
                    <div className="absolute bottom-1 right-1 text-[9px] text-muted-foreground/70 bg-background/50 p-0.5 rounded pointer-events-none">
                        Zoom: Scroll/Pinch | Pan: Drag
                    </div>
                    <div className="absolute bottom-8 right-2 z-10 flex flex-col gap-1">
                        <Button
                            variant="secondary"
                            size="icon"
                            className="rounded-full shadow-lg h-9 w-9 bg-background/90 text-foreground border"
                            onClick={() => handleZoom('in')}
                            title="ズームイン"
                        >
                            <ZoomIn className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="secondary"
                            size="icon"
                            className="rounded-full shadow-lg h-9 w-9 bg-background/90 text-foreground border"
                            onClick={() => handleZoom('out')}
                            title="ズームアウト"
                        >
                            <ZoomOut className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
