/**
 * Render2D — the low-fidelity, WebGL-free board (VISION: playable on weak PCs).
 * Draws the SAME rig the Babylon scene shows (devices, ports, cables) as an SVG,
 * and drives the SAME engine through CONNECT/DISCONNECT intents. No Babylon, no
 * shaders — just DOM. Click a port, click a second port → connect (green/red
 * dry-run via canConnect, exactly like the 3D snap). Click a cable → disconnect.
 */
import type { LevelT, Registry } from '../engine/CatalogLoader'
import type { ConnectResult, PortRef, SnapshotConnection } from '../engine/types'
import type { Intent } from '../ui/intents'
import { TOKENS } from '../design/tokens'

const SVG = 'http://www.w3.org/2000/svg'
const VIEW_W = 1000
const VIEW_H = 680
const DEV_W = 132
const DEV_H = 46
const PORT_R = 8

export interface Board2DApi {
  getConnections(): SnapshotConnection[]
  canConnect(a: PortRef, b: PortRef): ConnectResult
  connectionAt(ref: PortRef): string | undefined
  /**
   * Teaching hints gate (spec §3) — false in Exam: the ok/bad dry-run glow is
   * a HINT and must vanish; the armed marker stays (it is state, not a hint).
   */
  hints(): boolean
}

const portKey = (r: PortRef) => `${r.instance}␟${r.port}`
const dirColor = (dir: string): string =>
  dir === 'in' ? TOKENS.color.portIn : dir === 'out' ? TOKENS.color.portOut : TOKENS.color.portBidir

export class Render2D {
  private svg: SVGSVGElement
  private cableLayer: SVGGElement
  private portPos = new Map<string, { x: number; y: number }>()
  private armed: PortRef | null = null

  constructor(
    root: HTMLElement,
    private registry: Registry,
    private level: LevelT,
    private api: Board2DApi,
    private dispatch: (intent: Intent) => void,
  ) {
    this.svg = document.createElementNS(SVG, 'svg')
    this.svg.setAttribute('viewBox', `0 0 ${VIEW_W} ${VIEW_H}`)
    this.svg.setAttribute('class', 'board2d')
    this.svg.setAttribute('role', 'application')
    this.svg.setAttribute('aria-label', 'Plan de câblage 2D — cliquez deux ports pour les relier')
    this.cableLayer = document.createElementNS(SVG, 'g')

    this.layout()
    this.svg.appendChild(this.cableLayer) // cables under devices
    this.drawDevices()
    root.appendChild(this.svg)
    root.hidden = false

    this.svg.addEventListener('click', (e) => this.onClick(e))
    this.render()
  }

  /** Map level.layout (x,z metres) into the viewBox; grid-fallback for missing. */
  private layout(): void {
    const layout = this.level.layout ?? {}
    const placed = this.level.devices.map((d, i) => {
      const p = layout[d.instanceId]
      return { instanceId: d.instanceId, deviceId: d.deviceId, x: p?.[0], z: p?.[2], i }
    })
    const xs = placed.map((p) => p.x).filter((v): v is number => v !== undefined)
    const zs = placed.map((p) => p.z).filter((v): v is number => v !== undefined)
    const minX = Math.min(...xs, -3), maxX = Math.max(...xs, 3)
    const minZ = Math.min(...zs, -3), maxZ = Math.max(...zs, 3)
    const padX = 90, padY = 70
    const sx = (VIEW_W - 2 * padX) / (maxX - minX || 1)
    const sy = (VIEW_H - 2 * padY) / (maxZ - minZ || 1)
    this.devicePos = new Map()
    placed.forEach((p) => {
      const cx = p.x !== undefined ? padX + (p.x - minX) * sx : padX + (p.i % 4) * 200
      const cy = p.z !== undefined ? padY + (p.z - minZ) * sy : padY + Math.floor(p.i / 4) * 130
      this.devicePos.set(p.instanceId, { cx, cy, deviceId: p.deviceId })
    })
  }
  private devicePos = new Map<string, { cx: number; cy: number; deviceId: string }>()

