import { describe, expect, it } from 'vitest'
import { chainLabel, mistakeSummary } from '../../src/ui/format'
import { makeLevel, makeRegistry } from '../helpers'

const registry = makeRegistry()
const a1 = makeLevel('a1')

describe('chainLabel', () => {
  it('renders real device labels with port ids', () => {
    expect(chainLabel(registry, a1, a1.requiredChain[0])).toBe(
      'Shure SM58 out-xlr → Yamaha Rio3224-D2 in-mic-1',
    )
  })
})

describe('mistakeSummary', () => {
  it('groups by rule, resolves catalog titles, most frequent first', () => {
    const summary = mistakeSummary(registry, [
      { ruleId: 'R2', at: 'x' },
      { ruleId: 'R3', at: 'x' },
      { ruleId: 'R2', at: 'x' },
    ])
    expect(summary).toEqual([
      { label: registry.ruleById.get('R2')!.title, count: 2 },
      { label: registry.ruleById.get('R3')!.title, count: 1 },
    ])
  })

  it('falls back to the raw id for non-rule codes', () => {
    expect(mistakeSummary(registry, [{ ruleId: 'PORT_OCCUPIED', at: 'x' }])).toEqual([
      { label: 'PORT_OCCUPIED', count: 1 },
    ])
  })
})
