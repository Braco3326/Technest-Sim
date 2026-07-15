/** logic/mixMinus — R7 N-1 echo on the REAL C1 level. THE exam question. */
import { describe, expect, it } from 'vitest'
import { ConnectionGraph } from '../../src/engine/ConnectionGraph'
import { mixMinusCheck } from '../../src/logic/mixMinus'
import { makeLevel, makeRegistry, wireChain } from '../helpers'

const registry = makeRegistry()
const c1 = makeLevel('c1')
const rules = (g: ConnectionGraph) => mixMinusCheck(g.snapshot()).map((v) => v.ruleId)

// c1 chain indexes: 0 re50→scoopy, 1 scoopy↔scoop5 (ip), 2 return→iq in-line-1, 3 iq out-n1→scoop5 send

describe('R7 — mix-minus / N-1 echo', () => {
  it('triggers: full duplex wired + codec return routed into its own send bus (default mistake)', () => {
    const g = new ConnectionGraph(registry, c1.devices)
    wireChain(g, c1)
    const events = mixMinusCheck(g.snapshot())
    expect(events.map((v) => v.ruleId)).toContain('R7')
    // the echo loop is on the console's N-1 bus toward the studio codec
    expect(events[0].subjects[0]).toEqual({ instance: 'iq-1', port: 'out-n1' })
    expect(events[0].subjects[1].instance).toBe('scoop5-1')
  })

  it("doesn't trigger: return unrouted from the N-1 bus (a true mix-minus)", () => {
    const g = new ConnectionGraph(registry, c1.devices)
    wireChain(g, c1)
    g.setControl('iq-1', 'route-in-line-1-to-out-n1', false)
    expect(rules(g)).toEqual([])
  })

  it("doesn't trigger: routing ON but the loop is open (send not wired)", () => {
    const g = new ConnectionGraph(registry, c1.devices)
    wireChain(g, c1, [3]) // no N-1 send to the codec
    expect(rules(g)).toEqual([])
  })

  it("doesn't trigger: routing ON but no return from the codec", () => {
    const g = new ConnectionGraph(registry, c1.devices)
    wireChain(g, c1, [2]) // no return into in-line-1
    expect(rules(g)).toEqual([])
  })

  it('routing the mic (not the return) to N-1 is the CORRECT setup — no echo', () => {
    const g = new ConnectionGraph(registry, c1.devices)
    wireChain(g, c1)
    g.setControl('iq-1', 'route-in-line-1-to-out-n1', false)
    g.setControl('iq-1', 'route-in-mic-1-to-out-n1', true)
    expect(rules(g)).toEqual([])
  })
})
