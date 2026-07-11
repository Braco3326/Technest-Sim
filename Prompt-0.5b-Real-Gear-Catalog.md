# Prompt 0.5b — Real-gear catalog authoring (SUPERSEDES Prompt 0.5)
Cas 3 + real equipment. Author content/catalog.json (canonical v1) and equipment-catalog.md using REAL, commonly-used industry gear (Yamaha QL1, 01V96, Shure SM58, etc.) mapped only to what the 4 starter levels need. Personal/educational use — real model names are reference data.

> **Paste into Claude Code.** It authors the files, writes a validator, runs it, and STOPS for Oscar's approval before any engine code.

```
Respecte CLAUDE.md. CAS 3 + REAL GEAR. No reference catalog exists — author it now as the canonical v1 SOURCE OF TRUTH. Use REAL, industry-standard, commonly-used professional audio equipment (not invented placeholders). This is a personal learning tool, so real brand/model names are allowed as reference data. Do NOT code the engine until I (Oscar) approve the content.

GOAL: produce two artifacts, kept consistent with each other:
1. content/catalog.json — the data type system (connectorTypes, signalTypes, devices, rules) using real gear.
2. equipment-catalog.md — a human-readable reference, organized by category, listing the real models with metadata and which level each appears in.

SCOPE: ONLY the gear the 4 starter levels need (A1 Live, B1 Radio, C1 Duplex/N-1, D1 Post). Lean and real — no exhaustive dumps. Pick the most widely-used, representative real models per role; verify each is a real product and commonly used in that context; if you make a judgment call, note it.

ID / NAMING RULE (placement decision): each device id = a real-model slug (e.g. "yamaha-ql1", "shure-sm58"). Set label = real display name ("Yamaha QL1"). Add a realWorld field: { brand, model, category, typicalUse, notes }. Keep connectorTypes/signalTypes ids as neutral standard slugs (e.g. "xlr3-f", "dante-rj45", "wordclock-bnc").

DEPTH (build-ready metadata): every device lists a realistic-but-teaching-SIMPLIFIED port set — enough for the level's required chain and teaching rules, NOT every physical connector. Each port: { portId, dir:"in"|"out"|"bidir", connector:<connectorType id>, signal:<signalType id>, flags?: providesPhantom|requiresPhantom|isClockMaster|isClockSlave|isMicInput|isMonitorOut|isOnAirTally|isDantePrimary }.

TYPE SYSTEM to author (real standards):
- connectorTypes (~24–30, with gender + matesWith): XLR3 M/F, XLR5 M/F (DMX), TRS 1/4", TS 1/4", TRS 3.5mm, RCA, RJ45 (Dante/AES67), etherCON, Speakon NL4, powerCON / powerCON TRUE1, IEC-mains, Schuko, BNC (wordclock / MADI-coax), TT-Bantam (patchbay), D-sub25 (AES/analog multi), TOSLINK, USB-A/B/C, GPIO-terminal. Realistic mating (XLR M↔F, etherCON↔RJ45, TT↔TT, etc.).
- signalTypes (~16, with class analog|digital|control|power): mic-level, line-level-pro(+4dBu balanced), line-level-consumer(-10dBV unbalanced), instrument-hiZ, speaker-level, headphone, AES3/AES-EBU, S/PDIF, MADI, Dante/AES67(AoIP), wordclock, GPIO/tally, DMX512, USB-audio, phantom-+48V, mains-power.
- devices (~20, real, mapped below).
- rules (8 teaching rules): R1 connector-mate mismatch (engine); R2 signal mismatch (engine: mic into line, line into mic-pre, digital into analog, consumer/pro level); R3 direction mismatch (engine: out→out / in→in); R4 phantom (logic/phantom: condenser without +48V; warn if +48V sent to a ribbon mic); R5 on-air tally (logic/gpio); R6 monitor-mute-on-open-mic / feedback (logic/gpio); R7 mix-minus N-1 echo (logic/mixMinus); R8 wordclock master/slave & sample-rate mismatch (logic/clock).

REAL GEAR PER LEVEL (use these or better-justified equivalents; confirm they're real & common):
- A1 Live Sound: Yamaha QL1 (digital console) + Yamaha Rio3224-D2 (Dante stagebox) + Shure SM58 (dynamic vocal) + Shure SM57 (dynamic instrument) + a powered PA top (e.g. QSC K12.2) + a stage wedge monitor + a K&M boom mic stand. Signals: mic/line, Dante over etherCON, Speakon/powerCON for speakers.
- B1 Radio/Broadcast: Yamaha 01V96 (or a broadcast console like Axia iQ — pick one, justify) + Electro-Voice RE20 or Shure SM7B (broadcast mic) + Yellowtec m!ka boom arm + ON-AIR light (GPIO tally) + Genelec 8030 nearfields + playout PC. Signals: mic, AES3, GPIO tally, analog monitor.
- C1 Duplex/Remote (mix-minus/N-1): AETA Scoopy+ S or Tieline codec (studio) + Tieline Bridge-IT (portable field codec) + Electro-Voice RE50 (reporter/interview mic). Signals: mic, IP audio (Dante/RJ45), analog send/return. This domain is mostly logic + UI.
- D1 Post-Production: Avid Pro Tools workstation (DAW) + Avid HD I/O or Universal Audio Apollo x8 (interface) + a monitor controller (e.g. Grace m905 or Mackie Big Knob) + Neumann U87 or AKG C414 (condenser) + a TT/Bantam patchbay (e.g. ADC/Mosses & Mitchell). Signals: analog line, AES3, wordclock BNC, TT patch.

Then author content/levels/a1.json fully (requiredChain using the real A1 gear ids + logicChecks R1/R2/R3, and R4 if a condenser is present), plus valid stubs for b1/c1/d1 (minimal requiredChain + logicChecks: B1→R5/R6, C1→R7, D1→R8).

Also write tools/validate-catalog (TS): verify ALL refs (matesWith / connector / signal / device / level / rule) resolve, and that every device port uses defined connector+signal ids. Run it.

DELIVERABLE THIS TURN: show me (1) content/catalog.json, (2) equipment-catalog.md grouped by category (Consoles, Microphones, Monitors/Speakers, Stageboxes & I/O, Codecs, Patchbays, Stands/Accessories, Cables & Connectors) with brand/model + level tag + priority, (3) the validator output (green). Explain any gear choice you made and list assumptions. Then STOP — do not build the engine until I say "OK".
```

## After you approve
→ Run **Prompt 1** (engine + Level A1) from the master pack — it builds against this real-gear catalog. The overnight Blender assets keep the same device ids, so real-gear models drop straight in.

## Note on ids
Device ids are real-model slugs (e.g. `yamaha-ql1`), so swapping a model later means renaming that id in content only — no engine change (that's the whole point of the layer separation). If you'd rather keep role-neutral ids (`console-live`) with the model in `realWorld`, tell Claude Code to flip that one rule.
