/**
 * Hud — DOM overlay: objective checklist, teaching toasts, win screen.
 * Pure view layer: renders LevelState and teaching content, never touches the
 * graph. All markup lives under the #hud root injected by index.html.
 */
import type { LevelT, Registry } from '../engine/CatalogLoader'
import type { LevelState } from '../engine/types'
import type { CoachResult } from '../ai/AiCoach'
import { chainLabel, mistakeSummary } from './format'
import type { MistakeRecord } from './ProgressStore'

const TOAST_MS = 6000
const TOAST_AI_MS = 30000

/** Bouton optionnel sur un toast (ex. « Pourquoi ? » du coach IA, ADR-0006). */
export interface ToastAction {
  label: string
  onClick: (toastEl: HTMLElement) => void
}

const COACH_UNAVAILABLE: Record<Extract<CoachResult, { kind: 'unavailable' }>['reason'], string> = {
  unconfigured: 'Coach IA non configuré (clé absente dans .env).',
  exam: 'Pas d’aide en mode examen.',
  error: 'Coach IA injoignable pour le moment — le conseil ci-dessus reste valable.',
  rejected: 'Le coach n’a pas pu s’ancrer sur ton montage — le conseil ci-dessus reste valable.',
}

export class Hud {
  private checklist: HTMLElement
  private counter: HTMLElement
  private meter: HTMLElement
  private toasts: HTMLElement
  private win: HTMLElement
  private items: HTMLElement[] = []
  private lastConnected = 0

  constructor(
    root: HTMLElement,
    private registry: Registry,
    private level: LevelT,
  ) {
    const examMode = new URLSearchParams(location.search).get('mode') === 'exam'
    const sandbox = level.id === 'sandbox'
    const cur = (on: boolean) => (on ? ' aria-current="page"' : '')
    const nav =
      `<a href="${location.pathname}" title="Retour au tableau de bord" aria-label="Retour au tableau de bord">←</a>` +
      ['a1', 'b1', 'c1', 'd1']
        .map(
          (id) =>
            `<a href="?level=${id}" class="${id === level.id ? 'current' : ''}"${cur(id === level.id)}>${id.toUpperCase()}</a>`,
        )
        .join('') +
      `<a href="?level=sandbox" class="${sandbox ? 'current' : ''}"${cur(sandbox)}>Sandbox</a>` +
      (sandbox
        ? ''
        : `<a href="?level=${level.id}&mode=exam" class="hud-exam ${examMode ? 'current' : ''}"${cur(examMode)} title="Mode examen : chrono, sans aides, note /20">Examen</a>`)
    root.innerHTML = `
      <section class="hud-panel" id="hud-objectives">
        <nav id="hud-levels">${nav}</nav>
        <h1>${level.title}</h1>
        <p class="hud-brief">${level.brief}</p>
        <ol id="hud-checklist"></ol>
        <div id="hud-meter" role="img" aria-label="Progression de la chaîne"></div>
        <p id="hud-counter"></p>
      </section>
      <aside class="hud-panel" id="hud-controls" hidden></aside>
      <aside class="hud-panel" id="hud-shelf" hidden></aside>
      <div id="hud-toasts" role="status" aria-live="polite" aria-atomic="false"></div>
      <div id="hud-win" hidden></div>`
    this.checklist = root.querySelector('#hud-checklist')!
    this.counter = root.querySelector('#hud-counter')!
    this.meter = root.querySelector('#hud-meter')!
    this.toasts = root.querySelector('#hud-toasts')!
    this.win = root.querySelector('#hud-win')!

    for (const conn of level.requiredChain) {
      const li = document.createElement('li')
      li.textContent = chainLabel(registry, level, conn)
      this.checklist.appendChild(li)
      this.items.push(li)
    }
  }

