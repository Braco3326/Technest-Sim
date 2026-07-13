/**
 * CLAUDE.md contract: the engine NEVER imports logic/* directly —
 * RuleEvaluator receives logic modules by injection only.
 * Static check over the engine sources.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('layer decoupling', () => {
  it('no src/engine file imports from logic/', () => {
    const dir = new URL('../../src/engine/', import.meta.url)
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.ts'))) {
      const source = readFileSync(new URL(file, dir), 'utf8')
      expect(source, `${file} must not import logic/*`).not.toMatch(/from\s+['"].*\/logic\//)
    }
  })
})
