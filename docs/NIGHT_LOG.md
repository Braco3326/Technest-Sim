# NIGHT_LOG — run autonome du 2026-07-17 (Oscar dort)

> Journal incrémental : mis à jour après CHAQUE tâche (protection contre perte
> de contexte). Briefing de passation complet en fin de fichier.

## Tâche 1 — DA BLANCHE ✅ (Beats 1 & 3 : « calm, white page », le matériel héros)

**Livré :**
- `src/design/tokens.ts` — LE fichier de tokens (couleur/type/espace/rayon/élévation/motion) + `injectTokens()` → CSS `--tk-*`.
- `index.html` — HUD entièrement re-stylé sur les tokens (cartes blanches, un accent bleu, checklist ✓ verts, toasts liseré sémantique, win screen scrim+blur, switches, matrice).
- Scène 3D blanche : clear `bg`, sol `floor`, lumière musée (hémi 0.95 + key 0.35), **ombres de contact** (blob radial partagé) sous chaque device, câbles/ports/labels sur tokens.
- `docs/design-system.md` — principes, tokens, pièges, points à relire.
- Vérifié par screenshots Playwright sur les 4 niveaux (A1 aéré, D1 dense) + zooms labels. 65 vitest + 8 e2e verts, build OK.

**Décisions/bugs de la nuit :**
- Piège Babylon : `opacityTexture` dérive l'alpha de la LUMINANCE → un texte encre sur transparent est invisible. Solution : cartels OPAQUES encre-sur-blanc (zéro pipeline alpha), esthétique « cartel de galerie » assumée.
- La police canvas `500 Npx system-ui` ne parse pas (headless) → `bold Npx sans-serif` obligatoire.
- Zéro changement engine (src/engine intact).

**À relire par Oscar (design) :** accent bleu vs vert studio ; micro-cartels de ports un peu bruyants sur les racks denses (option : hover-only) ; intensité des ombres (0.20).
