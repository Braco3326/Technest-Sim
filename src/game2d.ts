/**
 * bootGame2D — the WebGL-free composition root (VISION: playable on weak PCs).
 * Reuses the ENTIRE audio-agnostic engine (ConnectionGraph, RuleEvaluator +
 * logic/*, LevelRunner) and every Babylon-free UI piece (Hud, ControlsPanel,
 * ExamController, ProgressStore, AI coach). Only the renderer differs: an SVG
 * board (render/Render2D) instead of the Babylon scene. Same intents, same
 * rules, same teaching — just cheaper pixels.
 */
import { loadCatalog, loadLevel, type Registry } from './engine/CatalogLoader'
import { ConnectionGraph } from './engine/ConnectionGraph'
import { RuleEvaluator } from './engine/RuleEvaluator'
import { LevelRunner } from './engine/LevelRunner'
import type { LevelState, PortRef, TypedError } from './engine/types'

import { phantomCheck } from './logic/phantom'
import { gpioCheck } from './logic/gpio'
import { mixMinusCheck } from './logic/mixMinus'
import { clockCheck } from './logic/clock'

import type { Intent } from './ui/intents'
import { Hud, type ToastAction } from './ui/hud'
import { ControlsPanel } from './ui/controlsPanel'
import { LocalStorageProgressStore } from './ui/ProgressStore'
import { ExamController } from './ui/exam'
import { SeenTips, tipFor, type CoachFile } from './ui/coach'
import coachJson from '../content/coach/tips.json'
import { askCoach, createAiCoach } from './ai'
import { buildGrounding } from './ai/grounding'
import { Render2D } from './render/Render2D'
import { persistRenderChoice } from './render/detect'

