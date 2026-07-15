/** logic/clock — R8 unlocked slave on the REAL D1 level. */
import { describe, expect, it } from 'vitest'
import { ConnectionGraph } from '../../src/engine/ConnectionGraph'
import { clockCheck } from '../../src/logic/clock'
import { makeLevel, makeRegistry, wireChain } from '../helpers'

const registry = makeRegistry()
const d1 = makeLevel('d1')
const rules = (g: ConnectionGraph) => clockCheck(g.snapshot()).map((v) => v.ruleId)

// d1 chain indexes: 0 u87→isa, 1 hdx↔hdio (digilink), 2 hdio→loom, 3-4 loom→m905,
// 5-6 m905→gen, 7 clock→hdio wordclock-in

describe('R8 — word clock master/slave', () => {
  it('triggers: digital audio flowing (DigiLink) but the HD I/O slave input is unlocked', () => {
    const g = new ConnectionGraph(registry, d1.devices)
    wireChain(g, d1, [7]) // everything except the word clock line
    const events = clockCheck(g.snapshot())
    expect(events.map((v) => v.ruleId)).toContain('R8')
    expect(events[0].subjects[0]).toEqual({ instance: 'hdio-1', port: 'wordclock-in' })
  })

  it("doesn't trigger: slaved to the OCX HD house clock", () => {
    const g = new ConnectionGraph(registry, d1.devices)
    wireChain(g, d1)
    expect(rules(g)).toEqual([])
  })

  it("doesn't trigger: no digital audio connection at all (idle rig)", () => {
    const g = new ConnectionGraph(registry, d1.devices)
    expect(rules(g)).toEqual([])
  })

  it("doesn't trigger: analog-only wiring never needs a clock", () => {
    const g = new ConnectionGraph(registry, d1.devices)
    wireChain(g, d1, [1, 7]) // no digilink, no clock — analog paths only
    expect(rules(g)).toEqual([])
  })
})
