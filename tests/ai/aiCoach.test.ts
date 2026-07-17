/**
 * Coach IA (ADR-0006) — ancrage strict, dégradation sans clé, silence examen.
 * Sur le VRAI catalog (source de vérité), provider factice pour le réseau.
 */
import { describe, expect, it, vi } from 'vitest'
import { ConnectionGraph } from '../../src/engine/ConnectionGraph'
import type { AiProvider } from '../../src/ai/AiCoach'
import { buildGrounding, groundingToContext, validateReply } from '../../src/ai/grounding'
import { SYSTEM_PROMPT } from '../../src/ai/prompt'
import { askCoach, createAiCoach, GroundedCoach } from '../../src/ai'
import { makeLevel, makeRegistry } from '../helpers'

const registry = makeRegistry()
const a1 = makeLevel('a1')

/** Rejection R2 typique : SM58 (mic) branché dans une entrée ligne de la K12. */
const r2Question = {
  ruleId: 'R2',
  errorCode: 'SIGNAL_MISMATCH',
  subjects: [
    { instance: 'sm58-1', port: 'out-xlr' },
    { instance: 'k12-1', port: 'in-line-a' },
  ],
}
const snapshot = () => new ConnectionGraph(registry, a1.devices).snapshot()

describe('buildGrounding — le pack ne contient QUE le contexte impliqué', () => {
  const g = buildGrounding(registry, snapshot(), r2Question)

  it('porte la règle déclenchée avec son teach du catalog', () => {
    expect(g.ruleId).toBe('R2')
    expect(g.ruleLine).toContain('R2')
    expect(g.ruleLine).toContain(registry.ruleById.get('R2')!.teach)
  })

  it('n’autorise en citation QUE les devices impliqués', () => {
    expect(g.allowedDeviceIds.sort()).toEqual(['qsc-k12-2', 'shure-sm58'])
    expect(g.knownDeviceIds).toContain('yamaha-ql1') // connu, mais PAS citable
  })

  it('le contexte sérialisé cite ses sources en ids ancrables', () => {
    const ctx = groundingToContext(g)
    expect(ctx).toContain('[catalog:shure-sm58]')
    expect(ctx).toContain('Règle déclenchée : R2')
  })
})

describe('validateReply — jamais de matériel ou de règle inventés', () => {
  const g = buildGrounding(registry, snapshot(), r2Question)

  it('accepte une réponse ancrée qui cite règle + appareil du contexte', () => {
    const r = validateReply(
      'Un micro dynamique [catalog:shure-sm58] sort un niveau micro, pas ligne [R2]. Que faudrait-il entre les deux ?',
      g,
    )
    expect(r).toMatchObject({ ok: true })
    if (r.ok) expect(r.citations.sort()).toEqual(['[R2]', '[catalog:shure-sm58]'])
  })

  it('rejette une règle qui n’existe pas au catalog', () => {
    expect(validateReply('C’est la règle [R9] voyons.', g)).toMatchObject({ ok: false })
  })

  it('rejette la citation d’un appareil hors contexte', () => {
    expect(validateReply('Regarde la console [catalog:yamaha-ql1] [R2].', g)).toMatchObject({ ok: false })
  })

  it('rejette la mention en clair d’un appareil du catalog absent du montage', () => {
    expect(
      validateReply('Utilise plutôt un focusrite-isa-one pour préamplifier [R2].', g),
    ).toMatchObject({ ok: false })
  })

  it('rejette une réponse sans aucune citation (pas de source = pas de réponse)', () => {
    expect(validateReply('Fais confiance, c’est faux.', g)).toMatchObject({
      ok: false,
      reason: 'aucune source citée',
    })
  })
})

describe('GroundedCoach — dégradation, jamais de throw', () => {
  const g = buildGrounding(registry, snapshot(), r2Question)

  it('réponse valide du provider → answer avec citations', async () => {
    const provider: AiProvider = {
      complete: async () => 'Niveau micro ≠ niveau ligne [R2]. Quel maillon manque après [catalog:shure-sm58] ?',
    }
    const res = await new GroundedCoach(provider).explain(g)
    expect(res.kind).toBe('answer')
    if (res.kind === 'answer') expect(res.citations).toContain('[R2]')
  })

  it('réponse non ancrée → rejected (l’UI garde le teach authoré)', async () => {
    const provider: AiProvider = { complete: async () => 'Branche le neumann-u87-ai à la place.' }
    expect(await new GroundedCoach(provider).explain(g)).toEqual({
      kind: 'unavailable',
      reason: 'rejected',
    })
  })

  it('provider en panne → error, sans exception', async () => {
    const provider: AiProvider = {
      complete: async () => {
        throw new Error('network down')
      },
    }
    expect(await new GroundedCoach(provider).explain(g)).toEqual({
      kind: 'unavailable',
      reason: 'error',
    })
  })
})

describe('createAiCoach — clé DIFFÉRÉE, jamais de crash', () => {
  it('sans clé → unconfigured, explain() résout proprement', async () => {
    const coach = createAiCoach({})
    expect(coach.status).toBe('unconfigured')
    const g = buildGrounding(registry, snapshot(), r2Question)
    expect(await coach.explain(g)).toEqual({ kind: 'unavailable', reason: 'unconfigured' })
  })

  it('provider inconnu (gemini pas encore implémenté) → unconfigured, pas de throw', () => {
    expect(createAiCoach({ VITE_AI_COACH_KEY: 'k', VITE_AI_COACH_PROVIDER: 'gemini' }).status).toBe(
      'unconfigured',
    )
  })

  it('clé présente → ready', () => {
    expect(createAiCoach({ VITE_AI_COACH_KEY: 'sk-test' }).status).toBe('ready')
  })
})

describe('askCoach — silence TOTAL en examen (double garde)', () => {
  it('mode examen : aucun appel provider, réponse « exam »', async () => {
    const complete = vi.fn(async () => 'jamais appelé [R2]')
    const coach = new GroundedCoach({ complete })
    const g = buildGrounding(registry, snapshot(), r2Question)
    expect(await askCoach(coach, g, { examMode: true })).toEqual({
      kind: 'unavailable',
      reason: 'exam',
    })
    expect(complete).not.toHaveBeenCalled()
  })

  it('hors examen : l’appel passe', async () => {
    const complete = vi.fn(async () => 'Pourquoi ce niveau ne convient-il pas ? [R2]')
    const coach = new GroundedCoach({ complete })
    const g = buildGrounding(registry, snapshot(), r2Question)
    expect((await askCoach(coach, g, { examMode: false })).kind).toBe('answer')
    expect(complete).toHaveBeenCalledOnce()
  })
})

describe('prompt système — teach, don’t cheat (garde-fous structurels)', () => {
  it('impose l’ancrage, les citations, le socratique et l’interdiction de la solution', () => {
    expect(SYSTEM_PROMPT).toContain('CONTEXTE')
    expect(SYSTEM_PROMPT).toContain('[catalog:')
    expect(SYSTEM_PROMPT).toContain('Ne donne JAMAIS la solution')
    expect(SYSTEM_PROMPT).toContain('questions')
  })
})
