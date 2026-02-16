import { useState, useEffect } from "react"
import { RotateCcw, Plus, Minus, ClipboardList, Divide, X, Delete } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Button } from "./ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { useCalculationHistory } from "../hooks/useCalculationHistory"

export function ConstructionCalculator() {
    return (
        <div className="space-y-4">
            <Tabs defaultValue="gradient" className="w-full">
                <TabsList className="grid w-full grid-cols-5 h-auto p-1 bg-muted/50">
                    <TabsTrigger value="gradient" className="text-xs md:text-sm">勾配</TabsTrigger>
                    <TabsTrigger value="trig" className="text-xs md:text-sm">三角関数</TabsTrigger>
                    <TabsTrigger value="curve" className="text-xs md:text-sm">単曲線</TabsTrigger>
                    <TabsTrigger value="counter" className="text-xs md:text-sm">累加</TabsTrigger>
                    <TabsTrigger value="simple" className="text-xs md:text-sm">電卓</TabsTrigger>
                </TabsList>

                <TabsContent value="gradient">
                    <GradientCalculator />
                </TabsContent>
                <TabsContent value="trig">
                    <TrigCalculator />
                </TabsContent>
                <TabsContent value="curve">
                    <CurveCalculator />
                </TabsContent>
                <TabsContent value="counter">
                    <CounterCalculator />
                </TabsContent>
                <TabsContent value="simple">
                    <SimpleCalculator />
                </TabsContent>
            </Tabs>
        </div>
    )
}

// --- Helper Components ---

function InputToolbar({ onInsert }: { onInsert: (char: string) => void }) {
    return (
        <div className="flex gap-2 mb-4 bg-muted/50 p-2 rounded-md overflow-x-auto shadow-inner">
            {/* Removed '-' button as requested */}
            <Button variant="outline" size="sm" onClick={() => onInsert("°")} className="min-w-[40px] h-8 text-lg font-bold bg-background">°</Button>
            <Button variant="outline" size="sm" onClick={() => onInsert("′")} className="min-w-[40px] h-8 text-lg font-bold bg-background">′</Button>
            <Button variant="outline" size="sm" onClick={() => onInsert("″")} className="min-w-[40px] h-8 text-lg font-bold bg-background">″</Button>
            <span className="text-xs text-muted-foreground self-center ml-2 hidden md:inline">※選択中の入力欄に挿入</span>
        </div>
    )
}

