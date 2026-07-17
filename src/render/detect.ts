/**
 * Renderer selection (VISION: a low-fidelity 2D fallback for weak PCs).
 * decideRenderer() is PURE (testable); readRenderEnv()/persistRenderChoice()
 * are the thin browser glue. Order of authority:
 *   1. explicit ?render=2d|3d (also persisted) — the "activable" switch
 *   2. a stored preference from a previous choice
 *   3. auto-detect: no WebGL, or a clearly low-end machine → 2D
 */

export interface RenderEnv {
  /** ?render= value (2d|3d|null). */
  param: string | null
  /** persisted preference (2d|3d|null). */
  stored: string | null
  /** WebGL (any version) available? */
  webgl: boolean
  /** navigator.hardwareConcurrency (logical cores). */
  cores: number
  /** navigator.deviceMemory (GiB) if exposed, else undefined. */
  memory: number | undefined
}

export interface RenderDecision {
  use2d: boolean
  reason: 'url' | 'pref' | 'no-webgl' | 'low-end' | 'default'
}

/** A machine is "low-end" if it has ≤2 logical cores or ≤2 GiB device memory. */
function isLowEnd(env: RenderEnv): boolean {
  if (env.cores > 0 && env.cores <= 2) return true
  if (env.memory !== undefined && env.memory <= 2) return true
  return false
}

export function decideRenderer(env: RenderEnv): RenderDecision {
  if (env.param === '2d') return { use2d: true, reason: 'url' }
  if (env.param === '3d') return { use2d: false, reason: 'url' }
  if (env.stored === '2d') return { use2d: true, reason: 'pref' }
  if (env.stored === '3d') return { use2d: false, reason: 'pref' }
  if (!env.webgl) return { use2d: true, reason: 'no-webgl' }
  if (isLowEnd(env)) return { use2d: true, reason: 'low-end' }
  return { use2d: false, reason: 'default' }
}

const PREF_KEY = 'audio-sim/render'

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch {
    return false
  }
}

export function readRenderEnv(): RenderEnv {
  let stored: string | null = null
  try {
    stored = window.localStorage.getItem(PREF_KEY)
  } catch {
    /* storage blocked — treat as no preference */
  }
  const nav = navigator as Navigator & { deviceMemory?: number }
  return {
    param: new URLSearchParams(location.search).get('render'),
    stored,
    webgl: hasWebGL(),
    cores: nav.hardwareConcurrency ?? 0,
    memory: nav.deviceMemory,
  }
}

/** Persist an explicit choice so the pick sticks across reloads (the toggle). */
export function persistRenderChoice(mode: '2d' | '3d'): void {
  try {
    window.localStorage.setItem(PREF_KEY, mode)
  } catch {
    /* storage blocked — the ?render= param still carries the choice for this load */
  }
}
