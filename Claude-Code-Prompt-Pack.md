# Audio Engineering Simulator — Master Prompt Pack (Claude Code)
Build complet, semaines 1-8 · Généré 2026-07-07 · À exécuter dans le repo `audio-sim` sur le Mac Studio

> **Comment l'utiliser :** colle les prompts dans Claude Code **dans l'ordre**. Commence par le **Prompt 0** (il crée `CLAUDE.md` avec les règles durables) — tous les prompts suivants disent « Respecte CLAUDE.md », donc ils restent courts et cohérents entre sessions.
>
> **Règle d'or (anti-drift), valable partout :** `content/catalog.json` (v0.2) et `content/levels/*.json` **existent déjà** = source de vérité. Claude Code les **lit**, ne les réinvente pas. En cas d'ambiguïté → il DEMANDE, jamais inventer.
>
> **Rythme :** chaque prompt s'arrête à son *gate* (critère d'acceptation) pour validation avant de continuer. **Règle no-drift du vendredi :** le build de la semaine est jouable sur Vercel.

**Carte des skills (active si installé dans `~/.claude/skills/`) :**
| Skill | Quand |
|---|---|
| `brainstorming` | Déjà fait (spec approuvé) — relancer seulement si un design nouveau apparaît |
| `subagent-driven-development` | Étapes indépendantes en parallèle (ex. tracks assets + features semaines 3-4) |
| `expert-council` / `debate` | Décisions dures : modèle mix-minus/N-1, patchbay normalled/half-normalled, budget perf câbles |
| `deep-scan` | Avant chaque ship majeur : chasse aux gaps/edge-cases |
| `session-vault` | Fin de chaque feature/semaine : documenter dans Obsidian |
| `ai-integrate` | Hors P1 — seulement si tu ajoutes du feedback IA audio plus tard |
| Blender MCP | Track assets (Prompts A) |
| Graphify (ta règle) | Avant de commencer chaque semaine : consulter ; après feature vérifiée : régénérer |

---

## PROMPT 0 — Priming & CLAUDE.md (à lancer une seule fois)

