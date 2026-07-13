import { describe, expect, it } from 'vitest'
import { loadCatalog, loadLevel } from '../../src/engine/CatalogLoader'
import { makeRegistry, rawCatalog, rawLevel } from '../helpers'

describe('CatalogLoader', () => {
  it('parses the real catalog without error and indexes it', () => {
    const reg = makeRegistry()
    expect(reg.catalog.connectorTypes.length).toBeGreaterThanOrEqual(26)
    expect(reg.deviceById.has('yamaha-ql1')).toBe(true)
    expect(reg.ruleById.get('R4')?.module).toBe('logic/phantom')
    expect(reg.connectorById.get('xlr3-m')?.matesWith).toContain('xlr3-f')
  })

  it('parses all four real levels', () => {
    for (const id of ['a1', 'b1', 'c1', 'd1']) {
      expect(loadLevel(rawLevel(id)).id).toBe(id)
    }
  })

  it('fails fast with the exact JSON path on a corrupted catalog field', () => {
    const corrupt = rawCatalog() as { devices: Array<{ label: unknown }> }
    corrupt.devices[0].label = 42
    expect(() => loadCatalog(corrupt)).toThrowError(/devices\.0\.label/)
  })

  it('fails fast with the exact JSON path on a corrupted level field', () => {
    const corrupt = rawLevel('a1') as { requiredChain: Array<{ from: { instance?: string } }> }
    delete corrupt.requiredChain[0].from.instance
    expect(() => loadLevel(corrupt)).toThrowError(/requiredChain\.0\.from\.instance/)
  })
})
