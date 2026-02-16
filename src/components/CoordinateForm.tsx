import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { db, type Point } from "../db"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "./ui/dialog"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Button } from "./ui/button"

const schema = z.object({
    name: z.string().min(1, "点名は必須です"),
    x: z.coerce.number(),
    y: z.coerce.number(),
    z: z.coerce.number(),
    note: z.string(),
})

type FormData = z.infer<typeof schema>

interface CoordinateFormProps {
    isOpen: boolean
    onClose: () => void
    initialData?: Point | null
}

export function CoordinateForm({ isOpen, onClose, initialData }: CoordinateFormProps) {
    const {
        register,
        handleSubmit,
        reset,
        setValue,
        getValues,
        formState: { errors },
    } = useForm<FormData>({
        // @ts-expect-error - zodResolver type mismatch with coerce
        resolver: zodResolver(schema),
        defaultValues: {
            name: "",
            x: 0,
            y: 0,
            z: 0,
            note: "",
        },
    })

    useEffect(() => {
        if (isOpen && initialData) {
            reset({
                name: initialData.name,
                x: initialData.x,
                y: initialData.y,
                z: initialData.z,
                note: initialData.note || "",
            })
        } else if (isOpen) {
            reset({
                name: "",
                x: 0,
                y: 0,
                z: 0,
                note: "",
            })
        }
    }, [isOpen, initialData, reset])

    const onSubmit = async (data: FormData) => {
        try {
            if (initialData) {
                await db.points.update(initialData.id, data)
            } else {
                await db.points.add(data)
            }
            onClose()
        } catch (error) {
            console.error("Failed to save point:", error)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{initialData ? "座標編集" : "新規座標登録"}</DialogTitle>
                    <DialogDescription>
                        座標データを入力してください。
                    </DialogDescription>
                </DialogHeader>
                {/* @ts-expect-error - type mismatch in submit handler */}
                <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                            点名
                        </Label>
                        <div className="col-span-3">
                            <Input
                                id="name"
                                className={errors.name ? "border-destructive" : ""}
                                {...register("name")}
                            />
                            {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
                        </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="x" className="text-right">
                            X座標
                        </Label>
                        <div className="col-span-3">
                            <div className="flex gap-2">
                                <Input
                                    id="x"
                                    type="number"
                                    step="0.001"
                                    className={errors.x ? "border-destructive" : ""}
                                    {...register("x")}
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="shrink-0 w-10 font-bold"
                                    onClick={() => {
                                        const current = getValues("x");
                                        setValue("x", -current);
                                    }}
                                    tabIndex={-1}
                                >
                                    -
                                </Button>
                            </div>
                            {errors.x && <p className="mt-1 text-xs text-destructive">{errors.x.message}</p>}
                        </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="y" className="text-right">
                            Y座標
                        </Label>
                        <div className="col-span-3">
                            <div className="flex gap-2">
                                <Input
                                    id="y"
                                    type="number"
                                    step="0.001"
                                    className={errors.y ? "border-destructive" : ""}
                                    {...register("y")}
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="shrink-0 w-10 font-bold"
                                    onClick={() => {
                                        const current = getValues("y");
                                        setValue("y", -current);
                                    }}
                                    tabIndex={-1}
                                >
                                    -
                                </Button>
                            </div>
                            {errors.y && <p className="mt-1 text-xs text-destructive">{errors.y.message}</p>}
                        </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="z" className="text-right">
                            Z座標
                        </Label>
                        <div className="col-span-3">
                            <div className="flex gap-2">
                                <Input
                                    id="z"
                                    type="number"
                                    step="0.001"
                                    className={errors.z ? "border-destructive" : ""}
                                    {...register("z")}
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="shrink-0 w-10 font-bold"
                                    onClick={() => {
                                        const current = getValues("z");
                                        setValue("z", -current);
                                    }}
                                    tabIndex={-1}
                                >
                                    -
                                </Button>
                            </div>
                            {errors.z && <p className="mt-1 text-xs text-destructive">{errors.z.message}</p>}
                        </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="note" className="text-right">
                            備考
                        </Label>
                        <div className="col-span-3">
                            <Input
                                id="note"
                                {...register("note")}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>
                            キャンセル
                        </Button>
                        <Button type="submit">保存</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
