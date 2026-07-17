/** Coach triggers (Beats 2/4): low-moment, comeback, contextual rule tips, dedupe. */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { detectComeback, detectLowMoment, tipFor, type CoachFile } from '../../src/ui/coach'
import type { ProgressData } from '../../src/ui/ProgressStore'

const coach = JSON.parse(
  readFileSync(new URL('../../content/coach/tips.json', import.meta.url), 'utf8'),
) as CoachFile

const data = (activity: string[]): ProgressData => ({ version: 2, levels: {}, activity })
const T = '2026-07-17'

describe('detectLowMoment — the motivation dip (Beat 4)', () => {
  it('fires: momentum built (3+ days) then 2+ days of silence', () => {
    expect(detectLowMoment(data(['2026-07-10', '2026-07-11', '2026-07-12']), T)).toBe(true)
  })
  it('does not fire while she is active (yesterday)', () => {
    expect(detectLowMoment(data(['2026-07-13', '2026-07-15', '2026-07-16']), T)).toBe(false)
  })
  it('does not fire on a brand-new learner (no momentum to lose — no guilt)', () => {
    expect(detectLowMoment(data(['2026-07-10']), T)).toBe(false)
    expect(detectLowMoment(data([]), T)).toBe(false)
  })
})

describe('detectComeback — she is BACK after a gap', () => {
  it('fires: active today after a 2+ day hole', () => {
    expect(detectComeback(data(['2026-07-12', '2026-07-13', T]), T)).toBe(true)
  })
  it('does not fire on a continuous streak', () => {
    expect(detectComeback(data(['2026-07-15', '2026-07-16', T]), T)).toBe(false)
  })
  it('does not fire when today is not active yet', () => {
    expect(detectComeback(data(['2026-07-12', '2026-07-13']), T)).toBe(false)
  })
})

describe('tipFor — contextual delivery + session dedupe', () => {
  it('maps a rule violation to ITS tip', () => {
    const tip = tipFor(coach, { kind: 'rule', ruleId: 'R4' }, new Set())
    expect(tip?.id).toBe('coach-r4')
    expect(tip?.text).toContain('À REMPLACER PAR OSCAR') // placeholder debt is explicit
  })
  it('every rule R1–R8 has a coach tip (validator also enforces this)', () => {
    for (let i = 1; i <= 8; i++)
      expect(tipFor(coach, { kind: 'rule', ruleId: `R${i}` }, new Set())).not.toBeNull()
  })
  it('a seen tip never fires twice (tone engine: no nagging)', () => {
    expect(tipFor(coach, { kind: 'rule', ruleId: 'R4' }, new Set(['coach-r4']))).toBeNull()
  })
  it('moment tips resolve by kind', () => {
    expect(tipFor(coach, { kind: 'low-moment' }, new Set())?.id).toBe('coach-low-moment')
    expect(tipFor(coach, { kind: 'forgiveness' }, new Set())?.id).toBe('coach-forgiveness')
  })
})
