/**
 * logic/gpio — R5 (on-air tally) + R6 (monitor-mute-on-open-mic), pure.
 * STUB: implemented with Level B1 (feature track B). Requires fader-state
 * controls on the console (ADR-0001 toggle shape, to be added to catalog).
 */
import type { RigSnapshot, ViolationDraft } from '../engine/types'

export const gpioCheck = (_snapshot: RigSnapshot): ViolationDraft[] => {
  // TODO(B1): R5 — open mic fader must drive isOnAirTally chain to the light.
  // TODO(B1): R6 — open mic + live isMonitorOut in the same room = feedback.
  return []
}
