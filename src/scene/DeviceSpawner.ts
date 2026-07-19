/**
 * DeviceSpawner — spawns a device at a position.
 * Tries public/assets/<deviceId>.glb; while absent (or on failure) the device
 * is a PLACEHOLDER BOX with labelled port markers read from the catalog.
 * Assets NEVER block gameplay: the placeholder is built synchronously, the
 * .glb (when it exists one day) replaces the visual asynchronously.
 */
import {
  AbstractMesh,
  Color3,
  DynamicTexture,
  Mesh,
  MeshBuilder,
  Scene,
  SceneLoader,
  StandardMaterial,
  TransformNode,
  Vector3,
} from '@babylonjs/core'
import '@babylonjs/loaders/glTF'
import type { Registry, DeviceT } from '../engine/CatalogLoader'
import type { PortRef } from '../engine/types'
import { TOKENS } from '../design/tokens'

export interface DeviceInstance {
  instanceId: string
  deviceId: string
  root: TransformNode
  /** portId → the pickable marker mesh (metadata.portRef is set). */
  portMarkers: Map<string, Mesh>
  /** Set to 'glb' once the model loads + normalises, 'placeholder' otherwise. */
  assetStatus: 'glb' | 'placeholder'
  /** Resolves true when the .glb applied (ports re-anchored), false on fallback. */
  modelReady: Promise<boolean>
  dispose(): void
}

/** Rough placeholder footprints per realWorld.category (meters: w, h, d). */
const SIZE_BY_CATEGORY: Record<string, [number, number, number]> = {
  console: [1.0, 0.25, 0.55],
  stagebox: [0.48, 0.18, 0.4],
  microphone: [0.07, 0.22, 0.07],
  'powered-speaker': [0.4, 0.62, 0.36],
  'studio-monitor': [0.2, 0.3, 0.25],
  accessory: [0.06, 1.6, 0.06],
  signaling: [0.12, 0.28, 0.12],
  computer: [0.45, 0.45, 0.2],
  codec: [0.48, 0.09, 0.32],
  'monitor-controller': [0.26, 0.1, 0.3],
  'mic-preamp': [0.24, 0.09, 0.26],
  'master-clock': [0.48, 0.09, 0.26],
  patchbay: [0.48, 0.14, 0.22],
  cable: [0.3, 0.06, 0.12],
  'audio-interface': [0.48, 0.13, 0.3],
}
const DEFAULT_SIZE: [number, number, number] = [0.4, 0.3, 0.3]

/**
 * Real-world outer dimensions per device id (meters: w=width, h=height, d=depth).
 * Source: assets-source/ ** /notes.md (manufacturer datasheets).
 * Height is the normalisation anchor (most reliable across the glb set): the
 * imported model is scaled UNIFORMLY so its measured height matches h. Ids
 * absent here are left unscaled (see tryLoadModel). Also drives the re-anchored
 * port grid so markers sit on the real -Z face of the normalised model.
 */
const REAL_SIZE_M: Record<string, { w: number; h: number; d: number }> = {
  'shure-sm58': { w: 0.051, h: 0.162, d: 0.051 },
  'shure-sm57': { w: 0.032, h: 0.157, d: 0.032 },
  'ev-re20': { w: 0.0544, h: 0.2167, d: 0.0544 },
  'ev-re50': { w: 0.049, h: 0.197, d: 0.049 },
  'neumann-u87-ai': { w: 0.056, h: 0.2, d: 0.056 },
  'qsc-k12-2': { w: 0.356, h: 0.602, d: 0.35 },
  'yamaha-dbr12': { w: 0.376, h: 0.601, d: 0.348 },
  'genelec-8030c': { w: 0.189, h: 0.299, d: 0.178 },
  'yamaha-ql1': { w: 0.468, h: 0.272, d: 0.562 },
  'yamaha-rio3224-d2': { w: 0.48, h: 0.22, d: 0.368 },
  'axia-iq': { w: 0.521, h: 0.114, d: 0.483 },
  'avid-hd-io': { w: 0.483, h: 0.089, d: 0.305 },
  'focusrite-isa-one': { w: 0.22, h: 0.104, d: 0.29 },
  'grace-m905': { w: 0.483, h: 0.089, d: 0.432 },
  'antelope-ocx-hd': { w: 0.4826, h: 0.044, d: 0.23 },
  'aeta-scoop5-s': { w: 0.48, h: 0.044, d: 0.252 },
  'aeta-scoopy-plus-s': { w: 0.155, h: 0.08, d: 0.234 },
  'switchcraft-studiopatch-9625': { w: 0.4826, h: 0.0445, d: 0.22 },
  'km-210-9': { w: 0.6, h: 1.6, d: 0.4 },
  'avid-protools-hdx': { w: 0.2, h: 0.45, d: 0.45 },
  'playout-pc': { w: 0.2, h: 0.45, d: 0.45 },
  'yellowtec-litt': { w: 0.051, h: 0.28, d: 0.051 },
  'yellowtec-mika': { w: 0.09, h: 0.45, d: 0.787 },
  'mogami-gold-db25-xlrm': { w: 0.3, h: 0.06, d: 0.12 },
}

