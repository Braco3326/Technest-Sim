/**
 * Dashboard — the home screen (Beat 2/4/5): readiness radar per bloc de
 * compétences, épreuve bars, ONE recommended action, forgiving streak and a
 * contextual mentor tip. Pure view over src/ui/readiness.ts outputs; the only
 * interaction is navigation (links) — it never touches the graph.
 */
import type { LevelT } from '../engine/CatalogLoader'
import type { ProgressData } from './ProgressStore'
import {
  bcScores,
  computeStreak,
  epreuveScores,
  globalReadiness,
  recommend,
  ruleScores,
  type ReadinessMap,
} from './readiness'

const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

export function renderDashboard(
  root: HTMLElement,
  data: ProgressData,
  levels: LevelT[],
  map: ReadinessMap,
): void {
  const scores = ruleScores(data, levels, map)
  const bcs = bcScores(scores, map)
  const eps = epreuveScores(scores, map)
  const global = globalReadiness(eps, map)
  const rec = recommend(data, levels, map)
  const streak = computeStreak(data.activity, new Date().toISOString().slice(0, 10))

  const epBars = Object.entries(map.epreuves)
    .map(([ep, def]) => {
      const pct = Math.round((eps[ep] ?? 0) * 100)
      return `<div class="db-ep"><span class="db-ep-name">${ep}</span>
        <span class="db-ep-track"><span class="db-ep-fill" style="width:${pct}%"></span></span>
        <span class="db-ep-pct">${pct}%</span>
        <span class="db-ep-label">${esc(def.label)}</span></div>`
    })
    .join('')

  const ruleChips = Object.entries(scores)
    .map(([id, s]) => {
      const pct = Math.round(s.score * 100)
      const cls = s.score >= 0.8 ? 'strong' : s.score > 0 ? 'mid' : 'todo'
      return `<span class="db-rule db-rule-${cls}" title="${s.wins} win(s), ${s.errors} erreur(s)">${id} ${pct}%</span>`
    })
    .join('')

  root.innerHTML = `
    <div class="db-card">
      <header class="db-head">
        <div>
          <h1>TekPractice</h1>
          <p class="db-sub">Ta préparation BTS Métiers du son — readiness, pas des points.</p>
        </div>
        <div class="db-streak" title="${streak.forgivenessUsed ? 'Un jour manqué a été pardonné — la régularité compte, pas la perfection.' : 'Jours actifs consécutifs'}">
          <span class="db-streak-n">${streak.days}</span>
          <span class="db-streak-label">jour${streak.days > 1 ? 's' : ''} de suite${streak.forgivenessUsed ? ' · pardon utilisé' : ''}</span>
        </div>
      </header>

      <section class="db-grid">
        <div class="db-block">
          <h2>Blocs de compétences</h2>
          ${renderRadar(bcs, map)}
        </div>
        <div class="db-block">
          <h2>Épreuves</h2>
          ${epBars}
          <div class="db-global">Readiness globale <strong>${Math.round(global * 100)}%</strong></div>
          <div class="db-rules">${ruleChips}</div>
        </div>
      </section>

      <section class="db-action">
        <h2>Prochaine action</h2>
        <p class="db-reason">${esc(rec.reason)}</p>
        <a class="db-cta" href="?level=${rec.levelId}">Jouer ${rec.levelId.toUpperCase()}</a>
        <aside class="db-tip"><strong>Conseil</strong>${esc(rec.tip)}</aside>
      </section>

      <nav class="db-levels">
        ${levels.map((l) => `<a href="?level=${l.id}">${l.id.toUpperCase()} · ${esc(l.title.split('—')[1]?.trim() ?? l.title)}</a>`).join('')}
      </nav>
    </div>`
}

/** 4-axis SVG radar (BC01–BC04). Out-of-game blocs render as dashed grey — honest, never fake readiness. */
function renderRadar(bcs: Record<string, number | null>, map: ReadinessMap): string {
  const axes = Object.keys(map.competencies) // BC01..BC04
  const cx = 110
  const cy = 100
  const R = 72
  const point = (i: number, r: number): [number, number] => {
    const angle = (Math.PI * 2 * i) / axes.length - Math.PI / 2
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)]
  }
  const ring = (r: number): string =>
    axes.map((_, i) => point(i, r).map((v) => v.toFixed(1)).join(',')).join(' ')

  const covered = axes.map((bc, i) => ({ bc, i, v: bcs[bc] }))
  const poly = covered
    .map(({ i, v }) => point(i, (v ?? 0) * R).map((n) => n.toFixed(1)).join(','))
    .join(' ')

  const labels = covered
    .map(({ bc, i, v }) => {
      const [x, y] = point(i, R + 18)
      const grey = v === null
      return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" class="db-radar-label${grey ? ' off' : ''}">${bc}${grey ? ' —' : ` ${Math.round((v ?? 0) * 100)}%`}</text>`
    })
    .join('')

  return `<svg viewBox="0 0 220 205" class="db-radar" role="img" aria-label="Radar de readiness par bloc de compétences">
    <polygon points="${ring(R)}" class="db-radar-grid" />
    <polygon points="${ring(R * 0.5)}" class="db-radar-grid" />
    <polygon points="${poly}" class="db-radar-value" />
    ${labels}
  </svg>`
}
