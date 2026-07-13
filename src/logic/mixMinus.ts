/**
 * logic/mixMinus — R7 (N-1 echo), pure.
 * STUB: implemented with Level C1 (needs the routing-matrix bus model).
 */
import type { RigSnapshot, ViolationDraft } from '../engine/types'

export const mixMinusCheck = (_snapshot: RigSnapshot): ViolationDraft[] => {
  // TODO(C1): R7 — a codec's send bus must not contain that codec's own return.
  return []
}
