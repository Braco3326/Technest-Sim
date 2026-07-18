# Teknest Design System — v1 (night run 2026-07-17)

> Source de vérité visuelle : `src/design/tokens.ts` (LE fichier unique de tokens).
> Direction : VISION_TekPractice-Game.md §6 — blanc galerie, calme, premium
> (Teenage Engineering × Apple × vrai studio). Le blanc est un dispositif
> pédagogique : il baisse l'anxiété (StudentJourney Beat 1) et fait du matériel
> réel le héros. JAMAIS de valeur en dur hors tokens.

## Principes

1. **Le matériel est la star.** Fond `bg` #F5F6F8, sol `floor` #FCFCFD, objets sombres → contraste maximal sur les devices, minimal sur l'UI.
2. **Un seul accent** : `accent` #2E5FE6 (bleu calme). Tout le reste est encre/neutres. Les couleurs sémantiques (success/error/warning) n'apparaissent que comme FEEDBACK pédagogique.
3. **Whitespace généreux, typographie soignée** : Inter/system-ui, poids 450/550/650, letter-spacing négatif sur les titres, labels uppercase espacés pour les métadonnées.
4. **Motion subtile et signifiante** : 140/240/420 ms, easing `cubic-bezier(0.2,0,0,1)` (départ décidé, atterrissage doux). Le motion EST du feedback (toast-in, toggle, snap) — jamais décoratif.
5. **Accessibilité WCAG AA** : ink 15.4:1, inkMuted 6.4:1, blanc sur accent 4.6:1, blanc sur success 3.9:1 (grands éléments/badges uniquement — glyphes ≥ 14px bold).

## Tokens (résumé — la vérité est dans tokens.ts)

| Groupe | Tokens |
|---|---|
| Surfaces | `bg` `floor` `surface` `surfaceBorder` `overlay` |
| Encre | `ink` `inkMuted` `inkFaint` |
| Accent | `accent` `accentInk` |
| Sémantique | `success` `error` `warning` `info` |
| Ports | `portIn` (bleu) `portOut` (orange) `portBidir` (violet) |
| Scène | `deviceBody` `cable*` `contactShadow` |
| Type | famille + tailles xs→xl + poids |
| Espace/Rayon/Élévation | échelles sm→xl, ombres `card`/`raised` |
| Motion | `fast/base/slow` + `ease` |
| Focus & Patch (ADR-0008) | `glowOutline` `glowOutlineWidth` `glowOverlayAlpha` `dimVisibility` `heldCableRadius` `flyMs` |

Diffusion : `injectTokens()` pousse tout sur `:root` en `--tk-*` ; le CSS du HUD
(index.html) ne consomme QUE ces variables ; la scène Babylon lit `TOKENS.*`
directement (Color3.FromHexString).

## Scène 3D (white gallery)

- Clear color `bg`, sol `floor` (le léger écart crée l'horizon doux).
- Lumière de musée : hémisphérique 0.95 (groundColor #DDE1E8) + directionnelle 0.35 pour modeler.
- **Ombres de contact** : blob radial-gradient (`contactShadow`, DynamicTexture partagée) sous chaque device — pas de vraies shadow maps (budget perf, calme visuel).
- Câbles : caténaires fines, `cable` sombre commité (rayon fixe) ; drag neutre/`cableOk`/`cableBad`.
  Le câble **tenu** (drag) utilise `focus.heldCableRadius` (0.02) — plus épais que le commité
  pour rester lisible en vue Ensemble ; matériau neutral doux (émissif 0.35, pas de flash).
- **Focus & Patch** (tokens `focus.*`, lus directement côté scène, PAS injectés en CSS) :
  le halo des cibles compatibles = `glowOutline` (= l'accent, jamais néon) + un lavis translucide
  `glowOverlayAlpha` (0.3, valeur UNIQUE pour corps et cartels — cohérence sur fond blanc) ;
  les ports incompatibles reculent à `dimVisibility` (0.35) ; le vol caméra dure `flyMs` (300 ms).
- Labels 3D : cartels encre-sur-blanc (texture opaque). ⚠️ Piège appris : l'opacityTexture Babylon dérive l'alpha de la LUMINANCE → texte sombre sur transparent = invisible. On n'utilise PLUS d'alpha pour les labels. Police canvas : `bold Npx sans-serif` uniquement (`500 … system-ui` ne parse pas dans le canvas headless).

## HUD

Cartes blanches `surface` + bord `surfaceBorder` + `elev-card`, rayon `md`.
Pills de niveaux (accent = actif). Checklist : cases → ✓ `success` rempli.
Toasts : carte blanche, liseré gauche sémantique 4px, titre uppercase.
Win screen : scrim `overlay` + blur léger, carte `radius-lg` + `elev-raised`.
Toggles : switch 28×16 (blanc sur `success` quand ON). Matrice de routage : cellules 18px, accent quand routé.

## À relire par Oscar (jugements design de la nuit)

- Le choix d'accent #2E5FE6 (bleu) — alternative naturelle : un vert studio.
- Cartels port-labels : micro-cartes blanches par port — un peu de bruit en vue
  large sur les racks denses (D1) ; option : ne les afficher qu'au hover/drag.
- Poids visuel des blobs d'ombre (0.20) — assombrir/alléger au goût.