```
Contexte : repo `audio-sim`. On construit un simulateur 3D navigateur d'ingénierie audio pro (4 domaines : Live Sound, Radio/Broadcast, Duplex/Remote N-1, Post-Production). Outil d'apprentissage perso — pas d'auth, pas de paiement, pas de gate DSGVO. Stratégie : VERTICAL SLICE d'abord, logic-first.

Avant tout : lis `equipment-catalog.md`, `content/catalog.json` (v0.2), `content/levels/*.json`, `blender-pipeline.md`, et le validateur Python existant. Ne modifie rien encore.

Puis crée un fichier `CLAUDE.md` à la racine qui capture ces règles durables (source de vérité pour toutes les sessions futures) :

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

Montre-moi le CLAUDE.md avant de commit. Ne code rien d'autre pour l'instant.
```
**Skills :** consulte **Graphify** avant. **Gate :** `CLAUDE.md` créé et validé par toi.

---

## PROMPT 1 — Vertical slice A1 (semaines 1-2)

```
Respecte CLAUDE.md. Objectif : Level A1 (Live Sound) jouable de bout en bout avec placeholders (boîtes + marqueurs de ports), engine + pipeline prouvés, déployé sur Vercel.

Exécute dans cet ordre, ARRÊTE-toi à chaque gate pour me montrer que ça passe :

1. Repo bootstrap : Vite+TS strict, dossiers du layout, eslint/prettier, deps. GATE : `npm run dev` affiche un canvas Babylon avec render loop ; `npm run build` passe.
2. CatalogLoader + schémas zod (connectorTypes/signalTypes/devices/rules + level schema). Il LIT content/catalog.json v0.2 réel. GATE : parse le v0.2 sans erreur ; un test qui corrompt un champ → erreur avec chemin JSON exact.
3. Validateur catalog porté en TS depuis le Python (tous les matesWith/carries/ends/refs connector/signal/level résolvent). GATE : `npm run validate:catalog` vert, parité avec le script Python.
4. Engine core : ConnectionGraph (validation mate/signal/direction), RuleEvaluator (invoque logic/* via logicChecks), LevelRunner (requiredChain + logicChecks → LevelState). GATE : vitest sur les matrices ; chaque rule d'A1 avec un cas triggers + un cas doesn't-trigger.
5. Scene placeholders : DeviceSpawner (boîte fallback + marqueurs de ports lus dans le catalog), CableRenderer (Path3D tube caténaire, drag des bouts, snap ≤15 cm vers port compatible, dry-run vert/rouge), Interaction (pointer pick). GATE : A1 spawn en boîtes avec ports ; câble draggable + snap vert/rouge.
6. LevelRunner A1 jouable + UI overlay (HUD checklist d'objectifs, toasts pédagogiques depuis RuleEvaluator, win screen avec résumé d'erreurs) + Progress localStorage versionné. GATE : construire la chaîne correcte d'a1.json à la main → win ; une erreur pédagogique → bon toast.
7. Tests + CI + Vercel : Playwright smoke (load A1 → build chaîne correcte programmatiquement → expect win), GitHub Actions sur push, preview deploys Vercel. GATE : CI vert ; A1 jouable sur l'URL Vercel.

Commence par l'étape 1 et montre-moi le gate.
```
**Skills :** `subagent-driven-development` (étapes 2-3-4 sont assez indépendantes). **Fin :** `session-vault` + régénère Graphify.

---

## PROMPT A — Asset track : connector kit + set A1 (semaines 3-4, parallèle)

```
Respecte CLAUDE.md et blender-pipeline.md. Le vertical slice A1 est jouable et déployé. Lance le track ASSETS via le Blender MCP. Inspecte d'abord la scène (get_objects_summary) — la scène `connector_kit` contient déjà les blockouts XLR m/f. Ne modifie pas destructivement sans confirmation.

Conventions (blender-pipeline.md) : mètres 1:1, origine au point fonctionnel, mating direction −Y, noms des objets = catalog ids, empties `port_<portId>` pour chaque port, single PBR material, export .glb, puis gltf-transform (Draco + KTX2). Trademark : équivalents visuels génériques uniquement.

Produis dans cet ordre :
1. Connector kit (~300–800 tris chacun) : XLR m/f (finir depuis blockouts) → TRS, TS, RJ45/etherCON, powerCON, Schuko, GPIO, USB, BNC, TT, TOSLINK, RJ11.
2. Set A1 : boom stand, SB-16 stagebox, DMX-32 console, AT-12 top ×2, WM-12 wedge ; DV-58 mic depuis Sketchfab (VÉRIFIE la licence, note-la) nettoyé dans Blender.

Après chaque modèle : export .glb dans public/assets/ keyé par device id, optimise avec gltf-transform, et vérifie qu'il remplace le placeholder SANS toucher à l'engine (les empties port_* doivent s'aligner sur les hitboxes). GATE : les devices A1 chargent en 3D à la place des boîtes, ports alignés, budget tris respecté, jeu toujours jouable.
```
**Skills :** Blender MCP. **Note :** ce track tourne EN PARALLÈLE du Prompt B (utilise `subagent-driven-development` ou deux sessions Claude Code).

---

## PROMPT B — Feature track : Level B1 + GPIO logic (semaines 3-4, parallèle)

```
Respecte CLAUDE.md. Ajoute le domaine Radio/Broadcast : Level B1 + logic/gpio, en éditant UNIQUEMENT content/ et logic/ (zéro changement engine — c'est le test de la séparation des couches).

Lis content/levels/b1.json (source de vérité). Implémente logic/gpio.ts en fonctions pures : état de la lampe ON AIR, et monitor-mute-on-open-mic (couper le monitoring quand un micro ouvert est routé au monitor → larsen). Déclare ces checks via les logicChecks de b1.json, invoqués par RuleEvaluator.

Tests vitest : gpio pur avec un cas triggers et un cas doesn't-trigger pour chaque règle. (Le check N-1/echo reste pour C1.) GATE : B1 jouable en placeholders, toasts GPIO corrects, TOUS les tests verts, déployé sur Vercel.
```
**Skills :** `expert-council` si le modèle GPIO/monitor a des cas limites. **Fin :** `session-vault` + Graphify.

---

## PROMPT C — Domaine C : mix-minus + routing UI + Level C1 (semaine 5)

```
Respecte CLAUDE.md. Domaine Duplex/Remote contribution (mix-minus / N-1). Lis content/levels/c1.json (source de vérité). Ce domaine est surtout logic + UI (peu d'assets 3D).

1. logic/mixMinus.ts (fonctions pures) : à partir du contenu d'un bus vs le canal de retour, détecter l'écho N-1 (le retour distant contient sa propre voix → echo). Le test « N-1 echo » EST une question d'examen en code : couvre triggers + doesn't-trigger.
2. UI overlay : modal 2D « routing matrix » AoIP (assigner sources/destinations), event-driven, qui dispatch des intents — ne mute jamais le graphe directement.
3. Level C1 branché sur ces logicChecks. GATE : construire un N-1 correct → win ; router sa propre voix dans le retour → toast « echo N-1 » ; tests verts ; déployé.

Si le modèle mix-minus a des ambiguïtés (bus, sends pre/post), DEMANDE avant d'implémenter.
```
**Skills :** `expert-council`/`debate` (le modèle N-1 est le cœur pédagogique — vaut une décision raisonnée). **Fin :** `session-vault` + Graphify.

---

## PROMPT D — Domaine D : patchbay + clock + Level D1 (semaine 6)

```
Respecte CLAUDE.md. Domaine Post-Production. Lis content/levels/d1.json (source de vérité).

1. Interaction patchbay : normalled / half-normalled (un câble inséré dans un jack rompt la normalisation ; half-normalled = tap sans rompre). Modélise ça dans l'interaction/ConnectionGraph SANS casser les contrats existants — si ça exige une extension d'interface, propose-la-moi d'abord.
2. logic/clock.ts (fonctions pures) : détecter un mismatch de sync numérique master/slave (deux masters, ou slave sans master). Triggers + doesn't-trigger.
3. logic/phantom.ts si utilisé par d1.json : condenser sans +48V → détection.
4. UI overlay : modal 2D « console bus assign » si requis par d1.json.
5. Level D1 branché. GATE : chaîne D1 correcte → win ; erreur normalling / double-master → bons toasts ; tests verts ; déployé.
```
**Skills :** `expert-council` (le normalling est subtil), `deep-scan` avant le gate. **Fin :** `session-vault` + Graphify.

---

## PROMPT E — Depth pass + mistake-history dashboard + polish (semaines 7-8)

```
Respecte CLAUDE.md. Les 4 levels P1 sont jouables. Passe en profondeur sur le domaine le plus fort :

1. Ajoute le contenu P2 (equipment-catalog.md priorités) du domaine choisi — édition content/ uniquement, plus des niveaux P2 dans content/levels/.
2. Dashboard « mistake history » : lit le Progress localStorage (historique d'erreurs personnel) et affiche une liste de points faibles + une tendance (objectif : tendre vers zéro). UI overlay event-driven.
3. Polish : feedback toasts, lisibilité du câblage, budget perf (guard caténaire→ligne droite), messages d'erreur.
GATE : contenu P2 jouable, dashboard reflète l'historique réel, tests verts, déployé.
```
**Skills :** `subagent-driven-development` (contenu vs dashboard vs polish en parallèle), `session-vault` + Graphify à la fin.

---

## PROMPT F — Verification & ship (avant de considérer P1 « done »)

```
Respecte CLAUDE.md. Passe de revue finale avant de figer P1.

1. Lance TOUTE la suite : vitest (ConnectionGraph matrices + chaque teaching rule triggers/doesn't-trigger + catalog consistency), Playwright smoke sur les 4 levels. Corrige tout ce qui casse.
2. Vérifie la Definition of Done : (a) 4 levels jouables end-to-end en navigateur ; (b) chaque teaching rule couverte par tests ET déclenchable en jeu ; (c) ajouter du contenu ne demande AUCUN changement engine (prouve-le en ajoutant un device factice via content/ seulement, puis retire-le).
3. Success criterion perso : je dois pouvoir câbler un studio radio self-op et un N-1 correct sans notes — vérifie que le mistake-history du simulateur peut mesurer ça.
4. Perf : contrôle le budget câble sous charge (plusieurs câbles) ; confirme la dégradation gracieuse.
Fais-moi un rapport final : ce qui passe, ce qui reste, et l'URL Vercel de prod.
```
**Skills :** **`deep-scan`** (chasse aux gaps multi-passes) — idéalement lancé via un subagent pour garder ton contexte propre. **Fin :** `session-vault` (doc de clôture P1) + régénère Graphify.

---

## PROMPT G — Rituel de fin de semaine (à réutiliser chaque vendredi)

```
Respecte CLAUDE.md. Fin de semaine :
1. Vérifie que le build de la semaine est jouable sur l'URL Vercel (règle no-drift). Si non, corrige avant tout.
2. Résume ce qui a été livré, les décisions prises, et les dettes/TODO ouverts.
3. Documente la session (session-vault → Obsidian) et régénère le graphe Graphify.
```

---

## Ordre de passage recommandé
`0 → 1` (S1-2) → puis **en parallèle** `A` + `B` (S3-4) → `C` (S5) → `D` (S6) → `E` (S7-8) → `F` (ship). `G` chaque vendredi.

## Hors P1 (plus tard, si tu veux)
Feedback **IA audio** (analyser une prise/mix uploadé → critique explicable) — c'est le white space identifié dans le landscape concurrentiel. Prompt à écrire avec le skill `ai-integrate` (RAG local sur Mac Studio vs cloud) quand les 4 levels P1 seront solides.
