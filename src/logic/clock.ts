/**
 * logic/clock — R8 (word clock master/slave), pure (ADR-0001).
 *
 * v1 scope: the UNLOCKED SLAVE. A device that carries digital audio on any
 * connection and has an isClockSlave word-clock input must have that input
 * CONNECTED (locked to the house master). Devices without a wordclock-in
 * (computers, codecs) are treated as self-/host-clocked.
 *
 * Digital audio signal ids are domain knowledge of this module (they are
 * stable catalog ids); wordclock itself doesn't count — the clock line is
 * the cure, not the disease.
 *
 * P2 (needs the enum-control extension from ADR-0001): sample-rate mismatch
 * and double-master detection across a clock distribution network.
 */
import type { RigSnapshot, ViolationDraft } from '../engine/types'
import { isConnected, sameRef } from './helpers'

const DIGITAL_AUDIO = new Set(['aes3', 'spdif', 'madi', 'aoip', 'usb-audio'])

export const clockCheck = (snapshot: RigSnapshot): ViolationDraft[] => {
  const violations: ViolationDraft[] = []
  for (const inst of snapshot.instances) {
    const slaveIns = inst.ports.filter((p) => p.flags.includes('isClockSlave'))
    if (slaveIns.length === 0) continue

    const carriesDigitalAudio = inst.ports.some(
      (p) =>
        DIGITAL_AUDIO.has(p.signal) &&
        snapshot.connections.some(
          (c) =>
            sameRef(c.a, { instance: inst.instanceId, port: p.portId }) ||
            sameRef(c.b, { instance: inst.instanceId, port: p.portId }),
        ),
    )
    if (!carriesDigitalAudio) continue

    const locked = slaveIns.some((p) =>
      isConnected(snapshot, { instance: inst.instanceId, port: p.portId }),
    )
    if (!locked)
      violations.push({
        ruleId: 'R8',
        subjects: [{ instance: inst.instanceId, port: slaveIns[0].portId }],
      })
  }
  return violations
}
