/**
 * logic/mixMinus — R7 (N-1 echo), pure (ADR-0001). THE exam question.
 *
 * State convention: control `route-<srcPort>-to-<busPort>` true = the console
 * source <srcPort> is assigned to bus <busPort> (routing matrix).
 *
 * Echo detection is pure graph+state topology — no device ids hardcoded:
 * a violation exists when, on the same console,
 *   bus B  → feeds an input of remote device K (the send), and
 *   an output of K → feeds console input S (the return), and
 *   route-S-to-B is ON — the remote's own voice rides its own send: echo.
 * The fix is a MIX-MINUS: everything on B except S.
 */
import type { RigSnapshot, ViolationDraft } from '../engine/types'
import { otherEnds } from './helpers'

const ROUTE = /^route-(.+)-to-(.+)$/

export const mixMinusCheck = (snapshot: RigSnapshot): ViolationDraft[] => {
  const violations: ViolationDraft[] = []
  for (const console_ of snapshot.instances) {
    for (const [controlId, on] of Object.entries(console_.controls)) {
      const match = ROUTE.exec(controlId)
      // route-* are toggles; guard the value type (enum controls also live here).
      if (!match || typeof on !== 'boolean' || !on) continue
      const [, srcPortId, busPortId] = match
      const busFeeds = otherEnds(snapshot, { instance: console_.instanceId, port: busPortId })
      const srcFedBy = otherEnds(snapshot, { instance: console_.instanceId, port: srcPortId })
      for (const sendEnd of busFeeds) {
        for (const returnEnd of srcFedBy) {
          if (sendEnd.instance !== returnEnd.instance) continue // not the same remote: no loop
          violations.push({
            ruleId: 'R7',
            subjects: [{ instance: console_.instanceId, port: busPortId }, sendEnd],
          })
        }
      }
    }
  }
  return violations
}