  update(state: LevelState): void {
    this.level.requiredChain.forEach((conn, i) => {
      const missing = state.missing.some(
        (m) =>
          m.from.instance === conn.from.instance &&
          m.from.port === conn.from.port &&
          m.to.instance === conn.to.instance &&
          m.to.port === conn.to.port,
      )
      this.items[i].classList.toggle('done', !missing)
    })
    this.counter.textContent =
      state.totalRequired === 0
        ? 'Jeu libre — les règles veillent sur chaque connexion.'
        : `${state.connectedRequired}/${state.totalRequired} connexions requises`

    // Chain meter (VU-style feedback): fills as the required chain lands; the
    // newest segment bounces once — motion tied to a real event, never idle.
    if (state.totalRequired > 0) {
      const grew = state.connectedRequired > this.lastConnected
      this.meter.innerHTML = Array.from({ length: state.totalRequired }, (_, i) => {
        const filled = i < state.connectedRequired
        const fresh = grew && i === state.connectedRequired - 1
        return `<span class="${filled ? 'on' : ''}${fresh ? ' fresh' : ''}"></span>`
      }).join('')
      this.lastConnected = state.connectedRequired
    }
  }

  private toastTimers = new WeakMap<HTMLElement, number>()

  toast(
    severity: 'error' | 'warning' | 'info' | 'coach',
    title: string,
    body: string,
    action?: ToastAction,
  ): HTMLElement {
    const el = document.createElement('div')
    el.className = `toast toast-${severity}`
    const strong = document.createElement('strong')
    strong.textContent = title
    const span = document.createElement('span')
    span.textContent = body
    el.append(strong, span)
    if (action) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'toast-action'
      btn.textContent = action.label
      btn.addEventListener(
        'click',
        () => {
          btn.remove()
          action.onClick(el)
        },
        { once: true },
      )
      el.appendChild(btn)
    }
    this.toasts.appendChild(el)
    this.toastTimers.set(
      el,
      window.setTimeout(() => el.remove(), TOAST_MS),
    )
    return el
  }

  /** Rend la réponse du coach IA DANS le toast d'origine (ADR-0006). */
  async showCoachReply(el: HTMLElement, pending: Promise<CoachResult>): Promise<void> {
    const timer = this.toastTimers.get(el)
    if (timer !== undefined) clearTimeout(timer)
    el.classList.add('toast-ai')
    const zone = document.createElement('div')
    zone.className = 'toast-ai-zone'
    zone.textContent = 'Le coach réfléchit…'
    el.appendChild(zone)
    const result = await pending
    if (result.kind === 'answer') {
      zone.textContent = result.text
      const cite = document.createElement('small')
      cite.className = 'toast-ai-cite'
      cite.textContent = `Sources : ${result.citations.join(' ')}`
      el.appendChild(cite)
    } else {
      zone.textContent = COACH_UNAVAILABLE[result.reason]
    }
    const close = document.createElement('button')
    close.type = 'button'
    close.className = 'toast-action'
    close.textContent = 'Fermer'
    close.addEventListener('click', () => el.remove(), { once: true })
    el.appendChild(close)
    this.toastTimers.set(
      el,
      window.setTimeout(() => el.remove(), TOAST_AI_MS),
    )
  }

  showWin(mistakes: readonly MistakeRecord[]): void {
    const summary = mistakeSummary(this.registry, mistakes)
    const list = summary.length
      ? `<ul>${summary.map((s) => `<li>${s.count}× ${escapeHtml(s.label)}</li>`).join('')}</ul>`
      : '<p>Zéro erreur — run parfait.</p>'
    this.win.innerHTML = `
      <div class="win-card">
        <div class="win-vu" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
        <h2>✓ Objectif atteint</h2>
        <p>${escapeHtml(this.level.successMessage)}</p>
        <h3>Erreurs de la session</h3>
        ${list}
        <button id="hud-replay">Rejouer</button>
      </div>`
    this.win.hidden = false
    this.win.querySelector('#hud-replay')!.addEventListener('click', () => location.reload())
  }

  /** Retract the win card when a completed level regresses (a required cable pulled). */
  hideWin(): void {
    this.win.hidden = true
    this.win.innerHTML = ''
  }
}

const escapeHtml = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)
