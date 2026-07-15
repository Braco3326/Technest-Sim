/** Shared pure helpers for logic/* modules — snapshot queries only, no engine imports. */
import type { PortRef, RigSnapshot, SnapshotPort } from '../engine/types'

export const sameRef = (a: PortRef, b: PortRef): boolean =>
  a.instance === b.instance && a.port === b.port

export const portOf = (snap: RigSnapshot, ref: PortRef): SnapshotPort | undefined =>
  snap.instances.find((i) => i.instanceId === ref.instance)?.ports.find((p) => p.portId === ref.port)

export const isConnected = (snap: RigSnapshot, ref: PortRef): boolean =>
  snap.connections.some((c) => sameRef(c.a, ref) || sameRef(c.b, ref))

/** Refs sitting at the other end of every connection touching `ref`. */
export const otherEnds = (snap: RigSnapshot, ref: PortRef): PortRef[] =>
  snap.connections
    .filter((c) => sameRef(c.a, ref) || sameRef(c.b, ref))
    .map((c) => (sameRef(c.a, ref) ? c.b : c.a))
