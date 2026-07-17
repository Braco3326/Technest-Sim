# PROMPT — Patchbay normalled/half-normalled (implémentation ADR-0002)

⚠️ PRÉREQUIS : Oscar doit avoir validé docs/adr/0002-patchbay-normalling.md
(statut Proposed). Ne commence pas sans son OK explicite.

Colle ce prompt tel quel dans une session Claude Code ouverte dans D:\teknest\tekpractice.

---

Respecte CLAUDE.md. Lis d'abord : docs/adr/0002-patchbay-normalling.md (LE design,
suis-le exactement), src/engine/ConnectionGraph.ts, src/engine/LevelRunner.ts,
content/catalog.json (switchcraft-studiopatch-9625), content/levels/d1.json.

ÉTAPES :
1. Passe l'ADR-0002 en Accepted (avec la date et "validé par Oscar").
2. Schéma : devices[].normals = [{ from, to, mode: 'full'|'half', tapOf: {from: portId, to: portId} }]
   (tools/schemas.ts + assertions validateur : ports existants, pas de cycles).
3. Engine (design ADR §2) : effectiveConnections() = explicites + dérivées ;
   une normale est coupée selon le mode quand son tap avant est occupé.
   snapshot() gagne "derived". connect/disconnect INCHANGÉS.
4. LevelRunner matche requiredChain sur effectiveConnections().
5. Contenu : donne ses normals au StudioPatch (rear-in → rear-out, half,
   taps = front-tt-1/front-tt-2) et enrichis d1 (version full) pour router
   ISA One → bay → HD I/O via la normale ; insérer un jack casse le chemin →
   le toast enseigne le normalling (nouveau texte teach ? NON : c'est du
   comportement R3/chaîne, pas une nouvelle rule — la leçon passe par le
   requiredChain qui se dé-complète + le brief du level).
6. Scène : rends les connexions dérivées en câble "fantôme" fin (couleur
   TOKENS.color.cableNeutral, alpha bas) — visuel uniquement.
7. Tests : vitest (normale présente sans câble ; full cassée par insertion ;
   half tap sans casser ; LevelRunner voit la chaîne via la normale) + un e2e d1.

GATES : validate:catalog vert · vitest vert · playwright vert · build passe.
Commits atomiques + push.