/** A port slot in the −Z grid: local position of its marker + its pick radius. */
interface PortSlot {
  local: Vector3
  pickDiameter: number
}

/**
 * Deterministic port grid on the camera-facing (−Z) face for a box of size
 * (w,h,d). Shared by the placeholder build and the glb re-anchor so markers,
 * pick spheres and labels land identically on both — the glb version just uses
 * the REAL dimensions instead of the rough placeholder footprint.
 */
function portGrid(n: number, w: number, h: number, d: number): PortSlot[] {
  if (n === 0) return []
  const cols = Math.min(4, Math.ceil(Math.sqrt(n)))
  const rows = Math.ceil(n / cols)
  const sx = Math.max(0.04, Math.min(0.1, w / (cols + 1)))
  const sy = Math.max(0.045, Math.min(0.1, h / (rows + 1)))
  const capX = cols > 1 ? sx * 0.95 : 0.12
  const capY = rows > 1 ? sy * 0.95 : 0.12
  const pickDiameter = Math.max(0.035, Math.min(0.12, capX, capY))
  const slots: PortSlot[] = []
  for (let i = 0; i < n; i++) {
    const col = i % cols
    const row = Math.floor(i / cols)
    slots.push({
      local: new Vector3((col - (cols - 1) / 2) * sx, h / 2 + ((rows - 1) / 2 - row) * sy, -d / 2 - 0.015),
      pickDiameter,
    })
  }
  return slots
}

/** Offset of a port label above its marker (kept identical everywhere). */
const PORT_LABEL_OFFSET = new Vector3(0, 0.055, -0.01)

const DIR_COLOR: Record<string, Color3> = {
  in: Color3.FromHexString(TOKENS.color.portIn),
  out: Color3.FromHexString(TOKENS.color.portOut),
  bidir: Color3.FromHexString(TOKENS.color.portBidir),
}

export class DeviceSpawner {
  private materials = new Map<string, StandardMaterial>()

  constructor(
    private scene: Scene,
    private registry: Registry,
  ) {}

  spawn(deviceId: string, position: Vector3, instanceId = deviceId): DeviceInstance {
    const device = this.registry.deviceById.get(deviceId)
    if (!device) throw new Error(`content bug: unknown deviceId "${deviceId}"`)

    const root = new TransformNode(`dev:${instanceId}`, this.scene)
    root.position = position.clone()

    const portMarkers = this.buildPlaceholder(device, instanceId, root)

    const instance: DeviceInstance = {
      instanceId,
      deviceId,
      root,
      portMarkers,
      assetStatus: 'placeholder',
      // Reassigned below to the real load promise; typed here so the object is
      // fully-formed before tryLoadModel can flip assetStatus.
      modelReady: Promise.resolve(false),
      dispose: () => root.dispose(false, true),
    }

    // Async .glb replacement — assets NEVER block gameplay: the placeholder is
    // live immediately, the model swaps in (and re-anchors the ports) when (and
    // only when) it loads. Engine + interaction depend only on marker metadata.
    instance.modelReady = this.tryLoadModel(device, instanceId, root, portMarkers, instance)

    return instance
  }

