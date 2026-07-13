/**
 * cablePath — pure math for cable rendering (no Babylon imports, unit-testable).
 * Catenary approximated by a parabola sag: cheap, stable, visually right.
 * CableBudget enforces the CLAUDE.md perf guard: when the global point budget
 * is exceeded, new/updated cables degrade to a STRAIGHT LINE (2 points)
 * before the render loop ever drops frames.
 */

export interface P3 {
  x: number
  y: number
  z: number
}

export const SEGMENTS_FULL = 24
export const SAG_FACTOR = 0.15
export const MIN_SAG = 0.05

/** segments+1 points from a to b with parabolic sag (t·(1−t) profile). segments=1 → straight. */
export function catenaryPoints(a: P3, b: P3, segments: number): P3[] {
  const sag = segments <= 1 ? 0 : Math.max(MIN_SAG, Math.hypot(b.x - a.x, b.z - a.z) * SAG_FACTOR)
  const pts: P3[] = []
  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    pts.push({
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t - sag * 4 * t * (1 - t),
      z: a.z + (b.z - a.z) * t,
    })
  }
  return pts
}

export class CableBudget {
  private granted = new Map<string, number>()

  constructor(private maxPoints = 1200) {}

  /** Points already granted to everyone else. */
  private othersTotal(excluding: string): number {
    let sum = 0
    for (const [id, pts] of this.granted) if (id !== excluding) sum += pts
    return sum
  }

  /** Ask segments for a cable; returns SEGMENTS if it fits the budget, else 1 (straight line). */
  grant(cableId: string, desired = SEGMENTS_FULL): number {
    const wanted = desired + 1
    const segments = this.othersTotal(cableId) + wanted <= this.maxPoints ? desired : 1
    this.granted.set(cableId, segments + 1)
    return segments
  }

  release(cableId: string): void {
    this.granted.delete(cableId)
  }
}