export function bootGame2D(registry: Registry, rawLevel: unknown): void {
  const level = loadLevel(rawLevel)
  const examMode = new URLSearchParams(location.search).get('mode') === 'exam'

  const graph = new ConnectionGraph(registry, level.devices)
  const evaluator = new RuleEvaluator(registry, level, {
    'logic/phantom': phantomCheck,
    'logic/gpio': gpioCheck,
    'logic/mixMinus': mixMinusCheck,
    'logic/clock': clockCheck,
  })
  const runner = new LevelRunner(level, evaluator)

  const hud = new Hud(document.getElementById('hud')!, registry, level)
  const controlsPanel = new ControlsPanel(
    document.getElementById('hud-controls')!,
    registry,
    level,
    (intent) => dispatch(intent),
  )

  const boardRoot = document.getElementById('board2d')!
  boardRoot.replaceChildren()
  const board = new Render2D(
    boardRoot,
    registry,
    level,
    {
      getConnections: () => graph.getConnections(),
      canConnect: (a, b) => graph.canConnect(a, b),
      connectionAt: (ref) => graph.connectionAt(ref),
    },
    (intent) => dispatch(intent),
  )

  // A visible "3D" switch (the fallback is activable both ways).
  const toggle = document.createElement('button')
  toggle.type = 'button'
  toggle.className = 'board2d-toggle'
  toggle.textContent = 'Vue 3D'
  toggle.title = 'Repasser au rendu 3D (si ta machine le permet)'
  toggle.addEventListener('click', () => {
    persistRenderChoice('3d')
    const url = new URL(location.href)
    url.searchParams.set('render', '3d')
    location.href = url.toString()
  })
  boardRoot.appendChild(toggle)

  const progress = new LocalStorageProgressStore(window.localStorage)
  const { data: progressData, wasReset } = progress.load()
  if (wasReset)
    hud.toast('info', 'Progression réinitialisée', 'Sauvegarde incompatible avec cette version — repart de zéro.')
  let mistakes = [...(progressData.levels[level.id]?.mistakes ?? [])]
  let sessionMistakes = 0
  let won = false
  const activeViolations = new Set<string>()

  const coachTips = coachJson as CoachFile
  const seenTips = new SeenTips()
  const coachOnRule = (ruleId: string | undefined): void => {
    if (examMode || !ruleId) return
    const tip = tipFor(coachTips, { kind: 'rule', ruleId }, seenTips.set)
    if (!tip) return
    seenTips.mark(tip.id)
    hud.toast('coach', 'Conseil d’Oscar', tip.text)
  }

  const aiCoach = createAiCoach(import.meta.env)
  const whyAction = (
    ruleId: string | undefined,
    errorCode: string | undefined,
    subjects: PortRef[],
  ): ToastAction | undefined => {
    if (examMode || aiCoach.status !== 'ready') return undefined
    return {
      label: 'Pourquoi ?',
      onClick: (toastEl) => {
        const grounding = buildGrounding(registry, graph.snapshot(), { ruleId, errorCode, subjects })
        void hud.showCoachReply(toastEl, askCoach(aiCoach, grounding, { examMode }))
      },
    }
  }

  const refresh = (): LevelState => {
    const state = runner.check(graph)
    hud.update(state)
    controlsPanel.update(graph.snapshot())
    board.render()
    for (const v of state.violations) {
      if (activeViolations.has(v.ruleId)) continue
      activeViolations.add(v.ruleId)
      if (!examMode) hud.toast(v.severity, v.title, v.teach, whyAction(v.ruleId, undefined, v.subjects))
      sessionMistakes += 1
      mistakes = progress.recordMistake(level.id, v.ruleId).levels[level.id]!.mistakes
      coachOnRule(v.ruleId)
    }
    for (const id of [...activeViolations])
      if (!state.violations.some((v) => v.ruleId === id)) activeViolations.delete(id)

    if (state.won && !won) {
      won = true
      const firstEver = Object.values(progress.load().data.levels).every((l) => l.wins === 0)
      progress.recordWin(level.id)
      if (exam) exam.finish()
      else {
        hud.showWin(mistakes)
        if (firstEver) {
          const tip = tipFor(coachTips, { kind: 'first-win' }, seenTips.set)
          if (tip) {
            seenTips.mark(tip.id)
            hud.toast('coach', 'Conseil d’Oscar', tip.text)
          }
        }
      }
    } else if (!state.won && won) {
      won = false
      hud.hideWin()
    }
    return state
  }

  const onRejected = (e: TypedError, subjects: PortRef[]): void => {
    const rule = !examMode && e.ruleId ? registry.ruleById.get(e.ruleId) : undefined
    if (examMode) hud.toast('error', 'Connexion refusée', 'Pas d’explication en mode examen — analyse et corrige.')
    else
      hud.toast('error', rule?.title ?? 'Connexion impossible', rule?.teach ?? e.message, whyAction(e.ruleId, e.code, subjects))
    sessionMistakes += 1
    mistakes = progress.recordMistake(level.id, e.ruleId ?? e.code).levels[level.id]!.mistakes
    coachOnRule(e.ruleId)
  }

  const dispatch = (intent: Intent): void => {
    if (exam?.isFinished) return
    switch (intent.type) {
      case 'CONNECT': {
        const r = graph.connect(intent.a, intent.b)
        if (r.ok) refresh()
        else onRejected(r, [intent.a, intent.b])
        break
      }
      case 'DISCONNECT': {
        if (graph.disconnect(intent.connectionId).ok) refresh()
        break
      }
      case 'SET_CONTROL': {
        if (graph.setControl(intent.instance, intent.control, intent.value).ok) refresh()
        break
      }
      // SPAWN / LOAD_RIG are sandbox-only (3D) — ignored on the 2D board.
    }
  }

  const exam = examMode
    ? new ExamController(document.getElementById('hud')!, level.examSeconds ?? 300, {
        getState: () => runner.check(graph),
        getMistakes: () => sessionMistakes,
        onFinished: () => undefined,
      })
    : null

  window.__audioSim = {
    dispatch,
    state: () => runner.check(graph),
    level,
    canConnect: (a, b) => graph.canConnect(a, b),
    portScreen: () => null, // 2D board is clicked by data attributes, not projected coords
    snap: () => null,
  }

  refresh()
}

export { loadCatalog }
