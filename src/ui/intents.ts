/**
 * UI intents — the ONLY way the UI/scene layer acts on the rig.
 * The bootstrap orchestrator applies intents to ConnectionGraph and notifies
 * listeners; the UI never mutates the graph (CLAUDE.md unidirectional flow).
 */
import type { ControlValue, PortRef } from '../engine/types'

export type Intent =
  | { type: 'CONNECT'; a: PortRef; b: PortRef }
  | { type: 'DISCONNECT'; connectionId: string }
  | { type: 'SET_CONTROL'; instance: string; control: string; value: ControlValue }
  /** Sandbox (ADR-0004): grab a device from the shelves, drop it on stage. */
  | { type: 'SPAWN'; deviceId: string }
  /** Sandbox (ADR-0005): rebuild a saved rig — clear stage, respawn, rewire. */
  | { type: 'LOAD_RIG'; name: string }

export type IntentDispatcher = (intent: Intent) => void
