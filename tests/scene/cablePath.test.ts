import { describe, expect, it } from 'vitest'
import { CableBudget, catenaryPoints, SEGMENTS_FULL } from '../../src/scene/cablePath'

describe('catenaryPoints', () => {
  it('produces segments+1 points from a to b with downward sag in the middle', () => {
    const a = { x: 0, y: 1, z: 0 }
    const b = { x: 2, y: 1, z: 0 }
    const pts = catenaryPoints(a, b, SEGMENTS_FULL)
    expect(pts).toHaveLength(SEGMENTS_FULL + 1)
    expect(pts[0]).toEqual(a)
    expect(pts[SEGMENTS_FULL]).toEqual(b)
    const mid = pts[SEGMENTS_FULL / 2]
    expect(mid.y).toBeLessThan(1) // sag
    expect(mid.x).toBeCloseTo(1)
  })

  it('degrades to a straight 2-point line at segments=1 (budget guard shape)', () => {
    const pts = catenaryPoints({ x: 0, y: 1, z: 0 }, { x: 2, y: 1, z: 2 }, 1)
    expect(pts).toHaveLength(2)
    expect(pts[0].y).toBe(1)
    expect(pts[1].y).toBe(1) // no sag on straight lines
  })
})

describe('CableBudget — degrade before dropping frames', () => {
  it('grants full segments while under budget', () => {
    const budget = new CableBudget(100)
    expect(budget.grant('c1', 24)).toBe(24)
    expect(budget.grant('c2', 24)).toBe(24)
  })

  it('grants a straight line once the budget would be exceeded', () => {
    const budget = new CableBudget(60)
    expect(budget.grant('c1', 24)).toBe(24) // 25 pts
    expect(budget.grant('c2', 24)).toBe(24) // 50 pts
    expect(budget.grant('c3', 24)).toBe(1) // would be 75 > 60 → straight
  })

  it('re-granting the same cable does not double-count it', () => {
    const budget = new CableBudget(30)
    expect(budget.grant('c1', 24)).toBe(24)
    expect(budget.grant('c1', 24)).toBe(24) // same id re-granted, still fits
  })

  it('released points return to the pool', () => {
    const budget = new CableBudget(60)
    budget.grant('c1', 24)
    budget.grant('c2', 24)
    expect(budget.grant('c3', 24)).toBe(1)
    budget.release('c1')
    expect(budget.grant('c3', 24)).toBe(24)
  })
})
