/**
 * ProgressStore — per-level wins + mistake history + activity days: the raw
 * signal behind the readiness model (ADR-0003). Swappable interface; the
 * default implementation persists to localStorage, VERSIONED:
 *  - v1 → v2 payloads MIGRATE silently (losing a learner's history is an
 *    anti-Beat-4; reset is a last resort)
 *  - unknown version / corrupt payload → reset with notice (CLAUDE.md).
 */

export const PROGRESS_VERSION = 2

/**
 * Per-level mistake history is bounded (deep-scan): the readiness model only
 * ever reads `mistakes.length`, so keeping the most recent N is lossless for
 * scoring and stops the payload growing without limit over long free-play.
 */
export const MISTAKE_CAP = 50

export interface MistakeRecord {
  ruleId: string // R1–R8, or an ErrorCode for non-rule gameplay errors
  at: string // ISO timestamp
}
export interface LevelProgress {
  completedAt?: string
  /** Total wins on this level (repeat plays count — they feed rule coverage). */
  wins: number
  mistakes: MistakeRecord[]
}
export interface ProgressData {
  version: number
  levels: Record<string, LevelProgress>
  /** Unique active days (YYYY-MM-DD) — the streak signal (forgiving, ADR-0003). */
  activity: string[]
}

export interface IProgressStore {
  /** wasReset = a previous payload existed but was unusable and got discarded. */
  load(): { data: ProgressData; wasReset: boolean }
  save(data: ProgressData): void
  recordMistake(levelId: string, ruleId: string): ProgressData
  /** A win: increments wins, sets completedAt on first success, touches activity. */
  recordWin(levelId: string): ProgressData
  /** Sets completedAt only (idempotent) — kept for callers that only care about "done once". */
  markCompleted(levelId: string): ProgressData
}

/** Minimal storage surface so tests (and future backends) can swap localStorage out. */
export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

const fresh = (): ProgressData => ({ version: PROGRESS_VERSION, levels: {}, activity: [] })

const today = (): string => new Date().toISOString().slice(0, 10)

interface V1LevelProgress {
  completedAt?: string
  mistakes: MistakeRecord[]
}

/** v1 → v2: completedAt implies one win; no activity history existed. */
function migrateV1(levels: Record<string, V1LevelProgress>): ProgressData {
  const data = fresh()
  for (const [id, lp] of Object.entries(levels)) {
    data.levels[id] = {
      completedAt: lp.completedAt,
      wins: lp.completedAt ? 1 : 0,
      mistakes: lp.mistakes ?? [],
    }
  }
  return data
}

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
      if (parsed.version === 1 && typeof parsed.levels === 'object' && parsed.levels !== null) {
        const migrated = migrateV1(parsed.levels as unknown as Record<string, V1LevelProgress>)
        this.save(migrated)
        return { data: migrated, wasReset: false }
      }
      if (parsed.version !== PROGRESS_VERSION || typeof parsed.levels !== 'object' || parsed.levels === null) {
        this.storage.removeItem(this.key)
        return { data: fresh(), wasReset: true }
      }
      parsed.activity ??= []
      return { data: parsed, wasReset: false }
    } catch {
      this.storage.removeItem(this.key)
      return { data: fresh(), wasReset: true }
    }
  }

  save(data: ProgressData): void {
    // Writes must never throw into the hot path (QuotaExceededError, private-mode
    // Safari, blocked storage): losing a write degrades gracefully to in-memory.
    try {
      this.storage.setItem(this.key, JSON.stringify(data))
    } catch (err) {
      console.warn('[progress] could not persist (storage full or blocked)', err)
    }
  }

  recordMistake(levelId: string, ruleId: string): ProgressData {
    const { data } = this.load()
    const level = (data.levels[levelId] ??= { wins: 0, mistakes: [] })
    level.mistakes.push({ ruleId, at: new Date().toISOString() })
    if (level.mistakes.length > MISTAKE_CAP) level.mistakes = level.mistakes.slice(-MISTAKE_CAP)
    this.touch(data)
    this.save(data)
    return data
  }

  recordWin(levelId: string): ProgressData {
    const { data } = this.load()
    const level = (data.levels[levelId] ??= { wins: 0, mistakes: [] })
    level.wins += 1
    level.completedAt ??= new Date().toISOString()
    this.touch(data)
    this.save(data)
    return data
  }

  markCompleted(levelId: string): ProgressData {
    const { data } = this.load()
    const level = (data.levels[levelId] ??= { wins: 0, mistakes: [] })
    level.completedAt ??= new Date().toISOString()
    this.save(data)
    return data
  }

  private touch(data: ProgressData): void {
    const day = today()
    if (!data.activity.includes(day)) data.activity.push(day)
  }
}
