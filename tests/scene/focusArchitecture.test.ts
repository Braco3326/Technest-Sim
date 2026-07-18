/**
 * Static discipline gate (spec §5 + ADR-0008): the camera/interaction modules
 * NEVER import the graph. Validation is an injected canConnect closure,
 * mutation is an injected dispatch — the camera cannot mutate what it cannot see.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const src = (name: string): string =>
  readFileSync(new URL(`../../src/scene/${name}`, import.meta.url), 'utf8')

const CAMERA_MODULES = ['focusMachine.ts', 'CameraRig.ts', 'FocusPatch.ts']

describe('camera modules never touch the graph', () => {
  for (const file of CAMERA_MODULES) {
    it(`${file} does not import ConnectionGraph (nor any engine module beyond types)`, () => {
      const code = src(file)
      // IMPORTS are the contract (doc comments may name the injected source).
      expect(code).not.toMatch(/from '[^']*ConnectionGraph[^']*'/)
      const engineImports = [...code.matchAll(/from '\.\.\/engine\/([\w/]+)'/g)].map((m) => m[1])
      expect(engineImports.every((m) => m === 'types')).toBe(true)
    })
  }

  it('focusMachine is fully pure: no Babylon, no DOM, no scene imports', () => {
    const code = src('focusMachine.ts')
    expect(code).not.toMatch(/@babylonjs/)
    expect(code).not.toMatch(/document\.|window\./)
    expect(code).not.toMatch(/from '\.\/(CableRenderer|DeviceSpawner|CameraRig|FocusPatch)'/)
  })

  it('no module re-implements validation: the only verdicts come from injected canConnect', () => {
    for (const file of CAMERA_MODULES) {
      const code = src(file)
      // The R1/R2/R3 vocabulary lives in the engine; its absence here means the
      // scene cannot have grown its own rule logic.
      expect(code).not.toMatch(/matesWith|CONNECTOR_MISMATCH|SIGNAL_MISMATCH|DIRECTION_MISMATCH/)
    }
  })
})
