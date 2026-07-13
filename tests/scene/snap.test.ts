import { describe, expect, it } from 'vitest'
import { nearestPort, SNAP_RADIUS, type PortPoint } from '../../src/scene/snap'

const ports: PortPoint[] = [
  { ref: { instance: 'rio-1', port: 'in-mic-1' }, x: 0, y: 1, z: 0 },
  { ref: { instance: 'rio-1', port: 'in-mic-2' }, x: 0.1, y: 1, z: 0 },
  { ref: { instance: 'ql1-1', port: 'out-main-l' }, x: 5, y: 1, z: 0 },
]

describe('nearestPort — snap ≤ 15 cm', () => {
  it('snaps to the closest port within the radius', () => {
    const hit = nearestPort(ports, { x: 0.08, y: 1, z: 0 })
    expect(hit?.ref).toEqual({ instance: 'rio-1', port: 'in-mic-2' })
  })

  it('returns null beyond the snap radius', () => {
    expect(nearestPort(ports, { x: 0, y: 1 + SNAP_RADIUS + 0.01, z: 0 })).toBeNull()
    expect(nearestPort(ports, { x: 2.5, y: 1, z: 0 })).toBeNull()
  })

  it('exactly at the radius still snaps (≤, not <)', () => {
    expect(nearestPort(ports, { x: 5, y: 1 + SNAP_RADIUS, z: 0 })?.ref.instance).toBe('ql1-1')
  })

  it('never snaps back onto the port the drag started from', () => {
    const hit = nearestPort(ports, { x: 0.001, y: 1, z: 0 }, { instance: 'rio-1', port: 'in-mic-1' })
    expect(hit?.ref).toEqual({ instance: 'rio-1', port: 'in-mic-2' })
  })
})
