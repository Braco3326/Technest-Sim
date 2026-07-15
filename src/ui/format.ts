/** Pure formatting helpers for the HUD (unit-testable, no DOM). */
import type { LevelT, Registry } from '../engine/CatalogLoader'
import type { MistakeRecord } from './ProgressStore'

type ChainConn = LevelT['requiredChain'][number]

/** "Shure SM58 out-xlr → Yamaha Rio3224-D2 in-mic-1" */
export function chainLabel(registry: Registry, level: LevelT, conn: ChainConn): string {
  const deviceLabel = (instanceId: string): string => {
    const inst = level.devices.find((d) => d.instanceId === instanceId)
    return (inst && registry.deviceById.get(inst.deviceId)?.label) ?? instanceId
  }
  return `${deviceLabel(conn.from.instance)} ${conn.from.port} → ${deviceLabel(conn.to.instance)} ${conn.to.port}`
}

/** Mistake counts grouped by rule/code, most frequent first. */
export function mistakeSummary(
  registry: Registry,
  mistakes: readonly MistakeRecord[],
): { label: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const m of mistakes) counts.set(m.ruleId, (counts.get(m.ruleId) ?? 0) + 1)
  return [...counts.entries()]
    .map(([id, count]) => ({ label: registry.ruleById.get(id)?.title ?? id, count }))
    .sort((a, b) => b.count - a.count)
}
