/**
 * Coach — "Conseils d'Oscar" (Beats 2 & 4): CONTEXTUAL delivery of the mentor
 * voice. Pure logic: trigger detection (rule met / low moment / comeback /
 * forgiveness / first win) + a tone contract. All texts live in
 * content/coach/tips.json (placeholders until Oscar writes them —
 * docs/REVIEW-ME.md tracks that debt).
 *
 * Tone engine (anti-burnout, VISION §5 "psychologically safe"):
 *  - at most ONE coach message per screen/moment — never a wall of text;
 *  - each contextual tip fires ONCE per session (dedupe by tip id);
 *  - low-moment/comeback tips appear on the DASHBOARD only, never mid-game
 *    (no guilt interruptions while she is trying).
 */
import type { ProgressData } from './ProgressStore'

export interface CoachTip {
  id: string
  trigger:
    | { kind: 'rule'; ruleId: string }
    | { kind: 'low-moment' }
    | { kind: 'comeback' }
    | { kind: 'forgiveness' }
    | { kind: 'exam-low' }
    | { kind: 'first-win' }
  text: string
}
export interface CoachFile {
  version: number
  tips: CoachTip[]
}

const dayDiff = (aIso: string, bIso: string): number =>
  Math.round((Date.parse(`${bIso}T00:00:00Z`) - Date.parse(`${aIso}T00:00:00Z`)) / 86_400_000)

/**
 * Low-moment detection (Beat 4): she HAD momentum (≥3 active days) and the
 * last activity is 2+ days old — the motivation dip, exactly when the mentor
 * voice matters. (Rising in-session error rate is handled by rule tips.)
 */
export function detectLowMoment(data: ProgressData, todayIso: string): boolean {
  if (data.activity.length < 3) return false
  const last = [...data.activity].sort().at(-1)!
  return dayDiff(last, todayIso) >= 2
}

/** Comeback: she is BACK today after a 2+ day gap (yesterday's last activity was old). */
export function detectComeback(data: ProgressData, todayIso: string): boolean {
  const past = data.activity.filter((d) => d !== todayIso).sort()
  if (past.length < 2 || !data.activity.includes(todayIso)) return false
  return dayDiff(past.at(-1)!, todayIso) >= 2
}

export function tipFor(
  tips: CoachFile,
  trigger: CoachTip['trigger'],
  seen: ReadonlySet<string>,
): CoachTip | null {
  const match = tips.tips.find((t) => {
    if (t.trigger.kind !== trigger.kind) return false
    if (t.trigger.kind === 'rule' && trigger.kind === 'rule') return t.trigger.ruleId === trigger.ruleId
    return true
  })
  return match && !seen.has(match.id) ? match : null
}

/** Session-scoped dedupe backed by sessionStorage (a set of tip ids). */
export class SeenTips {
  private ids: Set<string>
  constructor(private storage: Pick<Storage, 'getItem' | 'setItem'> = window.sessionStorage) {
    try {
      this.ids = new Set(JSON.parse(storage.getItem('audio-sim/coach-seen') ?? '[]') as string[])
    } catch {
      this.ids = new Set()
    }
  }
  get set(): ReadonlySet<string> {
    return this.ids
  }
  mark(id: string): void {
    this.ids.add(id)
    this.storage.setItem('audio-sim/coach-seen', JSON.stringify([...this.ids]))
  }
}
