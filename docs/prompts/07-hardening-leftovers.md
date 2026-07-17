# PROMPT — Reliquats du run de durcissement (2026-07-17)

Colle dans une session Claude Code dans D:\teknest\tekpractice. Respecte CLAUDE.md.
Lis d'abord : docs/REVIEW-ME.md §7, docs/NIGHT_LOG.md (run durcissement), src/game.ts,
src/game2d.ts, src/logic/gpio.ts, src/engine/CatalogLoader.ts. Choisis un ou plusieurs blocs
(indépendants). Gates à chaque commit : validate:catalog · vitest · playwright · build.

## A. Extraction d'un `GameSession` partagé (dé-duplique game.ts / game2d.ts)

game.ts (3D) et game2d.ts (2D) répètent la même boucle d'orchestration (refresh sweep,
toasts, mistakes, win/first-win, coach whyAction, exam). Extrais un module HEADLESS
`src/session/GameSession.ts` : construit graph+evaluator+runner, expose `dispatch(intent)`,
`refresh()`, et des hooks de rendu (`onState(state)`, `onToast(...)`, `onWin(...)`). Les deux
racines (game/game2d) deviennent : construire la session + brancher leur renderer sur les
hooks. Objectif : zéro logique de règles dupliquée. Tests : un vitest headless qui pilote une
GameSession sur a1 (connect chain → win) sans DOM ni Babylon.

## B. Fallback 2D — sandbox + polish

1. Support sandbox en 2D : une palette DOM (réutilise le catalog par catégorie de shelf.ts)
   qui dispatch SPAWN ; Render2D ajoute/retire les appareils dynamiquement (addInstance/
   removeInstance existent déjà). LOAD_RIG idem. Respecte le cap MAX_SANDBOX_DEVICES.
2. Polish layout : les labels d'appareils à gauche passent sous le panneau objectifs —
   décale le board vers la droite quand un panneau HUD est ouvert, ou place les labels
   au-dessus/à droite de chaque boîte selon la position.
3. e2e : `?level=sandbox&render=2d` → spawn 2 devices → wire → règle → (rien ne crash).

## C. Deep-scan NEEDS-DECISION (voir REVIEW-ME §7 — DEMANDE à Oscar avant de trancher)

1. R5/R6 sur appareil isolé en sandbox (option (b) recommandée : ne déclencher que si
   l'appareil a ≥1 port connecté). Touche logic/gpio.ts + tests triggers/doesn't.
2. Cross-ref léger dans loadLevel (refs requiredChain + logicChecks non-invariants) avec un
   message d'erreur contenu clair AVANT le boot scène. Test : un niveau volontairement cassé.
3. Flags morts isDantePrimary/isClockMaster : soit commenter « intention P2 » au schéma, soit
   retirer. (Aligne avec la décision double-master d'ADR-0007.)
4. Garde `map.rules` vide dans recommend() + test du contrat.

## D. Hardening mineur

Un helper `el(id)` garde-fou pour les `getElementById(...)!` (game.ts, game2d.ts, main.ts) :
throw « #<id> manquant — index.html désynchronisé ». Zéro changement de comportement, juste
une erreur nommée si le HTML dérive.

SKIP toujours : patchbay (ADR-0002) tant qu'Oscar n'a pas validé.
EOF
echo written