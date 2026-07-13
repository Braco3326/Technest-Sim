/**
 * Interaction — pointer pick → drag → snap → drop.
 * The snap CANDIDATE is geometry (snap.ts); the green/red verdict is
 * ConnectionGraph.canConnect — validation is NEVER re-implemented here.
 * On drop, this layer only DISPATCHES a CONNECT intent; the orchestrator
 * mutates the graph and reports back (CLAUDE.md unidirectional flow).
 */
import {
  AbstractMesh,
  ArcRotateCamera,
  Plane,
  PointerEventTypes,
  Scene,
  Vector3,
} from '@babylonjs/core'
import type { ConnectResult, PortRef } from '../engine/types'
import type { Intent } from '../ui/intents'
import { nearestPort, type PortPoint } from './snap'
import type { CableRenderer } from './CableRenderer'

export interface InteractionDeps {
  /** Dry-run verdict — ConnectionGraph.canConnect, injected by the bootstrap. */
  canConnect(a: PortRef, b: PortRef): ConnectResult
  dispatch(intent: Intent): void
}

interface DragState {
  from: PortPoint
  candidate: PortPoint | null
  candidateOk: boolean
  plane: Plane
}

export class Interaction {
  private drag: DragState | null = null

  constructor(
    private scene: Scene,
    private camera: ArcRotateCamera,
    private cables: CableRenderer,
    private ports: readonly PortPoint[],
    private deps: InteractionDeps,
  ) {
    scene.onPointerObservable.add((info) => {
      switch (info.type) {
        case PointerEventTypes.POINTERDOWN:
          this.onDown()
          break
        case PointerEventTypes.POINTERMOVE:
          this.onMove()
          break
        case PointerEventTypes.POINTERUP:
          this.onUp()
          break
      }
    })
  }

  /** The port the current drag would connect to, and whether it shows green. */
  get snapCandidate(): { ref: PortRef; ok: boolean } | null {
    if (!this.drag?.candidate) return null
    return { ref: this.drag.candidate.ref, ok: this.drag.candidateOk }
  }

  private onDown(): void {
    const pick = this.scene.pick(
      this.scene.pointerX,
      this.scene.pointerY,
      (m: AbstractMesh) => m.metadata?.isPortMarker === true,
    )
    const ref = pick?.pickedMesh?.metadata?.portRef as PortRef | undefined
    if (!ref) return

    const from = this.ports.find((p) => p.ref.instance === ref.instance && p.ref.port === ref.port)
    if (!from) return

    // Drag on a camera-facing plane through the start port.
    const normal = this.camera.getForwardRay().direction.negate()
    this.drag = {
      from,
      candidate: null,
      candidateOk: false,
      plane: Plane.FromPositionAndNormal(new Vector3(from.x, from.y, from.z), normal),
    }
    this.camera.detachControl()
    this.cables.beginDrag(new Vector3(from.x, from.y, from.z))
  }

  private onMove(): void {
    if (!this.drag) return
    const point = this.pointerOnPlane(this.drag.plane)
    if (!point) return

    // Candidate 1 — pick: pointer directly over a port's pick sphere. Depth-
    // accurate (the drag plane sits at the START port's depth, so a far/near
    // target would never be within 15 cm of the plane point).
    let candidate = this.pickPort()
    // Candidate 2 — geometric fallback for near-misses at similar depth.
    if (!candidate) candidate = nearestPort(this.ports, point, this.drag.from.ref)
    this.drag.candidate = candidate
    if (candidate) {
      // Dry-run through the ENGINE — single source of validation truth.
      this.drag.candidateOk = this.deps.canConnect(this.drag.from.ref, candidate.ref).ok
      this.cables.updateDrag(
        new Vector3(candidate.x, candidate.y, candidate.z),
        this.drag.candidateOk ? 'ok' : 'bad',
      )
    } else {
      this.drag.candidateOk = false
      this.cables.updateDrag(point, 'neutral')
    }
  }

  private onUp(): void {
    if (!this.drag) return
    const { from, candidate, candidateOk } = this.drag
    this.drag = null
    this.camera.attachControl(true)
    this.cables.endDrag()

    // Drop on a green candidate → intent. The orchestrator owns the mutation;
    // it re-validates via connect() and draws the committed cable on success.
    if (candidate && candidateOk) {
      this.deps.dispatch({ type: 'CONNECT', a: from.ref, b: candidate.ref })
    }
  }

  /** Port pick sphere under the pointer (excluding the drag origin), if any. */
  private pickPort(): PortPoint | null {
    if (!this.drag) return null
    const pick = this.scene.pick(
      this.scene.pointerX,
      this.scene.pointerY,
      (m: AbstractMesh) => m.metadata?.isPortMarker === true,
    )
    const ref = pick?.pickedMesh?.metadata?.portRef as PortRef | undefined
    if (!ref) return null
    const from = this.drag.from.ref
    if (ref.instance === from.instance && ref.port === from.port) return null
    return this.ports.find((p) => p.ref.instance === ref.instance && p.ref.port === ref.port) ?? null
  }

  private pointerOnPlane(plane: Plane): Vector3 | null {
    const ray = this.scene.createPickingRay(this.scene.pointerX, this.scene.pointerY, null, this.camera)
    const dist = ray.intersectsPlane(plane)
    return dist === null ? null : ray.origin.add(ray.direction.scale(dist))
  }
}
