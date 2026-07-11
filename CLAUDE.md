# CLAUDE.md — audio-sim

## Règle d'or (anti-drift)
- content/catalog.json et content/levels/*.json EXISTENT et sont la SOURCE DE VÉRITÉ. Les lire, jamais les réinventer. Ambigu → DEMANDER.
- equipment-catalog.md et blender-pipeline.md = conventions de référence.

## Architecture (3 couches strictement séparées)
- Content = data pure (catalog + levels). Nouveau matériel/leçon = édition data uniquement, jamais de changement engine.
- Engine = TypeScript strict + Babylon.js (Vite), audio-agnostic : charge catalog, spawn devices, valide connexions, évalue rules, reporte l'objectif.
- Assets = glTF .glb par device id ; modèle manquant → placeholder boîte + marqueurs de ports labellisés. Les assets ne bloquent JAMAIS le gameplay.

## Layout repo
content/{catalog.json, levels/{a1,b1,c1,d1}.json} · src/{engine,scene,ui,logic} · public/assets · tools · tests

## Contrats d'interface (ne pas dévier)
- CatalogLoader.loadCatalog(): Registry
- ConnectionGraph.connect(a: PortRef, b: PortRef): Ok | TypedError ; disconnect ; query
- RuleEvaluator.evaluate(graph): TeachingEvent[]
- DeviceSpawner.spawn(deviceId, position): DeviceInstance
- LevelRunner.check(graph): LevelState
- logic/{gpio,mixMinus,phantom,clock} = fonctions PURES
- Découplage : l'engine n'importe jamais logic/* directement ; RuleEvaluator les invoque via les logicChecks déclarés par niveau.

## Flux unidirectionnel
pointer pick → drag → snap candidate (connect() dry-run vert/rouge) → drop → ConnectionGraph.connect → RuleEvaluator sweep → toast → LevelRunner.check → win. L'UI dispatch des intents, ne mute JAMAIS le graphe.

## Gestion d'erreurs
zod fail-fast avec chemin JSON · asset manquant → placeholder + warning · connexion invalide = gameplay (pas exception) · localStorage version mismatch → reset + notice · budget câble → dégrader caténaire en ligne droite avant de dropper des frames.

## Stack
TypeScript strict · Babylon.js · Vite · zod · vitest · Playwright · gltf-transform (Draco+KTX2) · GitHub Actions · Vercel.

## Trademark
Équivalents visuels génériques uniquement ; références réelles restent internes.

## Out of scope (YAGNI)
DSP audio réel, multiplayer, VR, comptes/backend, builds mobile natifs, rigging line-array (P3 max).

## Conventions de travail
Commits atomiques par étape · tests d'abord quand raisonnable · fin d'étape = résumé + comment vérifier · s'arrêter à chaque gate.

## Règle no-drift du vendredi
Le build de la semaine doit être jouable sur l'URL Vercel chaque vendredi. Si non → corriger avant tout.

## Skills utiles
| Skill | Quand |
|---|---|
| subagent-driven-development | Étapes indépendantes en parallèle |
| debate | Décisions dures (mix-minus, normalled, perf) |
| session-vault | Fin de chaque feature/semaine → Obsidian |
| superpowers:verification-before-completion | Avant tout claim "ça passe" |
