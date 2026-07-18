/**
 * FocusPatch — the "Focus & Patch" input adapter (ADR-0008, spec §1-§3).
 * Translates pointer/keyboard into focusMachine events and executes the
 * machine's commands: camera flights (CameraRig), the held-cable indicator
 * (CableRenderer), compatible-device glow, and CONNECT intent dispatch.
 *
 * Discipline (spec §5): validation is the injected canConnect dry-run,
 * mutation is the injected dispatch — this module never imports the graph.
 */
import {
  AbstractMesh,
  ArcRotateCamera,
  Color3,
  Mesh,
  Plane,
  PointerEventTypes,
  Scene,
  Vector3,
} from '@babylonjs/core'
import type { ConnectResult, PortRef } from '../engine/types'
import type { Intent } from '../ui/intents'
import type { DeviceInstance } from './DeviceSpawner'
import type { PortPoint } from './snap'
import { CameraRig } from './CameraRig'
import type { CableRenderer } from './CableRenderer'
import {
  initialState,
  reduce,
  repickup,
  type FocusCommand,
  type FocusState,
} from './focusMachine'
import { TOKENS } from '../design/tokens'

export interface FocusPatchDeps {
  /** Dry-run verdict — ConnectionGraph.canConnect, injected by the bootstrap. */
  canConnect(a: PortRef, b: PortRef): ConnectResult
  dispatch(intent: Intent): void
  /**
   * Teaching hints gate (spec §3): true in Learn/Levels, false in Exam,
   * toggleable in Sandbox. Gates device glow, port dim AND the green/red
   * tint of the held cable (a neutral cable still shows — it is state, not a hint).
   */
  hints(): boolean
  /** Hover candidate while a cable is held (drives the marker breathing). */
  onCandidate?(ref: PortRef | null): void
}

const same = (a: PortRef, b: PortRef) => a.instance === b.instance && a.port === b.port
const OUTLINE_WIDTH = 0.012
const DIM_VISIBILITY = 0.35

export class FocusPatch {
  private state: FocusState = initialState()
  private glowing = new Set<AbstractMesh>()
  private dimmed = new Set<Mesh>()
  private hoverRef: PortRef | null = null
  private outlineColor = Color3.FromHexString(TOKENS.color.accent)

  constructor(
    private scene: Scene,
    private camera: ArcRotateCamera,
    private rig: CameraRig,
    private cables: CableRenderer,
    private instances: readonly DeviceInstance[],
    private ports: readonly PortPoint[],
    private deps: FocusPatchDeps,
  ) {
    scene.onPointerObservable.add((info) => {
      switch (info.type) {
        case PointerEventTypes.POINTERTAP:
          this.onTap((info.event as PointerEvent).button)
          break
        case PointerEventTypes.POINTERDOUBLETAP:
          this.onDoubleTap()
          break
        case PointerEventTypes.POINTERMOVE:
          this.onMove()
          break
      }
    })

    // Right-click must reach the machine, not the browser menu (spec §2).
    const canvas = scene.getEngine().getRenderingCanvas()
    canvas?.addEventListener('contextmenu', (e) => e.preventDefault())

    window.addEventListener('keydown', this.onKey)
  }

  /** e2e/debug view — mode, focused device, held cable end. */
  get view(): { mode: FocusState['mode']; focused: string | null; held: PortRef | null; selected: string | null } {
    return { mode: this.state.mode, focused: this.state.focused, held: this.state.held, selected: this.state.selected }
  }

  /** e2e/debug — how many meshes currently carry the hint glow (exam ⇒ 0). */
  get glowCount(): number {
    return this.glowing.size
  }

  /** Re-derive glow/dim after any graph change (occupancy moved). Called by refresh(). */
  refreshHints(): void {
    this.applyHints()
  }

  // ── input → machine events ──────────────────────────────────────────────────

  private onTap(button: number): void {
    if (button === 2) {
      this.apply(reduce(this.state, { type: 'RIGHT_CLICK' }))
      return
    }
    const port = this.portUnderPointer()
    if (port) {
      this.apply(reduce(this.state, { type: 'PORT_CLICK', ref: port }))
      return
    }
    const device = this.deviceUnderPointer()
    if (device) {
      this.apply(reduce(this.state, { type: 'DEVICE_CLICK', instanceId: device }))
      return
    }
    this.apply(reduce(this.state, { type: 'EMPTY_CLICK' }))
  }

