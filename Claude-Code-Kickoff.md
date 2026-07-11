# Audio Engineering Simulator — Claude Code Kickoff Pack
Vertical slice A1 (semaines 1-2) · Généré 2026-07-07 · À exécuter dans Claude Code sur le Mac Studio (repo `audio-sim`)

> **But de ce doc :** te donner (1) un plan de build séquencé et (2) des **prompts prêts-à-coller** dans Claude Code. Le build réel (npm/Vite/Babylon/vitest/Playwright/Vercel/Blender MCP) tourne dans ton env Claude Code, pas ici.
>
> **Règle d'or (anti-drift) :** `content/catalog.json` (v0.2) et `content/levels/a1.json` **existent déjà** et sont la **source de vérité**. Claude Code doit les **lire**, pas en fabriquer de nouveaux. En cas d'ambiguïté → poser la question, jamais inventer.

---

## Partie 0 — Pré-vol (5 min, à faire toi-même avant de lancer Claude Code)

1. Ouvre le repo `audio-sim` dans Claude Code (ou `cd audio-sim` puis `claude`).
2. Vérifie que ces fichiers sont bien là et à jour : `content/catalog.json`, `content/levels/a1.json`, `equipment-catalog.md`, `blender-pipeline.md`, et le validateur Python existant.
3. Node LTS installé (`node -v` ≥ 20). Compte GitHub + Vercel prêts.
4. **Graphify** : régénère/consulte le graphe du projet d'abord (ta règle) pour donner le contexte à Claude Code.
5. Colle le **Prompt 1** ci-dessous. Laisse Claude Code bosser étape par étape ; valide chaque gate.

---

## Partie 1 — Plan de build (ce que Claude Code doit livrer)

### Stack figé (du design spec)
TypeScript · Babylon.js · Vite · zod · vitest · Playwright · gltf-transform (Draco + KTX2) · GitHub Actions · Vercel. Un seul repo, layout du spec.

### Séquence semaines 1-2 — 7 étapes, chacune avec un *gate* (critère d'acceptation)

| # | Étape | Livrable | Gate (doit passer avant de continuer) |
|---|---|---|---|
| 1 | **Repo bootstrap** | Vite+TS, structure de dossiers du spec, tsconfig strict, eslint/prettier, deps installées | `npm run dev` sert une page blanche Babylon (canvas + moteur render loop), `npm run build` passe |
| 2 | **Content layer + zod** | `CatalogLoader` qui **lit** `catalog.json` existant, schémas zod pour connectorTypes/signalTypes/devices/rules + level schema, fail-fast avec JSON path | `loadCatalog()` parse le catalog v0.2 réel sans erreur ; test qui casse volontairement un champ → erreur avec chemin exact |
| 3 | **Catalog validator (port TS)** | Portage TS du check Python existant (tous les `matesWith`/`carries`/`ends`/refs connector/signal/level résolvent) | `npm run validate:catalog` vert sur le catalog réel ; parité avec le script Python |
| 4 | **Engine core** | `ConnectionGraph` (connect/disconnect/query + validation mate/signal/direction), `RuleEvaluator` (invoque `logic/*` déclarés dans `logicChecks`), `LevelRunner` (`requiredChain` + `logicChecks` → LevelState) | Vitest : matrices mate/signal/direction ; chaque rule A1 avec un cas *triggers* et un cas *doesn't-trigger* |
| 5 | **Scene + interaction (placeholders)** | `DeviceSpawner` (fallback boîte + marqueurs de ports labellisés depuis le catalog), `CableRenderer` (Path3D tube + caténaire, drag, snap ≤15 cm, dry-run vert/rouge), `Interaction` (pointer pick) | A1 spawn en boîtes placeholder avec ports visibles ; on peut tirer un câble et le snapper à un port compatible (vert) / refusé (rouge) |
| 6 | **LevelRunner A1 jouable + UI overlay** | HUD checklist d'objectifs, toasts pédagogiques (RuleEvaluator events), win screen avec résumé d'erreurs ; `Progress` localStorage (versionné) | Construire la chaîne correcte de `a1.json` **à la main** → win screen ; une erreur pédagogique déclenche le bon toast |
| 7 | **Tests + CI + Vercel** | Playwright smoke (load A1 → build chaîne correcte programmatiquement → expect win), GitHub Actions sur push, preview deploys Vercel | CI vert sur push ; **A1 jouable sur l'URL Vercel** (règle no-drift du vendredi) |

