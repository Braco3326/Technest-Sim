/**
 * snap — the world-space port anchor type shared by the scene layer.
 * (The nearest-port drag snapping died with the drag flow — Focus & Patch
 * picks ports by direct click, ADR-0008.)
 */
import type { PortRef } from '../engine/types'
import type { P3 } from './cablePath'

export interface PortPoint extends P3 {
  ref: PortRef
}
