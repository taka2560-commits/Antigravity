import { useState, useRef, useEffect } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { db } from "../db"
import { parseParameterFile, calculateCorrection, type AltitudeCorrectionParameter } from "../utils/altitudeCorrection"
import { decimalToDms } from "../utils/coordinates"
import { Upload, Save, FileText, CheckCircle2, Trash2, Loader2 } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card"
import { Button } from "./ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Checkbox } from "./ui/checkbox"

export function AltitudeCorrection() {
    const points = useLiveQuery(() => db.points.toArray())

    const [fileParams, setFileParams] = useState<AltitudeCorrectionParameter | null>(null)
    const [fileName, setFileName] = useState<string>("")
    const [errorMsg, setErrorMsg] = useState<string>("")
    const [isLoading, setIsLoading] = useState<boolean>(true) // DBからの初期読込中を示すフラグ

    // 変換対象ポイント
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
    const [previewResults, setPreviewResults] = useState<any[] | null>(null)

    const fileInputRef = useRef<HTMLInputElement>(null)

    // 初回マウント時に IndexedDB からパラメータを復元
    useEffect(() => {
        const loadFromDb = async () => {
            try {
                const setting = await db.settings.get("altitude_param_data");
                if (setting && setting.value) {
                    const data = JSON.parse(setting.value);
                    if (data.fileName && data.content) {
                        setFileName(data.fileName);
                        const params = parseParameterFile(data.content);
                        if (params) {
                            setFileParams(params);
                        }
                    }
                }
            } catch (e) {
                console.error("Failed to load parameters from DB:", e);
            } finally {
                setIsLoading(false);
            }
        };
        loadFromDb();
    }, []);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsLoading(true)
        const name = file.name
        setFileName(name)
        const reader = new FileReader()
        reader.onload = async (event) => {
            const content = event.target?.result as string
            const params = parseParameterFile(content)
            if (params) {
                setFileParams(params)
                setErrorMsg("")
                setPreviewResults(null)

                // DBに保存
                try {
                    await db.settings.put({
                        key: "altitude_param_data",
                        value: JSON.stringify({ fileName: name, content }),
                        updatedAt: Date.now()
                    })
                } catch (e) {
                    console.error("Failed to save parameter to DB", e)
                }
            } else {
                setFileParams(null)
                setErrorMsg("パラメータファイルの読み込みに失敗しました。正しいフォーマットのファイルを選択してください。")
            }
            setIsLoading(false)
        }
        reader.onerror = () => {
            setErrorMsg("ファイルの読み込み中にエラーが発生しました。")
            setIsLoading(false)
        }
        // 国土地理院のファイルはShift-JISエンコーディングが多い
        reader.readAsText(file, "Shift_JIS")
    }

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

    const handleCalculate = () => {
        if (!points || !fileParams) return

        const targets = points.filter(p => selectedIds.has(p.id!))
        const results = targets.map(p => {
            if (p.lat !== undefined && p.lon !== undefined) {
                const correction = calculateCorrection(fileParams, p.lat, p.lon)
                if (correction !== null) {
                    const oldZ = p.z || 0
                    const newZ = oldZ + correction
                    return { ...p, oldZ, correction, newZ, status: 'success' }
                } else {
                    return { ...p, oldZ: p.z || 0, status: 'error', msg: 'パラメータの範囲外です' }
                }
            } else {
                return { ...p, oldZ: p.z || 0, status: 'error', msg: '緯度経度が設定されていません' }
            }
        })
        setPreviewResults(results)
    }

    const handleSave = async () => {
        if (!previewResults) return

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
            alert(`${count}件の標高データを更新しました。`)
            setPreviewResults(null)
            setSelectedIds(new Set())
        } catch (e) {
            console.error("更新エラー:", e)
            alert("データの更新に失敗しました。")
        }
    }

    // キャッシュ削除
    const handleClearCache = async () => {
        setFileParams(null)
        setFileName("")
        setPreviewResults(null)
        if (fileInputRef.current) {
            fileInputRef.current.value = ""
        }
        try {
            await db.settings.delete("altitude_param_data")
        } catch (e) {
            console.error(e)
        }
    }

    if (isLoading && !fileParams) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-muted-foreground h-full">
                <Loader2 className="h-8 w-8 animate-spin mb-4 outline-none" />
                <p>パラメータファイルを読み込んでいます...</p>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[calc(100vh-[Headerの高さ+TabListの高さ])]">
            <Card className="border-0 shadow-none sm:border sm:shadow-sm h-[500px] flex flex-col">
                <CardHeader className="px-0 pt-0 pb-4 sm:px-6 sm:pt-6">
                    <CardTitle className="text-lg font-bold">標高改定対応 (標高補正計算)</CardTitle>
                    <CardDescription>
                        国土地理院が提供する標高改定パラメータファイル（.par 等）を読み込み、登録されている点の標高（Z座標）を補正・更新します。
                    </CardDescription>
                </CardHeader>

                <CardContent className="px-0 sm:px-6 space-y-6 flex-1 flex flex-col">
                    {/* 1. パラメータファイル入力 */}
                    <div className="border rounded-lg p-6 bg-muted/10">
                        <h3 className="text-sm font-semibold mb-3 flex items-center">
                            <FileText className="h-4 w-4 mr-2 text-primary" />
                            1. パラメータファイルの読み込み
                        </h3>

                        <div className="flex flex-col md:flex-row items-center gap-4">
                            <Button
                                variant="outline"
                                className="w-full md:w-auto"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Upload className="h-4 w-4 mr-2" />
                                ファイルを選択
                            </Button>
                            <input
                                type="file"
                                accept=".par,.isg,.txt"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="hidden"
                            />
                        </div>
                        {fileName ? (
                            <div className="flex justify-between items-center text-sm font-medium border rounded px-3 py-2 bg-muted/20 mt-4">
                                <div className="flex items-center break-all text-primary truncate">
                                    <FileText className="h-4 w-4 mr-2 flex-shrink-0" />
                                    <span className="truncate">{fileName}</span>
                                </div>
                                <Button variant="ghost" size="sm" onClick={handleClearCache} className="h-7 px-2 text-destructive hover:text-destructive shrink-0 ml-2" title="ファイルをクリア">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ) : (
                            <span className="text-sm text-muted-foreground mt-4 block">ファイルが選択されていません</span>
                        )}
                        {errorMsg && (
                            <p className="text-sm text-destructive mt-3">{errorMsg}</p>
                        )}
                        {fileParams && (
                            <div className="bg-green-950/20 border border-green-500/30 rounded p-3 mt-4 text-xs space-y-1 text-green-700 dark:text-green-400 font-mono">
                                <p className="font-semibold mb-1 flex items-center">
                                    <CheckCircle2 className="h-4 w-4 mr-1" />
                                    パラメータ情報
                                </p>
                                <p>読み込み完了 (対象メッシュ数: {fileParams.map?.size?.toLocaleString()} 件)</p>
                                <p className="text-[10px] text-muted-foreground mt-1">※水準点標高補正パラメータ (.par) を正しく認識しました。次回以降は自動で読み込まれます。</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* 2. 変換対象選択とプレビュー */}
            <div className="border rounded-lg bg-card shadow-sm flex flex-col h-[500px]">
                <div className="p-4 border-b flex justify-between items-center bg-muted/30">
                    <h3 className="text-sm font-semibold">2. 補正対象の選択と計算</h3>
                    <div className="space-x-2">
                        <Button size="sm" onClick={handleCalculate} disabled={!fileParams || selectedIds.size === 0}>
                            計算を実行
                        </Button>
                    </div>
                </div>

                {!previewResults ? (
                    // 選択モード
                    <div className="flex-1 p-4 flex flex-col overflow-hidden">
                        <div className="flex justify-between items-center mb-2 text-xs">
                            <div className="space-x-2">
                                <Button variant="link" size="sm" onClick={selectAll} className="h-auto p-0">全選択</Button>
                                <span className="text-muted-foreground">|</span>
                                <Button variant="link" size="sm" onClick={deselectAll} className="h-auto p-0">全解除</Button>
                            </div>
                            <span className="font-mono bg-muted px-2 py-0.5 rounded">{selectedIds.size} 点選択中</span>
                        </div>
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
                ) : (
                    // プレビューモード
                    <div className="flex-1 p-4 flex flex-col overflow-hidden">
                        <div className="flex justify-between items-center mb-2">
                            <div className="text-sm font-bold text-primary">計算結果プレビュー</div>
                            <Button variant="ghost" size="sm" onClick={() => setPreviewResults(null)} className="h-8 text-xs">
                                選択に戻る
                            </Button>
                        </div>

                        <div className="flex-1 overflow-auto border rounded-md mb-4 bg-background">
                            <Table className="text-xs sm:text-sm">
                                <TableHeader className="bg-muted/50 sticky top-0">
                                    <TableRow>
                                        <TableHead className="w-[120px]">点名</TableHead>
                                        <TableHead className="text-right">改定前 標高</TableHead>
                                        <TableHead className="text-right text-amber-600">補正量</TableHead>
                                        <TableHead className="text-right text-primary font-bold">改定後 標高</TableHead>
                                        <TableHead>ステータス</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {previewResults.map((r) => (
                                        <TableRow key={r.id}>
                                            <TableCell className="font-medium truncate max-w-[120px]" title={r.name}>{r.name}</TableCell>
                                            <TableCell className="text-right font-mono">{r.oldZ.toFixed(4)}</TableCell>
                                            {r.status === 'success' ? (
                                                <>
                                                    <TableCell className="text-right font-mono text-amber-600">{r.correction > 0 ? '+' : ''}{r.correction.toFixed(4)}</TableCell>
                                                    <TableCell className="text-right font-mono text-primary font-bold">{r.newZ.toFixed(4)}</TableCell>
                                                    <TableCell><span className="text-green-600 font-bold text-[10px] bg-green-500/10 px-1.5 py-0.5 rounded">成功</span></TableCell>
                                                </>
                                            ) : (
                                                <>
                                                    <TableCell className="text-right text-muted-foreground">-</TableCell>
                                                    <TableCell className="text-right text-muted-foreground">-</TableCell>
                                                    <TableCell><span className="text-destructive text-[10px] bg-destructive/10 px-1.5 py-0.5 rounded">{r.msg}</span></TableCell>
                                                </>
                                            )}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        <div className="pt-2 border-t flex justify-end">
                            <Button onClick={handleSave} className="w-full sm:w-auto">
                                <Save className="h-4 w-4 mr-2" />
                                標高を更新して保存
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
