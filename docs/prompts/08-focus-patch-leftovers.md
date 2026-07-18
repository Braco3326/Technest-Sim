# PROMPT — Focus & Patch : reliquats (après le run du 2026-07-18)

Colle un bloc dans une session Claude Code ouverte dans D:\teknest\tekpractice.
Lis d'abord : docs/adr/0008-focus-patch-camera.md, docs/TekPractice_Interaction-and-Assets.md,
src/scene/{focusMachine,CameraRig,FocusPatch}.ts, tests/e2e/focusPatch.spec.ts.
Gates à chaque commit : npx tsc --noEmit · npx vitest run · npx playwright test · npm run build.
Respecte CLAUDE.md : la caméra/UI ne mute JAMAIS le graphe ; engine intouché.

## A. Labels de ports au survol (spec §1 étape 2 : « Labels appear on hover »)

Aujourd'hui les cartels de ports sont TOUJOURS visibles (placeholder). La spec veut :
en Focus, label du port au survol (type + signal — spec §3). Options : (a) cartels
visibles en Focus seulement + tooltip enrichi au hover (connector/signal depuis le
catalog via une closure injectée `portInfo(ref)` — PAS d'import engine) ; (b) statu quo.
Si tu implémentes : masque les cartels en Ensemble (lisibilité), affiche-les en Focus,
et au hover ajoute une ligne `connector · signal`. e2e : hover → label enrichi visible.

## B. Flèche « prochain port recommandé » (spec §3, débutants, toggleable)

« A gentle arrow can point to the recommended next port for absolute beginners
(toggleable). » Gate sur hints() ET un second toggle (défaut OFF). Le prochain port =
première connexion manquante de state.missing. Scene-only : un petit cône/chevron
au-dessus du marker, animation douce (motionEnabled()). JAMAIS en examen (hints déjà OFF).

## C. Modes optionnels (spec §4 — pas par défaut)

1. **Flat back-panel overlay** : clic device → panneau 2D cliquable (réutilise Render2D
   par device ?) — utile accessibilité/touch. À cadrer par ADR avant de coder.
2. **« Reveal I/O » X-ray** (Learn only) : chassis fantôme bref. Idem, ADR d'abord.

## D. Touch réel (le mapping existe, ADR-0008 §5)

Deux-doigts-tap → retour Ensemble (Babylon MultiTouch), double-tap déjà couvert par
POINTERDOUBLETAP. Tester sur device réel ou émulation Playwright touch. + boutons UI
de secours (retour/annuler) pour tablette sans clavier.

## E. Perf Focus & Patch (si un profil montre un coût réel — ne pas optimiser à l'aveugle)

- applyHints() est O(instances × ports) par refresh — OK à 24 devices (cap sandbox).
  Si le cap monte : mémoïser par (held, occupancy-version).
- onMove fait un multiPick par pointer-move quand un câble est tenu — si coût visible,
  throttle à ~30 Hz.

## F. Nettoyage optionnel

- `markerScale` (breathing du candidat) n'est plus alimenté que par le hover de
  FocusPatch — vérifier qu'il vit encore, sinon simplifier.
- docs/prompts/02 (R8) est livré (ADR-0007) → archiver ; 06 (registry niveaux) et 07
  (durcissement) restent d'actualité ; 03 (patchbay) attend la décision d'Oscar (ADR-0002).
