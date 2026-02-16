import proj4 from 'proj4'

// Define JGD2011 Plane Rectangular Coordinate System Zones 1-19
// Definitions from: https://spatialreference.org/ or similar public sources for EPSG:6669-6687
const definitions = [
    // Zone 1 (EPSG:6669) - Nagasaki, Kagoshima (parts)
    "+proj=tmerc +lat_0=33 +lon_0=129.5 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs",
    // Zone 2 (EPSG:6670) - Fukuoka, Saga, Kumamoto, Oita, Miyazaki, Kagoshima (parts)
    "+proj=tmerc +lat_0=33 +lon_0=131 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs",
    // Zone 3 (EPSG:6671) - Yamaguchi, Shimane, Hiroshima
    "+proj=tmerc +lat_0=36 +lon_0=132.1666666666667 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs",
    // Zone 4 (EPSG:6672) - Kagawa, Ehime, Tokushima, Kochi
    "+proj=tmerc +lat_0=33 +lon_0=133.5 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs",
    // Zone 5 (EPSG:6673) - Hyogo, Tottori, Okayama
    "+proj=tmerc +lat_0=36 +lon_0=134.3333333333333 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs",
    // Zone 6 (EPSG:6674) - Kyoto, Osaka, Fukui, Shiga, Mie, Nara, Wakayama
    "+proj=tmerc +lat_0=36 +lon_0=136 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs",
    // Zone 7 (EPSG:6675) - Ishikawa, Toyama, Gifu, Aichi
    "+proj=tmerc +lat_0=36 +lon_0=137.1666666666667 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs",
    // Zone 8 (EPSG:6676) - Niigata, Nagano, Yamanashi, Shizuoka
    "+proj=tmerc +lat_0=36 +lon_0=138.5 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs",
    // Zone 9 (EPSG:6677) - Tokyo, Fukushima, Tochigi, Ibaraki, Saitama, Chiba, Gunma, Kanagawa
    "+proj=tmerc +lat_0=36 +lon_0=139.8333333333333 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs",
    // Zone 10 (EPSG:6678) - Aomori, Akita, Yamagata, Iwate, Miyagi
    "+proj=tmerc +lat_0=40 +lon_0=140.8333333333333 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs",
    // Zone 11 (EPSG:6679) - Hokkaido (Oshima, Hiyama, Shiribeshi, Iburi)
    "+proj=tmerc +lat_0=44 +lon_0=140.25 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs",
    // Zone 12 (EPSG:6680) - Hokkaido (Ishikari, Sorachi, Kamikawa, Rumoi, Soya)
    "+proj=tmerc +lat_0=44 +lon_0=142.25 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs",
    // Zone 13 (EPSG:6681) - Hokkaido (Hidaka, Tokachi, Kushiro, Nemuro, Abashiri)
    "+proj=tmerc +lat_0=44 +lon_0=144.25 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs",
    // Zone 14 (EPSG:6682) - Ogasawara Islands
    "+proj=tmerc +lat_0=27 +lon_0=142 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs",
    // Zone 15 (EPSG:6683) - Okinawa (parts)
    "+proj=tmerc +lat_0=26 +lon_0=127.5 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs",
    // Zone 16 (EPSG:6684) - Okinawa (parts)
    "+proj=tmerc +lat_0=26 +lon_0=124 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs",
    // Zone 17 (EPSG:6685) - Okinawa (Daito Islands)
    "+proj=tmerc +lat_0=26 +lon_0=131 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs",
    // Zone 18 (EPSG:6686) - Okinotorishima
    "+proj=tmerc +lat_0=20 +lon_0=136 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs",
    // Zone 19 (EPSG:6687) - Minamitorishima
    "+proj=tmerc +lat_0=26 +lon_0=154 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs"
]

// Register all zones
definitions.forEach((def, index) => {
    proj4.defs(`EPSG:${6669 + index}`, def)
})

