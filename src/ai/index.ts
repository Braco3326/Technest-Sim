/**
 * Composition du coach IA (ADR-0006) : GroundedCoach = n'importe quel
 * AiProvider + ancrage strict + validation de sortie. createAiCoach() lit la
 * config .env DÉFÉRÉE — clé absente → UnconfiguredCoach, jamais de crash.
 */
import {
  UnconfiguredCoach,
  type AiCoach,
  type AiProvider,
  type CoachResult,
  type CoachStatus,
} from './AiCoach'
import { groundingToContext, validateReply, type Grounding } from './grounding'
import { buildUserMessage, SYSTEM_PROMPT } from './prompt'
import { AnthropicProvider, DEFAULT_MODEL } from './anthropic'

export class GroundedCoach implements AiCoach {
  readonly status: CoachStatus = 'ready'
  constructor(private provider: AiProvider) {}

  async explain(grounding: Grounding): Promise<CoachResult> {
    let text: string
    try {
      text = await this.provider.complete(SYSTEM_PROMPT, buildUserMessage(groundingToContext(grounding)))
    } catch (err) {
      console.warn('[ai-coach] provider error', err)
      return { kind: 'unavailable', reason: 'error' }
    }
    const check = validateReply(text, grounding)
    if (!check.ok) {
      console.warn(`[ai-coach] réponse rejetée (ancrage) : ${check.reason}`)
      return { kind: 'unavailable', reason: 'rejected' }
    }
    return { kind: 'answer', text, citations: check.citations }
  }
}

export interface CoachEnv {
  VITE_AI_COACH_KEY?: string
  VITE_AI_COACH_PROVIDER?: string
  VITE_AI_COACH_MODEL?: string
}

/** Clé absente ou provider inconnu → état « coach IA non configuré » propre. */
export function createAiCoach(env: CoachEnv): AiCoach {
  const key = env.VITE_AI_COACH_KEY?.trim()
  if (!key) return new UnconfiguredCoach()
  const provider = env.VITE_AI_COACH_PROVIDER?.trim() || 'anthropic'
  if (provider !== 'anthropic') {
    console.warn(`[ai-coach] provider "${provider}" non implémenté (voir docs/prompts/05) — coach désactivé`)
    return new UnconfiguredCoach()
  }
  return new GroundedCoach(new AnthropicProvider(key, env.VITE_AI_COACH_MODEL?.trim() || DEFAULT_MODEL))
}

/**
 * Point d'entrée UI — DOUBLE garde examen (ADR-0006 décision 4) : en mode
 * examen le coach est muet AVANT tout appel réseau, quoi que câble l'UI.
 */
export function askCoach(
  coach: AiCoach,
  grounding: Grounding,
  opts: { examMode: boolean },
): Promise<CoachResult> {
  if (opts.examMode) return Promise.resolve({ kind: 'unavailable', reason: 'exam' })
  return coach.explain(grounding)
}
