import { describe, expect, it } from 'vitest'
import {
  LocalStorageProgressStore,
  MISTAKE_CAP,
  PROGRESS_VERSION,
  type StorageLike,
} from '../../src/ui/ProgressStore'

const fakeStorage = (initial: Record<string, string> = {}): StorageLike & { dump(): Record<string, string> } => {
  const map = new Map(Object.entries(initial))
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
    dump: () => Object.fromEntries(map),
  }
}

describe('LocalStorageProgressStore', () => {
  it('fresh storage → empty data, no reset notice', () => {
    const store = new LocalStorageProgressStore(fakeStorage())
    expect(store.load()).toEqual({
      data: { version: PROGRESS_VERSION, levels: {}, activity: [] },
      wasReset: false,
    })
  })

  it('v1 payload MIGRATES to v2 (no reset — history is precious, ADR-0003)', () => {
    const storage = fakeStorage({
      'audio-sim/progress': JSON.stringify({
        version: 1,
        levels: { a1: { completedAt: '2026-07-01T10:00:00Z', mistakes: [{ ruleId: 'R2', at: 'x' }] } },
      }),
    })
    const { data, wasReset } = new LocalStorageProgressStore(storage).load()
    expect(wasReset).toBe(false)
    expect(data.version).toBe(PROGRESS_VERSION)
    expect(data.levels.a1).toEqual({
      completedAt: '2026-07-01T10:00:00Z',
      wins: 1,
      mistakes: [{ ruleId: 'R2', at: 'x' }],
    })
    expect(data.activity).toEqual([])
  })

  it('recordWin counts wins and touches the activity day', () => {
    const store = new LocalStorageProgressStore(fakeStorage())
    store.recordWin('a1')
    const data = store.recordWin('a1')
    expect(data.levels.a1?.wins).toBe(2)
    expect(data.levels.a1?.completedAt).toBeTruthy()
    expect(data.activity).toHaveLength(1)
    expect(data.activity[0]).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('save/load roundtrip', () => {
    const store = new LocalStorageProgressStore(fakeStorage())
    store.markCompleted('a1')
    const { data } = store.load()
    expect(data.levels.a1?.completedAt).toBeTruthy()
  })

  it('version mismatch → reset + notice (CLAUDE.md)', () => {
    const storage = fakeStorage({
      'audio-sim/progress': JSON.stringify({ version: PROGRESS_VERSION + 1, levels: { a1: { mistakes: [] } } }),
    })
    const { data, wasReset } = new LocalStorageProgressStore(storage).load()
    expect(wasReset).toBe(true)
    expect(data.levels).toEqual({})
    expect(storage.dump()).toEqual({}) // stale payload discarded
  })

  it('corrupt JSON → reset + notice', () => {
    const storage = fakeStorage({ 'audio-sim/progress': '{not json' })
    expect(new LocalStorageProgressStore(storage).load().wasReset).toBe(true)
  })

  it('recordMistake appends to the level history (dashboard fuel)', () => {
    const store = new LocalStorageProgressStore(fakeStorage())
    store.recordMistake('a1', 'R2')
    const data = store.recordMistake('a1', 'R2')
    expect(data.levels.a1?.mistakes.map((m) => m.ruleId)).toEqual(['R2', 'R2'])
    expect(data.levels.a1?.mistakes[0]?.at).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it(`caps the mistake history at ${MISTAKE_CAP} (bounded payload, keeps the most recent)`, () => {
    const store = new LocalStorageProgressStore(fakeStorage())
    let data
    for (let i = 0; i < MISTAKE_CAP + 20; i++) data = store.recordMistake('a1', `R${(i % 8) + 1}`)
    expect(data!.levels.a1?.mistakes.length).toBe(MISTAKE_CAP)
    // the LAST recorded mistake survives (slice keeps the tail)
    expect(data!.levels.a1?.mistakes.at(-1)?.ruleId).toBe(`R${((MISTAKE_CAP + 19) % 8) + 1}`)
  })

  it('a write failure (quota/blocked storage) degrades gracefully — no throw', () => {
    const throwing: StorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new DOMException('QuotaExceededError')
      },
      removeItem: () => undefined,
    }
    const store = new LocalStorageProgressStore(throwing)
    expect(() => store.recordWin('a1')).not.toThrow()
    expect(() => store.recordMistake('a1', 'R2')).not.toThrow()
  })

  it('markCompleted is idempotent (first completion date wins)', () => {
    const store = new LocalStorageProgressStore(fakeStorage())
    const first = store.markCompleted('a1').levels.a1?.completedAt
    const second = store.markCompleted('a1').levels.a1?.completedAt
    expect(second).toBe(first)
  })
})
