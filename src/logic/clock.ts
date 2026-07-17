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
 * SAMPLE RATE (ADR-0007, enum controls): two digital devices on the same
 * link, each carrying a `sample-rate` enum control set to a DIFFERENT value,
 * is an R8 violation — one runs 44.1 kHz, the other 48 kHz, so the link ticks.
 * Double-master detection stays P2 (needs a clock distribution hub — a single
 * wordclock-in can only take one cable, so two masters aren't expressible yet).
 */
import type { RigSnapshot, ViolationDraft } from '../engine/types'
import { isConnected, portOf, sameRef } from './helpers'

const DIGITAL_AUDIO = new Set(['aes3', 'spdif', 'madi', 'aoip', 'usb-audio'])
const SAMPLE_RATE = 'sample-rate'

export const clockCheck = (snapshot: RigSnapshot): ViolationDraft[] => {
  const violations: ViolationDraft[] = []
  const rateOf = (instanceId: string): string | undefined => {
    const v = snapshot.instances.find((i) => i.instanceId === instanceId)?.controls[SAMPLE_RATE]
    return typeof v === 'string' ? v : undefined
  }

  // Sample-rate mismatch across a digital link (R2 guarantees both ends share a signal id).
  for (const { a, b } of snapshot.connections) {
    const port = portOf(snapshot, a)
    if (!port || !DIGITAL_AUDIO.has(port.signal)) continue
    const ra = rateOf(a.instance)
    const rb = rateOf(b.instance)
    if (ra !== undefined && rb !== undefined && ra !== rb)
      violations.push({ ruleId: 'R8', subjects: [a, b] })
  }

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
