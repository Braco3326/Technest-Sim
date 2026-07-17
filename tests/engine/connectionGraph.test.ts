/**
 * ConnectionGraph — engine invariants R1/R2/R3 matrices + device state.
 * Every rule: one triggers case, one doesn't-trigger case, on REAL catalog data.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { ConnectionGraph } from '../../src/engine/ConnectionGraph'
import { makeLevel, makeRegistry } from '../helpers'

const registry = makeRegistry()
const a1 = makeLevel('a1')
const d1 = makeLevel('d1')

let graph: ConnectionGraph
beforeEach(() => {
  graph = new ConnectionGraph(registry, a1.devices)
})

describe('R3 — direction', () => {
  it("doesn't trigger: out → in", () => {
    const r = graph.connect(
      { instance: 'sm58-1', port: 'out-xlr' },
      { instance: 'rio-1', port: 'in-mic-1' },
    )
    expect(r.ok).toBe(true)
  })
  it('triggers: out → out', () => {
    const r = graph.connect(
      { instance: 'sm58-1', port: 'out-xlr' },
      { instance: 'ql1-1', port: 'out-main-l' },
    )
    expect(r).toMatchObject({ ok: false, code: 'DIRECTION_MISMATCH', ruleId: 'R3' })
  })
  it('triggers: in → in', () => {
    const r = graph.connect(
      { instance: 'rio-1', port: 'in-mic-1' },
      { instance: 'k12-1', port: 'in-line-a' },
    )
    expect(r).toMatchObject({ ok: false, code: 'DIRECTION_MISMATCH', ruleId: 'R3' })
  })
  it("doesn't trigger: bidir ↔ bidir (Dante trunk)", () => {
    const r = graph.connect(
      { instance: 'rio-1', port: 'dante-primary' },
      { instance: 'ql1-1', port: 'dante-primary' },
    )
    expect(r.ok).toBe(true)
  })
})

describe('R1 — connector mate', () => {
  it('triggers: etherCON into IEC mains inlet', () => {
    const r = graph.connect(
      { instance: 'rio-1', port: 'dante-primary' },
      { instance: 'ql1-1', port: 'power-in' },
    )
    expect(r).toMatchObject({ ok: false, code: 'CONNECTOR_MISMATCH', ruleId: 'R1' })
  })
  it("doesn't trigger: XLR male mates XLR female", () => {
    const r = graph.connect(
      { instance: 'ql1-1', port: 'out-main-l' },
      { instance: 'k12-1', port: 'in-line-a' },
    )
    expect(r.ok).toBe(true)
  })
})

describe('R2 — signal identity', () => {
  it('triggers: mic level into a line input', () => {
    const r = graph.connect(
      { instance: 'sm58-1', port: 'out-xlr' },
      { instance: 'k12-1', port: 'in-line-a' },
    )
    expect(r).toMatchObject({ ok: false, code: 'SIGNAL_MISMATCH', ruleId: 'R2' })
  })
  it("doesn't trigger: line out into line in", () => {
    const r = graph.connect(
      { instance: 'ql1-1', port: 'out-mix-1' },
      { instance: 'dbr12-1', port: 'in-line' },
    )
    expect(r.ok).toBe(true)
  })
})

describe('gameplay errors (not rules)', () => {
  it('rejects unknown instance and unknown port', () => {
    expect(
      graph.connect({ instance: 'ghost', port: 'x' }, { instance: 'rio-1', port: 'in-mic-1' }),
    ).toMatchObject({ ok: false, code: 'UNKNOWN_INSTANCE' })
    expect(
      graph.connect({ instance: 'sm58-1', port: 'nope' }, { instance: 'rio-1', port: 'in-mic-1' }),
    ).toMatchObject({ ok: false, code: 'UNKNOWN_PORT' })
  })

  it('rejects an occupied port, frees it on disconnect', () => {
    const first = graph.connect(
      { instance: 'sm58-1', port: 'out-xlr' },
      { instance: 'rio-1', port: 'in-mic-1' },
    )
    expect(first.ok).toBe(true)
    const second = graph.connect(
      { instance: 'sm57-1', port: 'out-xlr' },
      { instance: 'rio-1', port: 'in-mic-1' },
    )
    expect(second).toMatchObject({ ok: false, code: 'PORT_OCCUPIED' })
    if (first.ok && first.connectionId) {
      expect(graph.disconnect(first.connectionId)).toMatchObject({ ok: true })
    }
    expect(
      graph.connect(
        { instance: 'sm57-1', port: 'out-xlr' },
        { instance: 'rio-1', port: 'in-mic-1' },
      ).ok,
    ).toBe(true)
  })

  it('canConnect (drag dry-run) never mutates', () => {
    const probe = graph.canConnect(
      { instance: 'sm58-1', port: 'out-xlr' },
      { instance: 'rio-1', port: 'in-mic-1' },
    )
    expect(probe.ok).toBe(true)
    expect(graph.getConnections()).toHaveLength(0)
    expect(graph.connectionAt({ instance: 'rio-1', port: 'in-mic-1' })).toBeUndefined()
  })
})

describe('dynamic spawn — ADR-0004 (sandbox)', () => {
  it('addInstance spawns with catalog control defaults and full invariants', () => {
    const g = new ConnectionGraph(registry, [])
    expect(g.addInstance('u87-x', 'neumann-u87-ai')).toMatchObject({ ok: true })
    expect(g.addInstance('isa-x', 'focusrite-isa-one')).toMatchObject({ ok: true })
    expect(g.getControl('isa-x', 'phantom-48v')).toBe(false) // catalog default
    expect(
      g.connect({ instance: 'u87-x', port: 'out-xlr' }, { instance: 'isa-x', port: 'in-mic' }).ok,
    ).toBe(true)
  })

  it('rejects duplicate instance ids and unknown devices (gameplay errors, not exceptions)', () => {
    const g = new ConnectionGraph(registry, [])
    g.addInstance('x', 'shure-sm58')
    expect(g.addInstance('x', 'shure-sm57')).toMatchObject({ ok: false, code: 'DUPLICATE_INSTANCE' })
    expect(g.addInstance('y', 'no-such-device')).toMatchObject({ ok: false, code: 'UNKNOWN_DEVICE' })
  })

  it('removeInstance frees its ports and cables (ADR-0005)', () => {
    const g = new ConnectionGraph(registry, a1.devices)
    g.connect({ instance: 'sm58-1', port: 'out-xlr' }, { instance: 'rio-1', port: 'in-mic-1' })
    expect(g.removeInstance('sm58-1')).toMatchObject({ ok: true })
    expect(g.getConnections()).toHaveLength(0)
    // the rio port is free again
    expect(
      g.connect({ instance: 'sm57-1', port: 'out-xlr' }, { instance: 'rio-1', port: 'in-mic-1' }).ok,
    ).toBe(true)
    expect(g.removeInstance('ghost')).toMatchObject({ ok: false, code: 'UNKNOWN_INSTANCE' })
  })

  it('clear empties the rig', () => {
    const g = new ConnectionGraph(registry, a1.devices)
    g.connect({ instance: 'sm58-1', port: 'out-xlr' }, { instance: 'rio-1', port: 'in-mic-1' })
    g.clear()
    expect(g.snapshot().instances).toHaveLength(0)
    expect(g.getConnections()).toHaveLength(0)
  })
})

describe('device state — ADR-0001', () => {
  it('initializes controls to catalog defaults and toggles via setControl', () => {
    const g = new ConnectionGraph(registry, d1.devices)
    expect(g.getControl('isa-1', 'phantom-48v')).toBe(false)
    expect(g.setControl('isa-1', 'phantom-48v', true)).toMatchObject({ ok: true })
    expect(g.getControl('isa-1', 'phantom-48v')).toBe(true)
    expect(g.setControl('isa-1', 'nope', true)).toMatchObject({ ok: false, code: 'UNKNOWN_CONTROL' })
    expect(g.setControl('ghost', 'phantom-48v', true)).toMatchObject({ ok: false, code: 'UNKNOWN_INSTANCE' })
  })

  it('snapshot exposes EFFECTIVE flags: providesPhantom drops while +48V is off', () => {
    const g = new ConnectionGraph(registry, d1.devices)
    const micIn = () =>
      g
        .snapshot()
        .instances.find((i) => i.instanceId === 'isa-1')!
        .ports.find((p) => p.portId === 'in-mic')!
    expect(micIn().flags).not.toContain('providesPhantom')
    expect(micIn().flags).toContain('isMicInput') // ungated flags stay
    g.setControl('isa-1', 'phantom-48v', true)
    expect(micIn().flags).toContain('providesPhantom')
  })
})
