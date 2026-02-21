export interface GeoidApiResult {
    OutputData: {
        geoidHeight: string;
        latitude: string;
        longitude: string;
    };
    ReturnFlag: string;
}

/**
 * 国土地理院のジオイド高計算APIを呼び出してジオイド高を取得します。
 * @param lat 緯度 (10進数)
 * @param lon 経度 (10進数)
 * @returns ジオイド高(m) または null(エラー時)
 */
export async function fetchGeoidHeight(lat: number, lon: number): Promise<number | null> {
    try {
        const url = `https://vldb.gsi.go.jp/sokuchi/surveycalc/geoid/calcgh/cgi/geoidcalc.pl?latitude=${lat}&longitude=${lon}&outputType=json`;
        const response = await fetch(url);

        if (!response.ok) {
            console.error("API response error:", response.status);
            return null;
        }

        const data = await response.json() as GeoidApiResult;

        // ReturnFlag が 1 の場合のみ成功
        if (data.ReturnFlag === "1" && data.OutputData && data.OutputData.geoidHeight) {
            const geoidHeight = parseFloat(data.OutputData.geoidHeight);
            if (!isNaN(geoidHeight)) {
                return geoidHeight;
            }
        } else {
            console.error("API returned error or invalid data:", data);
        }
        return null;
    } catch (error) {
        console.error("Failed to fetch geoid height:", error);
        return null;
    }
}
