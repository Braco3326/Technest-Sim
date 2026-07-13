/**
 * logic/clock — R8 (wordclock master/slave, sample rate), pure.
 * STUB: implemented with Level D1 full (needs sample-rate enum controls).
 */
import type { RigSnapshot, ViolationDraft } from '../engine/types'

export const clockCheck = (_snapshot: RigSnapshot): ViolationDraft[] => {
  // TODO(D1): R8 — exactly one clock master upstream of every digital link.
  return []
}
