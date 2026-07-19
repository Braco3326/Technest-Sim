# TekPractice — The "Real Set" System (sizes · staging · I/O · Set Editor)
_From random-scattered to a coherent, correctly-scaled, staged white set — plus an in-app editor to perfect each device one by one. Approved decisions: in-app Set Editor · white studio kept but grounded/staged · connection issue is visual/layout (rules stay)._

## The goal (what "done" looks like)
Open A1 and see a believable set: every piece at true relative scale, grounded on the floor or on its proper stand, logically positioned so the signal flow reads left-to-right / stage→FOH, ports clearly marked input vs output, cables routed cleanly — all in the calm white studio. And a dev-mode editor where you select any device, move/rotate/scale it, fix its ports, and Save — perfecting the set one device at a time.

## The 4 components

### 1. Dimensions-driven scale (kills "random sizes")
- **Single source of truth:** every device gets real dimensions `W×H×D` (mm) in `catalog.json` (from `assets-source/**/notes.md`).
- **DeviceSpawner scales each `.glb` to fit its real dimensions** (bounding-box → real size). A mic ends ~18 cm, a DBR12 ~36 cm wide, a QL1 ~44 cm, a K12.2 ~36 cm — all consistent 1:1. No more monoliths or slivers.
- **Validation:** flag any device missing real dimensions; a `npm run check:dims` report.

### 2. Staging model (kills floating/scattered — grounded white set)
- **Per-level "set layout" data:** each device gets `{ position, rotation, mount }`. Nothing floats — everything sits on the floor or on a support.
- **Mounts = reusable white-styled support props:** `mic-stand`, `speaker-tripod`, `foh-desk`, `rack`, `floor`. A mic mounts on a stand at ~1.4 m; a K12.2 on a tripod; a DBR12 as a floor wedge angled up; the Rio on the stage edge; the QL1 on the FOH desk.
- **Staging defaults by device role** so new levels auto-place sensibly (then fine-tune in the editor).
- **Subtle floor zones** (soft tinted areas, white-appropriate — not the reference's dark mats) mark stage vs FOH, giving spatial logic like the reference without breaking the white DA.
- Extends the existing `content/environments/*.json` presets.

### 3. I/O clarity + signal-flow readability (the "random connections" fix)
- **Inputs vs outputs are visually distinct** on every device — color + a small direction cue (out = source colour, in = destination colour), label on hover. You instantly see what feeds what.
- **Logical placement** so the chain reads as flow: sources (mics) → stagebox → console → amps/speakers, arranged so cables run naturally (down to FOH like the reference).
- **Cable routing:** clean catenary, cables drop from stage toward the FOH console; no crossing spaghetti where avoidable.
- (Engine rules R1–R3 + requiredChain stay untouched — this is purely visual clarity.)

### 4. The In-app Set Editor (dev mode) — the correction tool
- **Enter with `?edit=1`** (or a dev keybind); hidden from students.
- **Select a device →** transform gizmos: move, rotate, scale. A side panel sets its `mount` and lets you **drag its port markers** to the exact real connector spots.
- **Live** — changes apply instantly in the white scene; you eyeball against the real gear.
- **Save →** writes the corrected transforms/mounts back to the **level JSON**, and port-offset/dimension corrections back to the **catalog** (device-level). Via a tiny dev-server save endpoint (or download-JSON fallback).
- This is how you "perfect one by one": walk each device, nudge until right, Save, next.

## Data model changes
- `catalog.json` device: add `dimensions: {w,h,d}` (mm) and optional per-port `offset` (fine local position).
- `content/levels/*.json` (or environment): add `layout: { <instanceId>: { position, rotation, mount } }`.
- New `content/mounts.json`: the support props (stand, tripod, desk, rack) — data, styled by the design tokens.

## Architecture (respects the 3 layers)
- **Content = data:** dimensions, layout, mounts are all JSON. Engine untouched. New content = data edits.
- **Editor = a dev UI** that reads/writes those JSON files (dev-server endpoint or file download). It never touches the engine or the graph; it edits the *scene/content* only.
- Reuses `DeviceSpawner` (adds real-dimension scaling + mount attachment), the rigged `port_*` empties, and the environment presets.

## Build order (fastest visible win first)
1. **Dimensions → real scale** (catalog dims + DeviceSpawner fit). *Immediate huge improvement — everything sized right.*
2. **Staging + mounts + floor zones** (grounded, logical white set). *Kills floating/scattered.*
3. **I/O clarity + cable routing** (input/output distinct, chain reads as flow).
4. **The Set Editor** (gizmos + port drag + Save-to-JSON). *The perfect-one-by-one tool.*

## Success criteria
- A1 reads as a coherent white staged set: correct relative scale, nothing floating, logical stage→FOH layout, clear input/output ports, tidy cables.
- In `?edit=1` I can select any device, move/rotate/scale it, drag a port to the right spot, hit Save, reload, and the correction persists in the JSON.
- Adding a new device/level places sensibly by default, then is fine-tuned in the editor.

## Testing
- `check:dims` flags missing dimensions; unit test: DeviceSpawner scales a known device to its catalog dimensions.
- Editor Save round-trip test: edit → save → reload → transform matches.
- e2e: A1 loads with all devices grounded (y ≥ 0), none overlapping beyond tolerance.
