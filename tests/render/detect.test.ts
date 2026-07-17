/** Renderer selection (2D fallback) — pure decision, every branch. */
import { describe, expect, it } from 'vitest'
import { decideRenderer, type RenderEnv } from '../../src/render/detect'

const env = (over: Partial<RenderEnv> = {}): RenderEnv => ({
  param: null,
  stored: null,
  webgl: true,
  cores: 8,
  memory: 8,
  ...over,
})

describe('decideRenderer — authority order', () => {
  it('?render=2d forces the board even on a strong machine', () => {
    expect(decideRenderer(env({ param: '2d' }))).toEqual({ use2d: true, reason: 'url' })
  })

  it('?render=3d forces 3D even with no WebGL (explicit user override wins)', () => {
    expect(decideRenderer(env({ param: '3d', webgl: false }))).toEqual({ use2d: false, reason: 'url' })
  })

  it('a stored preference is honoured when no url param', () => {
    expect(decideRenderer(env({ stored: '2d' })).use2d).toBe(true)
    expect(decideRenderer(env({ stored: '3d', webgl: false })).use2d).toBe(false)
  })

  it('auto: no WebGL → 2D', () => {
    expect(decideRenderer(env({ webgl: false }))).toEqual({ use2d: true, reason: 'no-webgl' })
  })

  it('auto: low core count → 2D', () => {
    expect(decideRenderer(env({ cores: 2 }))).toEqual({ use2d: true, reason: 'low-end' })
  })

  it('auto: low device memory → 2D', () => {
    expect(decideRenderer(env({ memory: 2 }))).toEqual({ use2d: true, reason: 'low-end' })
  })

  it('a capable machine defaults to 3D', () => {
    expect(decideRenderer(env())).toEqual({ use2d: false, reason: 'default' })
  })

  it('unknown memory does not falsely flag low-end', () => {
    expect(decideRenderer(env({ memory: undefined, cores: 8 })).use2d).toBe(false)
  })
})
