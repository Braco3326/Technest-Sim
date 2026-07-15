/** logic/gpio — R5 tally + R6 monitor-mute on the REAL B1 level. */
import { describe, expect, it } from 'vitest'
import { ConnectionGraph } from '../../src/engine/ConnectionGraph'
import { gpioCheck } from '../../src/logic/gpio'
import { makeLevel, makeRegistry, wireChain } from '../helpers'

const registry = makeRegistry()
const b1 = makeLevel('b1')
const rules = (g: ConnectionGraph) => gpioCheck(g.snapshot()).map((v) => v.ruleId)

// b1 chain indexes: 0 mic→iq, 1 mon-l, 2 mon-r, 3 gpio→litt, 4 playout

describe('R5 — on-air tally', () => {
  it('triggers: fader open (default), tally not wired', () => {
    const g = new ConnectionGraph(registry, b1.devices)
    expect(rules(g)).toContain('R5')
  })

  it("doesn't trigger: fader closed", () => {
    const g = new ConnectionGraph(registry, b1.devices)
    g.setControl('iq-1', 'fader-in-mic-1', false)
    expect(rules(g)).toEqual([])
  })

  it("doesn't trigger: tally chain wired to the light", () => {
    const g = new ConnectionGraph(registry, b1.devices)
    wireChain(g, b1, [0, 1, 2, 4]) // only the gpio connection
    expect(rules(g)).not.toContain('R5')
  })
})

describe('R6 — monitor mute on open mic (feedback)', () => {
  it('triggers: live mic + live monitors + mute off', () => {
    const g = new ConnectionGraph(registry, b1.devices)
    wireChain(g, b1)
    const events = gpioCheck(g.snapshot())
    expect(events.map((v) => v.ruleId)).toContain('R6')
    const r6 = events.find((v) => v.ruleId === 'R6')!
    expect(r6.subjects[0]).toEqual({ instance: 'iq-1', port: 'in-mic-1' })
  })

  it("doesn't trigger: monitor-mute engaged", () => {
    const g = new ConnectionGraph(registry, b1.devices)
    wireChain(g, b1)
    g.setControl('iq-1', 'monitor-mute', true)
    expect(rules(g)).toEqual([])
  })

  it("doesn't trigger: fader closed kills both R5 and R6", () => {
    const g = new ConnectionGraph(registry, b1.devices)
    wireChain(g, b1)
    g.setControl('iq-1', 'fader-in-mic-1', false)
    expect(rules(g)).toEqual([])
  })

  it("doesn't trigger: monitors wired but no mic connected (nothing to feed back)", () => {
    const g = new ConnectionGraph(registry, b1.devices)
    wireChain(g, b1, [0]) // everything except the mic
    expect(rules(g)).not.toContain('R6')
  })
})
