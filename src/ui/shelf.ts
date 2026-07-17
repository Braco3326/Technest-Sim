/**
 * Shelf — the sandbox's category shelves (Beat 3), read STRAIGHT from the
 * catalog (never duplicated). Two modes, gated by mastery (ADR-0004):
 *  - guided (low readiness): a 3-item palette + a one-line brief — the Beat 1
 *    "taste" of freedom;
 *  - free: every device, grouped by realWorld.category.
 * Clicks dispatch SPAWN intents; the rig save box writes a named snapshot.
 */
import type { Registry } from '../engine/CatalogLoader'
import type { Intent } from './intents'

export const GUIDED_PALETTE = ['shure-sm58', 'yamaha-rio3224-d2', 'yamaha-ql1']
export const GUIDED_BRIEF =
  'Palette guidée : connecte le micro à la console, via la stagebox. Ta liberté grandit avec ta readiness.'

const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

export class Shelf {
  constructor(
    root: HTMLElement,
    registry: Registry,
    guided: boolean,
    dispatch: (intent: Intent) => void,
    onSaveRig: (name: string) => void,
    environments: readonly string[] = [],
    currentEnv = '',
  ) {
    const devices = [...registry.deviceById.values()].filter((d) => d.ports.length > 0)
    const pool = guided ? devices.filter((d) => GUIDED_PALETTE.includes(d.id)) : devices

    const byCategory = new Map<string, typeof pool>()
    for (const d of pool) {
      const cat = d.realWorld.category
      byCategory.set(cat, [...(byCategory.get(cat) ?? []), d])
    }

    const sections = [...byCategory.entries()]
      .map(
        ([cat, items]) =>
          `<section class="shelf-cat"><h3>${esc(cat)}</h3>${items
            .map(
              (d) =>
                `<button class="shelf-item" data-device="${d.id}" title="${esc(d.realWorld.typicalUse)}">
                  <img src="/assets/thumbs/${d.id}.png" alt="" loading="lazy" onerror="this.remove()" />
                  <span>${esc(d.label)}</span>
                </button>`,
            )
            .join('')}</section>`,
      )
      .join('')

    const rooms = environments.length
      ? `<nav class="shelf-rooms">${environments
          .map(
            (id) =>
              `<a href="?level=sandbox&env=${id}" class="${id === currentEnv ? 'current' : ''}">${esc(id)}</a>`,
          )
          .join('')}</nav>`
      : ''

    root.innerHTML = `
      <h2>Étagères${guided ? ' · palette guidée' : ''}</h2>
      ${rooms}
      ${guided ? `<p class="shelf-brief">${GUIDED_BRIEF}</p>` : ''}
      <div class="shelf-scroll">${sections}</div>
      <div class="shelf-save">
        <input id="rig-name" type="text" placeholder="Nom du rig…" maxlength="40" />
        <button id="rig-save">Sauver</button>
        <span id="rig-saved" hidden>✓ sauvegardé</span>
      </div>`
    root.hidden = false

    root.addEventListener('click', (e) => {
      const item = (e.target as HTMLElement).closest<HTMLButtonElement>('.shelf-item')
      if (item) {
        dispatch({ type: 'SPAWN', deviceId: item.dataset.device! })
        return
      }
      if ((e.target as HTMLElement).id === 'rig-save') {
        const input = root.querySelector<HTMLInputElement>('#rig-name')!
        const name = input.value.trim()
        if (!name) return
        onSaveRig(name)
        const ok = root.querySelector<HTMLElement>('#rig-saved')!
        ok.hidden = false
        setTimeout(() => (ok.hidden = true), 2500)
      }
    })
  }
}

// ── named rig snapshots (localStorage, versioned) ───────────────────────────

export interface SavedRig {
  name: string
  savedAt: string
  instances: { instanceId: string; deviceId: string }[]
  connections: { a: { instance: string; port: string }; b: { instance: string; port: string } }[]
  controls: Record<string, Record<string, boolean>>
}
interface RigFile {
  version: number
  rigs: SavedRig[]
}

const RIGS_KEY = 'audio-sim/rigs'
const RIGS_VERSION = 1

export function saveRig(storage: Pick<Storage, 'getItem' | 'setItem'>, rig: SavedRig): void {
  let file: RigFile = { version: RIGS_VERSION, rigs: [] }
  try {
    const raw = storage.getItem(RIGS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as RigFile
      if (parsed.version === RIGS_VERSION && Array.isArray(parsed.rigs)) file = parsed
    }
  } catch {
    // corrupt file → start fresh (rigs are conveniences, not learning history)
  }
  file.rigs = [...file.rigs.filter((r) => r.name !== rig.name), rig]
  storage.setItem(RIGS_KEY, JSON.stringify(file))
}
