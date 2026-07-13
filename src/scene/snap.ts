/**
 * snap — pure nearest-port lookup for cable drag (no Babylon imports).
 * The snap decision is GEOMETRY only; whether the snap shows green or red is
 * ConnectionGraph.canConnect's verdict — never re-implemented here.
 */
import type { PortRef } from '../engine/types'
import type { P3 } from './cablePath'

export const SNAP_RADIUS = 0.15 // meters

export interface PortPoint extends P3 {
  ref: PortRef
}

const sameRef = (a: PortRef, b: PortRef) => a.instance === b.instance && a.port === b.port

export function nearestPort(
  ports: readonly PortPoint[],
  p: P3,
  exclude?: PortRef,
  radius = SNAP_RADIUS,
): PortPoint | null {
  let best: PortPoint | null = null
  let bestD = radius
  for (const port of ports) {
    if (exclude && sameRef(port.ref, exclude)) continue
    const d = Math.hypot(port.x - p.x, port.y - p.y, port.z - p.z)
    if (d <= bestD) {
      bestD = d
      best = port
    }
  }
  return best
}