### Contrats d'interface (respecter le spec, ne pas dévier)
- `CatalogLoader.loadCatalog(): Registry`
- `ConnectionGraph.connect(a: PortRef, b: PortRef): Ok | TypedError` · `disconnect` · `query`
- `RuleEvaluator.evaluate(graph): TeachingEvent[]`
- `DeviceSpawner.spawn(deviceId, position): DeviceInstance`
- `LevelRunner.check(graph): LevelState`
- `logic/{gpio,mixMinus,phantom,clock}` = **fonctions pures** (pour A1, seuls les checks présents dans `a1.json` sont requis ; stub les autres avec tests).
- **Règle de découplage :** les composants engine n'importent jamais `logic/*` directement — `RuleEvaluator` les appelle via les `logicChecks` déclarés par niveau.

### Flux (unidirectionnel, à respecter)
`pointer pick → drag → snap candidate (connect() dry-run vert/rouge) → drop → ConnectionGraph.connect → RuleEvaluator sweep → toast → LevelRunner.check → win`. L'UI ne mute jamais le graphe : elle dispatch des intents.

### Gestion d'erreurs (du spec)
Content = zod fail-fast avec chemin JSON · Asset manquant = placeholder + warning, le jeu continue · Connexion invalide = gameplay, pas exception · localStorage version mismatch = reset avec notice · Budget câble = dégrader la caténaire en ligne droite avant de dropper des frames.

---

## Partie 2 — PROMPT 1 (à coller dans Claude Code)

```
Contexte : repo `audio-sim`. On construit un simulateur 3D navigateur d'ingénierie audio (design spec approuvé). Stratégie : VERTICAL SLICE d'abord, logic-first — Level A1 jouable avec des placeholders (boîtes + marqueurs de ports) en priorité, prouvant engine + pipeline de bout en bout.

SOURCE DE VÉRITÉ — NE PAS RÉINVENTER :
- `content/catalog.json` (v0.2) et `content/levels/a1.json` EXISTENT déjà. Lis-les, traite-les en lecture seule comme source de vérité. Si un champ est ambigu, DEMANDE-moi, n'invente rien.
- `equipment-catalog.md` et `blender-pipeline.md` = conventions de référence.
- Il existe un validateur catalog en Python : porte-le en TS en préservant EXACTEMENT ses checks.

Architecture (3 couches strictement séparées) :
- Content = data pure (catalog + levels). Nouveau matériel/leçon = édition data uniquement.
- Engine = TS + Babylon.js (Vite), audio-agnostic : charge le catalog, spawn devices, valide connexions, évalue rules, reporte l'état d'objectif.
- Assets = glTF .glb par device id ; modèle manquant → placeholder boîte avec marqueurs de ports labellisés. Les assets ne bloquent JAMAIS le gameplay.

Layout repo (à respecter) :
audio-sim/
  content/{catalog.json, levels/{a1,b1,c1,d1}.json}
  src/{engine/, scene/, ui/, logic/}
  public/assets/  (*.glb + fallback placeholder)
  tools/  (export Blender, gltf-transform batch, catalog validator CLI)
  tests/  (vitest unit + catalog consistency ; Playwright smoke)

Stack : TypeScript strict, Babylon.js, Vite, zod, vitest, Playwright, gltf-transform (Draco+KTX2), GitHub Actions, Vercel.

Contrats d'interface (ne pas dévier) :
- CatalogLoader.loadCatalog(): Registry
- ConnectionGraph.connect(a: PortRef, b: PortRef): Ok | TypedError ; disconnect ; query
- RuleEvaluator.evaluate(graph): TeachingEvent[]
- DeviceSpawner.spawn(deviceId, position): DeviceInstance
- LevelRunner.check(graph): LevelState
- logic/{gpio,mixMinus,phantom,clock} = fonctions pures
Règle de découplage : les composants engine n'importent jamais logic/* directement ; RuleEvaluator les invoque via les logicChecks déclarés par niveau.

Flux unidirectionnel : pointer pick → drag → snap candidate (connect() dry-run vert/rouge) → drop → ConnectionGraph.connect → RuleEvaluator sweep → toast → LevelRunner.check → win. L'UI dispatch des intents, ne mute jamais le graphe.

Gestion d'erreurs : zod fail-fast avec chemin JSON ; asset manquant → placeholder + warning ; connexion invalide = gameplay ; localStorage version mismatch → reset avec notice ; budget câble → dégrader caténaire en ligne droite avant de dropper des frames.

TÂCHE — exécute dans cet ordre, et ARRÊTE-toi à chaque gate pour me montrer que ça passe avant de continuer :
1. Repo bootstrap (Vite+TS strict, dossiers, eslint/prettier, deps). Gate : `npm run dev` affiche un canvas Babylon avec render loop ; `npm run build` passe.
2. CatalogLoader + schémas zod (connectorTypes/signalTypes/devices/rules + level). Il LIT le catalog.json réel. Gate : parse le v0.2 sans erreur ; un test qui corrompt un champ → erreur avec chemin JSON exact.
3. Validateur catalog porté en TS depuis le Python. Gate : `npm run validate:catalog` vert, parité avec le script Python.
4. Engine core : ConnectionGraph (validation mate/signal/direction), RuleEvaluator (invoque logic/* via logicChecks), LevelRunner (requiredChain + logicChecks). Gate : vitest sur les matrices ; chaque rule d'A1 avec un cas triggers + un cas doesn't-trigger.
5. Scene placeholders : DeviceSpawner (boîte fallback + marqueurs ports depuis catalog), CableRenderer (Path3D tube caténaire, drag, snap ≤15 cm, dry-run vert/rouge), Interaction (pointer pick). Gate : A1 spawn en boîtes avec ports ; câble draggable + snap vert/rouge.
6. LevelRunner A1 jouable + UI overlay (HUD checklist, toasts, win screen avec résumé d'erreurs) + Progress localStorage versionné. Gate : construire la chaîne correcte d'a1.json à la main → win ; une erreur → bon toast.
7. Tests + CI + Vercel : Playwright smoke (load A1 → build chaîne correcte programmatiquement → expect win), GitHub Actions sur push, preview Vercel. Gate : CI vert ; A1 jouable sur l'URL Vercel.

Conventions de travail : commits atomiques par étape ; tests d'abord quand c'est raisonnable ; à la fin de chaque étape, résume ce qui est fait + comment vérifier. Utilise mes skills si pertinent (subagent-driven-development pour les étapes indépendantes, session-vault pour documenter à la fin). Commence par l'étape 1 et montre-moi le gate.
```

