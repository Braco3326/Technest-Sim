/** logic/phantom (R4) — pure function on snapshots: triggers + doesn't-trigger. */
import { describe, expect, it } from 'vitest'
import { phantomCheck } from '../../src/logic/phantom'
import type { RigSnapshot } from '../../src/engine/types'

const snap = (destFlags: string[], micFlags: string[] = ['requiresPhantom']): RigSnapshot => ({
  instances: [
    {
      instanceId: 'mic-1',
      deviceId: 'some-mic',
      controls: {},
      ports: [{ portId: 'out', dir: 'out', connector: 'xlr3-m', signal: 'mic-level', flags: micFlags }],
    },
    {
      instanceId: 'pre-1',
      deviceId: 'some-pre',
      controls: {},
      ports: [{ portId: 'in', dir: 'in', connector: 'xlr3-f', signal: 'mic-level', flags: destFlags }],
    },
  ],
  connections: [{ a: { instance: 'mic-1', port: 'out' }, b: { instance: 'pre-1', port: 'in' } }],
})

describe('phantomCheck — R4', () => {
  it('triggers: condenser wired to an input whose effective providesPhantom is absent', () => {
    const events = phantomCheck(snap(['isMicInput']))
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({ ruleId: 'R4' })
    expect(events[0].subjects[0]).toEqual({ instance: 'mic-1', port: 'out' })
  })

  it("doesn't trigger: +48V effective on the destination", () => {
    expect(phantomCheck(snap(['isMicInput', 'providesPhantom']))).toHaveLength(0)
  })

  it("doesn't trigger: dynamic mic (no requiresPhantom) into a phantom-less input", () => {
    expect(phantomCheck(snap(['isMicInput'], []))).toHaveLength(0)
  })

  it("doesn't trigger: unconnected condenser (connectivity is the requiredChain's job)", () => {
    const s = snap(['isMicInput'])
    s.connections = []
    expect(phantomCheck(s)).toHaveLength(0)
  })
})
