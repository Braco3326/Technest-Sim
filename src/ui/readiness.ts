/**
 * readiness — pure functions turning ProgressStore data + the referential
 * mapping (content/readiness.json) into exam-readiness scores, the "next best
 * action" and the forgiving streak (ADR-0003). No DOM, no engine imports.
 */
import type { LevelT } from '../engine/CatalogLoader'
import type { ProgressData } from './ProgressStore'

export interface ReadinessMap {
  version: number
  competencies: Record<string, { label: string; inGame: boolean }>
  epreuves: Record<string, { label: string; coefficient: number }>
  rules: Record<string, { bc: string[]; epreuves: string[]; tip: string }>
}

export interface RuleScore {
  score: number // 0..1
  wins: number
  errors: number
}

/** Rules a successful run of this level exercises: engine invariants always, plus its declared checks. */
export const rulesOfLevel = (level: Pick<LevelT, 'logicChecks'>): string[] => [
  'R1',
  'R2',
  'R3',
  ...level.logicChecks,
]

const TARGET_WINS = 2 // full coverage needs ≥2 wins exercising the rule (ADR-0003)

export function ruleScores(
  data: ProgressData,
  levels: LevelT[],
  map: ReadinessMap,
): Record<string, RuleScore> {
  const out: Record<string, RuleScore> = {}
  for (const ruleId of Object.keys(map.rules)) {
    let wins = 0
    let errors = 0
    for (const level of levels) {
      const lp = data.levels[level.id]
      if (lp && rulesOfLevel(level).includes(ruleId)) wins += lp.wins
    }
    // Errors count from EVERY store entry — including the sandbox: free play
    // feeds the same assessment (ADR-0004 "play = assessment").
    for (const lp of Object.values(data.levels))
      errors += lp.mistakes.filter((m) => m.ruleId === ruleId).length
    const coverage = Math.min(1, wins / TARGET_WINS)
    const ratio = wins + errors > 0 ? wins / (wins + errors) : 0
    out[ruleId] = { score: ratio * coverage, wins, errors }
  }
  return out
}

/** Mean of mapped rule scores per bloc de compétences; null = not covered by the game. */
export function bcScores(scores: Record<string, RuleScore>, map: ReadinessMap): Record<string, number | null> {
  const out: Record<string, number | null> = {}
  for (const [bc, def] of Object.entries(map.competencies)) {
    if (!def.inGame) {
      out[bc] = null
      continue
    }
    const mapped = Object.entries(map.rules).filter(([, r]) => r.bc.includes(bc))
    out[bc] = mapped.length
      ? mapped.reduce((sum, [id]) => sum + scores[id].score, 0) / mapped.length
      : null
  }
  return out
}

export function epreuveScores(scores: Record<string, RuleScore>, map: ReadinessMap): Record<string, number> {
  const out: Record<string, number> = {}
  for (const ep of Object.keys(map.epreuves)) {
    const mapped = Object.entries(map.rules).filter(([, r]) => r.epreuves.includes(ep))
    out[ep] = mapped.length
      ? mapped.reduce((sum, [id]) => sum + scores[id].score, 0) / mapped.length
      : 0
  }
  return out
}

/** Global readiness: épreuve scores weighted by their exam coefficients. */
export function globalReadiness(epreuves: Record<string, number>, map: ReadinessMap): number {
  let total = 0
  let weights = 0
  for (const [ep, score] of Object.entries(epreuves)) {
    const coef = map.epreuves[ep]?.coefficient ?? 1
    total += score * coef
    weights += coef
  }
  return weights ? total / weights : 0
}

export interface Recommendation {
  levelId: string
  ruleId: string
  reason: string
  tip: string
  maintenance: boolean // everything strong — this is upkeep, not weakness-fixing
}

const MASTERY = 0.8

/**
 * The single next best action: attack the weakest rule via the least-won
 * level exercising it. `seedWeak` (onboarding self-assessment, Beat 1) breaks
 * ties at equal weakness — her declared fear gets attacked first.
 */
export function recommend(
  data: ProgressData,
  levels: LevelT[],
  map: ReadinessMap,
  seedWeak: readonly string[] = [],
): Recommendation {
  const scores = ruleScores(data, levels, map)
  const ordered = Object.keys(map.rules) // R1..R8 order is the tie-break
  let weakestId = ordered[0]
  for (const id of ordered) if (scores[id].score < scores[weakestId].score) weakestId = id
  const min = scores[weakestId].score
  const seeded = ordered.find((id) => scores[id].score === min && seedWeak.includes(id))
  if (seeded) weakestId = seeded

  const allStrong = ordered.every((id) => scores[id].score >= MASTERY)
  const pool = allStrong ? levels : levels.filter((l) => rulesOfLevel(l).includes(weakestId))
  const target = [...pool].sort((a, b) => (data.levels[a.id]?.wins ?? 0) - (data.levels[b.id]?.wins ?? 0))[0] ?? levels[0]

  const rule = map.rules[weakestId]
  return {
    levelId: target.id,
    ruleId: weakestId,
    maintenance: allStrong,
    reason: allStrong
      ? `Tout est solide — entretien sur ${target.id.toUpperCase()} pour garder le rythme.`
      : scores[weakestId].wins + scores[weakestId].errors === 0
        ? `${weakestId} jamais pratiquée — ${target.id.toUpperCase()} est le bon terrain pour la découvrir.`
        : `${weakestId} est ton point faible (${scores[weakestId].errors} erreur(s)) — ${target.id.toUpperCase()} la travaille directement.`,
    tip: rule?.tip ?? '',
  }
}

export interface Streak {
  days: number
  forgivenessUsed: boolean
}

/**
 * Forgiving streak (Beat 4): walk back from today (or yesterday when today is
 * not yet active). A single-day gap is FORGIVEN (doesn't count, doesn't
 * break); two consecutive missing days end the streak.
 */
export function computeStreak(activity: readonly string[], todayIso: string): Streak {
  const active = new Set(activity)
  const day = (iso: string, delta: number): string => {
    const d = new Date(`${iso}T00:00:00Z`)
    d.setUTCDate(d.getUTCDate() + delta)
    return d.toISOString().slice(0, 10)
  }

  let cursor = active.has(todayIso) ? todayIso : day(todayIso, -1)
  let days = 0
  let forgivenessUsed = false
  while (true) {
    if (active.has(cursor)) {
      days += 1
      cursor = day(cursor, -1)
    } else if (active.has(day(cursor, -1))) {
      forgivenessUsed = true // lone gap — forgiven, keep walking
      cursor = day(cursor, -1)
    } else {
      break
    }
  }
  return { days, forgivenessUsed }
}
