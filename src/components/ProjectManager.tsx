import { useState } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { db } from "../db"
import { useActiveProject } from "../hooks/useActiveProject"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Folder, Plus, Trash2, Check, Building2 } from "lucide-react"

export function ProjectManager() {
    const { activeProjectId, setActiveProjectId } = useActiveProject()
    const projects = useLiveQuery(() => db.projects.orderBy("updatedAt").reverse().toArray())
    const [isOpen, setIsOpen] = useState(false)
    const [newProjectName, setNewProjectName] = useState("")
    const [newProjectNote, setNewProjectNote] = useState("")
    const [isCreating, setIsCreating] = useState(false)

    const currentProject = projects?.find(p => p.id === activeProjectId)

    const handleCreateProject = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newProjectName.trim()) return

        const now = Date.now()
        const id = await db.projects.add({
            name: newProjectName.trim(),
            note: newProjectNote.trim(),
            createdAt: now,
            updatedAt: now
        })

        setActiveProjectId(Number(id))
        setNewProjectName("")
        setNewProjectNote("")
        setIsCreating(false)
    }

    const handleDeleteProject = async (id: number, name: string, e: React.MouseEvent) => {
        e.stopPropagation()
        if (confirm(`現場「${name}」を削除しますか？\n（※この現場に属する座標データも削除されます）`)) {
            await db.transaction('rw', [db.projects, db.points, db.levelings], async () => {
                await db.projects.delete(id)
                // Delete related points and levelings
                const relatedPoints = await db.points.filter(p => p.projectId === id).toArray()
                for (const p of relatedPoints) {
                    await db.points.delete(p.id)
                }
                const relatedLevelings = await db.levelings.filter(l => l.projectId === id).toArray()
                for (const l of relatedLevelings) {
                    if (l.id) await db.levelings.delete(l.id)
                }
            })

            if (activeProjectId === id) {
                setActiveProjectId("all")
            }
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 bg-background/80 hover:bg-background text-xs">
                    <Building2 className="h-3.5 w-3.5 text-amber-600" />
                    <span className="truncate max-w-[120px] font-semibold">
                        {activeProjectId === "all" ? "全現場" : (currentProject?.name || "現場指定なし")}
                    </span>
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-base">
                        <Building2 className="h-5 w-5 text-amber-600" />
                        現場（プロジェクト）管理
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Active Project Switcher */}
                    <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground">選択中の現場</Label>
                        <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto pr-1">
                            <button
                                onClick={() => setActiveProjectId("all")}
                                className={`flex items-center justify-between p-2.5 rounded-md border text-xs text-left transition-colors ${
                                    activeProjectId === "all"
                                        ? "border-primary bg-primary/10 font-bold text-primary"
                                        : "border-border hover:bg-muted/50"
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <Folder className="h-4 w-4 text-muted-foreground" />
                                    <span>すべての座標を表示（全現場）</span>
                                </div>
                                {activeProjectId === "all" && <Check className="h-4 w-4 text-primary" />}
                            </button>

                            {projects?.map((p) => (
                                <div
                                    key={p.id}
                                    onClick={() => setActiveProjectId(p.id!)}
                                    className={`flex items-center justify-between p-2.5 rounded-md border text-xs cursor-pointer transition-colors ${
                                        activeProjectId === p.id
                                            ? "border-primary bg-primary/10 font-bold text-primary"
                                            : "border-border hover:bg-muted/50"
                                    }`}
                                >
                                    <div className="flex flex-col min-w-0 pr-2">
                                        <div className="flex items-center gap-2 truncate">
                                            <Folder className="h-4 w-4 text-amber-600 shrink-0" />
                                            <span className="truncate">{p.name}</span>
                                        </div>
                                        {p.note && <span className="text-[10px] text-muted-foreground truncate pl-6">{p.note}</span>}
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        {activeProjectId === p.id && <Check className="h-4 w-4 text-primary mr-1" />}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                            onClick={(e) => handleDeleteProject(p.id!, p.name, e)}
                                            title="現場を削除"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* New Project Form */}
                    {!isCreating ? (
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full h-9 gap-1 text-xs"
                            onClick={() => setIsCreating(true)}
                        >
                            <Plus className="h-4 w-4" />
                            新しい現場を追加
                        </Button>
                    ) : (
                        <form onSubmit={handleCreateProject} className="space-y-3 p-3 border rounded-md bg-muted/20">
                            <div className="text-xs font-semibold">新規現場の登録</div>
                            <div className="space-y-1.5">
                                <Label className="text-[11px]">現場名（プロジェクト名）*</Label>
                                <Input
                                    type="text"
                                    placeholder="例: ○○様邸 新築工事現場"
                                    value={newProjectName}
                                    onChange={(e) => setNewProjectName(e.target.value)}
                                    required
                                    className="h-8 text-xs"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[11px]">備考・メモ</Label>
                                <Input
                                    type="text"
                                    placeholder="例: 東京都千代田区"
                                    value={newProjectNote}
                                    onChange={(e) => setNewProjectNote(e.target.value)}
                                    className="h-8 text-xs"
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-1">
                                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setIsCreating(false)}>
                                    キャンセル
                                </Button>
                                <Button type="submit" size="sm" className="h-7 text-xs">
                                    作成
                                </Button>
                            </div>
                        </form>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
