/**
 * ProgressStore — per-level completion + mistake history (feeds the P2
 * mistake-history dashboard). Swappable interface; the default implementation
 * persists to localStorage, VERSIONED: version mismatch or corrupt payload →
 * reset with notice (CLAUDE.md error handling).
 */

export const PROGRESS_VERSION = 1

export interface MistakeRecord {
  ruleId: string // R1–R8, or an ErrorCode for non-rule gameplay errors
  at: string // ISO timestamp
}
export interface LevelProgress {
  completedAt?: string
  mistakes: MistakeRecord[]
}
export interface ProgressData {
  version: number
  levels: Record<string, LevelProgress>
}

export interface IProgressStore {
  /** wasReset = a previous payload existed but was stale/corrupt and got discarded. */
  load(): { data: ProgressData; wasReset: boolean }
  save(data: ProgressData): void
  recordMistake(levelId: string, ruleId: string): ProgressData
  markCompleted(levelId: string): ProgressData
}

/** Minimal storage surface so tests (and future backends) can swap localStorage out. */
export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

const fresh = (): ProgressData => ({ version: PROGRESS_VERSION, levels: {} })

export class LocalStorageProgressStore implements IProgressStore {
  constructor(
    private storage: StorageLike,
    private key = 'audio-sim/progress',
  ) {}

  load(): { data: ProgressData; wasReset: boolean } {
    const raw = this.storage.getItem(this.key)
    if (raw === null) return { data: fresh(), wasReset: false }
    try {
      const parsed = JSON.parse(raw) as ProgressData
      if (parsed.version !== PROGRESS_VERSION || typeof parsed.levels !== 'object' || parsed.levels === null) {
        this.storage.removeItem(this.key)
        return { data: fresh(), wasReset: true }
      }
      return { data: parsed, wasReset: false }
    } catch {
      this.storage.removeItem(this.key)
      return { data: fresh(), wasReset: true }
    }
  }

  save(data: ProgressData): void {
    this.storage.setItem(this.key, JSON.stringify(data))
  }

  recordMistake(levelId: string, ruleId: string): ProgressData {
    const { data } = this.load()
    const level = (data.levels[levelId] ??= { mistakes: [] })
    level.mistakes.push({ ruleId, at: new Date().toISOString() })
    this.save(data)
    return data
  }

  markCompleted(levelId: string): ProgressData {
    const { data } = this.load()
    const level = (data.levels[levelId] ??= { mistakes: [] })
    level.completedAt ??= new Date().toISOString()
    this.save(data)
    return data
  }
}
