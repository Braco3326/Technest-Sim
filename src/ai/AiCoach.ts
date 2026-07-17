/**
 * AiCoach — interface swappable du coach IA temps-réel (ADR-0006).
 * Distinct des « Conseils d'Oscar » authorés (content/coach/tips.json) : le
 * coach IA répond À LA DEMANDE (« Pourquoi ? »), ancré sur le catalog + le
 * graphe courant, et se dégrade proprement quand aucune clé n'est configurée.
 */
import type { PortRef } from '../engine/types'
import type { Grounding } from './grounding'

export type CoachStatus = 'ready' | 'unconfigured'

/** Ce que l'UI sait au moment où l'élève clique « Pourquoi ? ». */
export interface CoachQuestion {
  /** Règle déclenchée (R1..R8) quand la rejection/violation en porte une. */
  ruleId?: string
  /** Code d'erreur gameplay sinon (PORT_OCCUPIED, …). */
  errorCode?: string
  /** Ports impliqués — délimitent le matériel que le coach a le droit de citer. */
  subjects: PortRef[]
}

export interface CoachReply {
  kind: 'answer'
  text: string
  citations: string[]
}
export interface CoachUnavailable {
  kind: 'unavailable'
  reason: 'unconfigured' | 'exam' | 'error' | 'rejected'
}
export type CoachResult = CoachReply | CoachUnavailable

export interface AiCoach {
  readonly status: CoachStatus
  /** Ne throw JAMAIS : toute panne devient un CoachUnavailable. */
  explain(grounding: Grounding): Promise<CoachResult>
}

/**
 * Bas niveau, swappable (ADR-0006 décision 1) : Anthropic aujourd'hui, Gemini
 * ou Ollama demain = une nouvelle implémentation de CETTE interface, rien d'autre.
 */
export interface AiProvider {
  complete(system: string, user: string): Promise<string>
}

/** Clé absente → le jeu tourne, le bouton n'existe pas, rien ne crash. */
export class UnconfiguredCoach implements AiCoach {
  readonly status: CoachStatus = 'unconfigured'
  explain(): Promise<CoachResult> {
    return Promise.resolve({ kind: 'unavailable', reason: 'unconfigured' })
  }
}
