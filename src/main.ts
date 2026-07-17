/**
 * Entry router: no ?level → the dashboard (home, Beat 2 — ONE next action,
 * no 3D boot at all); ?level=<id> → the game (src/game.ts).
 */
import catalogJson from '../content/catalog.json'
import a1Json from '../content/levels/a1.json'
import b1Json from '../content/levels/b1.json'
import c1Json from '../content/levels/c1.json'
import d1Json from '../content/levels/d1.json'
import readinessJson from '../content/readiness.json'
import coachJson from '../content/coach/tips.json'
import onboardingJson from '../content/onboarding.json'
import type { CoachFile } from './ui/coach'
import { loadOnboarding, renderOnboarding, type OnboardingConfig } from './ui/onboarding'
import { recommend } from './ui/readiness'

import { injectTokens } from './design/tokens'
import { loadCatalog, loadLevel } from './engine/CatalogLoader'
import { bootGame } from './game'
import { renderDashboard } from './ui/dashboard'
import { LocalStorageProgressStore } from './ui/ProgressStore'
import { epreuveScores, globalReadiness, ruleScores, type ReadinessMap } from './ui/readiness'
import { GUIDED_BRIEF } from './ui/shelf'

injectTokens()

const LEVELS: Record<string, unknown> = { a1: a1Json, b1: b1Json, c1: c1Json, d1: d1Json }
const levelParam = new URLSearchParams(location.search).get('level')

/** Mastery gate for the sandbox palette (ADR-0004): guided under 15% global readiness. */
function sandboxGuided(): boolean {
  const { data } = new LocalStorageProgressStore(window.localStorage).load()
  const levels = Object.values(LEVELS).map((raw) => loadLevel(raw))
  const map = readinessJson as ReadinessMap
  return globalReadiness(epreuveScores(ruleScores(data, levels, map), map), map) < 0.15
}

if (levelParam === 'sandbox') {
  const registry = loadCatalog(catalogJson)
  const guided = sandboxGuided()
  bootGame(
    registry,
    {
      id: 'sandbox',
      version: 1,
      domain: 'live',
      title: 'Sandbox — construis ton système',
      brief: guided
        ? GUIDED_BRIEF
        : 'Étagères complètes : prends du matériel, câble, écoute les règles. Tout compte pour ta readiness.',
      devices: [],
      requiredChain: [],
      logicChecks: ['R4', 'R5', 'R6', 'R7', 'R8'],
      successMessage: '—',
      environment: 'studio',
      layout: {},
    },
    { sandboxGuided: guided },
  )
} else if (levelParam) {
  const registry = loadCatalog(catalogJson)
  bootGame(registry, LEVELS[levelParam] ?? a1Json)
} else {
  // Home: pure DOM — the 3D engine never boots (fast, calm, Beat 2).
  const dashboard = document.getElementById('dashboard')!
  const { data } = new LocalStorageProgressStore(window.localStorage).load()
  const levels = Object.values(LEVELS).map((raw) => loadLevel(raw))
  const map = readinessJson as ReadinessMap
  const onboarding = loadOnboarding(window.localStorage)

  if (!onboarding) {
    // First visit (Beat 1): 2 questions + date, then STRAIGHT into a level —
    // the first win comes before any wall.
    renderOnboarding(dashboard, onboardingJson as OnboardingConfig, (answers) => {
      const rec = recommend(data, levels, map, answers.weakRules)
      location.href = `?level=${rec.levelId}`
    })
  } else {
    renderDashboard(dashboard, data, levels, map, coachJson as CoachFile, onboarding)
  }
  dashboard.hidden = false
  document.getElementById('renderCanvas')!.style.display = 'none'
}