function parseDMS(val: string): number {
    // Try simple number first
    const num = parseFloat(val)
    if (!isNaN(num) && !val.includes("°")) {
        return num
    }

    // Parse DMS string like 35°20'30" or 35-20-30
    // Normalize delimiters
    let s = val.replace(/[°′″"']+/g, "-")
    // Remove trailing dash
    if (s.endsWith("-")) s = s.slice(0, -1)

    const parts = s.split("-").map(p => parseFloat(p)).filter(n => !isNaN(n))

    if (parts.length === 0) return 0

    let deg = parts[0]
    let min = parts.length > 1 ? parts[1] : 0
    let sec = parts.length > 2 ? parts[2] : 0

    // Handle negative
    const sign = deg < 0 ? -1 : 1
    deg = Math.abs(deg)

    return sign * (deg + min / 60 + sec / 3600)
}

// --- Gradient Calculator ---
function GradientCalculator() {
    const { addHistory } = useCalculationHistory()
    const [mode, setMode] = useState<"A" | "B" | "C">("A")

    const [dist, setDist] = useState<string>("")
    const [height, setHeight] = useState<string>("")
    const [gradient, setGradient] = useState<string>("")
    const [angle, setAngle] = useState<string>("") // Can contain DMS symbols

    // Track active input for Toolbar
    const [activeInput, setActiveInput] = useState<string | null>(null)
    const setters: Record<string, (val: string) => void> = {
        dist: setDist,
        height: setHeight,
        gradient: setGradient,
        angle: setAngle,
        decDeg: (v) => setDecDeg(v), // For converter
        dmsVal: (v) => setDmsVal(v)
    }
    const values: Record<string, string> = {
        dist, height, gradient, angle
    }

    const handleInsert = (char: string) => {
        if (!activeInput) return
        const setter = setters[activeInput]
        if (activeInput === 'decDeg') {
            setter(decDeg + char); return
        }
        if (activeInput === 'dmsVal') {
            setter(dmsVal + char); return
        }

        const currentVal = values[activeInput] || ""
        setter(currentVal + char)
    }

    // Results
    const [resGradient, setResGradient] = useState<number | null>(null)
    const [resAngle, setResAngle] = useState<number | null>(null)
    const [resAngleDMS, setResAngleDMS] = useState<string>("")
    const [resSlope, setResSlope] = useState<number | null>(null)
    const [resHeight, setResHeight] = useState<number | null>(null)

    const calculate = () => {
        const d = parseFloat(dist)

        if (mode === "A") {
            const h = parseFloat(height)
            if (!d) return
            // Gradient %
            const g = (h / d) * 100
            setResGradient(g)
            // Angle
            const rad = Math.atan2(h, d)
            const deg = rad * (180 / Math.PI)
            setResAngle(deg)
            setResAngleDMS(toDMS(deg))
            // Slope
            const s = Math.sqrt(d * d + h * h)
            setResSlope(s)
        } else if (mode === "B") {
            const g = parseFloat(gradient)
            if (!d) return
            const h = d * (g / 100)
            setResHeight(h)
        } else if (mode === "C") {
            const a = parseDMS(angle)
            if (!d) return
            const rad = a * (Math.PI / 180)
            const h = d * Math.tan(rad)
            setResHeight(h)
            const g = (h / d) * 100
            setResGradient(g)
        }
    }

    useEffect(() => {
        calculate()
    }, [dist, height, gradient, angle, mode])

    const handleRecord = () => {
        let summary = ""
        let details: any = { mode, dist }

        if (mode === "A") {
            if (resGradient === null) return
            summary = `距離:${dist}m 比高:${height}m → 勾配:${resGradient.toFixed(3)}%`
            details = { ...details, height, gradient: resGradient, angle: resAngle, slope: resSlope }
        } else if (mode === "B") {
            if (resHeight === null) return
            summary = `距離:${dist}m 勾配:${gradient}% → 比高:${resHeight.toFixed(3)}m`
            details = { ...details, gradient, height: resHeight }
        } else if (mode === "C") {
            if (resHeight === null) return
            summary = `距離:${dist}m 角度:${angle}° → 比高:${resHeight.toFixed(3)}m`
            details = { ...details, angle, height: resHeight, gradient: resGradient }
        }

        addHistory({
            type: 'gradient',
            title: '勾配計算',
            summary,
            details
        })
    }

    // Angle Converter
    const [decDeg, setDecDeg] = useState<string>("")
    const [dmsVal, setDmsVal] = useState<string>("")

    const convertToDMS = () => {
        const val = parseFloat(decDeg)
        if (!isNaN(val)) setDmsVal(toDMS(val))
    }
    const convertToDec = () => {
        const val = parseDMS(dmsVal)
        setDecDeg(val.toFixed(6))
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="py-3 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-medium">勾配計算</CardTitle>
                    <Button variant="outline" size="sm" onClick={handleRecord} className="h-8 gap-1">
                        <ClipboardList className="h-4 w-4" />
                        <span className="text-xs">一時記録</span>
                    </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                    <InputToolbar onInsert={handleInsert} />

                    <div className="flex space-x-2">
                        <Button variant={mode === "A" ? "default" : "outline"} size="sm" onClick={() => setMode("A")} className="flex-1 text-xs">距離+高さ</Button>
                        <Button variant={mode === "B" ? "default" : "outline"} size="sm" onClick={() => setMode("B")} className="flex-1 text-xs">距離+勾配</Button>
                        <Button variant={mode === "C" ? "default" : "outline"} size="sm" onClick={() => setMode("C")} className="flex-1 text-xs">距離+角度</Button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>水平距離 (m)</Label>
                            <Input type="number" inputMode="decimal" value={dist} onChange={e => setDist(e.target.value)} onFocus={() => setActiveInput('dist')} />
                        </div>

                        {mode === "A" && (
                            <div className="space-y-2">
                                <Label>比高 (m)</Label>
                                <Input type="number" inputMode="decimal" value={height} onChange={e => setHeight(e.target.value)} onFocus={() => setActiveInput('height')} />
                            </div>
                        )}
                        {mode === "B" && (
                            <div className="space-y-2">
                                <Label>勾配 (%)</Label>
                                <Input type="number" inputMode="decimal" value={gradient} onChange={e => setGradient(e.target.value)} onFocus={() => setActiveInput('gradient')} />
                            </div>
                        )}
                        {mode === "C" && (
                            <div className="space-y-2">
                                <Label>角度 (度/DMS)</Label>
                                <Input
                                    type="text"
                                    inputMode="decimal"
                                    value={angle}
                                    onChange={e => setAngle(e.target.value)}
                                    onFocus={() => setActiveInput('angle')}
                                    placeholder="35.5 or 35°20'30"
                                />
                            </div>
                        )}
                    </div>

                    <div className="bg-muted/50 p-4 rounded-md space-y-2">
                        {mode === "A" && (
                            <>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">勾配:</span>
                                    <span className="font-mono font-bold">{resGradient?.toFixed(3)} %</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">角度:</span>
                                    <div className="text-right">
                                        <div className="font-mono">{resAngle?.toFixed(4)}°</div>
                                        <div className="font-mono text-xs text-muted-foreground">{resAngleDMS}</div>
                                    </div>
                                </div>
                                <div className="flex justify-between text-sm border-t pt-2 mt-2 border-dashed">
                                    <span className="text-muted-foreground font-semibold">斜距離:</span>
                                    <span className="font-mono font-bold">{resSlope?.toFixed(3)} m</span>
                                </div>
                            </>
                        )}
                        {(mode === "B" || mode === "C") && (
                            <>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">比高:</span>
                                    <span className="font-mono font-bold">{resHeight?.toFixed(3)} m</span>
                                </div>
                                {mode === "C" && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">勾配:</span>
                                        <span className="font-mono font-bold">{resGradient?.toFixed(3)} %</span>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="py-3">
                    <CardTitle className="text-sm font-medium">角度変換 (DEC ⇔ DMS)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 items-center">
                        <div className="space-y-2">
                            <Label>10進数 (度)</Label>
                            <Input
                                type="text"
                                inputMode="decimal"
                                value={decDeg}
                                onChange={e => setDecDeg(e.target.value)}
                                onFocus={() => setActiveInput('decDeg')}
                                placeholder="35.5"
                            />
                            <Button size="sm" variant="secondary" className="w-full" onClick={convertToDMS}>↓ 変換</Button>
                        </div>
                        <div className="space-y-2">
                            <Label>60進数 (DMS)</Label>
                            <Input
                                type="text"
                                inputMode="decimal"
                                value={dmsVal}
                                onChange={e => setDmsVal(e.target.value)}
                                onFocus={() => setActiveInput('dmsVal')}
                                placeholder="35°20'30"
                            />
                            <Button size="sm" variant="secondary" className="w-full" onClick={convertToDec}>↑ 変換</Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

// --- Trig Calculator ---
function TrigCalculator() {
    const { addHistory } = useCalculationHistory()
    const [deg, setDeg] = useState<string>("")
    const [res, setRes] = useState<{ sin: number, cos: number, tan: number } | null>(null)
    const [activeInput, setActiveInput] = useState<string | null>(null)

    const handleInsert = (char: string) => {
        if (activeInput === 'deg') setDeg(deg + char)
    }

    useEffect(() => {
        const val = parseDMS(deg)
        if (!isNaN(val)) {
            const rad = val * (Math.PI / 180)
            setRes({
                sin: Math.sin(rad),
                cos: Math.cos(rad),
                tan: Math.tan(rad)
            })
        } else {
            setRes(null)
        }
    }, [deg])

    const handleRecord = () => {
        if (!res) return
        addHistory({
            type: 'trig',
            title: '三角関数',
            summary: `角度:${deg}° → sin:${res.sin.toFixed(4)} cos:${res.cos.toFixed(4)} tan:${res.tan.toFixed(4)}`,
            details: { deg, ...res }
        })
    }

    return (
        <Card>
            <CardHeader className="py-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium">三角関数</CardTitle>
                <Button variant="outline" size="sm" onClick={handleRecord} className="h-8 gap-1">
                    <ClipboardList className="h-4 w-4" />
                    <span className="text-xs">一時記録</span>
                </Button>
            </CardHeader>
            <CardContent className="space-y-4">
                <InputToolbar onInsert={handleInsert} />
                <div className="space-y-2">
                    <Label>角度 (度/DMS)</Label>
                    <Input
                        type="text"
                        inputMode="decimal"
                        value={deg}
                        onChange={e => setDeg(e.target.value)}
                        onFocus={() => setActiveInput('deg')}
                        placeholder="45"
                    />
                </div>
                {res && (
                    <div className="grid grid-cols-3 gap-2 text-center bg-muted/50 p-4 rounded-md">
                        <div>
                            <div className="text-xs text-muted-foreground mb-1">sin</div>
                            <div className="font-mono font-bold text-sm">{res.sin.toFixed(6)}</div>
                        </div>
                        <div>
                            <div className="text-xs text-muted-foreground mb-1">cos</div>
                            <div className="font-mono font-bold text-sm">{res.cos.toFixed(6)}</div>
                        </div>
                        <div>
                            <div className="text-xs text-muted-foreground mb-1">tan</div>
                            <div className="font-mono font-bold text-sm">{res.tan.toFixed(6)}</div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

// --- Curve Calculator ---
function CurveCalculator() {
    const { addHistory } = useCalculationHistory()
    const [mode, setMode] = useState<"IA" | "CL" | "C">("IA")
    const [radius, setRadius] = useState<string>("")
    const [val2, setVal2] = useState<string>("") // IA or CL or Chord
    const [activeInput, setActiveInput] = useState<string | null>(null)

    const handleInsert = (char: string) => {
        if (activeInput === 'radius') setRadius(radius + char)
        if (activeInput === 'val2') setVal2(val2 + char)
    }

    const [results, setResults] = useState<{ ia: number, cl: number, tl: number, e: number, m: number, c: number } | null>(null)

    useEffect(() => {
        const r = parseFloat(radius)
        let v = 0

        // Parse val2 based on mode. Only IA supports DMS
        if (mode === "IA") {
            v = parseDMS(val2)
        } else {
            v = parseFloat(val2)
        }

        if (!r || !v) {
            setResults(null)
            return
        }

        let ia_rad = 0
        let ia_deg = 0

        try {
            if (mode === "IA") {
                ia_deg = v
                ia_rad = v * (Math.PI / 180)
            } else if (mode === "CL") {
                ia_rad = v / r
                ia_deg = ia_rad * (180 / Math.PI)
            } else if (mode === "C") {
                const sinVal = v / (2 * r)
                if (sinVal > 1) {
                    setResults(null)
                    return
                }
                ia_rad = 2 * Math.asin(sinVal)
                ia_deg = ia_rad * (180 / Math.PI)
            }

            const tl = r * Math.tan(ia_rad / 2)
            const cl = r * ia_rad
            const e = r * (1 / Math.cos(ia_rad / 2) - 1)
            const m = r * (1 - Math.cos(ia_rad / 2))
            const c = 2 * r * Math.sin(ia_rad / 2)

            setResults({
                ia: ia_deg,
                cl: cl,
                tl: tl,
                e: e,
                m: m,
                c: c
            })

        } catch (e) {
            setResults(null)
        }

    }, [radius, val2, mode])

    const handleRecord = () => {
        if (!results) return
        addHistory({
            type: 'curve',
            title: '単曲線計算',
            summary: `R:${radius} ${mode === "IA" ? `IA:${val2}` : mode === "CL" ? `CL:${val2}` : `C:${val2}`} → CL:${results.cl.toFixed(3)} TL:${results.tl.toFixed(3)}`,
            details: { mode, radius, val2, ...results }
        })
    }

    return (
        <Card>
            <CardHeader className="py-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium">単曲線 (Simple Curve)</CardTitle>
                <Button variant="outline" size="sm" onClick={handleRecord} className="h-8 gap-1">
                    <ClipboardList className="h-4 w-4" />
                    <span className="text-xs">一時記録</span>
                </Button>
            </CardHeader>
            <CardContent className="space-y-4">
                <InputToolbar onInsert={handleInsert} />
                <div className="flex space-x-2">
                    <Button variant={mode === "IA" ? "default" : "outline"} size="sm" onClick={() => setMode("IA")} className="flex-1 text-xs">R + IA</Button>
                    <Button variant={mode === "CL" ? "default" : "outline"} size="sm" onClick={() => setMode("CL")} className="flex-1 text-xs">R + CL</Button>
                    <Button variant={mode === "C" ? "default" : "outline"} size="sm" onClick={() => setMode("C")} className="flex-1 text-xs">R + 弦</Button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>半径 (R)</Label>
                        <Input
                            type="number"
                            inputMode="decimal"
                            value={radius}
                            onChange={e => setRadius(e.target.value)}
                            onFocus={() => setActiveInput('radius')}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>
                            {mode === "IA" ? "交角 (IA・度/DMS)" :
                                mode === "CL" ? "曲線長 (CL)" : "弦長 (C)"}
                        </Label>
                        <Input
                            type={mode === "IA" ? "text" : "number"}
                            inputMode="decimal"
                            value={val2}
                            onChange={e => setVal2(e.target.value)}
                            onFocus={() => setActiveInput('val2')}
                        />
                    </div>
                </div>

                {results && (
                    <div className="bg-muted/50 p-4 rounded-md space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">交角 (IA):</span>
                            <span className="font-mono font-bold">{toDMS(results.ia)} ({results.ia.toFixed(4)}°)</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">接線長 (TL):</span>
                            <span className="font-mono font-bold">{results.tl.toFixed(3)} m</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">曲線長 (CL):</span>
                            <span className="font-mono font-bold">{results.cl.toFixed(3)} m</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">外線長 (E):</span>
                            <span className="font-mono font-bold">{results.e.toFixed(3)} m</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">中央縦距 (M):</span>
                            <span className="font-mono font-bold">{results.m.toFixed(3)} m</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">弦長 (C):</span>
                            <span className="font-mono font-bold">{results.c.toFixed(3)} m</span>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

// --- Counter Calculator ---
function CounterCalculator() {
    const { addHistory } = useCalculationHistory()
    const [currentVal, setCurrentVal] = useState<number>(0)
    const [increment, setIncrement] = useState<string>("20")
    const [startVal, setStartVal] = useState<string>("0")
    const [activeInput, setActiveInput] = useState<string | null>(null)

    // History log
    const [history, setHistory] = useState<number[]>([])

    const handleInsert = (char: string) => {
        if (activeInput === 'startVal') setStartVal(startVal + char)
        if (activeInput === 'increment') setIncrement(increment + char)
    }

    const handleReset = () => {
        const s = parseFloat(startVal) || 0
        setCurrentVal(s)
        setHistory([s])
    }

    const handleAdd = () => {
        const inc = parseFloat(increment) || 0
        const newVal = currentVal + inc
        setCurrentVal(newVal)
        setHistory(prev => [newVal, ...prev].slice(0, 20))
    }

    const handleSub = () => {
        const inc = parseFloat(increment) || 0
        const newVal = currentVal - inc
        setCurrentVal(newVal)
        setHistory(prev => [newVal, ...prev].slice(0, 20))
    }

    const handleRecord = () => {
        addHistory({
            type: 'counter',
            title: '累加計算',
            summary: `現在値: ${currentVal}`,
            details: { currentVal, increment, startVal, history }
        })
    }

    // Init history on load
    useEffect(() => {
        handleReset()
    }, [])

    return (
        <Card>
            <CardHeader className="py-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium">累加計算 (カウンター)</CardTitle>
                <Button variant="outline" size="sm" onClick={handleRecord} className="h-8 gap-1">
                    <ClipboardList className="h-4 w-4" />
                    <span className="text-xs">一時記録</span>
                </Button>
            </CardHeader>
            <CardContent className="space-y-6">
                <InputToolbar onInsert={handleInsert} />
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>開始値</Label>
                        <div className="flex gap-2">
                            <Input
                                type="number"
                                inputMode="decimal"
                                value={startVal}
                                onChange={e => setStartVal(e.target.value)}
                                onFocus={() => setActiveInput('startVal')}
                            />
                            <Button variant="outline" size="icon" onClick={handleReset} title="リセット">
                                <RotateCcw className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>増減値</Label>
                        <Input
                            type="number"
                            inputMode="decimal"
                            value={increment}
                            onChange={e => setIncrement(e.target.value)}
                            onFocus={() => setActiveInput('increment')}
                        />
                    </div>
                </div>

                <div className="text-center py-6 bg-muted/10 rounded-lg border">
                    <div className="text-xs text-muted-foreground mb-2">現在の値</div>
                    <div className="text-4xl font-bold font-mono tracking-wider">{Number.isInteger(currentVal) ? currentVal : currentVal.toFixed(3)}</div>
                </div>

                <div className="grid grid-cols-2 gap-4 h-24">
                    <Button variant="outline" className="h-full text-xl font-bold border-red-200 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20" onClick={handleSub}>
                        <Minus className="mr-2 h-6 w-6" /> 引く
                    </Button>
                    <Button className="h-full text-xl font-bold" onClick={handleAdd}>
                        <Plus className="mr-2 h-6 w-6" /> 足す
                    </Button>
                </div>

                <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">履歴 (最新20件)</Label>
                    <div className="bg-muted/50 rounded-md p-2 h-32 overflow-y-auto font-mono text-sm">
                        {history.map((val, i) => (
                            <div key={i} className="flex justify-between border-b last:border-0 border-muted-foreground/10 py-1">
                                <span className="text-muted-foreground text-xs w-8">{history.length - i}.</span>
                                <span>{Number.isInteger(val) ? val : val.toFixed(3)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

// --- Simple Calculator ---
function SimpleCalculator() {
    const { addHistory } = useCalculationHistory()
    const [display, setDisplay] = useState<string>("0")
    const [firstOperand, setFirstOperand] = useState<number | null>(null)
    const [operator, setOperator] = useState<string | null>(null)
    const [waitingForSecondOperand, setWaitingForSecondOperand] = useState<boolean>(false)

    const inputDigit = (digit: string) => {
        if (waitingForSecondOperand) {
            setDisplay(digit)
            setWaitingForSecondOperand(false)
        } else {
            setDisplay(display === "0" ? digit : display + digit)
        }
    }

    const inputDecimal = () => {
        if (waitingForSecondOperand) {
            setDisplay("0.")
            setWaitingForSecondOperand(false)
            return
        }
        if (!display.includes(".")) {
            setDisplay(display + ".")
        }
    }

    const clear = () => {
        setDisplay("0")
        setFirstOperand(null)
        setOperator(null)
        setWaitingForSecondOperand(false)
    }

    const backspace = () => {
        if (waitingForSecondOperand) return
        if (display.length === 1) {
            setDisplay("0")
        } else {
            setDisplay(display.slice(0, -1))
        }
    }

    const handleOperator = (nextOperator: string) => {
        const inputValue = parseFloat(display)

        if (operator && waitingForSecondOperand) {
            setOperator(nextOperator)
            return
        }

        if (firstOperand == null) {
            setFirstOperand(inputValue)
        } else if (operator) {
            const result = calculate(firstOperand, inputValue, operator)
            setDisplay(String(result))
            setFirstOperand(result)
        }

        setWaitingForSecondOperand(true)
        setOperator(nextOperator)
    }

    const calculate = (first: number, second: number, op: string) => {
        if (op === "+") return first + second
        if (op === "-") return first - second
        if (op === "*") return first * second
        if (op === "/") return first / second
        return second
    }

    const performCalculation = () => {
        if (operator === null || waitingForSecondOperand) return

        const inputValue = parseFloat(display)
        const result = calculate(firstOperand!, inputValue, operator)
        setDisplay(String(result))
        setFirstOperand(null)
        setOperator(null)
        setWaitingForSecondOperand(true)
    }

    // Toggle sign
    const toggleSign = () => {
        const val = parseFloat(display)
        if (val === 0) return
        setDisplay(String(val * -1))
    }

    const handleRecord = () => {
        addHistory({
            type: 'counter', // Reusing counter type or generic
            title: '一般電卓',
            summary: `計算結果: ${display}`,
            details: { value: display }
        })
    }

    return (
        <Card>
            <CardHeader className="py-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium">一般電卓</CardTitle>
                <Button variant="outline" size="sm" onClick={handleRecord} className="h-8 gap-1">
                    <ClipboardList className="h-4 w-4" />
                    <span className="text-xs">一時記録</span>
                </Button>
            </CardHeader>
            <CardContent>
                <div className="bg-muted p-4 text-right text-3xl font-mono rounded-md mb-4 overflow-x-auto">
                    {display}
                </div>

                <div className="grid grid-cols-4 gap-2">
                    <Button variant="secondary" onClick={clear} className="bg-red-100 text-foreground hover:bg-red-200 dark:bg-red-900/30">AC</Button>
                    <Button variant="secondary" onClick={backspace}><Delete className="h-4 w-4" /></Button>
                    <Button variant="secondary" onClick={toggleSign}>+/-</Button>
                    <Button variant="secondary" onClick={() => handleOperator("/")} className="bg-orange-100 text-foreground hover:bg-orange-200 dark:bg-orange-900/30"><Divide className="h-4 w-4" /></Button>

                    <Button variant="outline" onClick={() => inputDigit("7")}>7</Button>
                    <Button variant="outline" onClick={() => inputDigit("8")}>8</Button>
                    <Button variant="outline" onClick={() => inputDigit("9")}>9</Button>
                    <Button variant="secondary" onClick={() => handleOperator("*")} className="bg-orange-100 text-foreground hover:bg-orange-200 dark:bg-orange-900/30"><X className="h-4 w-4" /></Button>

                    <Button variant="outline" onClick={() => inputDigit("4")}>4</Button>
                    <Button variant="outline" onClick={() => inputDigit("5")}>5</Button>
                    <Button variant="outline" onClick={() => inputDigit("6")}>6</Button>
                    <Button variant="secondary" onClick={() => handleOperator("-")} className="bg-orange-100 text-foreground hover:bg-orange-200 dark:bg-orange-900/30"><Minus className="h-4 w-4" /></Button>

                    <Button variant="outline" onClick={() => inputDigit("1")}>1</Button>
                    <Button variant="outline" onClick={() => inputDigit("2")}>2</Button>
                    <Button variant="outline" onClick={() => inputDigit("3")}>3</Button>
                    <Button variant="secondary" onClick={() => handleOperator("+")} className="bg-orange-100 text-foreground hover:bg-orange-200 dark:bg-orange-900/30"><Plus className="h-4 w-4" /></Button>

                    <Button variant="outline" onClick={() => inputDigit("0")} className="col-span-2">0</Button>
                    <Button variant="outline" onClick={inputDecimal}>.</Button>
                    <Button onClick={performCalculation} className="bg-primary text-primary-foreground">=</Button>
                </div>
            </CardContent>
        </Card>
    )
}

function toDMS(degrees: number): string {
    const d = Math.floor(degrees)
    const m = Math.floor((degrees - d) * 60)
    const s = Math.round(((degrees - d) * 60 - m) * 60)

    // Handle 60 seconds
    if (s === 60) {
        return `${d}°${m + 1}'00"`
    }

    return `${d}°${m}'${s}"`
}
