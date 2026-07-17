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

## Tache 2 - CERVEAU READINESS + DASHBOARD OK (Beats 2/4/5)

**Livre :**
- content/readiness.json : mapping rules R1-R8 -> BC01-04 + E3/E4/E51 + tips contextuels (donnees pures, valide par le validateur : chaque rule du catalog DOIT etre mappee).
- ADR-0003 (Accepted) : score par rule = ratio wins/(wins+erreurs) x couverture (2 wins = couverture pleine) ; BC/epreuve = moyennes ; global pondere par coefficients ; rulesOfLevel = R1-R3 + logicChecks.
- ProgressStore v2 : wins par level + activity (jours actifs) ; MIGRATION v1->v2 sans reset ; recordWin() ; interface swappable intacte.
- src/ui/readiness.ts (pur) : scores, recommandeur "prochaine meilleure action" (attaque la rule la plus faible via le level le moins gagne ; mode entretien si tout >= 0.8), streak avec pardon (1 jour manque pardonne, 2 = fin).
- src/ui/dashboard.ts + route "/" : radar SVG BC01-04 (blocs hors-jeu grises - jamais de fausse readiness), barres epreuves, chips rules, streak, CTA unique, conseil contextuel. Le jeu passe sous ?level=; la home ne boote PAS Babylon.
- main.ts scinde en routeur + src/game.ts (bootstrap jeu, recordWin cable au win).
- Tests : 81 vitest (16 nouveaux readiness/streak/migration) + 11 e2e (3 nouveaux dashboard).

**A relire par Oscar (pedagogie) :** le mapping BC/epreuves de readiness.json (mes jugements : R5/R6/R7 -> aussi BC03 ; E3 pour R2/R4/R8 ; E51 pour R7) et les textes des tips (a reecrire dans ta voix).