  /**
   * Swap the placeholder box for public/assets/<deviceId>.glb when it exists,
   * NORMALISED to real-world scale: uniform-scaled by height, grounded (min.y=0),
   * centered on the instance origin, oriented I/O toward −Z. Then the existing
   * port markers/pick-spheres/labels are RE-ANCHORED onto the real −Z face so
   * cables land on the visible model (not the placeholder grid).
   *
   * Any failure (404, decode, Draco) keeps the box — gameplay never depends on
   * the model. Resolves true when the glb applied, false on fallback.
   */
  private tryLoadModel(
    device: DeviceT,
    instanceId: string,
    root: TransformNode,
    portMarkers: Map<string, Mesh>,
    instance: DeviceInstance,
  ): Promise<boolean> {
    const deviceId = device.id
    return SceneLoader.ImportMeshAsync(null, '/assets/', `${deviceId}.glb`, this.scene)
      .then(({ meshes }) => {
        const glbRoot = meshes[0]
        glbRoot.name = `glb:${instanceId}`
        glbRoot.parent = root
        // The model is the double-click focus target too (ADR-0008).
        for (const m of meshes) {
          m.isPickable = true
          m.metadata = { ...(m.metadata ?? {}), isDeviceBody: true, instanceId }
        }

        const scale = this.normalizeModel(deviceId, glbRoot)
        this.reanchorPorts(device, instanceId, glbRoot, portMarkers)

        this.scene.getMeshByName(`box:${instanceId}`)?.setEnabled(false)
        instance.assetStatus = 'glb'
        console.info(`[assets] ${deviceId}: glb chargé (${meshes.length} meshes, scale ×${scale.toFixed(3)})`)
        return true
      })
      .catch((e: unknown) => {
        const reason = e instanceof Error ? e.message : String(e)
        console.info(`[assets] ${deviceId}: placeholder (échec: ${reason})`)
        return false
      })
  }

  /**
   * Normalise an imported glb IN PLACE (root-local, since the instance root only
   * translates — no rotation/scale): uniform scale by REAL height, ground min.y
   * to the instance origin, center X/Z, and rotate 180° if the ports face +Z.
   * Returns the applied scale factor (1 when the id has no known real size).
   */
  private normalizeModel(deviceId: string, glbRoot: AbstractMesh): number {
    const real = REAL_SIZE_M[deviceId]
    const origin = glbRoot.parent instanceof TransformNode
      ? (glbRoot.parent as TransformNode).getAbsolutePosition()
      : Vector3.Zero()

    glbRoot.computeWorldMatrix(true)
    let bounds = glbRoot.getHierarchyBoundingVectors()
    const height0 = bounds.max.y - bounds.min.y

    // (a/b) uniform scale by height — the most reliable anchor across the set.
    const scale = real && height0 > 1e-6 ? real.h / height0 : 1
    if (scale !== 1) {
      glbRoot.scaling.setAll(scale)
      glbRoot.computeWorldMatrix(true)
      bounds = glbRoot.getHierarchyBoundingVectors()
    }

    // (e) orientation: if the port empties sit on +Z, spin 180° so I/O faces −Z.
    // Applied BEFORE grounding/centering so absolute anchors follow the spin.
    const empties = glbRoot
      .getDescendants(false)
      .filter((n): n is TransformNode => n instanceof TransformNode && /port[_:]/i.test(n.name))
    if (empties.length) {
      console.info(`[assets] ${deviceId}: ${empties.length} empties port_* trouvés — ${empties.map((n) => n.name).join(', ')}`)
      let meanZ = 0
      for (const n of empties) meanZ += n.getAbsolutePosition().z - origin.z
      meanZ /= empties.length
      if (meanZ > 0) {
        glbRoot.rotation.y += Math.PI
        glbRoot.computeWorldMatrix(true)
        bounds = glbRoot.getHierarchyBoundingVectors()
      }
    }

    // (c) ground: shift so the lowest point sits at the instance origin's y.
    glbRoot.position.y -= bounds.min.y - origin.y
    // (d) center X/Z on the instance origin.
    const cx = (bounds.min.x + bounds.max.x) / 2
    const cz = (bounds.min.z + bounds.max.z) / 2
    glbRoot.position.x -= cx - origin.x
    glbRoot.position.z -= cz - origin.z
    glbRoot.computeWorldMatrix(true)
    return scale
  }

