# ADR-0005 — removeInstance/clear, chargement de rig, signal « rig propre »

- **Status:** Accepted (run de nuit n°2, 2026-07-17) — exécution du prompt docs/prompts/01
- **Beat servi:** 3 (sandbox : « save & share your rig » → ici save & RELOAD)

## Décisions

**1. Engine (extension minimale, suite d'ADR-0004)** :
- `removeInstance(instanceId): Ok | TypedError('UNKNOWN_INSTANCE')` — déconnecte
  d'abord TOUS les câbles de l'instance via `disconnect()` (jamais de chirurgie
  directe des maps), puis retire l'instance.
- `clear(): void` — removeInstance de tout (l'ordre n'importe pas).
Aucun autre contrat ne change.

**2. Chargement de rig = INTENTS uniquement** : nouvel intent `LOAD_RIG {name}`.
L'orchestrateur : `clear()` + dispose des visuels + reset des portPoints →
`addInstance` (ids EXACTS sauvegardés) → spawn scène → `connect` chaque
connexion → `setControl` chaque control → refresh. L'UI (Shelf) ne fait que
dispatcher. Un rig sauvegardé sous un id d'appareil disparu du catalog échoue
proprement (toast), sans crash.

**3. Signal positif « rig propre » (play = assessment, le manque de l'ADR-0004)** :
un rig est PROPRE si ≥ 2 connexions et zéro violation des logicChecks au moment
de la sauvegarde. Alors `recordWin('sandbox')` — et `ruleScores` crédite les
wins sandbox sur R1/R2/R3 UNIQUEMENT : un rig propre prouve le câblage, pas
des leçons de domaine qu'il n'a peut-être jamais touchées (radar honnête,
jamais de sur-crédit ; l'analyse par-rule-réellement-exercée est un P2). Un rig sale se sauvegarde AUSSI
(aucune punition — Beat 4), il ne crédite juste rien.

## Rejetés
- Sérialiser la scène Babylon : le graphe EST l'état ; la scène se reconstruit.
- Bloquer la sauvegarde d'un rig avec violations : anti-Beat 4 (honte).