  private onDoubleTap(): void {
    // Double-click only focuses when it lands on a device BODY — a fast
    // double-click on a port stays a port action (the TAP already handled it).
    if (this.portUnderPointer()) return
    const device = this.deviceUnderPointer()
    if (device) this.apply(reduce(this.state, { type: 'DEVICE_DOUBLE_CLICK', instanceId: device }))
  }

  private onKey = (e: KeyboardEvent): void => {
    // Never hijack keys while the learner is inside HUD controls (a11y).
    const active = document.activeElement
    const inHud = active && active !== document.body && active.tagName !== 'CANVAS'
    switch (e.key) {
      case 'Escape':
        this.apply(reduce(this.state, { type: 'ESC' }))
        break
      case 'Tab':
        if (inHud) return
        e.preventDefault()
        this.apply(reduce(this.state, { type: 'TAB', instanceIds: this.instances.map((i) => i.instanceId) }))
        break
      case 'Enter':
        if (inHud) return
        this.apply(reduce(this.state, { type: 'ENTER' }))
        break
      case 'ArrowLeft':
      case 'ArrowRight':
      case 'ArrowUp':
      case 'ArrowDown': {
        if (inHud || this.state.mode !== 'focus') return
        e.preventDefault()
        // Keyboard orbit (spec §2) — same camera the mouse drags, small steps.
        if (e.key === 'ArrowLeft') this.camera.alpha -= 0.09
        if (e.key === 'ArrowRight') this.camera.alpha += 0.09
        if (e.key === 'ArrowUp') this.camera.beta = Math.max(0.15, this.camera.beta - 0.06)
        if (e.key === 'ArrowDown') this.camera.beta = Math.min(Math.PI / 2 + 0.3, this.camera.beta + 0.06)
        break
      }
    }
  }

  private onMove(): void {
    if (!this.state.held) return
    const from = this.portPoint(this.state.held)
    if (!from) return

    const hover = this.portUnderPointer()
    const hoverKey = hover ? `${hover.instance} ${hover.port}` : ''
    const prevKey = this.hoverRef ? `${this.hoverRef.instance} ${this.hoverRef.port}` : ''
    if (hoverKey !== prevKey) {
      this.hoverRef = hover
      this.deps.onCandidate?.(hover)
    }

    if (hover && !same(hover, this.state.held)) {
      const target = this.portPoint(hover)
      if (target) {
        const verdict = this.deps.canConnect(this.state.held, hover).ok
        this.cables.updateDrag(
          new Vector3(target.x, target.y, target.z),
          this.deps.hints() ? (verdict ? 'ok' : 'bad') : 'neutral',
        )
        return
      }
    }
    // Free end follows the pointer on a camera-facing plane at the port's depth.
    const origin = new Vector3(from.x, from.y, from.z)
    const plane = Plane.FromPositionAndNormal(origin, this.camera.getForwardRay().direction.negate())
    const ray = this.scene.createPickingRay(this.scene.pointerX, this.scene.pointerY, null, this.camera)
    const dist = ray.intersectsPlane(plane)
    if (dist !== null) this.cables.updateDrag(ray.origin.add(ray.direction.scale(dist)), 'neutral')
  }

  // ── machine commands → effects ──────────────────────────────────────────────

  private apply(t: { state: FocusState; commands: FocusCommand[] }): void {
    this.state = t.state
    for (const cmd of t.commands) this.exec(cmd)
    this.applyHints()
  }

