/**
 * CableRenderer — Path3D-style tube cables with catenary sag.
 * One transient DRAG cable (green/red/neutral from ConnectionGraph.canConnect's
 * verdict — the renderer never judges validity itself) and N committed cables.
 * Perf guard: CableBudget degrades committed cables to straight lines before
 * frames drop (CLAUDE.md).
 */
import { Color3, Mesh, MeshBuilder, Scene, StandardMaterial, Vector3 } from '@babylonjs/core'
import { CableBudget, catenaryPoints, pointAlong, SEGMENTS_FULL, type P3 } from './cablePath'
import { motionEnabled, TOKENS } from '../design/tokens'

export type DragTint = 'neutral' | 'ok' | 'bad'

const toVec = (p: P3) => new Vector3(p.x, p.y, p.z)
const CABLE_RADIUS = 0.012

export class CableRenderer {
  private committed = new Map<string, Mesh>()
  private drag: { mesh: Mesh; from: Vector3 } | null = null
  private mats!: Record<DragTint | 'committed', StandardMaterial>

  constructor(
    private scene: Scene,
    private budget = new CableBudget(),
  ) {
    const make = (name: string, hex: string, glow = 0.6) => {
      const m = new StandardMaterial(`cable:${name}`, scene)
      const c = Color3.FromHexString(hex)
      m.diffuseColor = c
      m.emissiveColor = c.scale(glow)
      return m
    }
    this.mats = {
      neutral: make('neutral', TOKENS.color.cableNeutral, 0.35),
      ok: make('ok', TOKENS.color.cableOk, 0.4),
      bad: make('bad', TOKENS.color.cableBad, 0.4),
      committed: make('committed', TOKENS.color.cable, 0.1),
    }
  }

  // ── drag lifecycle ─────────────────────────────────────────────────────────

  beginDrag(from: Vector3): void {
    this.endDrag()
    this.drag = { mesh: this.buildTube('cable:drag', from, from, SEGMENTS_FULL), from: from.clone() }
    this.drag.mesh.material = this.mats.neutral
  }

  updateDrag(to: Vector3, tint: DragTint): void {
    if (!this.drag) return
    // Same point count every frame → cheap in-place tube update.
    const path = catenaryPoints(this.drag.from, to, SEGMENTS_FULL).map(toVec)
    this.drag.mesh = MeshBuilder.CreateTube('cable:drag', { path, instance: this.drag.mesh })
    this.drag.mesh.material = this.mats[tint]
  }

  endDrag(): void {
    this.drag?.mesh.dispose()
    this.drag = null
  }

  // ── committed cables + signal-flow pulses ──────────────────────────────────

  private pulses = new Map<string, { mesh: Mesh; path: P3[]; phase: number }>()
  private pulseObserverOn = false
  private static readonly PULSE_PERIOD_MS = 2400
  private static readonly PULSE_CAP = 12 // perf guard: no pulse swarm on huge rigs

  addCable(connectionId: string, a: Vector3, b: Vector3): void {
    this.removeCable(connectionId)
    const segments = this.budget.grant(connectionId) // straight line once over budget
    const path = catenaryPoints(a, b, segments)
    const mesh = this.buildTubeFromPath(`cable:${connectionId}`, path)
    mesh.material = this.mats.committed
    this.committed.set(connectionId, mesh)
    this.addPulse(connectionId, path)
  }

  /** Drop every committed cable + pulse (rig reload, ADR-0005). */
  clear(): void {
    for (const id of [...this.committed.keys()]) this.removeCable(id)
  }

  removeCable(connectionId: string): void {
    const mesh = this.committed.get(connectionId)
    if (!mesh) return
    mesh.dispose()
    this.committed.delete(connectionId)
    this.budget.release(connectionId)
    const pulse = this.pulses.get(connectionId)
    if (pulse) {
      pulse.mesh.dispose()
      this.pulses.delete(connectionId)
    }
  }

  /**
   * A small accent dot travelling out→in along the cable: the signal flow made
   * visible (pedagogical motion, VISION §6). Skipped entirely under
   * prefers-reduced-motion and beyond the pulse cap.
   */
  private addPulse(connectionId: string, path: P3[]): void {
    if (!motionEnabled() || this.pulses.size >= CableRenderer.PULSE_CAP) return
    const dot = MeshBuilder.CreateSphere(`pulse:${connectionId}`, { diameter: 0.024, segments: 8 }, this.scene)
    dot.material = this.pulseMat()
    dot.isPickable = false
    this.pulses.set(connectionId, { mesh: dot, path, phase: this.pulses.size * 0.17 })
    if (!this.pulseObserverOn) {
      this.pulseObserverOn = true
      this.scene.onBeforeRenderObservable.add(() => {
        const now = performance.now()
        for (const p of this.pulses.values()) {
          const t = (now / CableRenderer.PULSE_PERIOD_MS + p.phase) % 1
          const pos = pointAlong(p.path, t)
          p.mesh.position.set(pos.x, pos.y, pos.z)
        }
      })
    }
  }

  private pulseMaterial?: StandardMaterial
  private pulseMat(): StandardMaterial {
    if (!this.pulseMaterial) {
      this.pulseMaterial = new StandardMaterial('cable:pulse', this.scene)
      const c = Color3.FromHexString(TOKENS.color.accent)
      this.pulseMaterial.diffuseColor = c
      this.pulseMaterial.emissiveColor = c.scale(0.8)
    }
    return this.pulseMaterial
  }

  private buildTube(name: string, a: Vector3, b: Vector3, segments: number): Mesh {
    return this.buildTubeFromPath(name, catenaryPoints(a, b, segments))
  }

  private buildTubeFromPath(name: string, path: P3[]): Mesh {
    const mesh = MeshBuilder.CreateTube(
      name,
      { path: path.map(toVec), radius: CABLE_RADIUS, tessellation: 8, updatable: true },
      this.scene,
    )
    mesh.isPickable = false
    return mesh
  }
}
