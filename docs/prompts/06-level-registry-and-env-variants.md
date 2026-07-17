# PROMPT — Rendre les niveaux DATA-ONLY (registry dynamique) + variantes d'environnement

> Contexte : le run de contenu du 2026-07-17 a enrichi b1/c1/d1 mais a été BLOQUÉ sur
> « ajouter des niveaux » — voir docs/REVIEW-ME.md §6. Ce prompt lève le blocage. Il
> AUTORISE les changements engine (main.ts, hud.ts) + tooling (validate-catalog.ts) :
> c'est précisément la dette que CLAUDE.md promet de ne pas avoir (« nouveau niveau = data »).

Colle dans une session Claude Code ouverte dans D:\teknest\tekpractice.
Lis d'abord : src/main.ts, src/ui/hud.ts (nav), tools/validate-catalog.ts (LEVEL_IDS),
content/levels/*.json, CLAUDE.md (§Architecture, §Layout).

## OBJECTIF 1 — Registry de niveaux dynamique (la vraie promesse « data-only »)

Aujourd'hui la liste des niveaux est CODÉE EN DUR à 3 endroits, ce qui contredit
CLAUDE.md (« Nouveau matériel/leçon = édition data uniquement, jamais de changement
engine ») :
- `src/main.ts` : imports statiques a1..d1 + `const LEVELS = { a1, b1, c1, d1 }`.
- `src/ui/hud.ts` : `['a1','b1','c1','d1']` dans la nav.
- `tools/validate-catalog.ts` : `const LEVEL_IDS = ['a1','b1','c1','d1']`.

Remplace les 3 par une découverte dynamique :
1. main.ts : `const LEVELS = import.meta.glob('../content/levels/*.json', { eager: true })`
   → construis le Record {id → module.default}, trié par id. Le routeur `?level=<id>`
   marche alors pour tout fichier présent. Garde le fallback a1 pour un id inconnu.
2. hud.ts : la nav prend la liste d'ids depuis main.ts (passe-la en param au constructeur
   Hud, ne réimporte pas le glob dans la couche UI). Ordre : tri alpha, sandbox en dernier.
3. validate-catalog.ts : `LEVEL_IDS` devient un glob du dossier content/levels/*.json
   (fs.readdirSync). TOUT nouveau niveau est alors validé sans toucher le validateur.
4. Le champ `devices[].levels` du catalog reste la source d'appartenance (déjà data).
   Vérifie que le validateur accepte les nouveaux ids sans liste blanche.

Tests : un vitest qui charge chaque fichier de content/levels/ via loadLevel sans throw ;
un e2e qui visite `?level=<nouvel id>` et voit le bon nombre d'items de checklist.

## OBJECTIF 2 — Variantes d'environnement (le même geste, une autre salle)

Une fois le registry en place, AJOUTE ces niveaux — pur content/ (nouveau fichier +
`levels[]` du catalog). Chaîne identique à la source, SEUL l'environnement change ;
c'est la leçon « le même câblage dans une autre pièce » (VISION §3, environnements = data).

| Nouveau | Source | environment | Intention |
|---|---|---|---|
| a2 | a1 (live PA) | plein-air | Le même PA, mais en extérieur (pas de murs, pas de réverbe salle). |
| b2 | b1 (radio) | theatre | La même discipline broadcast en captation OB dans un théâtre. |
| c2 | c1 (duplex) | reportage | Le duplex reporter dans son décor naturel (le terrain). |

Pour chacun : copie le fichier source, change `id`, `environment`, `title`, `brief`
(mentionne la salle), et AJOUTE le nouvel id à `levels[]` de CHAQUE device utilisé dans
le catalog. Le layout peut être repris tel quel (les presets ne changent que le fond +
la caméra). NE crée PAS de nouveau matériel ni de nouveau port.

Ambiguïté à ne PAS trancher en silence : est-ce qu'une variante doit AJUSTER la chaîne
(ex. plein-air = alim par groupe électrogène, câbles plus longs → budget caténaire) ou
rester strictement identique ? Défaut proposé : identique (la leçon est « transposer un
geste connu »). Si Oscar veut des twists par salle, note-le en [À VÉRIFIER PAR OSCAR].

## OBJECTIF 3 — Un e2e « chaîne → violation → fix → win » par nouveau niveau

Réutilise le pattern de tests/e2e/levels.spec.ts (déjà multi-étapes). Comme la chaîne
est identique à la source, le même arc de règles s'applique — vérifie juste l'environnement
(fond/caméra) et le compte de checklist.

GATES : validate:catalog · vitest · playwright · build. Commit atomique par objectif + push.
NIGHT_LOG + relecture.
