# Prompt — Autonomous overnight asset factory (Blender MCP)
Goal: Claude Code generates all P1 3D models independently via the Blender MCP, unattended, as far as it can get. Ports/connections reconciled with the catalog later.

## PRE-FLIGHT (do this before you sleep — 3 minutes)
1. **Blender open** with the MCP add-on enabled and **Connected** (check the add-on panel says connected).
2. **Stop Windows from sleeping**: Settings → System → Power → Screen & sleep → set "When plugged in, put my device to sleep" to **Never**. (Also set screen off to Never or long.) Keep the laptop plugged in.
3. **Git ready**: repo has a remote and you're logged in, so progress is pushed and survives a crash.
4. Leave Blender as the foreground app; don't lock in a way that suspends apps.
5. Paste the prompt below into Claude Code and let it run.

> Reality check: if Blender disconnects or a usage limit hits, it pauses there. That's expected — you'll still have every model it finished (committed one by one). Just resume in the morning.

---

## THE PROMPT (paste into Claude Code)

```
Respecte CLAUDE.md. AUTONOMOUS OVERNIGHT MODE — asset generation only. Do NOT build the engine, do NOT touch content/catalog.json, do NOT wait for me. I am asleep. Work continuously and independently down the queue below until you finish it or hit a hard stop (Blender disconnected / usage limit). Never pause to ask for approval — make reasonable assumptions and LOG them.

TASK: build low-poly, trademark-safe 3D models of pro-audio gear and connectors in Blender via the Blender MCP, export each as an optimized .glb into public/assets/, and keep a manifest + log.

WORKING RULES (autonomy):
- Process the queue in order. After EACH model: export, optimize, render a thumbnail to verify it looks right, commit, then immediately start the next. Do not stop between items.
- On ANY error (MCP call fails, export fails, geometry weird): write an entry to ASSET_LOG.md (item, what failed, your guess why), SKIP that item, and CONTINUE with the next. Never let one failure halt the batch.
- If the Blender MCP is unreachable for 3 consecutive attempts, write a final ASSET_LOG.md summary and STOP cleanly.
- Do NOT download external assets (no Sketchfab) — model everything from scratch so no license decision is needed.
- Commit after every successful model with message "asset: <id>". Push if a remote exists.

CONVENTIONS (embed these — blender-pipeline.md does not exist yet, so these ARE the spec):
- Units: meters, 1:1 real-world scale.
- Origin: at the functional/base point of the object (mic capsule base, speaker bottom, rack unit front-bottom).
- Mating direction of connectors: −Y.
- Object name = device/connector id (exact ids in the queue).
- For every connection point, add an Empty named `port_<portId>` at the exact connector location, oriented so −Y points outward. Use sensible provisional port ids (e.g. port_out_l, port_mic_in, port_aes_out, port_mains_in) — these are PROVISIONAL and will be reconciled with the catalog later; just be consistent and list them in the manifest.
- One single PBR material per object, neutral/generic colors. Trademark rule: generic visual equivalents only, no real brand logos/text.
- Export: .glb per object into public/assets/<id>.glb. Then optimize with gltf-transform (Draco + KTX2) via the CLI in tools/ (install locally if needed with npm).
- Keep tris budgets: connectors 300–800 tris; devices 800–4000 tris. Favor clean blocky shapes over detail.
- Maintain public/assets/ASSET_MANIFEST.json: for each item → id, category, tris, list of port empties, file path, status (done/skipped).

QUEUE (priority order — most important first):

# 1. Connector kit (small, ~300–800 tris each)
xlr3-male, xlr3-female, xlr5-male, xlr5-female, trs-quarter, ts-quarter, trs-mini, rj45, ethercon, powercon, powercon-true1, schuko, gpio-terminal, usb-a, usb-b, usb-c, bnc, tt-bantam, toslink, rj11, speakon-nl4, dsub-25

# 2. A1 — Live Sound devices
sb-16 (16ch stagebox, rack box + XLR inputs row + multipin out), dmx-32 (32ch mixing console, angled surface with fader zone + rear I/O), at-12 (top PA speaker, trapezoid cabinet), wm-12 (floor wedge monitor, angled cabinet), dv-58 (dynamic mic, cylindrical body + ball grille), boom-stand (tripod mic stand with boom arm)

# 3. B1 — Radio/Broadcast devices
bd-20 (large-diaphragm broadcast mic, side-address body), boom-arm (desk-mounted spring mic arm), bcx-12 (broadcast console, channel strips + monitor section), on-air-light (rectangular illuminated sign box), nf-5 (nearfield studio monitor, small 2-way box), playout-pc (small desktop/rack PC)

# 4. C1 — Duplex/Remote devices
ipc-1 (1U studio codec, rack faceplate + connectors), ipc-r (portable field codec, handheld box + XLR + display), rm-1 (reporter/handheld interview mic, long dynamic mic)

# 5. D1 — Post-Production devices
daw-desk (studio desk surface), ai-16 (2U audio interface, rack faceplate + many I/O), mc-1 (desktop monitor controller, knob + buttons), lc-87 (large-diaphragm condenser mic, suspension-friendly body), pb-48 (48-point TT patchbay, 1U with two rows of jacks)

START NOW with item #1 (xlr3-male). Before you begin, inspect the Blender scene (get_objects_summary) to respect anything already there (there may be XLR blockouts). Go item by item without stopping. When the queue is done or you hit a hard stop, write a final summary to ASSET_LOG.md with counts (done / skipped) and next steps.
```

---

## In the morning
- Check `public/assets/ASSET_MANIFEST.json` (what got built) and `ASSET_LOG.md` (what was skipped and why).
- Eyeball the thumbnails / open a couple of `.glb` files.
- Anything skipped, we re-run just those items. Then we reconcile the `port_*` empties with the catalog when we author it (Prompt 0.5).

## Note
This runs independently of the catalog/engine work. Your build order is unchanged: assets tonight → catalog authoring (Prompt 0.5) → engine (Prompt 1). The models will already be waiting to drop in.
