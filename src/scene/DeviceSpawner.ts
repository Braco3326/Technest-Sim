/**
 * DeviceSpawner — spawns a device at a position.
 * Tries public/assets/<deviceId>.glb; while absent (or on failure) the device
 * is a PLACEHOLDER BOX with labelled port markers read from the catalog.
 * Assets NEVER block gameplay: the placeholder is built synchronously, the
 * .glb (when it exists one day) replaces the visual asynchronously.
 */
import {
  Color3,
  DynamicTexture,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  TransformNode,
  Vector3,
} from '@babylonjs/core'
import type { Registry, DeviceT } from '../engine/CatalogLoader'
import type { PortRef } from '../engine/types'

export interface DeviceInstance {
  instanceId: string
  deviceId: string
  root: TransformNode
  /** portId → the pickable marker mesh (metadata.portRef is set). */
  portMarkers: Map<string, Mesh>
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

const DIR_COLOR: Record<string, Color3> = {
  in: Color3.FromHexString('#4da6ff'),
  out: Color3.FromHexString('#ffa94d'),
  bidir: Color3.FromHexString('#b98cff'),
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
    // Async .glb replacement is the asset track's job (Prompt A); the engine
    // and interaction only ever depend on the marker metadata built here.

    return {
      instanceId,
      deviceId,
      root,
      portMarkers,
      dispose: () => root.dispose(false, true),
    }
  }

  // ── placeholder box + labelled port markers ───────────────────────────────

  private buildPlaceholder(device: DeviceT, instanceId: string, root: TransformNode): Map<string, Mesh> {
    const [w, h, d] = SIZE_BY_CATEGORY[device.realWorld.category] ?? DEFAULT_SIZE

    const box = MeshBuilder.CreateBox(`box:${instanceId}`, { width: w, height: h, depth: d }, this.scene)
    box.parent = root
    box.position.y = h / 2
    box.material = this.material('body', '#39415c')
    box.isPickable = false

    this.labelPlane(`label:${instanceId}`, device.label, 0.8, 0.2, root, new Vector3(0, h + 0.22, 0))

    // Port grid on the camera-facing (−Z) side of the box.
    const markers = new Map<string, Mesh>()
    const n = device.ports.length
    if (n === 0) return markers
    const cols = Math.min(4, Math.ceil(Math.sqrt(n)))
    const rows = Math.ceil(n / cols)
    const sx = Math.max(0.04, Math.min(0.1, w / (cols + 1)))
    const sy = Math.max(0.045, Math.min(0.1, h / (rows + 1)))

    device.ports.forEach((port, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      const local = new Vector3(
        (col - (cols - 1) / 2) * sx,
        h / 2 + ((rows - 1) / 2 - row) * sy,
        -d / 2 - 0.015,
      )
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
      const capX = cols > 1 ? sx * 0.95 : 0.12
      const capY = rows > 1 ? sy * 0.95 : 0.12
      const pickDiameter = Math.max(0.035, Math.min(0.12, capX, capY))
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
        local.add(new Vector3(0, 0.055, -0.01)),
        22,
      )

      markers.set(port.portId, marker)
    })
    return markers
  }

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
    tex.hasAlpha = true
    tex.drawText(text, null, null, `bold ${fontPx}px system-ui`, '#e8ecff', 'transparent', true)

    const mat = new StandardMaterial(`mat:${name}`, this.scene)
    mat.diffuseTexture = tex
    mat.emissiveColor = Color3.White()
    mat.opacityTexture = tex
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