  /**
   * Re-anchor the existing port markers / pick-spheres / labels onto the −Z face
   * of the NORMALISED model, using REAL dimensions (falls back to the measured
   * normalised bounds when the id is unknown). Look (size/color) is untouched —
   * only positions move. NOTE: current glb assets carry NO `port_*` empties
   * (gen_asset.py exports selection-only), so anchoring uses the −Z face grid;
   * see docs/REVIEW-ME.md §10.
   */
  private reanchorPorts(
    device: DeviceT,
    instanceId: string,
    glbRoot: AbstractMesh,
    portMarkers: Map<string, Mesh>,
  ): void {
    if (device.ports.length === 0) return
    const real = REAL_SIZE_M[device.id]
    let w: number, h: number, d: number
    if (real) {
      ;({ w, h, d } = real)
    } else {
      const b = glbRoot.getHierarchyBoundingVectors()
      w = b.max.x - b.min.x
      h = b.max.y - b.min.y
      d = b.max.z - b.min.z
    }

    const slots = portGrid(device.ports.length, w, h, d)
    device.ports.forEach((port, i) => {
      const { local } = slots[i]
      const marker = portMarkers.get(port.portId)
      if (marker) {
        marker.position = local.clone()
        marker.computeWorldMatrix(true)
      }
      const pick = this.scene.getMeshByName(`pick:${instanceId}:${port.portId}`)
      if (pick) {
        pick.position = local.clone()
        pick.computeWorldMatrix(true)
      }
      const label = this.scene.getMeshByName(`portlabel:${instanceId}:${port.portId}`)
      if (label) {
        label.position = local.add(PORT_LABEL_OFFSET)
        label.computeWorldMatrix(true)
      }
    })
  }

  // ── placeholder box + labelled port markers ───────────────────────────────

  private buildPlaceholder(device: DeviceT, instanceId: string, root: TransformNode): Map<string, Mesh> {
    const [w, h, d] = SIZE_BY_CATEGORY[device.realWorld.category] ?? DEFAULT_SIZE

    const box = MeshBuilder.CreateBox(`box:${instanceId}`, { width: w, height: h, depth: d }, this.scene)
    box.parent = root
    box.position.y = h / 2
    box.material = this.material('body', TOKENS.color.deviceBody)
    // Focus & Patch (ADR-0008): the body is the double-click focus target.
    box.isPickable = true
    box.metadata = { isDeviceBody: true, instanceId }

    // Soft contact shadow: a radial-gradient blob on the floor grounds the
    // device on the white stage (VISION §6 "gentle contact shadows").
    this.shadowBlob(instanceId, Math.max(w, d) * 1.7, root)

    this.labelPlane(`label:${instanceId}`, device.label, 0.8, 0.2, root, new Vector3(0, h + 0.22, 0))

    // Port grid on the camera-facing (−Z) side of the box (placeholder dims).
    // The exact same grid geometry is re-applied with REAL dims once the glb
    // loads (reanchorPorts), so markers/cables track the visible model.
    const markers = new Map<string, Mesh>()
    const slots = portGrid(device.ports.length, w, h, d)
    device.ports.forEach((port, i) => {
      const { local, pickDiameter } = slots[i]
      const ref: PortRef = { instance: instanceId, port: port.portId }

      const marker = MeshBuilder.CreateCylinder(
        `port:${instanceId}:${port.portId}`,
        { diameter: 0.05, height: 0.02, tessellation: 16 },
        this.scene,
      )
      marker.rotation.x = Math.PI / 2
      marker.parent = root
      marker.position = local
      marker.material = this.material(`dir:${port.dir}`, undefined, DIR_COLOR[port.dir])
      marker.isPickable = false

      // Invisible, enlarged pick target — capped by grid spacing ONLY along
      // axes that actually have neighbours: overlapping spheres make the ray
      // grab a neighbour port, but a lone port keeps the full comfort size.
      const pick = MeshBuilder.CreateSphere(`pick:${instanceId}:${port.portId}`, { diameter: pickDiameter }, this.scene)
      pick.parent = root
      pick.position = local
      pick.visibility = 0
      pick.isPickable = true
      pick.metadata = { isPortMarker: true, portRef: ref }

      this.labelPlane(
        `portlabel:${instanceId}:${port.portId}`,
        port.portId,
        0.34,
        0.085,
        root,
        local.add(PORT_LABEL_OFFSET),
        22,
      )

      markers.set(port.portId, marker)
    })
    return markers
  }

