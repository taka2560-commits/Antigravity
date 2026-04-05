/**
 * 幅杭計算（オフセット計算）ユーティリティ
 * 測量座標系（X: 北, Y: 東）におけるベクトル計算を行います。
 */

export interface OffsetInput {
    pointName: string;
    station: number;      // 始点Aからの前進距離 (m)
    offsetParams: {
        width: number;    // 中心線からの離れ (m)
        direction: 'right' | 'left'; // 左右の方向（始点から終点に向かって）
    }[];
}

export interface OffsetCalculationResult {
    name: string;
    station: number;     // 前進距離
    width: number;       // 離れ（幅）
    direction: 'right' | 'left';
    x: number;
    y: number;
    z?: number;
}

/**
 * 基準線ABと複数のステーション・オフセット情報から、新点の座標を計算します。
 * Xが北、Yが東の測量座標系を使用します。
 * 
 * @param ax 始点AのX
 * @param ay 始点AのY
 * @param bx 終点BのX
 * @param by 終点BのY
 * @param inputs オフセット入力の配列
 */
export function calculateOffsets(
    ax: number, ay: number, 
    bx: number, by: number, 
    inputs: OffsetInput[]
): OffsetCalculationResult[] {
    const dx = bx - ax;
    const dy = by - ay;
    const L = Math.sqrt(dx * dx + dy * dy);

    if (L === 0) {
        throw new Error("始点と終点が同じ座標です");
    }

    // 進行方向の単位ベクトル（A -> B）
    const ux = dx / L;
    const uy = dy / L;

    // 測量座標系（X:北, Y:東）において
    // 進行方向 (ux, uy) に対して
    // 右方向の単位ベクトル: (-uy, ux)
    // 左方向の単位ベクトル: (uy, -ux)
    const rx = -uy;
    const ry = ux;
    
    const lx = uy;
    const ly = -ux;

    const results: OffsetCalculationResult[] = [];

    for (const input of inputs) {
        // 中心線上の点 (station分前進)
        const cx = ax + input.station * ux;
        const cy = ay + input.station * uy;

        for (const offset of input.offsetParams) {
            // 幅分の移動
            let px = cx;
            let py = cy;

            if (offset.direction === 'right') {
                px += offset.width * rx;
                py += offset.width * ry;
            } else {
                px += offset.width * lx;
                py += offset.width * ly;
            }

            // 点名自動生成フォーマット 例: "No.1-R3.0"
            const dirStr = offset.direction === 'right' ? 'R' : 'L';
            const defaultName = offset.width === 0 
                ? `${input.pointName}` 
                : `${input.pointName}-${dirStr}${offset.width}`;

            results.push({
                name: defaultName,
                station: input.station,
                width: offset.width,
                direction: offset.direction,
                x: px,
                y: py,
                // Zは今回は空欄（undefined）
            });
        }
    }

    return results;
}