  private exec(cmd: FocusCommand): void {
    switch (cmd.kind) {
      case 'flyToDevice': {
        const inst = this.instances.find((i) => i.instanceId === cmd.instanceId)
        if (!inst) return
        const { min, max } = inst.root.getHierarchyBoundingVectors()
        this.rig.flyToDevice({
          center: min.add(max).scale(0.5),
          boundingRadius: max.subtract(min).length() / 2,
        })
        break
      }
      case 'flyToEnsemble':
        this.rig.flyToEnsemble()
        break
      case 'pickup': {
        const p = this.portPoint(cmd.from)
        if (p) this.cables.beginDrag(new Vector3(p.x, p.y, p.z))
        break
      }
      case 'dropHeld':
        this.cables.endDrag()
        this.deps.onCandidate?.(null)
        this.hoverRef = null
        break
      case 'connect': {
        const accepted = this.deps.canConnect(cmd.a, cmd.b).ok
        this.cables.endDrag()
        this.deps.onCandidate?.(null)
        this.hoverRef = null
        // The intent ALWAYS goes out — a rejection toasts the teaching text
        // (that rejection IS the R1-R3 lesson). On reject, the cable returns
        // to the hand so the learner retries without re-clicking the source.
        this.deps.dispatch({ type: 'CONNECT', a: cmd.a, b: cmd.b })
        if (!accepted) this.apply(repickup(this.state, cmd.a))
        break
      }
    }
  }

  // ── teaching hints (spec §3, mode-gated) ────────────────────────────────────

  /**
   * Ensemble + held cable → devices with a FREE compatible port glow.
   * Focus + held cable → compatible port markers glow, incompatible dim.
   * hints() false (Exam / sandbox toggle) → nothing glows, ever.
   */
  private applyHints(): void {
    this.clearHints()
    if (!this.state.held || !this.deps.hints()) return
    const held = this.state.held

    if (this.state.mode === 'ensemble') {
      for (const inst of this.instances) {
        if (inst.instanceId === held.instance) continue
        const compatible = this.ports.some(
          (p) => p.ref.instance === inst.instanceId && this.deps.canConnect(held, p.ref).ok,
        )
        if (!compatible) continue
        for (const mesh of this.bodyMeshes(inst)) {
          mesh.renderOutline = true
          mesh.outlineColor = this.outlineColor
          mesh.outlineWidth = OUTLINE_WIDTH
          this.glowing.add(mesh)
        }
      }
      return
    }

    // Focus: judge the framed device's ports (and the held end stays neutral).
    const focused = this.instances.find((i) => i.instanceId === this.state.focused)
    if (!focused) return
    for (const [portId, marker] of focused.portMarkers) {
      const ref = { instance: focused.instanceId, port: portId }
      if (same(ref, held)) continue
      if (this.deps.canConnect(held, ref).ok) {
        marker.renderOutline = true
        marker.outlineColor = this.outlineColor
        marker.outlineWidth = OUTLINE_WIDTH / 2
        this.glowing.add(marker)
      } else {
        marker.visibility = DIM_VISIBILITY
        this.dimmed.add(marker)
      }
    }
  }

  private clearHints(): void {
    for (const mesh of this.glowing) mesh.renderOutline = false
    for (const mesh of this.dimmed) mesh.visibility = 1
    this.glowing.clear()
    this.dimmed.clear()
  }

  // ── picking helpers ─────────────────────────────────────────────────────────

  private portPoint(ref: PortRef): PortPoint | undefined {
    return this.ports.find((p) => same(p.ref, ref))
  }

  /** multiPick + closest-center-to-ray (dense grids pick the aimed port, not a neighbour). */
  private portUnderPointer(): PortRef | null {
    const hits = this.scene.multiPick(
      this.scene.pointerX,
      this.scene.pointerY,
      (m: AbstractMesh) => m.metadata?.isPortMarker === true,
    )
    if (!hits?.length) return null
    const ray = this.scene.createPickingRay(this.scene.pointerX, this.scene.pointerY, null, this.camera)
    let best: PortRef | null = null
    let bestD = Infinity
    for (const hit of hits) {
      const mesh = hit.pickedMesh
      if (!mesh) continue
      const d = ray.direction.cross(mesh.getAbsolutePosition().subtract(ray.origin)).length()
      if (d < bestD) {
        bestD = d
        best = mesh.metadata.portRef as PortRef
      }
    }
    return best
  }

  private deviceUnderPointer(): string | null {
    const hit = this.scene.pick(
      this.scene.pointerX,
      this.scene.pointerY,
      (m: AbstractMesh) => m.metadata?.isDeviceBody === true,
    )
    return hit?.pickedMesh?.metadata?.instanceId ?? null
  }

  private bodyMeshes(inst: DeviceInstance): AbstractMesh[] {
    return inst.root
      .getChildMeshes(false)
      .filter((m) => m.metadata?.isDeviceBody === true)
  }
}
