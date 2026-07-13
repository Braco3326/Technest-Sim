/**
 * CatalogLoader — parses content/*.json with the SHARED zod schemas
 * (tools/schemas.ts — single source of truth, do not fork) and builds the
 * Registry of indexed lookups the rest of the engine uses.
 * Fail-fast: invalid content throws with the exact JSON path.
 */
import { z } from 'zod'
import { Catalog, Level, type CatalogT, type LevelT } from '../../tools/schemas'

export type DeviceT = CatalogT['devices'][number]
export type RuleT = CatalogT['rules'][number]
export type ConnectorTypeT = CatalogT['connectorTypes'][number]
export type SignalTypeT = CatalogT['signalTypes'][number]
export type { CatalogT, LevelT }

export interface Registry {
  catalog: CatalogT
  connectorById: Map<string, ConnectorTypeT>
  signalById: Map<string, SignalTypeT>
  deviceById: Map<string, DeviceT>
  ruleById: Map<string, RuleT>
}

function parseOrThrow<T>(schema: z.ZodType<T>, raw: unknown, what: string): T {
  const r = schema.safeParse(raw)
  if (!r.success) {
    const details = r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(' · ')
    throw new Error(`${what} invalid — ${details}`)
  }
  return r.data
}

export function loadCatalog(raw: unknown): Registry {
  const catalog = parseOrThrow(Catalog, raw, 'catalog')
  return {
    catalog,
    connectorById: new Map(catalog.connectorTypes.map((c) => [c.id, c])),
    signalById: new Map(catalog.signalTypes.map((s) => [s.id, s])),
    deviceById: new Map(catalog.devices.map((d) => [d.id, d])),
    ruleById: new Map(catalog.rules.map((r) => [r.id, r])),
  }
}

export function loadLevel(raw: unknown): LevelT {
  return parseOrThrow(Level, raw, 'level')
}
