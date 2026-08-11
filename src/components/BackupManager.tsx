import { useState, useRef } from "react"
import { db } from "../db"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog"
import { Button } from "./ui/button"
import { Label } from "./ui/label"
import { Download, Upload, ShieldCheck, FileJson } from "lucide-react"

export function BackupManager() {
    const [isOpen, setIsOpen] = useState(false)
    const [isExporting, setIsExporting] = useState(false)
    const [isImporting, setIsImporting] = useState(false)
    const [importMode, setImportMode] = useState<"merge" | "replace">("merge")
    const [statusMsg, setStatusMsg] = useState<string>("")
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Export All Data
    const handleExportBackup = async () => {
        setIsExporting(true)
        setStatusMsg("データを抽出中...")

        try {
            const projects = await db.projects.toArray()
            const points = await db.points.toArray()
            const levelings = await db.levelings.toArray()
            const settings = await db.settings.toArray()
            const historyStr = localStorage.getItem("survey-app-calc-history") || "[]"
            const history = JSON.parse(historyStr)

            const backupData = {
                version: 1,
                app: "Antigravity",
                exportedAt: new Date().toISOString(),
                projects,
                points,
                levelings,
                settings,
                history
            }

            const jsonStr = JSON.stringify(backupData, null, 2)
            const blob = new Blob([jsonStr], { type: "application/json" })
            const url = URL.createObjectURL(blob)

            const dateStr = new Date().toISOString().split("T")[0]
            const a = document.createElement("a")
            a.href = url
            a.download = `Antigravity_Backup_${dateStr}.json`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)

            setStatusMsg("バックアップファイルをダウンロードしました。")
        } catch (e) {
            console.error("Backup export failed", e)
            setStatusMsg("バックアップの作成に失敗しました。")
        } finally {
            setIsExporting(false)
        }
    }

    // Import Backup File
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsImporting(true)
        setStatusMsg("ファイルを読み込み中...")

        try {
            const text = await file.text()
            const data = JSON.parse(text)

            if (!data.app || data.app !== "Antigravity" || !Array.isArray(data.points)) {
                alert("有効な Antigravity バックアップファイルではありません。")
                setStatusMsg("無効なファイル形式です。")
                setIsImporting(false)
                return
            }

            if (importMode === "replace") {
                if (!confirm("既存の全データを削除して、バックアップデータに完全置き換えしますか？\n（※この操作は取り消せません）")) {
                    setIsImporting(false)
                    return
                }
            }

            await db.transaction('rw', [db.projects, db.points, db.levelings, db.settings], async () => {
                if (importMode === "replace") {
                    await db.projects.clear()
                    await db.points.clear()
                    await db.levelings.clear()
                    await db.settings.clear()
                }

                if (Array.isArray(data.projects) && data.projects.length > 0) {
                    for (const p of data.projects) {
                        const item = { ...p }
                        delete item.id
                        await db.projects.add(item)
                    }
                }

                if (Array.isArray(data.points) && data.points.length > 0) {
                    for (const pt of data.points) {
                        const item = { ...pt }
                        delete item.id
                        await db.points.add(item)
                    }
                }

                if (Array.isArray(data.levelings) && data.levelings.length > 0) {
                    for (const l of data.levelings) {
                        const item = { ...l }
                        delete item.id
                        await db.levelings.add(item)
                    }
                }

                if (Array.isArray(data.settings) && data.settings.length > 0) {
                    for (const s of data.settings) {
                        await db.settings.put(s)
                    }
                }
            })

            if (Array.isArray(data.history) && data.history.length > 0) {
                if (importMode === "replace") {
                    localStorage.setItem("survey-app-calc-history", JSON.stringify(data.history))
                } else {
                    const currentHistoryStr = localStorage.getItem("survey-app-calc-history") || "[]"
                    const currentHistory = JSON.parse(currentHistoryStr)
                    const merged = [...data.history, ...currentHistory].slice(0, 50)
                    localStorage.setItem("survey-app-calc-history", JSON.stringify(merged))
                }
            }

            setStatusMsg(`復元が完了しました！（${data.points.length}件の座標）`)
            alert("データの復元が完了しました！")
            window.location.reload()
        } catch (e) {
            console.error("Backup import failed", e)
            setStatusMsg("ファイルの解析・復元に失敗しました。")
            alert("ファイルの読み込み中にエラーが発生しました。")
        } finally {
            setIsImporting(false)
            if (fileInputRef.current) fileInputRef.current.value = ""
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    <span>バックアップ/復元</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-base">
                        <FileJson className="h-5 w-5 text-emerald-600" />
                        全データの一括バックアップ・復元
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-2">
                    {/* Export Section */}
                    <div className="space-y-2 border-b pb-4">
                        <Label className="text-xs font-semibold">1. 一括バックアップ（保存）</Label>
                        <p className="text-xs text-muted-foreground">
                            登録済みの全現場、座標データ、野帳データ、計算履歴を一括でJSONファイルに書き出します。
                        </p>
                        <Button
                            onClick={handleExportBackup}
                            disabled={isExporting}
                            size="sm"
                            className="w-full gap-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            <Download className="h-4 w-4" />
                            {isExporting ? "エクスポート中..." : "全バックアップJSONをダウンロード"}
                        </Button>
                    </div>

                    {/* Import Section */}
                    <div className="space-y-3">
                        <Label className="text-xs font-semibold">2. 一括復元（リストア）</Label>
                        <p className="text-xs text-muted-foreground">
                            保存したバックアップJSONファイルを選択して、端末にデータを復元します。
                        </p>

                        <div className="space-y-2 bg-muted/30 p-3 rounded-md border text-xs">
                            <div className="font-semibold text-muted-foreground mb-1">復元モードの選択:</div>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="importMode"
                                    checked={importMode === "merge"}
                                    onChange={() => setImportMode("merge")}
                                />
                                <span>既存データに追加・統合（統合モード）</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-amber-700">
                                <input
                                    type="radio"
                                    name="importMode"
                                    checked={importMode === "replace"}
                                    onChange={() => setImportMode("replace")}
                                />
                                <span>既存データを全消去して完全置き換え（上書きモード）</span>
                            </label>
                        </div>

                        <input
                            type="file"
                            ref={fileInputRef}
                            accept=".json"
                            onChange={handleFileSelect}
                            className="hidden"
                        />

                        <Button
                            variant="outline"
                            size="sm"
                            disabled={isImporting}
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full gap-2 text-xs"
                        >
                            <Upload className="h-4 w-4" />
                            {isImporting ? "復元中..." : "バックアップJSONファイルを選択して復元"}
                        </Button>
                    </div>

                    {/* Status Message */}
                    {statusMsg && (
                        <div className="text-xs text-center p-2 rounded bg-muted font-medium text-foreground">
                            {statusMsg}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
