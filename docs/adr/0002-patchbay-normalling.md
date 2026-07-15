# ADR-0002 — Patchbay normalling (normalled / half-normalled)

- **Status:** Proposed (design only — NOT implemented; D1 v1 ships without normalling)
- **Date:** 2026-07-15
- **Context rule:** D1 full version (Switchcraft StudioPatch 9625); teaching goal =
  "a patch inserted in the TOP jack breaks the normal; half-normalled taps without breaking".

## Problem

Normalling is an IMPLICIT signal path inside the bay: rear-in N flows to rear-out N
with no cable, UNTIL a front TT insertion breaks it. Today ConnectionGraph only knows
EXPLICIT cables — representing normals as regular connections would let the player
"disconnect" them, and RuleEvaluator/LevelRunner would count them in requiredChain
matching. This cannot be modeled without an engine extension, and CLAUDE.md forbids
hacking one in from the content layer.

## Proposed design (engine extension, one concept)

**Content** — the bay declares its normals (data only, zod extension):

```jsonc
// devices[].normals
[{ "from": "rear-in-db25", "to": "rear-out-db25", "mode": "half" | "full" }]
```

**Engine** — ConnectionGraph gains DERIVED edges, never stored as connections:

- `effectiveConnections()` = explicit cables + implicit normal edges, where a normal
  edge {from,to} is present iff:
  - mode "full": NO explicit cable occupies `from`'s front tap NOR `to`'s front tap
  - mode "half": no explicit cable occupies the destination tap only (source tap taps
    without breaking)
- Front-tap ↔ rear-pair mapping is part of the same content block (`tapOf` field per
  normal entry) so the engine stays data-driven.
- `connect()/disconnect()` are UNCHANGED (they manage explicit cables only).
  `snapshot()` exposes both lists (`connections`, `derived`) so logic/* and
  LevelRunner can reason about actual signal flow without new APIs.

**Contracts impact** — `RuleEvaluator.evaluate(graph)`, `LevelRunner.check(graph)`
signatures unchanged; LevelRunner's requiredChain matching switches to
`effectiveConnections()`. UI renders derived edges as faint "internal" links.

## Why not alternatives

- **Normals as pre-made cables** — player can delete them; occupancy blocks the jack;
  physically wrong (a normal is not a cable).
- **Normalling in logic/*** — logic modules are read-only rule checkers; signal
  routing belongs to the graph, and requiredChain matching lives in LevelRunner.
- **Special-casing in the scene layer** — violates engine-audio-agnostic layering;
  headless tests would not see the normal paths.

## Consequences

- Small, contained engine change (derived-edge computation + snapshot field),
  gated behind content that only the D1-full bay uses.
- Teaching flows naturally: patch into the front jack → the derived edge vanishes →
  the chain breaks → toast explains normalling.
- To implement when D1-full is scheduled; requires Oscar's OK on this ADR first.
