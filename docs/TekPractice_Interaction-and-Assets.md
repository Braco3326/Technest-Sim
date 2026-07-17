# TekPractice — "Focus & Patch" Interaction + Asset Sourcing (Design Spec)
_Council-validated (Tier 3, 84%). Desktop-first, touch-portable. Realistic modeling. Companion to the vision docs._

## 0. The core insight
On real gear, **finding the right port on a real panel IS the exam skill** (E4). So the interaction must *not* auto-solve port-finding the way PC Building Sim's auto-connect does. Some friction is pedagogy. This single principle drives every choice below.

---

## 1. The recommended model — "Focus & Patch" (your idea, refined)
No more constant zoom/unzoom. Two camera states: **Ensemble** (the whole set) and **Focus** (one device, auto-framed, free-orbit).

**Flow (Levels):**
1. **Ensemble view** — you see your whole setup (console, mics, speakers, rack…).
2. **Double-click a device** → camera smoothly flies in and **auto-frames it**; you **orbit freely** (drag) to see front/back/I-O. Labels appear on hover.
3. **Click a port** (e.g. a cable's male XLR, or a device output) → that end is **"in hand"** (a held-cable indicator follows).
4. **Esc / right-click / click empty space** → fly back to **Ensemble**. Compatible devices **glow** (they have a free, compatible port).
5. **Double-click the target device** (e.g. the rack, the speaker) → focus + orbit → **click the destination port** → **connected** (cable snaps, catenary drawn).
6. Repeat. A cable can be started from either end (matches the engine's unordered chain).

**Why this beats the alternatives:**
- vs **drag-to-connect** (PC Building Sim / node editors): dragging across a scene fails when the port is hidden on the back — you'd drag *while* rotating. Click→focus→click removes that entirely.
- vs **flat 2D patch panel by default**: faster but destroys the "recognize real I/O" skill. Kept only as an optional mode (below).
- vs **your original**: identical spirit; refinements = double-click to focus (single click = select/preview, avoids accidental focus), mode-gated hints, and a clear "held cable" state.

---

## 2. Camera & controls (desktop, touch-portable)
| Action | Desktop | Touch (later) |
|---|---|---|
| Enter focus on a device | double-click | double-tap |
| Orbit (in focus) | left-drag | one-finger drag |
| Zoom (fine) | scroll wheel | pinch |
| Pick a port / place cable | left-click | tap |
| Back to Ensemble | Esc / right-click / click empty | two-finger tap / back button |
| Cancel held cable | Esc / click the held end again | tap held end |

- **Smooth transitions** (250–350 ms eased fly) between Ensemble ⇄ Focus — no teleport, no nausea; respects `prefers-reduced-motion` (instant cut).
- **Auto-frame** targets the device's *active panel* (the side with the relevant I/O for the current step), so the ports you need are usually already facing you — but you can orbit to the real back panel.
- Keyboard: Tab cycles devices, Enter focuses, arrows orbit — accessibility + power users.

## 3. Teaching layer (hint = mode-gated)
- **Learn / Levels:** compatible free ports **glow green**, incompatible **dim**; hovering a port shows its label (type + signal). A gentle arrow can point to the recommended next port for absolute beginners (toggleable).
- **Exam mode:** **all highlights OFF** — you must locate and identify ports yourself, exactly like the jury table. (Consistent with the existing no-hints exam rule.)
- **Sandbox:** highlights ON by default (exploration), toggle to turn them off for self-testing.

## 4. Optional modes (not default)
- **Flat back-panel overlay** (accessibility / low-end / touch): click a device → a clean 2D image of its real back panel with clickable ports. Faster, but off by default because it bypasses the 3D-recognition skill. Great as the **2D low-fidelity fallback** the vision already calls for.
- **"Reveal I/O" X-ray** (beginner aid, Learn only): briefly ghosts the chassis so you see which ports exist — training wheels, never in Exam.

## 5. How it maps to the existing engine (no rewrite)
- Connection still goes through `ConnectionGraph.connect()` (R1/R2/R3 invariants) and `canConnect()` for the green/red dry-run — the "in hand" preview reuses `canConnect`.
- Camera/focus is a **scene/UI concern only** — it never touches the graph (respects the unidirectional flow + 3-layer rule).
- Ports already exist as `port_<portId>` empties/markers — focus mode just adds camera framing + a selection state + the held-cable indicator.
- Delegate: **Developer** builds the camera state machine + interaction; **Designer** does the focus framing, glow/dim tokens, held-cable visual, transitions.

---

## 6. Asset sourcing pipeline (datasheets + photos → 3D reference)
Goal: for every device in `catalog.json`, gather the **fiche technique + product photos (esp. the back/I-O panel)** so the 3D models match the real gear.

**Folder structure (in the repo, but git-ignored):**
```
D:\teknest\tekpractice\assets-source\        ← gitignored (reference only, not shipped)
  <category>\<device-id>\
    datasheet.pdf            ← manufacturer spec sheet / manual
    photos\ front.jpg, back.jpg (the I/O panel — the key one), angle-*.jpg
    notes.md                 ← real dimensions, port count/types, colors, finish
```
Categories: Consoles · Microphones · Monitors-Speakers · Stageboxes-IO · Codecs · Patchbays · Stands-Accessories · Cables-Connectors.

**Why the back-panel photo + datasheet matter most:** they give exact **I/O layout, port counts/types, and real dimensions** — which is both the modeling reference *and* a **consistency check against `catalog.json`** (if the datasheet shows 16 XLR inputs and the catalog says 8, we catch it).

**How to gather (semi-automated):**
1. From `catalog.json`, generate `assets-source/SOURCES.md` — one row per device: brand, model, and the **official product-page + datasheet URL** to fetch.
2. Download datasheets/photos where the source permits; anything blocked, Oscar grabs manually from the manufacturer site (2 min each).
3. `notes.md` per device: dimensions (mm), rack units, port map, colour/finish — the modeler's checklist.

**⚠️ Legal (important):** manufacturer datasheets/photos are fine as **internal modeling reference** (personal/learning). Keep `assets-source/` **git-ignored and never published**. For a commercial launch, real brand logos / exact likeness need clearance — that's the "trademark for later" flag you already accepted. The shipped `.glb` models are *your* recreations, not the copied photos.

---

## 7. Build order
1. **Interaction (Developer + Designer):** camera state machine (Ensemble ⇄ Focus) → port selection + held-cable → glow/dim hint layer (mode-gated) → transitions & reduced-motion → touch mapping stubs. Tests: connect via focus flow e2e; exam hides hints; reduced-motion cuts transitions.
2. **Asset pipeline:** generate `SOURCES.md` from catalog → gather datasheets/photos → `notes.md` per device → then re-model each `.glb` to match (Blender), cross-checking I/O against the catalog.
3. Optional flat-panel fallback (accessibility/low-end) after the 3D flow is solid.

## 8. Success criteria
- Wire a full A1 chain **without ever manually zooming** — double-click, orbit, click ports, done.
- In Exam mode, no port is highlighted — you locate them yourself.
- Every device folder has a datasheet + back-panel photo + notes, and the catalog I/O matches the datasheet.
- Works with mouse now; the same clicks map to taps later with no redesign.
