import { type Point } from "../db"

// SIMA format details:
// A00,Note
// A01,PointID,X,Y,Z,Note...
// We mainly care about A01 records for coordinates.

export function parseSima(content: string): Omit<Point, "id">[] {
    const lines = content.split(/\r?\n/)
    const points: Omit<Point, "id">[] = []

    for (const line of lines) {
        // Remove quotes and trim
        const cleanLine = line.replace(/"/g, "").trim()
        if (!cleanLine) continue

        const parts = cleanLine.split(",").map(p => p.trim())
        if (parts.length < 4) continue // A01,Name,X,Y needs at least 4 parts

        const code = parts[0]
        if (code === "A01") {
            // Heuristic search for coordinates:
            // Look for the first pair of consecutive numbers.
            // Valid assumption for SIMA: Name comes before Coordinates.
            // 0: A01
            // 1: ?
            // 2: ?
            // ...

            let found = false
            for (let i = 2; i < parts.length - 1; i++) {
                // Check if i and i+1 are numbers
                // Use a stricter number check (not empty string)
                if (parts[i] !== "" && parts[i + 1] !== "" && !isNaN(parseFloat(parts[i])) && !isNaN(parseFloat(parts[i + 1]))) {
                    const name = parts[i - 1] // Preceding field is Name
                    const val1 = parseFloat(parts[i])
                    const val2 = parseFloat(parts[i + 1])

                    // Z is optional, usually follows Y
                    let z = 0
                    if (parts[i + 2] && parts[i + 2] !== "" && !isNaN(parseFloat(parts[i + 2]))) {
                        z = parseFloat(parts[i + 2])
                    }

                    if (name) {
                        points.push({
                            name: name,
                            x: val1,
                            y: val2,
                            z: z,
                            note: ""
                        })
                        found = true
                    }
                    break // Stop after finding the first valid coordinate set
                }
            }

            if (!found) {
                // Fallback or log if strictly needed, but might be just a header line with A01? unlikely
                console.warn("Skipping A01 line (no coords found):", line)
            }
        }
    }

    return points
}

export function generateSima(points: Point[]): string {
    let content = "A00,Unspecified\n"
    for (const p of points) {
        // A01,Name,X,Y,Z
        content += `A01,${p.name},${p.x.toFixed(3)},${p.y.toFixed(3)},${p.z.toFixed(3)}\n`
    }
    // Z00: End of file
    content += "Z00\n"
    return content
}
