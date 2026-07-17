/**
 * logic/gpio — R5 (on-air tally) + R6 (monitor-mute-on-open-mic), pure (ADR-0001).
 *
 * State conventions (equipment-catalog.md, validator-enforced):
 *   control `fader-<portId>` true  = the channel fed by that isMicInput port is OPEN
 *   control `monitor-mute`  true  = the device's isMonitorOut monitors are cut
 *
 * R5: an open mic channel requires a complete tally chain — some isOnAirTally
 *     port of the console connected to an isOnAirTally port elsewhere (the
 *     light). Fires with or without a mic plugged: real tally follows the
 *     fader, and the toast doubles as "wire the tally" guidance.
 * R6: feedback (larsen) — open fader + a LIVE mic actually connected + any
 *     connected isMonitorOut + monitor-mute off. v1 assumes a single room.
 */
import type { RigSnapshot, ViolationDraft } from '../engine/types'
import { isConnected, otherEnds, portOf } from './helpers'

export const gpioCheck = (snapshot: RigSnapshot): ViolationDraft[] => {
  const violations: ViolationDraft[] = []
  for (const inst of snapshot.instances) {
    for (const [controlId, on] of Object.entries(inst.controls)) {
      // fader-* are toggles; guard the value type (enum controls also live here).
      if (!controlId.startsWith('fader-') || typeof on !== 'boolean' || !on) continue
      const micPortId = controlId.slice('fader-'.length)
      const micPort = inst.ports.find((p) => p.portId === micPortId)
      if (!micPort?.flags.includes('isMicInput')) continue
      const micRef = { instance: inst.instanceId, port: micPortId }

      // R5 — tally chain complete?
      const tallyWired = inst.ports
        .filter((p) => p.flags.includes('isOnAirTally'))
        .some((p) =>
          otherEnds(snapshot, { instance: inst.instanceId, port: p.portId }).some((end) =>
            portOf(snapshot, end)?.flags.includes('isOnAirTally'),
          ),
        )
      if (!tallyWired) violations.push({ ruleId: 'R5', subjects: [micRef] })

      // R6 — live mic + live monitors + mute off = feedback
      const liveMonitor = inst.ports.find(
        (p) =>
          p.flags.includes('isMonitorOut') &&
          isConnected(snapshot, { instance: inst.instanceId, port: p.portId }),
      )
      if (liveMonitor && isConnected(snapshot, micRef) && inst.controls['monitor-mute'] !== true)
        violations.push({
          ruleId: 'R6',
          subjects: [micRef, { instance: inst.instanceId, port: liveMonitor.portId }],
        })
    }
  }
  return violations
}
