/**
 * ControlsPanel — data-driven device-state UI. Renders every control declared
 * in the catalog for the level's instances: plain toggles as switches, and
 * route-<src>-to-<bus> controls grouped into a routing MATRIX (sources ×
 * buses). Clicks dispatch SET_CONTROL intents — this layer never mutates the
 * graph (CLAUDE.md).
 */
import type { LevelT, Registry } from '../engine/CatalogLoader'
import type { RigSnapshot } from '../engine/types'
import type { Intent } from './intents'

const ROUTE = /^route-(.+)-to-(.+)$/

export class ControlsPanel {
  private controls = new Map<string, HTMLButtonElement | HTMLSelectElement>() // "instance␟control" → element

  constructor(
    root: HTMLElement,
    registry: Registry,
    level: LevelT,
    dispatch: (intent: Intent) => void,
  ) {
    const sections: string[] = []
    for (const inst of level.devices) {
      const device = registry.deviceById.get(inst.deviceId)
      if (!device?.controls?.length) continue

      const toggles = device.controls.filter((c) => c.type === 'toggle' && !ROUTE.test(c.id))
      const enums = device.controls.filter((c) => c.type === 'enum')
      const routes = device.controls.filter((c) => c.type === 'toggle' && ROUTE.test(c.id))

      let html = `<section class="cp-device"><h3>${device.label}</h3>`
      for (const ctl of toggles)
        html += `<button class="cp-toggle" data-instance="${inst.instanceId}" data-control="${ctl.id}"><i></i>${ctl.label}</button>`

      for (const ctl of enums)
        if (ctl.type === 'enum') {
          const opts = ctl.options.map((o) => `<option value="${o}">${o}</option>`).join('')
          html += `<label class="cp-enum"><span>${ctl.label}</span><select class="cp-select" data-instance="${inst.instanceId}" data-control="${ctl.id}">${opts}</select></label>`
        }

      if (routes.length) {
        const srcs = [...new Set(routes.map((c) => ROUTE.exec(c.id)![1]))]
        const buses = [...new Set(routes.map((c) => ROUTE.exec(c.id)![2]))]
        html += `<table class="cp-matrix"><thead><tr><th>src \\ bus</th>${buses
          .map((b) => `<th>${b}</th>`)
          .join('')}</tr></thead><tbody>`
        for (const s of srcs) {
          html += `<tr><th>${s}</th>`
          for (const b of buses) {
            const ctl = routes.find((c) => c.id === `route-${s}-to-${b}`)
            html += ctl
              ? `<td><button class="cp-cell" data-instance="${inst.instanceId}" data-control="${ctl.id}" aria-label="Router ${s} vers ${b}"></button></td>`
              : '<td></td>'
          }
          html += '</tr>'
        }
        html += '</tbody></table>'
      }
      sections.push(html + '</section>')
    }

    if (!sections.length) {
      root.hidden = true
      return
    }
    root.innerHTML = `<h2>État du rack</h2>${sections.join('')}`
    root.hidden = false

    // Toggle buttons + routing cells flip on click.
    root.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-control]')
      if (!btn) return
      dispatch({
        type: 'SET_CONTROL',
        instance: btn.dataset.instance!,
        control: btn.dataset.control!,
        value: btn.getAttribute('aria-pressed') !== 'true',
      })
    })
    // Enum selects (ADR-0007, e.g. sample-rate) dispatch the chosen option.
    root.addEventListener('change', (e) => {
      const sel = (e.target as HTMLElement).closest<HTMLSelectElement>('select[data-control]')
      if (!sel) return
      dispatch({
        type: 'SET_CONTROL',
        instance: sel.dataset.instance!,
        control: sel.dataset.control!,
        value: sel.value,
      })
    })

    for (const el of root.querySelectorAll<HTMLButtonElement | HTMLSelectElement>('[data-control]'))
      this.controls.set(`${el.dataset.instance}␟${el.dataset.control}`, el)
  }

  update(snapshot: RigSnapshot): void {
    for (const inst of snapshot.instances)
      for (const [controlId, value] of Object.entries(inst.controls)) {
        const el = this.controls.get(`${inst.instanceId}␟${controlId}`)
        if (!el) continue
        if (el instanceof HTMLSelectElement) el.value = String(value)
        else el.setAttribute('aria-pressed', String(value))
      }
  }
}
