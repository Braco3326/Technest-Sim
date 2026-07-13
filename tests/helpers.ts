/** Test helpers — always load the REAL content files (source of truth). */
import { readFileSync } from 'node:fs'
import { loadCatalog, loadLevel, type Registry, type LevelT } from '../src/engine/CatalogLoader'

export const rawCatalog = (): unknown =>
  JSON.parse(readFileSync(new URL('../content/catalog.json', import.meta.url), 'utf8'))

export const rawLevel = (id: string): unknown =>
  JSON.parse(readFileSync(new URL(`../content/levels/${id}.json`, import.meta.url), 'utf8'))

export const makeRegistry = (): Registry => loadCatalog(rawCatalog())
export const makeLevel = (id: string): LevelT => loadLevel(rawLevel(id))
