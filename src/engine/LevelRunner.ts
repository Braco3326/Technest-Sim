/**
 * LevelRunner — compares the live graph against the level's requiredChain
 * and the RuleEvaluator's verdict.
 * Win = chain complete AND zero violations from the declared logicChecks —
 * a declared check IS the level's lesson, so even a "warning"-severity rule
 * (R5 tally) blocks the win; severity only styles the toast.
 */
import type { LevelT } from './CatalogLoader'
import type { ConnectionGraph } from './ConnectionGraph'
import type { RuleEvaluator } from './RuleEvaluator'
import type { LevelState, PortRef } from './types'

const sameRef = (x: PortRef, y: PortRef) => x.instance === y.instance && x.port === y.port

export class LevelRunner {
  constructor(
    private level: LevelT,
    private evaluator: RuleEvaluator,
  ) {}

  check(graph: ConnectionGraph): LevelState {
    const conns = graph.getConnections()
    // A player may drag a cable from either end — required pairs match unordered.
    const present = (from: PortRef, to: PortRef) =>
      conns.some(
        (c) =>
          (sameRef(c.a, from) && sameRef(c.b, to)) || (sameRef(c.a, to) && sameRef(c.b, from)),
      )

    const missing = this.level.requiredChain
      .filter((rc) => !present(rc.from, rc.to))
      .map((rc) => ({ from: { ...rc.from }, to: { ...rc.to } }))

    const violations = this.evaluator.evaluate(graph)
    const totalRequired = this.level.requiredChain.length
    const chainComplete = missing.length === 0

    return {
      chainComplete,
      connectedRequired: totalRequired - missing.length,
      totalRequired,
      missing,
      violations,
      won: chainComplete && violations.length === 0,
    }
  }
}
