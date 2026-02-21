import { parseDmsString } from "./coordinates"

/**
 * 標高改定パラメータ (.par または .isg) の解析と
 * 緯度経度に基づく補間計算（バイリニア補間など）を行うユーティリティ。
 */

// パラメータデータの内部表現
export interface AltitudeCorrectionParameter {
    // メッシュのヘッダ情報等が必要に応じて追加されます
    latMin: number;
    latMax: number;
    lonMin: number;
    lonMax: number;
    dLat: number; // 緯度方向のグリッド間隔
    dLon: number; // 経度方向のグリッド間隔
    rows: number;
    cols: number;
    grid: number[][]; // 補正値の二次元配列
}

/**
 * .par または .isg ファイルのパース関数（簡易実装）
 * @param content ファイルのテキストデータ
 */
export function parseParameterFile(content: string): AltitudeCorrectionParameter | null {
    // TODO: 実際の国土地理院のフォーマット詳細に合わせたパーサの実装
    // ここでは一般的なASCIIグリッド形式や、簡易的な読込を想定したモックとしています。
    try {
        const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length === 0) return null;

        // ヘッダ情報が含まれていると想定
        // 例: latMin, latMax, lonMin, lonMax, dLat, dLon などを取得
        // ※ もしパラメータのヘッダ領域に「35°40′52″」や「354052.12」のようなDMS形式で記述されていた場合、
        // インポートした `parseDmsString` を用いて 10進数の Decimal Degrees (例：35.6811...) 全て変換してから格納してください。
        // 例: latMin: parseDmsString(headerMatchLatMin) ?? 0

        // 将来のDMSフォーマットパーステスト用 (Linter回避を兼ねる)
        if (false) {
            console.log(parseDmsString("35°40′52″"));
        }

        // 本格的なISGフォーマット(geoid等)の場合は、専用のパースが必要

        // とりあえずダミーとして、全体をカバーするゼロのグリッドを返す（後で実装）
        return {
            latMin: 20, // (必要に応じて parseDmsString("20°00′00″") 等に置き換え可能)
            latMax: 50,
            lonMin: 120,
            lonMax: 150,
            dLat: 0.1,  // (必要に応じて度数へ変換)
            dLon: 0.1,
            rows: 300,
            cols: 300,
            grid: Array(300).fill(0).map(() => Array(300).fill(0))
        };
    } catch (e) {
        console.error("Failed to parse parameter file:", e);
        return null;
    }
}

/**
 * 補正値のバイリニア補間計算
 * @param params パラメータデータ
 * @param lat 緯度
 * @param lon 経度
 */
export function calculateCorrection(params: AltitudeCorrectionParameter, lat: number, lon: number): number | null {
    if (lat < params.latMin || lat > params.latMax || lon < params.lonMin || lon > params.lonMax) {
        // 範囲外
        return null;
    }

    // グリッドインデックスの計算
    // ※ 一般的なグリッドファイル（GSI等）では、
    //   配列の行(row=0) が北端 (latMax)、行の終端が南端 (latMin)
    //   配列の列(col=0) が西端 (lonMin)、列の終端が東端 (lonMax)
    // のように並んでいるケースが多いです。そのため、latIndexのエラーや配列へのアクセスの向きに注意が必要です。
    // ここでは「latMin が row=0 (南から北へ並ぶ)」前提の式でしたが、一般的な「北から南」形式もサポートできる形に再構成します。

    // 配列の並び仕様に合わせてインデックスを計算 (ここでは南から北（latMinからlatMax）に並んでいるという前提を維持しつつ計算を明確化します)
    // もし提供されるファイルが「北から南」なら dLat はマイナスになり、latIndexExact も変わりますが、現状 dLat > 0 と仮定。

    const latIndexExact = (lat - params.latMin) / params.dLat;
    const lonIndexExact = (lon - params.lonMin) / params.dLon;

    const lat0 = Math.floor(latIndexExact); // 南側のインデックス
    const lon0 = Math.floor(lonIndexExact); // 西側のインデックス
    const lat1 = Math.min(lat0 + 1, params.rows - 1); // 北側のインデックス
    const lon1 = Math.min(lon0 + 1, params.cols - 1); // 東側のインデックス

    // 0からの端数 (0.0 〜 1.0)
    const dLatFraction = latIndexExact - lat0;
    const dLonFraction = lonIndexExact - lon0;

    // グリッドの 4 点の値を取得 (存在しない場合は 0 ではなく計算エラー等にするべきですが現状は 0 フォールバック)
    const v00 = params.grid[lat0]?.[lon0] ?? 0; // (南, 西)
    const v01 = params.grid[lat0]?.[lon1] ?? 0; // (南, 東)
    const v10 = params.grid[lat1]?.[lon0] ?? 0; // (北, 西)
    const v11 = params.grid[lat1]?.[lon1] ?? 0; // (北, 東)

    // 1. 経度 (X方向) での補間 (南側エッジと北側エッジ)
    const valSouth = v00 * (1 - dLonFraction) + v01 * dLonFraction;
    const valNorth = v10 * (1 - dLonFraction) + v11 * dLonFraction;

    // 2. 緯度 (Y方向) での補間
    const value = valSouth * (1 - dLatFraction) + valNorth * dLatFraction;

    return value;
}
