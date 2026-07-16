/**
 * CableRenderer — Path3D-style tube cables with catenary sag.
 * One transient DRAG cable (green/red/neutral from ConnectionGraph.canConnect's
 * verdict — the renderer never judges validity itself) and N committed cables.
 * Perf guard: CableBudget degrades committed cables to straight lines before
 * frames drop (CLAUDE.md).
 */
import { Color3, Mesh, MeshBuilder, Scene, StandardMaterial, Vector3 } from '@babylonjs/core'
import { CableBudget, catenaryPoints, SEGMENTS_FULL, type P3 } from './cablePath'
import { TOKENS } from '../design/tokens'

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

  // ── committed cables ───────────────────────────────────────────────────────

  addCable(connectionId: string, a: Vector3, b: Vector3): void {
    this.removeCable(connectionId)
    const segments = this.budget.grant(connectionId) // straight line once over budget
    const mesh = this.buildTube(`cable:${connectionId}`, a, b, segments)
    mesh.material = this.mats.committed
    this.committed.set(connectionId, mesh)
  }

  removeCable(connectionId: string): void {
    const mesh = this.committed.get(connectionId)
    if (!mesh) return
    mesh.dispose()
    this.committed.delete(connectionId)
    this.budget.release(connectionId)
  }

  private buildTube(name: string, a: Vector3, b: Vector3, segments: number): Mesh {
    const path = catenaryPoints(a, b, segments).map(toVec)
    const mesh = MeshBuilder.CreateTube(
      name,
      { path, radius: CABLE_RADIUS, tessellation: 8, updatable: true },
      this.scene,
    )
    mesh.isPickable = false
    return mesh
  }
}
