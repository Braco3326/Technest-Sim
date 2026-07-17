/** Readiness model (ADR-0003): scores, recommender, forgiving streak — on REAL content. */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  bcScores,
  computeStreak,
  epreuveScores,
  globalReadiness,
  recommend,
  ruleScores,
  rulesOfLevel,
  type ReadinessMap,
} from '../../src/ui/readiness'
import type { ProgressData } from '../../src/ui/ProgressStore'
import { makeLevel } from '../helpers'

const map = JSON.parse(
  readFileSync(new URL('../../content/readiness.json', import.meta.url), 'utf8'),
) as ReadinessMap
const levels = ['a1', 'b1', 'c1', 'd1'].map(makeLevel)

const empty = (): ProgressData => ({ version: 2, levels: {}, activity: [] })
const withData = (partial: ProgressData['levels']): ProgressData => ({
  version: 2,
  levels: partial,
  activity: [],
})

describe('rulesOfLevel', () => {
  it('engine invariants always count, plus the declared checks', () => {
    expect(rulesOfLevel(makeLevel('a1'))).toEqual(['R1', 'R2', 'R3'])
    expect(rulesOfLevel(makeLevel('d1'))).toEqual(['R1', 'R2', 'R3', 'R4', 'R8'])
  })
})

describe('ruleScores', () => {
  it('never practised → 0', () => {
    const scores = ruleScores(empty(), levels, map)
    for (const id of Object.keys(map.rules)) expect(scores[id].score).toBe(0)
  })

  it('readiness rises with wins and reaches full coverage at 2 wins', () => {
    const one = ruleScores(withData({ a1: { wins: 1, mistakes: [] } }), levels, map)
    expect(one.R1.score).toBe(0.5) // ratio 1 × coverage 0.5
    const two = ruleScores(withData({ a1: { wins: 2, mistakes: [] } }), levels, map)
    expect(two.R1.score).toBe(1)
    expect(two.R4.score).toBe(0) // a1 does not exercise R4
  })

  it('clean sandbox rigs credit the wiring invariants ONLY (ADR-0005, honest radar)', () => {
    const scores = ruleScores(
      withData({ sandbox: { wins: 2, mistakes: [] } }),
      levels,
      map,
    )
    expect(scores.R1.score).toBe(1)
    expect(scores.R3.score).toBe(1)
    expect(scores.R4.score).toBe(0) // domain lessons are NOT credited by free play
    expect(scores.R7.score).toBe(0)
  })

  it('sandbox mistakes count too — play is assessment (ADR-0004)', () => {
    const scores = ruleScores(
      withData({
        a1: { wins: 2, mistakes: [] },
        sandbox: { wins: 0, mistakes: [{ ruleId: 'R2', at: 'x' }, { ruleId: 'R2', at: 'x' }] },
      }),
      levels,
      map,
    )
    expect(scores.R2.score).toBe(0.5) // 2 wins / (2 + 2 sandbox errors)
  })

  it('errors drag the ratio down', () => {
    const scores = ruleScores(
      withData({ a1: { wins: 2, mistakes: [{ ruleId: 'R2', at: 'x' }, { ruleId: 'R2', at: 'x' }] } }),
      levels,
      map,
    )
    expect(scores.R2.score).toBe(0.5) // 2 wins / (2+2) × coverage 1
    expect(scores.R1.score).toBe(1) // untouched by R2 mistakes
  })
})

describe('aggregations', () => {
  it('out-of-game blocs stay null (honest radar), covered blocs average their rules', () => {
    const bcs = bcScores(ruleScores(withData({ a1: { wins: 2, mistakes: [] } }), levels, map), map)
    expect(bcs.BC01).toBeNull()
    expect(bcs.BC04).toBeNull()
    expect(bcs.BC02).toBeGreaterThan(0)
  })

  it('global readiness weights épreuves by coefficient', () => {
    const eps = epreuveScores(ruleScores(withData({ a1: { wins: 2, mistakes: [] } }), levels, map), map)
    const g = globalReadiness(eps, map)
    expect(g).toBeGreaterThan(0)
    expect(g).toBeLessThanOrEqual(1)
  })
})

describe('recommend — the single next best action', () => {
  it('with no history, recommends the first unpractised rule on its least-won level', () => {
    const rec = recommend(empty(), levels, map)
    expect(rec.ruleId).toBe('R1')
    expect(rec.maintenance).toBe(false)
    expect(rec.tip.length).toBeGreaterThan(10)
  })

  it('attacks the weakest DOMAIN rule: R7 broken → C1 recommended', () => {
    const data = withData({
      a1: { wins: 2, mistakes: [] },
      b1: { wins: 2, mistakes: [] },
      d1: { wins: 2, mistakes: [] },
      c1: { wins: 2, mistakes: Array.from({ length: 6 }, () => ({ ruleId: 'R7', at: 'x' })) },
    })
    const rec = recommend(data, levels, map)
    expect(rec.ruleId).toBe('R7')
    expect(rec.levelId).toBe('c1') // the only level exercising R7
  })

  it('everything mastered → maintenance mode on the least-played level', () => {
    const data = withData({
      a1: { wins: 9, mistakes: [] },
      b1: { wins: 3, mistakes: [] },
      c1: { wins: 4, mistakes: [] },
      d1: { wins: 5, mistakes: [] },
    })
    const rec = recommend(data, levels, map)
    expect(rec.maintenance).toBe(true)
    expect(rec.levelId).toBe('b1')
  })
})

describe('computeStreak — forgiveness (Beat 4)', () => {
  const T = '2026-07-17'
  it('simple consecutive days', () => {
    expect(computeStreak(['2026-07-15', '2026-07-16', T], T)).toEqual({ days: 3, forgivenessUsed: false })
  })
  it('a single missed day is forgiven (does not count, does not break)', () => {
    expect(computeStreak(['2026-07-14', '2026-07-15', T], T)).toEqual({ days: 3, forgivenessUsed: true })
  })
  it('two consecutive missed days end the streak', () => {
    expect(computeStreak(['2026-07-12', '2026-07-13', T], T)).toEqual({ days: 1, forgivenessUsed: false })
  })
  it('today not yet active → streak counts up to yesterday', () => {
    expect(computeStreak(['2026-07-15', '2026-07-16'], T)).toEqual({ days: 2, forgivenessUsed: false })
  })
  it('no activity at all → 0', () => {
    expect(computeStreak([], T)).toEqual({ days: 0, forgivenessUsed: false })
  })
})
