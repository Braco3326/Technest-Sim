# ADR-0008 — "Focus & Patch" : state machine caméra + interaction clic-clic

- **Status:** Accepted (run autonome long, 2026-07-18) — exécution de la spec
  docs/TekPractice_Interaction-and-Assets.md §1-§5 (council-validated Tier 3)
- **Beat servi:** 3 (le geste métier : trouver le bon port sur le vrai panneau EST la
  compétence d'examen E4 — la friction est pédagogique, spec §0)
- **Remplace:** le drag-to-connect 3D (src/scene/Interaction.ts) — l'anti-pattern que la
  spec §1 rejette explicitement. On ne garde PAS les deux flows (décision d'Oscar).

## Décision 1 — Trois modules, séparation stricte

| Module | Rôle | Importe |
|---|---|---|
| `scene/focusMachine.ts` | **QUOI** — state machine PURE : ensemble⇄focus, curseur sélection, câble en main. Entrée = FocusEvent, sortie = état + FocusCommand[]. | uniquement le TYPE PortRef |
| `scene/CameraRig.ts` | **Vol caméra** : ensemble↔focus, eased 250-350 ms, auto-frame du panneau actif, reduced-motion = cut. | Babylon (caméra seulement) |
| `scene/FocusPatch.ts` | **Adaptateur** : pointeur/clavier → events ; exécute les commands (vol, câble tenu via CableRenderer, glow, dispatch CONNECT). | Babylon + closures injectées |

**Aucun de ces modules n'importe ConnectionGraph** (test statique). La validation reste
`canConnect` injecté (dry-run), la mutation reste le dispatch d'intents → orchestrateur.
La caméra ne mute JAMAIS le graphe (spec §5, CLAUDE.md).

## Décision 2 — Politique Esc (ambiguïté de la spec tranchée)

La spec §2 liste Esc à la fois dans « Back to Ensemble » et « Cancel held cable ».
**Résolution : Esc annule l'engagement le PLUS RÉCENT** — câble en main → 1er Esc lâche le
câble (on reste en focus), 2e Esc revient en Ensemble. **Clic droit et clic dans le vide
reviennent en Ensemble EN GARDANT le câble en main** — c'est le cœur du flow §1 étape 4
(revenir, voir les devices compatibles glow, plonger sur la cible).

## Décision 3 — Connexion refusée = câble regardé en main

Sur le 2e clic port, la machine émet `connect` et libère la main (optimiste). FocusPatch
consulte le dry-run `canConnect` AVANT le dispatch : refusé → l'intent part quand même
(le toast enseignant EST la leçon R1-R3) puis `repickup()` re-arme le câble — l'élève
réessaie sans re-cliquer la source. Aucune dépendance nouvelle vers le graphe.

## Décision 4 — Auto-frame du « panneau actif »

Les ports des placeholders vivent sur la face −Z (DeviceSpawner). L'auto-frame vise donc
alpha=−π/2 (caméra côté −Z), beta≈1.15, radius = 2.6 × rayon englobant (borné) — les ports
te font face en arrivant, l'orbite libre (drag) montre le vrai arrière. Quand les .glb
remplaceront les boîtes, le même contrat tient (bounding réel du root).

## Décision 5 — Entrées touch-portables (mapping maintenant, tactile plus tard)

| Action | Desktop (implémenté) | Touch (même event Babylon, plus tard) |
|---|---|---|
| Focus device | double-clic (POINTERDOUBLETAP) | double-tap (même observable) |
| Orbite | drag gauche (ArcRotateCamera) | 1 doigt |
| Zoom fin | molette | pincement |
| Port / poser câble | clic (POINTERTAP) | tap |
| Retour Ensemble | Esc / clic droit / clic vide | 2 doigts (à mapper) / bouton retour |
| Annuler câble | Esc / re-clic sur le port tenu | tap sur le port tenu |

Clavier : Tab cycle les devices, Entrée focus, flèches orbitent (accessibilité).

## Rejeté
- **Garder le drag en parallèle du clic-clic** : deux grammaires d'entrée = confusion +
  double surface de bugs ; la spec impose le remplacement.
- **HighlightLayer Babylon pour le glow** : exige le stencil buffer à la création de
  l'Engine ; `renderOutline` par mesh fait le même travail sans toucher au bootstrap.
- **State machine dans game.ts** : intestable headless ; la pureté de focusMachine donne
  les tests unitaires exigés par la spec §7.

## Conséquences
- Interaction.ts (drag) et nearestPort/snap-radius disparaissent ; snap.ts se réduit au
  type PortPoint. `window.__audioSim.snap` remplacé par `view()` (mode/focused/held).
- Indices mode-gated (spec §3) : glow devices + tint ok/bad SEULEMENT si hints() —
  ON Learn/Levels, OFF Examen, toggle Sandbox. Le 2D (Render2D) suit la même règle.
- e2e pilotables à la vraie souris : `deviceScreen()`/`portScreen()` projettent en continu.
