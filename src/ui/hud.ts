/**
 * Hud — DOM overlay: objective checklist, teaching toasts, win screen.
 * Pure view layer: renders LevelState and teaching content, never touches the
 * graph. All markup lives under the #hud root injected by index.html.
 */
import type { LevelT, Registry } from '../engine/CatalogLoader'
import type { LevelState } from '../engine/types'
import { chainLabel, mistakeSummary } from './format'
import type { MistakeRecord } from './ProgressStore'

const TOAST_MS = 6000

export class Hud {
  private checklist: HTMLElement
  private counter: HTMLElement
  private toasts: HTMLElement
  private win: HTMLElement
  private items: HTMLElement[] = []

  constructor(
    root: HTMLElement,
    private registry: Registry,
    private level: LevelT,
  ) {
    const nav =
      `<a href="${location.pathname}" title="Retour au tableau de bord">←</a>` +
      ['a1', 'b1', 'c1', 'd1']
        .map((id) => `<a href="?level=${id}" class="${id === level.id ? 'current' : ''}">${id.toUpperCase()}</a>`)
        .join('')
    root.innerHTML = `
      <section class="hud-panel" id="hud-objectives">
        <nav id="hud-levels">${nav}</nav>
        <h1>${level.title}</h1>
        <p class="hud-brief">${level.brief}</p>
        <ol id="hud-checklist"></ol>
        <p id="hud-counter"></p>
      </section>
      <aside class="hud-panel" id="hud-controls" hidden></aside>
      <div id="hud-toasts"></div>
      <div id="hud-win" hidden></div>`
    this.checklist = root.querySelector('#hud-checklist')!
    this.counter = root.querySelector('#hud-counter')!
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
    this.counter.textContent = `${state.connectedRequired}/${state.totalRequired} connexions requises`
  }

  toast(severity: 'error' | 'warning' | 'info', title: string, body: string): void {
    const el = document.createElement('div')
    el.className = `toast toast-${severity}`
    el.innerHTML = `<strong></strong><span></span>`
    ;(el.firstChild as HTMLElement).textContent = title
    ;(el.lastChild as HTMLElement).textContent = body
    this.toasts.appendChild(el)
    setTimeout(() => el.remove(), TOAST_MS)
  }

  showWin(mistakes: readonly MistakeRecord[]): void {
    const summary = mistakeSummary(this.registry, mistakes)
    const list = summary.length
      ? `<ul>${summary.map((s) => `<li>${s.count}× ${escapeHtml(s.label)}</li>`).join('')}</ul>`
      : '<p>Zéro erreur — run parfait.</p>'
    this.win.innerHTML = `
      <div class="win-card">
        <h2>✓ Objectif atteint</h2>
        <p>${escapeHtml(this.level.successMessage)}</p>
        <h3>Erreurs de la session</h3>
        ${list}
        <button id="hud-replay">Rejouer</button>
      </div>`
    this.win.hidden = false
    this.win.querySelector('#hud-replay')!.addEventListener('click', () => location.reload())
  }
}

const escapeHtml = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)