  private drawDevices(): void {
    for (const [instanceId, { cx, cy, deviceId }] of this.devicePos) {
      const device = this.registry.deviceById.get(deviceId)
      if (!device) continue
      const g = document.createElementNS(SVG, 'g')

      const rect = document.createElementNS(SVG, 'rect')
      rect.setAttribute('x', String(cx - DEV_W / 2))
      rect.setAttribute('y', String(cy - DEV_H / 2))
      rect.setAttribute('width', String(DEV_W))
      rect.setAttribute('height', String(DEV_H))
      rect.setAttribute('rx', '8')
      rect.setAttribute('class', 'b2d-device')
      g.appendChild(rect)

      const label = document.createElementNS(SVG, 'text')
      label.setAttribute('x', String(cx))
      label.setAttribute('y', String(cy - DEV_H / 2 - 6))
      label.setAttribute('text-anchor', 'middle')
      label.setAttribute('class', 'b2d-label')
      label.textContent = device.label
      g.appendChild(label)

      // Ports evenly along the bottom edge, coloured by direction.
      const ports = device.ports
      ports.forEach((port, i) => {
        const px = cx - DEV_W / 2 + ((i + 1) * DEV_W) / (ports.length + 1)
        const py = cy + DEV_H / 2 + PORT_R + 3 // fully below the body, so clicks never hit the rect
        this.portPos.set(portKey({ instance: instanceId, port: port.portId }), { x: px, y: py })
        const c = document.createElementNS(SVG, 'circle')
        c.setAttribute('cx', String(px))
        c.setAttribute('cy', String(py))
        c.setAttribute('r', String(PORT_R))
        c.setAttribute('class', 'b2d-port')
        c.setAttribute('fill', dirColor(port.dir))
        c.dataset.instance = instanceId
        c.dataset.port = port.portId
        c.setAttribute('tabindex', '0')
        c.setAttribute('role', 'button')
        c.setAttribute('aria-label', `${device.label} — ${port.portId} (${port.dir})`)
        const title = document.createElementNS(SVG, 'title')
        title.textContent = `${port.portId} · ${port.dir} · ${port.signal}`
        c.appendChild(title)
        g.appendChild(c)
      })
      this.svg.appendChild(g)
    }
  }

  private onClick(e: Event): void {
    const target = (e.target as Element).closest<SVGElement>('[data-instance][data-port], [data-connection]')
    if (!target) {
      this.setArmed(null)
      return
    }
    if (target.dataset.connection) {
      this.dispatch({ type: 'DISCONNECT', connectionId: target.dataset.connection })
      return
    }
    const ref: PortRef = { instance: target.dataset.instance!, port: target.dataset.port! }
    if (!this.armed) {
      this.setArmed(ref)
      return
    }
    if (portKey(this.armed) === portKey(ref)) {
      this.setArmed(null) // click the armed port again to cancel
      return
    }
    this.dispatch({ type: 'CONNECT', a: this.armed, b: ref })
    this.setArmed(null)
  }

  private setArmed(ref: PortRef | null): void {
    this.armed = ref
    this.render()
  }

  /** Redraw cables + arming highlights. Called by the orchestrator after every intent. */
  render(): void {
    // cables
    this.cableLayer.replaceChildren()
    for (const conn of this.api.getConnections()) {
      const a = this.portPos.get(portKey(conn.a))
      const b = this.portPos.get(portKey(conn.b))
      if (!a || !b) continue
      const id = this.api.connectionAt(conn.a)
      const line = document.createElementNS(SVG, 'line')
      line.setAttribute('x1', String(a.x))
      line.setAttribute('y1', String(a.y))
      line.setAttribute('x2', String(b.x))
      line.setAttribute('y2', String(b.y))
      line.setAttribute('class', 'b2d-cable')
      if (id) line.dataset.connection = id
      this.cableLayer.appendChild(line)
    }
    // Arming feedback: the armed port always shows (state); the green/red
    // dry-run on every other port is a TEACHING HINT — mode-gated (spec §3),
    // so in Exam you locate and judge the ports yourself.
    const hints = this.api.hints()
    for (const c of this.svg.querySelectorAll<SVGCircleElement>('.b2d-port')) {
      c.classList.remove('armed', 'ok', 'bad')
      if (!this.armed) continue
      const ref: PortRef = { instance: c.dataset.instance!, port: c.dataset.port! }
      if (portKey(ref) === portKey(this.armed)) c.classList.add('armed')
      else if (hints) c.classList.add(this.api.canConnect(this.armed, ref).ok ? 'ok' : 'bad')
    }
  }
}
