/**
 * UI intents — the ONLY way the UI/scene layer acts on the rig.
 * The bootstrap orchestrator applies intents to ConnectionGraph and notifies
 * listeners; the UI never mutates the graph (CLAUDE.md unidirectional flow).
 */
import type { PortRef } from '../engine/types'

export type Intent =
  | { type: 'CONNECT'; a: PortRef; b: PortRef }
  | { type: 'DISCONNECT'; connectionId: string }
  | { type: 'SET_CONTROL'; instance: string; control: string; value: boolean }

export type IntentDispatcher = (intent: Intent) => void