---

## Partie 3 — Prompts de suivi (après le vertical slice)

**Prompt 2 — Asset track (semaines 3-4, en parallèle) :**
```
Le vertical slice A1 est jouable et déployé. Lance le track ASSETS via le Blender MCP en suivant blender-pipeline.md (mètres 1:1, origine au point fonctionnel, mating −Y, noms = catalog ids, empties `port_<portId>`, single PBR material, export .glb, puis gltf-transform Draco+KTX2). Produis le connector kit (XLR m/f déjà en blockout → TRS, TS, RJ45/etherCON, powerCON, Schuko, GPIO, USB, BNC, TT, TOSLINK, RJ11) puis le set A1 (boom stand, SB-16, DMX-32, AT-12 ×2, WM-12 ; DV-58 depuis Sketchfab licence-checkée, nettoyé). Chaque .glb remplace son placeholder sans toucher à l'engine. Trademark : équivalents visuels génériques uniquement. Gate : les modèles A1 chargent à la place des boîtes, ports alignés, budget tris respecté.
```

**Prompt 3 — Feature track B1 (semaines 3-4, en parallèle) :**
```
Ajoute Level B1 (Radio/Broadcast) + logic/gpio (ON AIR light state, monitor-mute-on-open-mic) en éditant UNIQUEMENT content/ et logic/. Lis content/levels/b1.json (source de vérité). Tests : gpio pur avec cas triggers/doesn't-trigger ; le check N-1/echo reste pour C1. Gate : B1 jouable en placeholders, toasts GPIO corrects, tous les tests verts, déployé.
```

**Puis :** C1 (mixMinus + routing UI, semaine 5), D1 (patchbay normalled/half-normalled + clock, semaine 6), depth pass P2 + dashboard mistake-history (semaines 7-8).

---

## Partie 4 — Definition of Done (semaines 1-2)
- [ ] A1 jouable de bout en bout dans le navigateur (placeholders OK).
- [ ] CatalogLoader lit le catalog.json v0.2 réel via zod (fail-fast testé).
- [ ] Validateur catalog TS à parité avec le Python.
- [ ] ConnectionGraph + chaque rule d'A1 couverts par tests (triggers + doesn't-trigger).
- [ ] Playwright smoke vert ; GitHub Actions sur push ; **A1 sur URL Vercel**.
- [ ] Aucune modif de l'engine requise pour ajouter du contenu (test de la séparation des couches).

---

## Rappel — pourquoi ça se fait dans Claude Code, pas ici
Cowork ne peut pas exécuter npm/Vite/vitest/Playwright, ni piloter le Blender MCP ou déployer sur Vercel, et tes artefacts (`catalog.json`, scène `connector_kit`) vivent sur le Mac. Ce pack est donc conçu pour être **collé dans Claude Code**, qui a l'environnement et la source de vérité. Après le slice, pense à `session-vault` pour documenter dans Obsidian et à régénérer le graphe Graphify (ta règle post-feature).
