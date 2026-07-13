# ADR-0001 — Device state for stateful teaching rules (R4 phantom, and beyond)

- **Status:** Proposed (awaiting Oscar's OK — engine step 4 implements it)
- **Date:** 2026-07-13
- **Context rule:** R4 (phantom +48 V). Later consumers: R5/R6 (fader open), R8 (sample rate).

## Context

Phantom power is a **switch, not a cable**. The connection graph alone cannot decide R4:
the U 87 can be correctly wired into the ISA One's mic input and still be silent because
+48 V is off. Some teaching rules therefore need **device state** in addition to the graph:

| Rule | Needs | State kind |
|---|---|---|
| R4 phantom | is +48 V enabled on the preamp? | toggle |
| R5 tally / R6 monitor-mute | is the mic fader open? | toggle (P2) |
| R8 clock | sample rate per device | enum (P2) |

Constraints (CLAUDE.md): unidirectional flow, UI never mutates the graph, `logic/*` stay
pure functions, content is data-only, engine contracts must not be broken.

## Decision

**1. Content — controls are catalog data.** A device may declare physical controls:

```jsonc
// devices[].controls
{ "id": "phantom-48v", "type": "toggle", "label": "+48V phantom", "default": false,
  "enables": { "flag": "providesPhantom", "ports": ["in-mic"] } }
```

`enables` gates a port flag on the runtime value: the port's `providesPhantom` flag is
only **effective** while the control is on. A port with a gated flag and no control state
defaults to the control's `default`. Ports whose flags are not gated by any control keep
them always-on (e.g. Rio/QL1 phantom stays implicit until a control is added — harmless,
no condenser exists in those levels). `type` is `"toggle"` today; `"enum"` (sample rate)
is the planned extension, same shape.

**2. Engine — ConnectionGraph owns the runtime rig state.** The graph is already the
single runtime source of truth for the rig; control values live beside connections:

```ts
ConnectionGraph.setControl(instanceId, controlId, value): Ok | TypedError  // unknown ids → TypedError
ConnectionGraph.getControl(instanceId, controlId): boolean
ConnectionGraph.snapshot(): RigSnapshot   // plain-data view: instances, ports (with EFFECTIVE flags), connections, controls
```

Existing contracts (`connect`, `disconnect`, `query`, `RuleEvaluator.evaluate(graph)`)
are unchanged — `evaluate` still takes the graph and reads `graph.snapshot()`.

**3. Flow — a control change is an intent, like a cable drop.**

`UI toggle click → dispatch SET_CONTROL intent → ConnectionGraph.setControl → RuleEvaluator sweep → toast → LevelRunner.check`

Same unidirectional pipeline as connect/disconnect; the UI never mutates state directly.

**4. Logic — pure functions receive plain data.** `logic/phantom.ts` gets a
`RigSnapshot`, never the graph object: find ports flagged `requiresPhantom`, walk their
connection to an input, pass iff that input's **effective** `providesPhantom` is true.
Deterministic, trivially testable (triggers / doesn't-trigger fixtures are just JSON).

**5. Validation.** `validate-catalog` asserts: control ids unique per device,
`enables.ports` exist on the device, and each gated port actually carries the flag.

## Alternatives rejected

- **State in a separate DeviceStateStore next to the graph** — breaks
  `RuleEvaluator.evaluate(graph)` (needs a second argument) or forces a hidden global;
  two sources of runtime truth to keep in sync.
- **State on scene DeviceInstance (Babylon side)** — couples rules to rendering; logic
  would read scene objects, violating the audio-agnostic engine layer.
- **State in the UI layer** — UI must stay a dumb intent dispatcher; state there is
  invisible to RuleEvaluator and untestable headless.
- **Modeling phantom as a connection/cable** — physically wrong (the lesson IS that it's
  a switch riding the same cable), and would pollute the graph with fake edges.

## Consequences

- Engine step 4 implements `setControl/getControl/snapshot` + `logic/phantom` on
  snapshots; D1 stub already declares `logicChecks: ["R4","R8"]`.
- LevelRunner win condition naturally includes logic checks passing (R4 forces the
  player to flip +48 V on — the intended lesson).
- Playwright/vitest can drive controls programmatically through the same intents.
- P2 `enum` controls (sample rate) reuse the shape; no new architecture needed.
