/**
 * RuleEvaluator — routes a level's declared logicChecks (R4–R8) to pure
 * logic/* modules. The engine NEVER imports logic/* — the bootstrap layer
 * injects the module map, keyed by the rule's `module` field in the catalog.
 * Engine invariants (R1/R2/R3) are NOT evaluated here: ConnectionGraph
 * rejects them at connect() time.
 */
import type { LevelT, Registry } from './CatalogLoader'
import type { ConnectionGraph } from './ConnectionGraph'
import type { LogicCheck, LogicModuleName, TeachingEvent } from './types'

export class RuleEvaluator {
  constructor(
    private registry: Registry,
    private level: LevelT,
    private modules: Partial<Record<LogicModuleName, LogicCheck>>,
  ) {}

  evaluate(graph: ConnectionGraph): TeachingEvent[] {
    const declared = new Set(this.level.logicChecks)
    if (declared.size === 0) return []

    // One module can back several rules (logic/gpio → R5+R6): invoke each module ONCE.
    const moduleNames = new Set<LogicModuleName>()
    for (const ruleId of declared) {
      const rule = this.registry.ruleById.get(ruleId)
      if (!rule) throw new Error(`content bug: level "${this.level.id}" declares unknown rule "${ruleId}"`)
      if (rule.module === 'engine')
        throw new Error(`content bug: level "${this.level.id}" declares engine invariant "${ruleId}" in logicChecks`)
      moduleNames.add(rule.module)
    }

    const snapshot = graph.snapshot()
    const events: TeachingEvent[] = []
    for (const name of moduleNames) {
      const fn = this.modules[name]
      if (!fn) continue // module not implemented yet (stub phase) — no events, level stays winnable
      for (const draft of fn(snapshot)) {
        if (!declared.has(draft.ruleId)) continue // module may know rules this level doesn't teach
        const rule = this.registry.ruleById.get(draft.ruleId)
        if (!rule) continue
        events.push({
          ruleId: rule.id,
          severity: rule.severity,
          title: rule.title,
          teach: rule.teach,
          subjects: draft.subjects,
        })
      }
    }
    return events
  }
}
