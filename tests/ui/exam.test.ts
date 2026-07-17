/** Exam scoring (Beat 5) — pure, transparent, /20. */
import { describe, expect, it } from 'vitest'
import { examScore, formatClock } from '../../src/ui/exam'
import type { LevelState } from '../../src/engine/types'

const state = (partial: Partial<LevelState>): LevelState => ({
  chainComplete: false,
  connectedRequired: 0,
  totalRequired: 5,
  missing: [],
  violations: [],
  won: false,
  ...partial,
})

describe('examScore', () => {
  it('perfect run → 20/20', () => {
    const s = examScore(
      state({ chainComplete: true, connectedRequired: 5, violations: [], won: true }),
      0,
      120,
      240,
    )
    expect(s.score20).toBe(20)
    expect(s.checksClean).toBe(true)
    expect(s.timedOut).toBe(false)
  })

  it('mistakes cost half a point each', () => {
    const s = examScore(
      state({ chainComplete: true, connectedRequired: 5, violations: [], won: true }),
      3,
      120,
      240,
    )
    expect(s.score20).toBe(18.5)
  })

  it('timeout with partial wiring: completion counts, checks do not', () => {
    const s = examScore(state({ connectedRequired: 3 }), 2, 240, 240)
    // 20 × (0.6 × 3/5) − 1 = 6.2 → half-point rounding
    expect(s.score20).toBe(6)
    expect(s.timedOut).toBe(true)
    expect(s.checksClean).toBe(false)
  })

  it('chain complete but a domain check still red → the 40% block is lost', () => {
    const s = examScore(
      state({
        chainComplete: true,
        connectedRequired: 5,
        violations: [{ ruleId: 'R4', severity: 'error', title: 'x', teach: 'x', subjects: [] }],
      }),
      0,
      100,
      240,
    )
    expect(s.score20).toBe(12)
  })

  it('score never goes below 0', () => {
    expect(examScore(state({}), 40, 10, 240).score20).toBe(0)
  })
})

describe('formatClock', () => {
  it('formats minutes:seconds', () => {
    expect(formatClock(240)).toBe('4:00')
    expect(formatClock(61.4)).toBe('1:01')
    expect(formatClock(-3)).toBe('0:00')
  })
})
