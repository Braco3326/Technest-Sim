/** Onboarding (Beat 1): persistence, exam countdown, recommender seeding. */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { daysToExam, loadOnboarding, saveOnboarding } from '../../src/ui/onboarding'
import { recommend, type ReadinessMap } from '../../src/ui/readiness'
import { makeLevel } from '../helpers'

const map = JSON.parse(
  readFileSync(new URL('../../content/readiness.json', import.meta.url), 'utf8'),
) as ReadinessMap
const levels = ['a1', 'b1', 'c1', 'd1'].map(makeLevel)

const fakeStorage = () => {
  const m = new Map<string, string>()
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
  }
}

describe('onboarding persistence', () => {
  it('save → load roundtrip', () => {
    const s = fakeStorage()
    saveOnboarding(s, { examDate: '2027-06', weakRules: ['R7'], choices: { 'weak-area': 'broadcast' } })
    const loaded = loadOnboarding(s)
    expect(loaded?.examDate).toBe('2027-06')
    expect(loaded?.weakRules).toEqual(['R7'])
  })
  it('nothing stored / corrupt → null (onboarding shows)', () => {
    expect(loadOnboarding(fakeStorage())).toBeNull()
    const s = fakeStorage()
    s.setItem('audio-sim/onboarding', '{nope')
    expect(loadOnboarding(s)).toBeNull()
  })
})

describe('daysToExam', () => {
  it('counts to the 1st of the exam month', () => {
    expect(daysToExam('2026-08', '2026-07-17')).toBe(15)
  })
  it('null on unset or past date', () => {
    expect(daysToExam(null, '2026-07-17')).toBeNull()
    expect(daysToExam('2026-06', '2026-07-17')).toBeNull()
  })
})

describe('recommender seeding (declared weakness wins ties at zero)', () => {
  const empty = { version: 2, levels: {}, activity: [] }
  it('fresh learner + "broadcast" fear → R5 first → level B1', () => {
    const rec = recommend(empty, levels, map, ['R5', 'R6', 'R7'])
    expect(rec.ruleId).toBe('R5')
    expect(rec.levelId).toBe('b1')
  })
  it('no seed → unchanged default (R1)', () => {
    expect(recommend(empty, levels, map).ruleId).toBe('R1')
  })
  it('seed never overrides a GENUINE weakness (non-tied lower score wins)', () => {
    const data = {
      version: 2,
      activity: [],
      levels: {
        a1: { wins: 2, mistakes: [] },
        b1: { wins: 2, mistakes: [] },
        c1: { wins: 2, mistakes: [] },
        d1: { wins: 2, mistakes: Array.from({ length: 8 }, () => ({ ruleId: 'R8', at: 'x' })) },
      },
    }
    const rec = recommend(data, levels, map, ['R1'])
    expect(rec.ruleId).toBe('R8') // real data beats declared fear
  })
})
