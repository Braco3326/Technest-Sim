import { describe, expect, it } from 'vitest'
import {
  LocalStorageProgressStore,
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
    expect(store.load()).toEqual({ data: { version: PROGRESS_VERSION, levels: {} }, wasReset: false })
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

  it('markCompleted is idempotent (first completion date wins)', () => {
    const store = new LocalStorageProgressStore(fakeStorage())
    const first = store.markCompleted('a1').levels.a1?.completedAt
    const second = store.markCompleted('a1').levels.a1?.completedAt
    expect(second).toBe(first)
  })
})
