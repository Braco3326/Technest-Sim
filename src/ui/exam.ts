/**
 * Exam mode (Beat 5 — "Tests"): same level, same engine, but NO hints, a
 * countdown, and a /20 exam-style score with a readiness report at the end.
 * Pure scoring is exported for tests; the controller only touches the DOM.
 * Mistakes made under exam conditions still feed ProgressStore — play (and
 * tests) are the same assessment loop (ADR-0003).
 */
import type { LevelState } from '../engine/types'
import { TOKENS } from '../design/tokens'

export interface ExamScore {
  score20: number // French exam grading, 0–20
  completion: number // 0..1 — required chain built
  checksClean: boolean // declared logicChecks all green at the end
  mistakes: number
  elapsedSeconds: number
  timedOut: boolean
}

/**
 * 60% wiring completion + 40% domain checks, minus half a point per mistake.
 * Transparent and explainable — the report shows every term.
 */
export function examScore(
  state: LevelState,
  mistakes: number,
  elapsedSeconds: number,
  budgetSeconds: number,
): ExamScore {
  const completion = state.totalRequired ? state.connectedRequired / state.totalRequired : 0
  const checksClean = state.chainComplete && state.violations.length === 0
  const raw = 20 * (0.6 * completion + 0.4 * (checksClean ? 1 : 0)) - 0.5 * mistakes
  return {
    score20: Math.max(0, Math.round(raw * 2) / 2), // half-point precision
    completion,
    checksClean,
    mistakes,
    elapsedSeconds,
    timedOut: elapsedSeconds >= budgetSeconds,
  }
}

export const formatClock = (s: number): string =>
  `${Math.floor(Math.max(0, s) / 60)}:${String(Math.max(0, Math.floor(s)) % 60).padStart(2, '0')}`

export interface ExamHooks {
  getState(): LevelState
  getMistakes(): number
  onFinished(): void // freeze interactions upstream if desired
}

export class ExamController {
  private startedAt = Date.now()
  private timerEl: HTMLElement
  private interval: number
  private finished = false

  constructor(
    private root: HTMLElement, // #hud
    private budgetSeconds: number,
    private hooks: ExamHooks,
  ) {
    this.timerEl = document.createElement('div')
    this.timerEl.id = 'exam-timer'
    this.timerEl.setAttribute('role', 'timer')
    root.appendChild(this.timerEl)
    this.tick()
    this.interval = window.setInterval(() => this.tick(), 500)
  }

  get elapsedSeconds(): number {
    return (Date.now() - this.startedAt) / 1000
  }

  private tick(): void {
    const left = this.budgetSeconds - this.elapsedSeconds
    this.timerEl.textContent = formatClock(left)
    this.timerEl.classList.toggle('exam-late', left <= 30)
    if (left <= 0 && !this.finished) this.finish()
  }

  /** Called on win (by the orchestrator) or on timeout (by the tick). */
  finish(): void {
    if (this.finished) return
    this.finished = true
    window.clearInterval(this.interval)
    const state = this.hooks.getState()
    const score = examScore(state, this.hooks.getMistakes(), this.elapsedSeconds, this.budgetSeconds)
    this.renderReport(score, state)
    this.hooks.onFinished()
  }

  get isFinished(): boolean {
    return this.finished
  }

  private renderReport(score: ExamScore, state: LevelState): void {
    const overlay = document.createElement('div')
    overlay.id = 'exam-report'
    const verdictColor = score.score20 >= 10 ? TOKENS.color.success : TOKENS.color.error
    const rows = [
      `Câblage requis : ${state.connectedRequired}/${state.totalRequired} (${Math.round(score.completion * 100)}%)`,
      `Contrôles du domaine : ${score.checksClean ? 'tous verts' : state.violations.map((v) => v.ruleId).join(', ') + ' en défaut'}`,
      `Erreurs pendant l'épreuve : ${score.mistakes} (−${(score.mistakes * 0.5).toFixed(1)} pt)`,
      `Temps : ${formatClock(score.elapsedSeconds)}${score.timedOut ? ' — TEMPS ÉCOULÉ' : ''}`,
    ]
    overlay.innerHTML = `
      <div class="exam-card">
        <h2 style="color:${verdictColor}">${score.score20}/20</h2>
        <p class="exam-verdict">${score.timedOut ? "Temps écoulé — voilà exactement où tu en es." : score.score20 >= 10 ? 'Épreuve validée. Ce score est une mesure, pas un jugement.' : "Pas encore — et c'est une donnée précieuse : tu sais quoi travailler."}</p>
        <ul>${rows.map((r) => `<li>${r}</li>`).join('')}</ul>
        <a class="db-cta" href="${location.pathname}">Voir ma readiness</a>
        <a class="exam-retry" href="?level=${new URLSearchParams(location.search).get('level')}&mode=exam">Repasser l'épreuve</a>
      </div>`
    this.root.appendChild(overlay)
  }
}
