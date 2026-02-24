/**
 * 日本の代表的な標高系（水準面）の定義
 * 
 * T.P.（東京湾平均海面）を基準（0）として、各標高系のオフセットを定義しています。
 * オフセット値は「その標高系の基準面がT.P.よりどれだけ低いか」を示します。
 * 
 * 例: O.P. のオフセット = -1.3000
 *   → O.P.の基準面はT.P.より1.3m低い
 *   → O.P. 4.3m = T.P. 3.0m （T.P. = O.P. + offset = 4.3 + (-1.3) = 3.0）
 * 
 * 変換式:
 *   T.P.値 = 元の値 + 元の標高系のオフセット
 *   変換先の値 = T.P.値 - 変換先のオフセット
 */

export interface ElevationSystem {
    /** 表示名 */
    name: string;
    /** 略称 */
    abbr: string;
    /** T.P.を0としたときのオフセット（m） */
    offsetFromTP: number;
    /** 説明 */
    description: string;
    /** 使用される地域 */
    region: string;
}

export const ELEVATION_SYSTEMS: ElevationSystem[] = [
    {
        name: "東京湾平均海面",
        abbr: "T.P.",
        offsetFromTP: 0,
        description: "日本の標高の全国的基準（東京湾中等潮位）",
        region: "全国"
    },
    {
        name: "大阪湾最低潮位",
        abbr: "O.P.",
        offsetFromTP: -1.3000,
        description: "大阪港天保山の最低潮位を基準",
        region: "大阪湾・淀川流域"
    },
    {
        name: "荒川工事基準面",
        abbr: "A.P.",
        offsetFromTP: -1.1344,
        description: "霊岸島量水標の0mを基準",
        region: "東京都（荒川・隅田川流域）"
    },
    {
        name: "江戸川工事基準面",
        abbr: "Y.P.",
        offsetFromTP: -0.8402,
        description: "堀江水位観測所の水位標0mを基準",
        region: "千葉県（江戸川・利根川流域）"
    },
    {
        name: "利根川工事基準面",
        abbr: "Y.P.(利根川)",
        offsetFromTP: -0.8402,
        description: "Y.P.と同一基準面（利根川流域で使用）",
        region: "茨城県・千葉県（利根川流域）"
    },
    {
        name: "北上川工事基準面",
        abbr: "K.P.",
        offsetFromTP: -0.0873,
        description: "北上川の工事基準面",
        region: "岩手県・宮城県（北上川流域）"
    },
];

/**
 * 標高系間の変換を行う
 * @param value 変換元の値（m）
 * @param fromSystem 変換元の標高系
 * @param toSystem 変換先の標高系
 * @returns 変換後の値（m）
 */
export function convertElevation(
    value: number,
    fromSystem: ElevationSystem,
    toSystem: ElevationSystem
): number {
    // まずT.P.に変換し、そこから目的の標高系に変換
    const tpValue = value + fromSystem.offsetFromTP;
    return tpValue - toSystem.offsetFromTP;
}

/**
 * 変換に使用されるオフセット差を取得する
 * @param fromSystem 変換元の標高系
 * @param toSystem 変換先の標高系
 * @returns オフセット差（m）
 */
export function getConversionOffset(
    fromSystem: ElevationSystem,
    toSystem: ElevationSystem
): number {
    return fromSystem.offsetFromTP - toSystem.offsetFromTP;
}
