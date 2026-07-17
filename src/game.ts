/**
 * Game bootstrap / composition root (extracted from main.ts when the
 * dashboard became the home screen). The ONLY layer allowed to wire
 * everything together: it loads content, owns the ConnectionGraph, applies UI
 * intents to it, and injects logic/* modules into RuleEvaluator (the engine
 * itself never imports logic/*).
 */
import {
  ArcRotateCamera,
  Color3,
  Color4,
  DirectionalLight,
  Engine,
  HemisphericLight,
  Matrix,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Vector3,
} from '@babylonjs/core'
import { TOKENS } from './design/tokens'

import { loadCatalog, loadLevel, type Registry } from './engine/CatalogLoader'
import { ConnectionGraph } from './engine/ConnectionGraph'
import { RuleEvaluator } from './engine/RuleEvaluator'
import { LevelRunner } from './engine/LevelRunner'
import type { LevelState, PortRef, TypedError } from './engine/types'

import { phantomCheck } from './logic/phantom'
import { gpioCheck } from './logic/gpio'
import { mixMinusCheck } from './logic/mixMinus'
import { clockCheck } from './logic/clock'

import { DeviceSpawner } from './scene/DeviceSpawner'
import { CableRenderer } from './scene/CableRenderer'
import { Interaction } from './scene/Interaction'
import type { PortPoint } from './scene/snap'
import type { Intent } from './ui/intents'
import { Hud } from './ui/hud'
import { ControlsPanel } from './ui/controlsPanel'
import { LocalStorageProgressStore } from './ui/ProgressStore'

declare global {
  interface Window {
    __audioSim?: {
      dispatch: (intent: Intent) => void
      state: () => LevelState
      level: ReturnType<typeof loadLevel>
      canConnect: (a: PortRef, b: PortRef) => ReturnType<ConnectionGraph['canConnect']>
      portScreen: (ref: PortRef) => { x: number; y: number } | null
      snap: () => { ref: PortRef; ok: boolean } | null
    }
  }
}

// Per-level stage layouts (meters). Any instance not listed falls back to a grid.
// NOTE: night-run task 4 moves these into content/environments/*.json presets.
const LAYOUTS: Record<string, Record<string, Vector3>> = {
  a1: {
    'sm58-1': new Vector3(-1.6, 0, 2.2),
    'sm57-1': new Vector3(1.6, 0, 2.2),
    'stand-1': new Vector3(-1.9, 0, 2.2),
    'rio-1': new Vector3(0, 0, 3.2),
    'ql1-1': new Vector3(0, 0, -2.6),
    'k12-1': new Vector3(-3.2, 0, 1.2),
    'dbr12-1': new Vector3(3.2, 0, 1.8),
  },
  b1: {
    're20-1': new Vector3(-1.4, 0, 1),
    'mika-1': new Vector3(-1.7, 0, 1),
    'iq-1': new Vector3(0, 0, -1.4),
    'litt-1': new Vector3(1.6, 0, 0.6),
    'gen-l': new Vector3(-1.4, 0, 2.6),
    'gen-r': new Vector3(1.4, 0, 2.6),
    'playout-1': new Vector3(2.6, 0, -0.8),
  },
  c1: {
    're50-1': new Vector3(-2.8, 0, 1.6),
    'scoopy-1': new Vector3(-1.4, 0, 0.6),
    'scoop5-1': new Vector3(0.6, 0, 0.6),
    'iq-1': new Vector3(2.2, 0, -1.2),
  },
  d1: {
    'u87-1': new Vector3(-3, 0, 1.4),
    'isa-1': new Vector3(-2, 0, 0.3),
    'bay-1': new Vector3(-1, 0, -0.8),
    'hdio-1': new Vector3(0.3, 0, -0.8),
    'hdx-1': new Vector3(1.7, 0, -1.6),
    'loom-1': new Vector3(0, 0, 0.9),
    'm905-1': new Vector3(1.3, 0, 0.6),
    'gen-l': new Vector3(-1, 0, 2.8),
    'gen-r': new Vector3(1.5, 0, 2.8),
    'clock-1': new Vector3(2.7, 0, -0.2),
  },
}

