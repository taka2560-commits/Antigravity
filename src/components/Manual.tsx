import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { ScrollArea } from "./ui/scroll-area"

export function Manual() {
    return (
        <Card className="h-[calc(100vh-120px)] md:h-[calc(100vh-140px)] flex flex-col">
            <CardHeader className="flex-none">
                <CardTitle>操作マニュアル & 更新履歴</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-full px-6 pb-6">
                    <div className="space-y-8 text-sm text-foreground/90 leading-relaxed max-w-3xl mx-auto">

                        <section className="space-y-3">
                            <h3 className="text-xl font-bold border-b pb-2 flex items-center">
                                <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded mr-2">New</span>
                                更新履歴 (Changelog)
                            </h3>
                            <div className="space-y-4">
                                <div className="border-l-2 border-primary pl-4 ml-1">
                                    <h4 className="font-bold flex items-center gap-2">
                                        v1.9.0 <span className="text-xs font-normal text-muted-foreground">2026/02/21</span>
                                    </h4>
                                    <ul className="list-disc pl-5 mt-1 space-y-1 text-xs md:text-sm">
                                        <li><strong>ジオイド高計算機能</strong>: 国土地理院のWeb APIを利用したジオイド高計算と、楕円体高⇔標高の相互変換機能を追加</li>
                                        <li><strong>UIコンポーネントの追加</strong>: 選択項目（RadioGroup）を用いて変換モードを切り替えられるよう改善</li>
                                    </ul>
                                </div>
                                <div className="border-l-2 border-muted pl-4 ml-1 opacity-80">
                                    <h4 className="font-bold flex items-center gap-2 text-muted-foreground">
                                        v1.8.0 <span className="text-xs font-normal">2026/02/21</span>
                                    </h4>
                                    <ul className="list-disc pl-5 mt-1 space-y-1 text-xs md:text-sm">
                                        <li><strong>標高改定対応</strong>: 国土地理院の標高補正パラメータファイル (.par) を用いた水準点の標高補正計算機能を追加</li>
                                        <li><strong>パラメータの自動保存</strong>: 読み込んだパラメータファイルをブラウザ内に保存し、次回起動時もすぐに利用可能に改善</li>
                                        <li><strong>DMS表示対応</strong>: 各画面での緯度・経度の表示を一般的な度分秒 (DMS) フォーマットに統一</li>
                                    </ul>
                                </div>
                                <div className="border-l-2 border-muted pl-4 ml-1 opacity-80">
                                    <h4 className="font-bold flex items-center gap-2 text-muted-foreground">
                                        v1.7.0 <span className="text-xs font-normal">2026/02/17</span>
                                    </h4>
                                    <h4 className="font-bold flex items-center gap-2">
                                        v1.7.0 <span className="text-xs font-normal">2026/02/17</span>
                                    </h4>
                                    <ul className="list-disc pl-5 mt-1 space-y-1 text-xs md:text-sm">
                                        <li><strong>エクスポート機能改善</strong>: CSV/SIMA/PDF保存時にファイル名を指定できるように対応</li>
                                        <li><strong>モバイルUI最適化</strong>: iPhone15準拠でヘッダー・ボタン・テーブル・計算画面のレイアウトを調整</li>
                                        <li><strong>地図ズームボタン</strong>: 地図・簡易プロットにズームイン/アウトボタンを追加</li>
                                        <li><strong>点登録方法の変更</strong>: 地図上の点登録は中心マーカーのタップのみに変更</li>
                                    </ul>
                                </div>
                                <div className="border-l-2 border-muted pl-4 ml-1 opacity-80">
                                    <h4 className="font-bold flex items-center gap-2 text-muted-foreground">
                                        v1.6.0 <span className="text-xs font-normal">2026/02/16</span>
                                    </h4>
                                    <ul className="list-disc pl-5 mt-1 space-y-1 text-xs md:text-sm">
                                        <li><strong>建設電卓</strong>: 勾配・三角関数・単曲線・累加計算・一般電卓を搭載した電卓機能を追加</li>
                                        <li><strong>モバイル入力改善</strong>: 座標登録時のマイナス入力ボタン、電卓の入力支援ボタンを追加</li>
                                    </ul>
                                </div>
                                <div className="border-l-2 border-muted pl-4 ml-1 opacity-80">
                                    <h4 className="font-bold flex items-center gap-2 text-muted-foreground">
                                        v1.5.0 <span className="text-xs font-normal">2026/02/15</span>
                                    </h4>
                                    <ul className="list-disc pl-5 mt-1 space-y-1 text-xs md:text-sm">
                                        <li><strong>計算履歴の復元</strong>: 過去の野帳データや計算結果から、入力値をワンクリックで復元する機能を追加</li>
                                        <li><strong>UI改善</strong>: 履歴一覧のデザイン刷新、モバイル表示時のレイアウト調整</li>
                                    </ul>
                                </div>
                                <div className="border-l-2 border-muted pl-4 ml-1 opacity-80">
                                    <h4 className="font-bold flex items-center gap-2 text-muted-foreground">
                                        v1.4.0 <span className="text-xs font-normal">2026/02/15</span>
                                    </h4>
                                    <ul className="list-disc pl-5 mt-1 space-y-1 text-xs md:text-sm">
                                        <li><strong>帳票出力 (PDF)</strong>: 座標一覧表および水準野帳のPDF出力機能を追加</li>
                                        <li><strong>フォント改善</strong>: PDF出力時の日本語フォント(Zen Kaku Gothic New)を内蔵化し、文字化けを解消</li>
                                    </ul>
                                </div>
                                <div className="border-l-2 border-muted pl-4 ml-1 opacity-60">
                                    <h4 className="font-bold text-muted-foreground">v1.3.0</h4>
                                    <ul className="list-disc pl-5 mt-1 space-y-1 text-xs md:text-sm">
                                        <li><strong>地図 (Map)</strong>: 全画面表示時のレイアウト改善（ナビゲーション非表示化）</li>
                                        <li><strong>簡易プロット</strong>: レイアウトの最適化（中央表示）、操作パネルの整理</li>
                                        <li><strong>計算機能</strong>: 計算結果の文字サイズ調整（視認性向上）</li>
                                        <li><strong>UI全般</strong>: テーマカラーの微調整、プルダウンメニューの操作性向上</li>
                                    </ul>
                                </div>
                                <div className="border-l-2 border-muted pl-4 ml-1 opacity-40">
                                    <h4 className="font-bold text-muted-foreground">v1.2.0</h4>
                                    <ul className="list-disc pl-5 mt-1 space-y-1 text-xs md:text-sm">
                                        <li><strong>地図機能の強化</strong>: 地図クリックでの点登録、住所検索、タイル地図切り替え機能を追加</li>
                                        <li><strong>水準測量 (Leveling)</strong>: 野帳入力・計算機能を追加</li>
                                        <li><strong>座標変換</strong>: 緯度経度⇔平面直角座標の一括変換機能を追加</li>
                                        <li><strong>データ管理</strong>: 座標一覧に「全データ削除」「範囲削除」機能を追加</li>
                                        <li><strong>安定性向上</strong>: データ欠損時の保護機能、簡易プロットの自動ズームを追加</li>
                                    </ul>
                                </div>
                                <div className="border-l-2 border-muted pl-4 ml-1 opacity-30">
                                    <h4 className="font-bold text-muted-foreground">v1.1.0</h4>
                                    <ul className="list-disc pl-5 mt-1 space-y-1 text-xs md:text-sm">
                                        <li><strong>ヘルマート変換</strong>: 座標変換機能の実装</li>
                                        <li><strong>真北方向角</strong>: 計算機能の追加</li>
                                        <li><strong>UI改善</strong>: テーマカラーの調整</li>
                                    </ul>
                                </div>
                            </div>
                        </section>

                        <div className="border-t my-6"></div>

                        <section className="space-y-2">
                            <h3 className="text-lg font-bold border-b pb-1 text-primary">1. 画面構成</h3>
                            <p>画面下のメニューバー（PCは上部）から機能を切り替えます。</p>
                            <ul className="list-disc pl-5 space-y-1 marker:text-primary">
                                <li><strong>一覧 (List)</strong>: 座標データの登録・編集・インポート</li>
                                <li><strong>計算 (Calc)</strong>: 各種測量計算・変換</li>
                                <li><strong>地図 (Map)</strong>: 地図上での確認・登録</li>
                                <li><strong>簡易 (Plot)</strong>: シンプルな座標展開図</li>
                            </ul>
                        </section>

                        <section className="space-y-2">
                            <h3 className="text-lg font-bold border-b pb-1 text-primary">2. 計算機能と履歴 (Calc & History)</h3>
                            <p>様々な測量計算を行い、結果をブラウザに保存・復元できます。</p>

                            <div className="space-y-3 mt-2">
                                <div>
                                    <h4 className="font-semibold text-foreground/80">計算の種類</h4>
                                    <div className="grid md:grid-cols-2 gap-3 mt-1">
                                        <div className="bg-muted/30 p-2 rounded border">
                                            <span className="font-bold text-xs block">ST計算 (逆打ち)</span>
                                            <span className="text-[10px] text-muted-foreground">2点間の距離・方向角を計算</span>
                                        </div>
                                        <div className="bg-muted/30 p-2 rounded border">
                                            <span className="font-bold text-xs block">座標変換 (Lat/Lon)</span>
                                            <span className="text-[10px] text-muted-foreground">緯度経度 ⇔ 平面直角座標(XY)</span>
                                        </div>
                                        <div className="bg-muted/30 p-2 rounded border">
                                            <span className="font-bold text-xs block">標高改定対応</span>
                                            <span className="text-[10px] text-muted-foreground">パラメータファイル(.par)を用いた標高補正</span>
                                        </div>
                                        <div className="bg-muted/30 p-2 rounded border">
                                            <span className="font-bold text-xs block">ジオイド高</span>
                                            <span className="text-[10px] text-muted-foreground">国土地理院APIを利用したジオイド高取得</span>
                                        </div>
                                        <div className="bg-muted/30 p-2 rounded border">
                                            <span className="font-bold text-xs block">水準測量 (Leveling)</span>
                                            <span className="text-[10px] text-muted-foreground">レベル野帳の入力と計算、PDF出力</span>
                                        </div>
                                        <div className="bg-muted/30 p-2 rounded border">
                                            <span className="font-bold text-xs block">ヘルマート変換</span>
                                            <span className="text-[10px] text-muted-foreground">座標系の補正・変換パラメータ算出</span>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="font-semibold text-foreground/80">便利な履歴機能</h4>
                                    <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                                        <li><strong>記録</strong>: 計算結果画面のクリップボードアイコンをクリックすると履歴に保存されます。</li>
                                        <li><strong>復元</strong>: 画面上部の時計アイコンから履歴を開き、回転矢印ボタンを押すと、<strong className="text-primary">過去の入力値をそのまま復元</strong>できます。</li>
                                        <li><strong>再利用</strong>: 「さっきの計算、条件を少し変えてやり直したい」という時に便利です。</li>
                                    </ul>
                                </div>
                            </div>
                        </section>

                        <section className="space-y-2">
                            <h3 className="text-lg font-bold border-b pb-1 text-primary">3. 座標一覧 (List)</h3>
                            <div className="space-y-3">
                                <div>
                                    <h4 className="font-semibold">データの登録・編集</h4>
                                    <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                                        <li><strong>新規登録</strong>: 「+」ボタン、または地図クリックで登録できます。</li>
                                        <li><strong>マイナス入力</strong>: モバイル等でマイナスが入力しにくい場合、各座標欄の横にある <code>[-]</code> ボタンで値を反転できます。</li>
                                        <li><strong>整理・削除</strong>: 「整理」メニューから範囲削除や全削除が可能です。誤操作防止のため確認画面が出ます。</li>
                                    </ul>
                                </div>

                                <div>
                                    <h4 className="font-semibold">インポート・エクスポート</h4>
                                    <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                                        <li><strong>CSV/SIMA読込</strong>: 既存の座標データを一括で取り込めます。</li>
                                        <li><strong>保存</strong>: CSV/SIMA/PDF形式で保存できます。保存時にファイル名を指定可能です。</li>
                                    </ul>
                                </div>
                            </div>
                        </section>

                        <section className="space-y-2">
                            <h3 className="text-lg font-bold border-b pb-1 text-primary">4. 地図・Webマップ (Map)</h3>
                            <p>地理院地図やGoogleマップ（風）のタイル上に座標を表示します。</p>
                            <ul className="list-disc pl-5 space-y-1 marker:text-primary">
                                <li><strong>点登録</strong>: 地図中心の「+」マーカーをタップして新点を登録できます。</li>
                                <li><strong>住所検索</strong>: 虫眼鏡アイコンから地名や住所で移動できます。</li>
                                <li><strong>背景切替</strong>: レイヤーアイコンから地図の種類（標準・写真・淡色など）を変更できます。</li>
                                <li><strong>ズーム</strong>: 右下のズームボタンで拡大・縮小ができます。</li>
                            </ul>
                        </section>

                        <section className="space-y-2">
                            <h3 className="text-lg font-bold border-b pb-1 text-primary">5. 建設電卓 (Construction Calc)</h3>
                            <p>現場で役立つ計算機能をまとめた電卓です。</p>
                            <div className="space-y-3 mt-2">
                                <ul className="list-disc pl-5 space-y-1 marker:text-primary">
                                    <li><strong>勾配計算</strong>: 水平距離と（比高・勾配・角度）から残りの要素を計算。</li>
                                    <li><strong>三角関数</strong>: 角度からsin, cos, tanを算出。</li>
                                    <li><strong>単曲線</strong>: カーブ要素（R, IAなど）から接線長や曲線長を計算。</li>
                                    <li><strong>累加計算</strong>: カウンターのように数値を足し引きし、履歴に残せます。</li>
                                    <li><strong>一般電卓</strong>: シンプルな四則演算電卓（履歴付き）。</li>
                                </ul>
                                <p className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                                    ※ モバイル入力用に、度分秒記号 <code>° ′ ″</code> の入力ボタンがあります。一般電卓の文字色は視認性の高い黒を採用しています。
                                </p>
                            </div>
                        </section>

                        <div className="h-10"></div>
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    )
}
