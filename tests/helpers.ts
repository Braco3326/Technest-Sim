/** Test helpers — always load the REAL content files (source of truth). */
import { readFileSync } from 'node:fs'
import { loadCatalog, loadLevel, type Registry, type LevelT } from '../src/engine/CatalogLoader'
import type { ConnectionGraph } from '../src/engine/ConnectionGraph'

export const rawCatalog = (): unknown =>
  JSON.parse(readFileSync(new URL('../content/catalog.json', import.meta.url), 'utf8'))

export const rawLevel = (id: string): unknown =>
  JSON.parse(readFileSync(new URL(`../content/levels/${id}.json`, import.meta.url), 'utf8'))

export const makeRegistry = (): Registry => loadCatalog(rawCatalog())
export const makeLevel = (id: string): LevelT => loadLevel(rawLevel(id))

/** Wire a level's full requiredChain; throws if the content is unwirable. */
export const wireChain = (graph: ConnectionGraph, level: LevelT, skip: number[] = []): void => {
  level.requiredChain.forEach(({ from, to }, i) => {
    if (skip.includes(i)) return
    const r = graph.connect(from, to)
    if (!r.ok)
      throw new Error(
        `required chain must be wirable: ${from.instance}.${from.port} → ${to.instance}.${to.port}: ${r.message}`,
      )
  })
}
