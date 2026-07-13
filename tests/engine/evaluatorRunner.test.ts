/**
 * RuleEvaluator + LevelRunner on the REAL levels:
 * A1 winnable by hand, D1's R4 blocks the win until +48V is on.
 */
import { describe, expect, it, vi } from 'vitest'
import { ConnectionGraph } from '../../src/engine/ConnectionGraph'
import { RuleEvaluator } from '../../src/engine/RuleEvaluator'
import { LevelRunner } from '../../src/engine/LevelRunner'
import { phantomCheck } from '../../src/logic/phantom'
import { clockCheck } from '../../src/logic/clock'
import { makeLevel, makeRegistry } from '../helpers'
import type { LevelT } from '../../src/engine/CatalogLoader'

const registry = makeRegistry()

const wireChain = (graph: ConnectionGraph, level: LevelT) => {
  for (const { from, to } of level.requiredChain) {
    const r = graph.connect(from, to)
    if (!r.ok) throw new Error(`required chain must be wirable: ${from.instance}.${from.port} → ${to.instance}.${to.port}: ${r.message}`)
  }
}

describe('A1 — no logicChecks, engine invariants only', () => {
  it('wins once the full required chain is built, reports progress before', () => {
    const a1 = makeLevel('a1')
    const graph = new ConnectionGraph(registry, a1.devices)
    const runner = new LevelRunner(a1, new RuleEvaluator(registry, a1, {}))

    expect(runner.check(graph)).toMatchObject({ won: false, chainComplete: false, connectedRequired: 0, totalRequired: 5 })

    wireChain(graph, a1)
    const state = runner.check(graph)
    expect(state).toMatchObject({ won: true, chainComplete: true, violations: [] })
  })

  it('a missing connection is reported precisely', () => {
    const a1 = makeLevel('a1')
    const graph = new ConnectionGraph(registry, a1.devices)
    const runner = new LevelRunner(a1, new RuleEvaluator(registry, a1, {}))
    wireChain(graph, a1)
    const id = graph.connectionAt({ instance: 'dbr12-1', port: 'in-line' })!
    graph.disconnect(id)
    const state = runner.check(graph)
    expect(state.won).toBe(false)
    expect(state.missing).toEqual([
      { from: { instance: 'ql1-1', port: 'out-mix-1' }, to: { instance: 'dbr12-1', port: 'in-line' } },
    ])
  })

  it('accepts a required connection wired from the other end (unordered match)', () => {
    const a1 = makeLevel('a1')
    const graph = new ConnectionGraph(registry, a1.devices)
    const runner = new LevelRunner(a1, new RuleEvaluator(registry, a1, {}))
    // drag started at the stagebox end: to → from
    expect(graph.connect({ instance: 'rio-1', port: 'in-mic-1' }, { instance: 'sm58-1', port: 'out-xlr' }).ok).toBe(true)
    expect(runner.check(graph).connectedRequired).toBe(1)
  })
})

describe('D1 — R4 phantom via device state (ADR-0001)', () => {
  const setup = () => {
    const d1 = makeLevel('d1')
    const graph = new ConnectionGraph(registry, d1.devices)
    const evaluator = new RuleEvaluator(registry, d1, {
      'logic/phantom': phantomCheck,
      'logic/clock': clockCheck, // stub — returns []
    })
    return { d1, graph, runner: new LevelRunner(d1, evaluator) }
  }

  it('triggers: full chain wired but +48V off → R4 violation blocks the win', () => {
    const { d1, graph, runner } = setup()
    wireChain(graph, d1)
    const state = runner.check(graph)
    expect(state.chainComplete).toBe(true)
    expect(state.won).toBe(false)
    expect(state.violations).toHaveLength(1)
    expect(state.violations[0]).toMatchObject({
      ruleId: 'R4',
      severity: 'error',
      title: registry.ruleById.get('R4')!.title,
    })
    expect(state.violations[0].subjects[0]).toEqual({ instance: 'u87-1', port: 'out-xlr' })
  })

  it("doesn't trigger: +48V on → win", () => {
    const { d1, graph, runner } = setup()
    wireChain(graph, d1)
    expect(graph.setControl('isa-1', 'phantom-48v', true)).toMatchObject({ ok: true })
    expect(runner.check(graph)).toMatchObject({ won: true, violations: [] })
  })
})

describe('RuleEvaluator wiring', () => {
  it('invokes a module ONCE even when it backs two declared rules (B1: R5+R6 → logic/gpio)', () => {
    const b1 = makeLevel('b1')
    const graph = new ConnectionGraph(registry, b1.devices)
    const gpio = vi.fn(() => [])
    new RuleEvaluator(registry, b1, { 'logic/gpio': gpio }).evaluate(graph)
    expect(gpio).toHaveBeenCalledTimes(1)
  })

  it('drops drafts for rules the level does not declare', () => {
    const a1 = makeLevel('a1') // declares nothing
    const graph = new ConnectionGraph(registry, a1.devices)
    const noisy = vi.fn(() => [{ ruleId: 'R4', subjects: [] }])
    // a1 declares no rules → no module is even consulted
    expect(new RuleEvaluator(registry, a1, { 'logic/phantom': noisy }).evaluate(graph)).toEqual([])
    expect(noisy).not.toHaveBeenCalled()
  })

  it('unimplemented module (stub phase) yields no events and keeps the level winnable', () => {
    const c1 = makeLevel('c1') // declares R7 → logic/mixMinus, not injected here
    const graph = new ConnectionGraph(registry, c1.devices)
    expect(new RuleEvaluator(registry, c1, {}).evaluate(graph)).toEqual([])
  })
})
