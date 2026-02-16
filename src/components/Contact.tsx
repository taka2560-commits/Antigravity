import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Textarea } from "./ui/textarea"
import { Mail } from "lucide-react"

export function Contact() {
    const [name, setName] = useState("")
    const [subject, setSubject] = useState("")
    const [body, setBody] = useState("")

    const handleSend = () => {
        const mailtoLink = `mailto:technoline@dream.ocn.ne.jp?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(`名前: ${name}\n\n${body}`)}`
        window.location.href = mailtoLink
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>会社案内</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                    <div>
                        <h3 className="font-bold text-base mb-1">有限会社テクノライン</h3>
                        <div className="grid grid-cols-[100px_1fr] gap-2">
                            <div className="font-medium text-muted-foreground">設立</div>
                            <div>平成16年2月13日</div>

                            <div className="font-medium text-muted-foreground">代表取締役</div>
                            <div>石丸竜介</div>

                            <div className="font-medium text-muted-foreground">営業所</div>
                            <div>
                                〒660-0802<br />
                                兵庫県尼崎市長洲中通2丁目4-23<br />
                                TEL：06-6110-5077
                            </div>

                            <div className="font-medium text-muted-foreground">事業内容</div>
                            <div className="space-y-1">
                                <p>3Dレーザースキャナーによる三次元計測・三次元測量器による構造物測定</p>
                                <p>鉄骨建方建ち測定・精度管理・敷地境界測量・CADデータ作成・土木、外構測量・丁張り・遣り方・杭芯出し・基準墨出し・地盤レベル計測・山留め計測・変状計測等</p>
                                <p>計測関連業務</p>
                            </div>

                            <div className="font-medium text-muted-foreground mt-2">アプリ作成者</div>
                            <div className="mt-2">吉本</div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>お問い合わせ</CardTitle>
                    <CardDescription>
                        以下のフォームに入力し送信ボタンを押すと、お使いのメールソフトが起動します。
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="bg-muted/50 p-3 rounded-md text-sm space-y-1">
                        <div className="flex justify-between gap-4">
                            <span className="font-semibold whitespace-nowrap">アプリ名</span>
                            <span className="text-right">測量座標管理アプリ (Survey Coordinate Manager)</span>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span className="font-semibold whitespace-nowrap">作成日</span>
                            <span className="text-right">2026年2月13日</span>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="name">お名前</Label>
                        <Input
                            id="name"
                            placeholder="お名前を入力"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="subject">件名</Label>
                        <Input
                            id="subject"
                            placeholder="お問い合わせの件名"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="body">お問い合わせ内容</Label>
                        <Textarea
                            id="body"
                            placeholder="お問い合わせ内容を入力してください"
                            className="min-h-[150px]"
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                        />
                    </div>
                    <Button onClick={handleSend} className="w-full sm:w-auto">
                        <Mail className="mr-2 h-4 w-4" />
                        メールソフトを起動して送信
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
