> ✅ EXÉCUTÉ (run de nuit n°2, 2026-07-17) — conservé pour référence.
> Voir ADR-0005 ; seule variante : le crédit readiness se limite à R1/R2/R3 (radar honnête).

# PROMPT — Sandbox : chargement de rig + signal "rig propre" (suite ADR-0004)

Colle ce prompt tel quel dans une session Claude Code ouverte dans D:\teknest\tekpractice.

---

Respecte CLAUDE.md (3 couches, anti-drift, invariants R1-R3 engine-only). Lis d'abord :
docs/adr/0004-sandbox-free-graph.md, src/ui/shelf.ts, src/game.ts (bloc sandbox),
src/engine/ConnectionGraph.ts (addInstance), tests/e2e/sandbox.spec.ts.

OBJECTIF 1 — removeInstance + reset (extension engine, ADR OBLIGATOIRE) :
1. Écris docs/adr/0005-remove-instance.md : ConnectionGraph.removeInstance(instanceId)
   → Ok | TypedError('UNKNOWN_INSTANCE') ; déconnecte d'abord tous les câbles de
   l'instance (réutilise disconnect, ne bidouille pas les maps directement) ;
   et clear() = remove de toutes les instances. Rien d'autre ne change.
2. Implémente + tests vitest : remove libère les ports occupés ; remove instance
   inconnue = TypedError ; clear() vide le snapshot.

OBJECTIF 2 — charger un rig sauvé :
1. src/ui/shelf.ts : ajoute loadRigs(storage) (lit audio-sim/rigs, version 1) et
   une liste des rigs sauvés dans le panneau (bouton "Charger" par rig).
2. Le chargement passe UNIQUEMENT par les intents existants + un nouvel intent
   { type: 'LOAD_RIG', name } géré par l'orchestrateur de game.ts :
   clear() → addInstance chacun → spawn scène → connect chaque connexion →
   setControl chaque control. AUCUNE mutation directe du graphe par l'UI.
3. e2e : sauver un rig de 2 devices + 1 câble, recharger la page, le charger,
   vérifier que canConnect voit les instances et que le câble est présent.

OBJECTIF 3 — signal positif "rig propre" vers la readiness :
1. Définition honnête (ADR-0005 aussi) : un rig est "propre" si ≥ 2 connexions
   audio ET zéro violation logicChecks au moment de la sauvegarde.
2. ProgressStore : recordCleanRig() → data.levels['sandbox'].wins += 1 (les wins
   sandbox comptent alors dans ruleScores : adapte src/ui/readiness.ts pour que
   les wins sandbox créditent les rules VÉRIFIÉES par la sandbox, c.-à-d.
   R1-R3 + les logicChecks du pseudo-level — attention : rulesOfLevel a besoin
   du pseudo-level sandbox, passe-le explicitement). Tests triggers/doesn't.

GATES : npm run validate:catalog vert · npx vitest run vert · npx playwright test
vert · npm run build passe. Commit atomique par objectif ("sandbox: rig load",
etc.) + push. Documente tout choix dans docs/NIGHT_LOG.md (section "Post-run").
