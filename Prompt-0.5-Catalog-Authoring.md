# Prompt 0.5 — Authoring du catalog (à lancer avant le Prompt 1)
Cas 3 : aucun artefact de référence trouvé. On crée `content/catalog.json` (v1 canonique) + `content/levels/a1.json` (+ stubs b1/c1/d1) proprement, puis on valide, puis on lance l'engine.

> **À coller dans Claude Code.** Il PROPOSE les fichiers et s'ARRÊTE pour validation d'Oscar avant tout code engine.

```
Respecte CLAUDE.md. CAS 3 confirmé : aucun catalog.json/levels/equipment-catalog.md de référence n'existe. On AUTHORE le contenu maintenant — il deviendra la SOURCE DE VÉRITÉ canonique (v1). Ne code PAS l'engine tant que je (Oscar) n'ai pas validé le contenu.

Sources d'entrée : le design spec et les deux docs de kickoff présents dans le dossier (Claude-Code-Kickoff.md, Claude-Code-Prompt-Pack.md). Complète avec des connaissances réelles d'ingénierie audio pro. Si un choix métier est ambigu, PROPOSE et explique — ne tranche pas en silence.

Produis content/catalog.json avec ce type system (JSON pur, aucune logique) :

1) connectorTypes (~30) — pour chacun : id, label, gender ("male"|"female"|"n/a"), et matesWith (liste d'ids compatibles). Couvre au minimum ces familles (avec variantes m/f) :
   XLR3 (m/f, audio balanced), XLR5 (m/f, DMX), TRS 1/4", TRS 3.5mm, TS 1/4", RJ45, etherCON, powerCON, powerCON TRUE1, Schuko, GPIO (terminal/DB), USB-A, USB-B, USB-C, BNC, TT/Bantam (patchbay), TOSLINK, RJ11, Speakon NL4, D-sub 25, MADI-optique (LC/SC). Règle de mating réaliste : m↔f pour XLR/Speakon ; RJ45↔etherCON compatibles ; TT↔TT ; etc.

2) signalTypes (16) — id, label, class ("analog"|"digital"|"control"|"power") :
   mic-level, line-level-balanced, line-level-unbalanced, instrument-hiZ, speaker-level, headphone, AES3/AES-EBU, S/PDIF-coax, S/PDIF-optical(TOSLINK), MADI, Dante/AES67(AoIP), wordclock, GPIO/tally, DMX512, USB-audio, phantom-+48V.

3) devices (~20) — id, label, domain (A|B|C|D), et ports[] où chaque port a : portId, dir ("in"|"out"|"bidir"), connector (id connectorType), signal (id signalType), et flags optionnels (ex : providesPhantom, requiresPhantom, isClockMaster, isClockSlave, isMicInput, isMonitorOut, isOnAirTally). Devices attendus, par domaine :
   A1 (Live) : SB-16 (stagebox), DMX-32 (console), AT-12 (top speaker), WM-12 (wedge), DV-58 (dynamic mic), boom-stand.
   B1 (Radio) : BD-20 (broadcast mic), boom-arm, BCX-12 (broadcast console), ON-AIR-light, NF-5 (nearfield), playout-PC.
   C1 (Duplex/N-1) : IPC-1 (studio codec 1U), IPC-R (portable codec), RM-1 (reporter mic).
   D1 (Post) : DAW-desk, AI-16 (audio interface 2U), MC-1 (monitor controller), LC-87 (condenser mic), PB-48 (patchbay).

4) rules (8 teaching rules) — id, message, severity, et soit "engine" (validation structurelle) soit "logic" (module) :
   R1 mate-mismatch (engine) : connecteurs incompatibles.
   R2 signal-mismatch (engine) : ex. mic-level dans une entrée line, digital dans analogique, speaker-level dans line.
   R3 direction-mismatch (engine) : out→out ou in→in.
   R4 phantom-missing (logic/phantom) : micro condensateur sans +48V.
   R5 onair-tally (logic/gpio) : fader micro ouvert sans ON AIR déclenché.
   R6 monitor-mute (logic/gpio) : micro ouvert routé au monitor → larsen.
   R7 mixminus-echo (logic/mixMinus) : le retour distant contient sa propre voix → echo N-1.
   R8 clock-mismatch (logic/clock) : deux masters, ou slave sans master.

Puis content/levels/a1.json (Live Sound) : requiredChain (DV-58 → SB-16 → DMX-32 → AT-12 ×2 + WM-12, via boom-stand), logicChecks (au moins R1/R2/R3 ; phantom R4 si un condensateur est présent), et goal + mistake summary. Génère aussi des stubs b1/c1/d1 (structure valide, requiredChain minimal + logicChecks pointant les rules du domaine : B1→R5/R6, C1→R7, D1→R8 + normalling).

Livrable de ce tour : montre-moi catalog.json + a1.json (et les stubs), explique tes choix de mating/signal, et liste toute hypothèse. Écris un validateur `tools/validate-catalog` (TS) qui vérifie que TOUTES les refs (matesWith/connector/signal/device/level/rule) résolvent, et fais-le tourner. ARRÊTE-toi ensuite : ne code pas l'engine avant mon "OK".
```

**Skills à activer :** `expert-council` ou `debate` (les règles de mating et surtout R7 mix-minus/R8 clock méritent une décision raisonnée) · `deep-scan` sur le catalog proposé avant validation (chasse aux refs manquantes / cas limites). **Fin :** `session-vault` + régénère Graphify une fois le catalog validé.

## Après validation
→ Enchaîne le **Prompt 1** (vertical slice A1) du master pack : il code l'engine contre CE catalog, avec zod dérivé de ce type system. Note pour plus tard : préviens Ali que ce catalog est la **v1 canonique** à réconcilier avec son éventuelle v0.2.
