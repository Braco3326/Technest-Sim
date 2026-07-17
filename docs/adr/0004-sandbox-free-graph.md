# ADR-0004 — Sandbox v1 : free graph, mêmes rules, spawn dynamique

- **Status:** Accepted (run de nuit 2026-07-17)
- **Beat servi:** 3 — « the sandbox opens » ; garde-fous vision : play = assessment, freedom follows mastery.

## Contexte

La sandbox est « un level sans requiredChain » (VISION §10) — le même
RuleEvaluator enseigne en direct. MAIS l'engine actuel fige les instances à la
construction de ConnectionGraph : le grab-&-drop depuis les étagères exige un
spawn dynamique. Extension d'interface engine → ADR obligatoire (consigne).

## Décisions

**1. Extension engine minimale** : `ConnectionGraph.addInstance(instanceId,
deviceId): Ok | TypedError` (codes: DUPLICATE_INSTANCE, UNKNOWN_DEVICE).
Controls initialisés aux défauts catalog, comme au constructeur. AUCUN autre
contrat ne change ; `removeInstance` = P2 (le besoin réel n'existe qu'avec
l'édition de rig).

**2. La sandbox est un pseudo-level DATA construit par le bootstrap** :
`{ id:'sandbox', devices:[], requiredChain:[], logicChecks:[R4..R8] }` —
zéro nouveau concept engine. `won` n'a pas de sens sans chaîne requise → le
bootstrap ne déclenche jamais win/recordWin en sandbox.

**3. Play = assessment** : les violations sandbox sont enregistrées comme
mistakes sous le level id `sandbox` ; `ruleScores` compte désormais les
erreurs de TOUTES les entrées du store (pas seulement les 4 levels connus).
Signal positif (« rig propre ») = P2 (nécessite une définition honnête d'un
« rig terminé » sans chaîne requise).

**4. Freedom follows mastery** : readiness globale < 15 % → palette GUIDÉE
(SM58 + stagebox + console, un brief « connecte le micro à la console » — le
goût de sandbox du Beat 1) ; sinon étagères complètes par catégorie (lues du
catalog, jamais dupliquées).

**5. Rigs** : sauvegarde nommée (localStorage `audio-sim/rigs`, versionné) =
v1. Le RECHARGEMENT d'un rig attend `removeInstance`/reset (P2) — un chargement
propre exige de vider la scène.

## Alternatives rejetées

- Recréer un ConnectionGraph par spawn : perd l'état (câbles/controls posés).
- Sandbox hors LevelRunner/RuleEvaluator : casserait « play = assessment ».
- Palette gated par des flags manuels : la readiness EST le gate naturel.
