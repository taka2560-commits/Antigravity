

export interface HelmertParams {
    a: number // s * cos(theta)
    b: number // s * sin(theta)
    c: number // Translation X
    d: number // Translation Y
    scale: number
    rotation: number // Degrees
}

export interface ControlPointPair {
    source: { x: number; y: number; id?: string }
    target: { x: number; y: number; id?: string }
    use: boolean
}

/**
 * Calculate 2D Helmert transformation parameters using Least Squares Estimation.
 * Formula:
 * X' = aX - bY + c
 * Y' = bX + aY + d
 * 
 * Residual equations:
 * vX = aX - bY + c - X'
 * vY = bX + aY + d - Y'
 */
export function calculateHelmertParams(pairs: ControlPointPair[], fixedScale: boolean = false): HelmertParams | null {
    const activePairs = pairs.filter(p => p.use)
    const n = activePairs.length

    if (n < 2) return null // Need at least 2 points

    // Summations
    let sumX = 0, sumY = 0, sumX_prime = 0, sumY_prime = 0
    let sum_dx2_dy2 = 0 // Sum(dx^2 + dy^2)
    let sum_dx_dxp_dy_dyp = 0 // Sum(dx*dx' + dy*dy') (A)
    let sum_dx_dyp_minus_dy_dxp = 0 // Sum(dx*dy' - dy*dx') (B)

    for (const p of activePairs) {
        const x = p.source.x
        const y = p.source.y
        const x_prime = p.target.x
        const y_prime = p.target.y

        sumX += x
        sumY += y
        sumX_prime += x_prime
        sumY_prime += y_prime
    }

    // Gravity centers (centroids)
    const meanX = sumX / n
    const meanY = sumY / n
    const meanX_prime = sumX_prime / n
    const meanY_prime = sumY_prime / n

    for (const p of activePairs) {
        const dx = p.source.x - meanX
        const dy = p.source.y - meanY
        const dx_prime = p.target.x - meanX_prime
        const dy_prime = p.target.y - meanY_prime

        sum_dx2_dy2 += dx * dx + dy * dy
        sum_dx_dxp_dy_dyp += dx * dx_prime + dy * dy_prime
        sum_dx_dyp_minus_dy_dxp += dx * dy_prime - dy * dx_prime
    }

    if (Math.abs(sum_dx2_dy2) < 1e-10) return null // Points are too close/identical

    let a: number, b: number

    if (fixedScale) {
        // Fixed Scale = 1.0
        // Maximize c*A + s*B subject to c^2+s^2=1
        // theta = atan2(B, A)
        const theta = Math.atan2(sum_dx_dyp_minus_dy_dxp, sum_dx_dxp_dy_dyp)
        a = Math.cos(theta)
        b = Math.sin(theta)
    } else {
        // Free Scale
        // a = Sum(dx*dx' + dy*dy') / Sum(dx^2 + dy^2)
        // b = Sum(dx*dy' - dy*dx') / Sum(dx^2 + dy^2)
        a = sum_dx_dxp_dy_dyp / sum_dx2_dy2
        b = sum_dx_dyp_minus_dy_dxp / sum_dx2_dy2
    }

    // Calculate translation c, d
    // c = meanX' - a*meanX + b*meanY
    // d = meanY' - b*meanX - a*meanY
    const c = meanX_prime - a * meanX + b * meanY
    const d = meanY_prime - b * meanX - a * meanY

    // Extract Scale and Rotation
    const scale = Math.sqrt(a * a + b * b)
    let rotRad = Math.atan2(b, a)
    const rotDeg = rotRad * (180 / Math.PI)

    return {
        a,
        b,
        c,
        d,
        scale,
        rotation: rotDeg
    }
}

export function transformPoint(x: number, y: number, params: HelmertParams): { x: number, y: number } {
    // X' = aX - bY + c
    // Y' = bX + aY + d
    return {
        x: params.a * x - params.b * y + params.c,
        y: params.b * x + params.a * y + params.d
    }
}
