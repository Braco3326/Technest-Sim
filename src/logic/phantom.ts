/**
 * logic/phantom — R4, pure function (ADR-0001).
 * A mic port flagged requiresPhantom that is CONNECTED must land on a port
 * whose EFFECTIVE providesPhantom flag is on (the snapshot already strips
 * flags gated by an off control — e.g. ISA One "+48V" toggle).
 * An unconnected condenser is not a violation — the requiredChain handles
 * connectivity; R4 teaches "wired but silent".
 */
import type { RigSnapshot, ViolationDraft, PortRef } from '../engine/types'

export const phantomCheck = (snapshot: RigSnapshot): ViolationDraft[] => {
  const port = (ref: PortRef) =>
    snapshot.instances
      .find((i) => i.instanceId === ref.instance)
      ?.ports.find((p) => p.portId === ref.port)

  const violations: ViolationDraft[] = []
  for (const { a, b } of snapshot.connections) {
    for (const [mic, dest] of [
      [a, b],
      [b, a],
    ] as const) {
      const micPort = port(mic)
      if (!micPort?.flags.includes('requiresPhantom')) continue
      const destPort = port(dest)
      if (!destPort?.flags.includes('providesPhantom')) violations.push({ ruleId: 'R4', subjects: [mic, dest] })
    }
  }
  return violations
}