export function bootGame(registry: Registry, rawLevel: unknown): void {
  const level = loadLevel(rawLevel)

  // ── engine ────────────────────────────────────────────────────────────────
  const graph = new ConnectionGraph(registry, level.devices)
  const evaluator = new RuleEvaluator(registry, level, {
    'logic/phantom': phantomCheck,
    'logic/gpio': gpioCheck,
    'logic/mixMinus': mixMinusCheck,
    'logic/clock': clockCheck,
  })
  const runner = new LevelRunner(level, evaluator)

  // ── scene (white gallery — design tokens, VISION §6) ─────────────────────
  const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement
  const babylon = new Engine(canvas, true)
  const scene = new Scene(babylon)
  const bg = Color3.FromHexString(TOKENS.color.bg)
  scene.clearColor = new Color4(bg.r, bg.g, bg.b, 1)

  const camera = new ArcRotateCamera('cam', -Math.PI / 2, Math.PI / 3.6, 8.5, new Vector3(0, 0.4, 0.4), scene)
  camera.attachControl(true)
  camera.lowerRadiusLimit = 2
  camera.upperRadiusLimit = 40
  camera.wheelDeltaPercentage = 0.02

  const hemi = new HemisphericLight('light', new Vector3(0.2, 1, 0.3), scene)
  hemi.intensity = 0.95
  hemi.groundColor = Color3.FromHexString('#DDE1E8')
  const key = new DirectionalLight('key', new Vector3(-0.35, -1, 0.25), scene)
  key.intensity = 0.35

  const ground = MeshBuilder.CreateGround('stage', { width: 24, height: 14 }, scene)
  const groundMat = new StandardMaterial('mat:stage', scene)
  groundMat.diffuseColor = Color3.FromHexString(TOKENS.color.floor)
  groundMat.specularColor = Color3.Black()
  ground.material = groundMat
  ground.isPickable = false

  const LAYOUT = LAYOUTS[level.id] ?? {}
  const spawner = new DeviceSpawner(scene, registry)
  const instances = level.devices.map((d, i) =>
    spawner.spawn(
      d.deviceId,
      LAYOUT[d.instanceId] ?? new Vector3((i % 4) * 1.5 - 2.25, 0, Math.floor(i / 4) * 1.5),
      d.instanceId,
    ),
  )

  // World-space port points for snapping + cable anchoring.
  scene.render() // one pass so absolute positions are computed
  const portPoints: PortPoint[] = instances.flatMap((inst) =>
    [...inst.portMarkers.entries()].map(([portId, marker]) => {
      const p = marker.getAbsolutePosition()
      return { ref: { instance: inst.instanceId, port: portId }, x: p.x, y: p.y, z: p.z }
    }),
  )
  const portPos = (ref: PortRef): Vector3 => {
    const p = portPoints.find((pt) => pt.ref.instance === ref.instance && pt.ref.port === ref.port)
    return p ? new Vector3(p.x, p.y, p.z) : Vector3.Zero()
  }

  // ── orchestrator: intents → engine → scene/UI notifications ──────────────
  const cables = new CableRenderer(scene)
  const hud = new Hud(document.getElementById('hud')!, registry, level)
  const progress = new LocalStorageProgressStore(window.localStorage)
  const controlsPanel = new ControlsPanel(
    document.getElementById('hud-controls')!,
    registry,
    level,
    (intent) => dispatch(intent),
  )

  const { data: progressData, wasReset } = progress.load()
  if (wasReset)
    hud.toast('info', 'Progression réinitialisée', 'Sauvegarde incompatible avec cette version — repart de zéro.')
  let mistakes = [...(progressData.levels[level.id]?.mistakes ?? [])]

  let won = false
  const activeViolations = new Set<string>()

  const refresh = (): LevelState => {
    const state = runner.check(graph)
    hud.update(state)
    controlsPanel.update(graph.snapshot())
    console.info(
      `[${level.id}] ${state.connectedRequired}/${state.totalRequired} required — ${state.won ? 'WIN' : 'in progress'}`,
    )
    // Toast NEW logic violations (R4–R8 sweeps); clear ones that got fixed.
    for (const v of state.violations) {
      if (activeViolations.has(v.ruleId)) continue
      activeViolations.add(v.ruleId)
      hud.toast(v.severity, v.title, v.teach)
      mistakes = progress.recordMistake(level.id, v.ruleId).levels[level.id]!.mistakes
    }
    for (const id of [...activeViolations])
      if (!state.violations.some((v) => v.ruleId === id)) activeViolations.delete(id)

    if (state.won && !won) {
      won = true
      progress.recordWin(level.id) // feeds the readiness model (ADR-0003)
      hud.showWin(mistakes)
    }
    return state
  }

  const onRejected = (e: TypedError): void => {
    const rule = e.ruleId ? registry.ruleById.get(e.ruleId) : undefined
    hud.toast('error', rule?.title ?? 'Connexion impossible', rule?.teach ?? e.message)
    mistakes = progress.recordMistake(level.id, e.ruleId ?? e.code).levels[level.id]!.mistakes
    console.warn(`[rejected ${e.code}${e.ruleId ? ` ${e.ruleId}` : ''}] ${e.message}`)
  }

  const dispatch = (intent: Intent): void => {
    switch (intent.type) {
      case 'CONNECT': {
        const r = graph.connect(intent.a, intent.b)
        if (r.ok && r.connectionId) {
          cables.addCable(r.connectionId, portPos(intent.a), portPos(intent.b))
          refresh()
        } else if (!r.ok) {
          onRejected(r)
        }
        break
      }
      case 'DISCONNECT': {
        if (graph.disconnect(intent.connectionId).ok) {
          cables.removeCable(intent.connectionId)
          refresh()
        }
        break
      }
      case 'SET_CONTROL': {
        if (graph.setControl(intent.instance, intent.control, intent.value).ok) refresh()
        break
      }
    }
  }

  const interaction = new Interaction(scene, camera, cables, portPoints, {
    canConnect: (a, b) => graph.canConnect(a, b),
    dispatch,
  })

  // Debug/e2e hook (Playwright drives the same intents a pointer would, and
  // portScreen() lets it aim REAL pointer drags at port markers).
  const portScreen = (ref: PortRef): { x: number; y: number } | null => {
    const world = portPos(ref)
    const projected = Vector3.Project(
      world,
      Matrix.Identity(),
      scene.getTransformMatrix(),
      camera.viewport.toGlobal(babylon.getRenderWidth(), babylon.getRenderHeight()),
    )
    const rect = canvas.getBoundingClientRect()
    return {
      x: rect.left + (projected.x / babylon.getRenderWidth()) * rect.width,
      y: rect.top + (projected.y / babylon.getRenderHeight()) * rect.height,
    }
  }

  window.__audioSim = {
    dispatch,
    state: () => runner.check(graph),
    level,
    canConnect: (a, b) => graph.canConnect(a, b),
    portScreen,
    snap: () => interaction.snapCandidate,
  }

  babylon.runRenderLoop(() => scene.render())
  window.addEventListener('resize', () => babylon.resize())
  refresh()
}

export { loadCatalog }
