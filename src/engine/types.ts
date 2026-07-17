/**
 * Engine core types. The engine is audio-agnostic and never imports logic/* —
 * logic modules receive plain RigSnapshot data (ADR-0001) via RuleEvaluator.
 */

export type PortRef = { instance: string; port: string }

export type ErrorCode =
  | 'UNKNOWN_INSTANCE'
  | 'UNKNOWN_PORT'
  | 'UNKNOWN_CONTROL'
  | 'UNKNOWN_CONNECTION'
  | 'UNKNOWN_DEVICE' // addInstance (ADR-0004)
  | 'DUPLICATE_INSTANCE' // addInstance (ADR-0004)
  | 'INVALID_CONTROL_VALUE' // setControl on an enum control (ADR-0007)
  | 'SELF_CONNECTION'
  | 'PORT_OCCUPIED'
  | 'DIRECTION_MISMATCH' // R3
  | 'CONNECTOR_MISMATCH' // R1
  | 'SIGNAL_MISMATCH' // R2

/**
 * A device-control value (ADR-0001 + ADR-0007): a toggle is a boolean, an enum
 * control (e.g. sample-rate 44100/48000/96000) is one of its string options.
 */
export type ControlValue = boolean | string

/** Engine-invariant rules enforced by ConnectionGraph.connect() in every level. */
export type InvariantRuleId = 'R1' | 'R2' | 'R3'

export type Ok = { ok: true; connectionId?: string }
export type TypedError = {
  ok: false
  code: ErrorCode
  /** Set when the rejection is one of the engine invariants, so the UI can toast rule.teach. */
  ruleId?: InvariantRuleId
  message: string
}
export type ConnectResult = Ok | TypedError

// ── RigSnapshot: the pure-data view logic/* modules consume (ADR-0001) ──────
export interface SnapshotPort {
  portId: string
  dir: 'in' | 'out' | 'bidir'
  connector: string
  signal: string
  /** EFFECTIVE flags: a flag gated by a control (controls[].enables) is present only while that control is on. */
  flags: string[]
}
export interface SnapshotInstance {
  instanceId: string
  deviceId: string
  ports: SnapshotPort[]
  controls: Record<string, ControlValue>
}
export interface SnapshotConnection {
  a: PortRef
  b: PortRef
}
export interface RigSnapshot {
  instances: SnapshotInstance[]
  connections: SnapshotConnection[]
}

// ── Teaching events (RuleEvaluator output) ──────────────────────────────────
export interface TeachingEvent {
  ruleId: string
  severity: 'error' | 'warning'
  title: string
  teach: string
  subjects: PortRef[]
}

/**
 * What a pure logic module returns: which rule fired, on which ports.
 * RuleEvaluator enriches drafts with severity/title/teach from the catalog.
 */
export interface ViolationDraft {
  ruleId: string
  subjects: PortRef[]
}
export type LogicCheck = (snapshot: RigSnapshot) => ViolationDraft[]

/** Domain modules a level's logicChecks can route to ('engine' excluded — invariants live in ConnectionGraph). */
export type LogicModuleName = 'logic/phantom' | 'logic/gpio' | 'logic/mixMinus' | 'logic/clock'

// ── LevelRunner output ──────────────────────────────────────────────────────
export interface LevelState {
  chainComplete: boolean
  connectedRequired: number
  totalRequired: number
  missing: { from: PortRef; to: PortRef }[]
  violations: TeachingEvent[]
  won: boolean
}