const PREFECTURES = [
    "長崎、鹿児島", // 1
    "福岡、佐賀、熊本、大分、宮崎、鹿児島", // 2
    "山口、島根、広島", // 3
    "香川、愛媛、徳島、高知", // 4
    "兵庫、鳥取、岡山", // 5
    "京都、大阪、福井、滋賀、三重、奈良、和歌山", // 6
    "石川、富山、岐阜、愛知", // 7
    "新潟、長野、山梨、静岡", // 8
    "東京、福島、栃木、茨城、埼玉、千葉、群馬、神奈川", // 9
    "青森、秋田、山形、岩手、宮城", // 10
    "北海道(渡島・檜山・後志・胆振)", // 11
    "北海道(石狩・空知・上川・留萌・宗谷)", // 12
    "北海道(日高・十勝・釧路・根室・網走)", // 13
    "小笠原諸島", // 14
    "沖縄本島", // 15
    "沖縄(宮古・八重山)", // 16
    "沖縄(大東諸島)", // 17
    "沖ノ鳥島", // 18
    "南鳥島" // 19
]

export const ZONES = Array.from({ length: 19 }, (_, i) => ({
    id: i + 1,
    name: `第${i + 1}系`,
    epsg: 6669 + i,
    prefectures: PREFECTURES[i]
}))

/**
 * Convert Plane Rectangular Coordinates (X, Y) to Latitude/Longitude (WGS84/GRS80)
 * Note: Plane Rectangular X is Northing (Vertical), Y is Easting (Horizontal)
 * But proj4 usually expects [x, y] as [Easting, Northing].
 * In Japanese survey: X = North, Y = East.
 * Proj4: x = East, y = North.
 * So passing to proj4: forward([Y, X]) -> [lon, lat]
 */
export function xyToLatLon(x: number, y: number, zoneNumber: number): { lat: number, lon: number } {
    if (zoneNumber < 1 || zoneNumber > 19) throw new Error("Invalid zone number")

    // Convert from Plane Rectangular (X=North, Y=East) to Lon/Lat
    // Proj4 input: [East(Y), North(X)]
    const result = proj4(`EPSG:${6669 + zoneNumber - 1}`, "EPSG:4326", [y, x])

    return {
        lon: result[0],
        lat: result[1]
    }
}

/**
 * Convert Latitude/Longitude to Plane Rectangular Coordinates (X, Y)
 */
export function latLonToXY(lat: number, lon: number, zoneNumber: number): { x: number, y: number } {
    if (zoneNumber < 1 || zoneNumber > 19) throw new Error("Invalid zone number")

    // Convert from Lon/Lat to Plane Rectangular
    // Proj4 output: [East(Y), North(X)]
    const result = proj4("EPSG:4326", `EPSG:${6669 + zoneNumber - 1}`, [lon, lat])

    return {
        y: result[0], // East
        x: result[1]  // North
    }
}

/**
 * Calculate Meridian Convergence (子午線収差角)
 * Returns value in degrees.
 * Formula (Approx): γ = Δλ * sin(φ)
 * Δλ: Longitude difference from origin (decimal degrees)
 * φ: Latitude (decimal degrees)
 */
export function calculateMeridianConvergence(lat: number, lon: number, zoneNumber: number): number {
    if (zoneNumber < 1 || zoneNumber > 19) throw new Error("Invalid zone number")

    // Parse lon_0 from proj4 definition string in `definitions` array
    // Or just use hardcoded knowledge of JGD2011 zones.
    // Let's extract from the hardcoded definition array using regex or lookup.

    // Zone origins (lon_0)
    const origins = [
        129.5, 131.0, 132.1666666666667, 133.5, 134.3333333333333,
        136.0, 137.1666666666667, 138.5, 139.8333333333333, 140.8333333333333,
        140.25, 142.25, 144.25, 142.0, 127.5,
        124.0, 131.0, 136.0, 154.0
    ]

    const originLon = origins[zoneNumber - 1]

    const phi = lat * (Math.PI / 180) // Latitude in radians
    const deltaLambda = (lon - originLon) * (Math.PI / 180) // Delta Longitude in radians

    const gammaRad = deltaLambda * Math.sin(phi)

    return gammaRad * (180 / Math.PI) // Return in degrees
}

export function decimalToDms(deg: number): string {
    const sign = deg < 0 ? "-" : ""
    const absDeg = Math.abs(deg)

    const d = Math.floor(absDeg)
    const mFloat = (absDeg - d) * 60
    const m = Math.floor(mFloat)
    const s = Math.round((mFloat - m) * 60)

    // Handle 60 seconds case
    if (s === 60) {
        return `${sign}${d}°${(m + 1).toString().padStart(2, '0')}′00″`
    }

    return `${sign}${d}°${m.toString().padStart(2, '0')}′${s.toString().padStart(2, '0')}″`
}
