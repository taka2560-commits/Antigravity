/**
 * 標高改定パラメータ (.par または .isg) の解析と
 * 緯度経度に基づく補間計算（バイリニア補間）を行うユーティリティ。
 */

// パラメータデータの内部表現
export interface AltitudeCorrectionParameter {
    map: Map<number, number>; // メッシュコード(数値化) をキーにした補正値
}

/**
 * .par ファイルのパース関数
 * 国土地理院のPatchJGD(H)用 3次メッシュパラメータを想定
 */
export function parseParameterFile(content: string): AltitudeCorrectionParameter | null {
    try {
        const lines = content.split('\n');
        const map = new Map<number, number>();
        let valid = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.length < 18) continue;

            // 先頭8文字が数値化できればメッシュコードと判定
            const codeStr = line.slice(0, 8);
            if (!/^\d{8}$/.test(codeStr)) continue;

            const code = parseInt(codeStr, 10);
            const dhStr = line.slice(8, 18).trim();
            const dh = parseFloat(dhStr);

            if (!isNaN(dh)) {
                map.set(code, dh);
                valid = true;
            }
        }

        // 有効なデータが1つも無ければパース失敗
        if (!valid) return null;

        return { map };
    } catch (e) {
        console.error("Failed to parse parameter file:", e);
        return null;
    }
}

/**
 * 緯度・経度のインデックス値から、該当する3次メッシュのコード数値を算出する
 */
function getMeshCodeAsNumber(latIndex: number, lonIndex: number): number {
    const p = Math.floor(latIndex / 80);
    const remLat = latIndex % 80;
    const q = Math.floor(remLat / 10);
    const r = remLat % 10;

    const u = Math.floor(lonIndex / 80);
    const remLon = lonIndex % 80;
    const v = Math.floor(remLon / 10);
    const w = remLon % 10;

    return p * 1000000 + u * 10000 + q * 1000 + v * 100 + r * 10 + w;
}

/**
 * 補正値のバイリニア補間計算
 * @param params パラメータデータ
 * @param lat 緯度 (10進数)
 * @param lon 経度 (10進数)
 */
export function calculateCorrection(params: AltitudeCorrectionParameter, lat: number, lon: number): number | null {
    // 緯度の3次メッシュグリッド間隔は 30秒 = 1/120度 -> lat * 120 がインデックス
    // 経度の3次メッシュグリッド間隔は 45秒 = 1/80度  -> (lon - 100) * 80 がインデックス
    const latIndexExact = lat * 120;
    const lonIndexExact = (lon - 100) * 80;

    const lat0 = Math.floor(latIndexExact); // 南側のインデックス
    const lon0 = Math.floor(lonIndexExact); // 西側のインデックス
    const lat1 = lat0 + 1; // 北側のインデックス
    const lon1 = lon0 + 1; // 東側のインデックス

    // 0からの端数 (0.0 〜 1.0)
    const dLatFraction = latIndexExact - lat0;
    const dLonFraction = lonIndexExact - lon0;

    // 四隅のメッシュコードを計算
    const code00 = getMeshCodeAsNumber(lat0, lon0);
    const code01 = getMeshCodeAsNumber(lat0, lon1);
    const code10 = getMeshCodeAsNumber(lat1, lon0);
    const code11 = getMeshCodeAsNumber(lat1, lon1);

    // 四隅の補正値を取得
    const v00 = params.map.get(code00); // (南, 西)
    const v01 = params.map.get(code01); // (南, 東)
    const v10 = params.map.get(code10); // (北, 西)
    const v11 = params.map.get(code11); // (北, 東)

    // 全ての頂点が存在しない場合は、範囲外（対象エリア外）とする
    if (v00 === undefined && v01 === undefined && v10 === undefined && v11 === undefined) {
        return null; // 範囲外
    }

    // 欠損している角は 0.0 として扱い、補間を継続する（海沿いなどの端数対応）
    const val00 = v00 ?? 0;
    const val01 = v01 ?? 0;
    const val10 = v10 ?? 0;
    const val11 = v11 ?? 0;

    // 1. 経度 (X方向) での補間 (南側エッジと北側エッジ)
    const valSouth = val00 * (1 - dLonFraction) + val01 * dLonFraction;
    const valNorth = val10 * (1 - dLonFraction) + val11 * dLonFraction;

    // 2. 緯度 (Y方向) での補間
    const value = valSouth * (1 - dLatFraction) + valNorth * dLatFraction;

    return value;
}