  /** Radial soft-shadow decal under the device (cheap contact shadow). */
  private shadowBlob(instanceId: string, size: number, parent: TransformNode): void {
    let tex = this.shadowTexture
    if (!tex) {
      tex = new DynamicTexture('tex:contact-shadow', { width: 256, height: 256 }, this.scene, false)
      const ctx = tex.getContext() as CanvasRenderingContext2D
      const g = ctx.createRadialGradient(128, 128, 8, 128, 128, 126)
      g.addColorStop(0, TOKENS.color.contactShadow)
      g.addColorStop(1, 'rgba(20, 24, 32, 0)')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, 256, 256)
      tex.update()
      tex.hasAlpha = true
      this.shadowTexture = tex
    }
    const mat = new StandardMaterial(`mat:shadow:${instanceId}`, this.scene)
    mat.diffuseTexture = tex
    mat.opacityTexture = tex
    mat.emissiveColor = Color3.Black()
    mat.diffuseColor = Color3.Black()
    mat.disableLighting = true

    const blob = MeshBuilder.CreatePlane(`shadow:${instanceId}`, { size }, this.scene)
    blob.rotation.x = Math.PI / 2
    blob.parent = parent
    // A contact shadow lives on the FLOOR even when the device is elevated
    // (layout y > 0, e.g. a mic sitting on its stand) — compensate the parent.
    blob.position.y = 0.002 - parent.position.y
    blob.material = mat
    blob.isPickable = false
  }
  private shadowTexture?: DynamicTexture

  private labelPlane(
    name: string,
    text: string,
    wPlane: number,
    hPlane: number,
    parent: TransformNode,
    position: Vector3,
    fontPx = 44,
  ): void {
    const texW = 512
    const texH = Math.round((texW * hPlane) / wPlane)
    const tex = new DynamicTexture(`tex:${name}`, { width: texW, height: texH }, this.scene, false)
    // Ink on OPAQUE white — a tiny gallery label card. No alpha pipeline at
    // all: dark glyphs die in luminance-derived opacity (learned the hard way).
    tex.drawText(text, null, null, `bold ${fontPx}px sans-serif`, TOKENS.color.ink, TOKENS.color.floor, true)

    const mat = new StandardMaterial(`mat:${name}`, this.scene)
    mat.emissiveTexture = tex
    mat.disableLighting = true
    mat.backFaceCulling = false

    const plane = MeshBuilder.CreatePlane(name, { width: wPlane, height: hPlane }, this.scene)
    plane.parent = parent
    plane.position = position
    plane.material = mat
    plane.billboardMode = Mesh.BILLBOARDMODE_ALL
    plane.isPickable = false
  }

  /** Shared materials (one per body/direction) — placeholders must stay cheap. */
  private material(key: string, hex?: string, color?: Color3): StandardMaterial {
    let mat = this.materials.get(key)
    if (!mat) {
      mat = new StandardMaterial(`mat:${key}`, this.scene)
      const c = color ?? Color3.FromHexString(hex ?? '#888888')
      mat.diffuseColor = c
      mat.emissiveColor = c.scale(0.25)
      this.materials.set(key, mat)
    }
    return mat
  }
}
