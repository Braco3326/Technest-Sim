# ADR-0003 — Modèle de readiness mappé au référentiel BTS

- **Status:** Accepted (run de nuit 2026-07-17 — le MAPPING pédagogique attend la relecture d'Oscar)
- **Beats servis:** 2 (one next action), 4 (streak-pardon), 5 (readiness visible)

## Contexte

La vision exige « exam-readiness, never vanity » : un radar par bloc de
compétences (BC01–BC04) et par épreuve (E3/E4/E51), nourri par les erreurs
R1–R8 et les victoires, avec un recommandeur « prochaine meilleure action » et
un streak qui pardonne. Les données existent déjà : mistakes typées par rule
dans ProgressStore, et le référentiel dans docs/db_*.csv.

## Décisions

**1. Le mapping rules→référentiel est du CONTENU** (`content/readiness.json`),
pas du code : BC/épreuves/tips par rule. Jugements de la nuit, à relire :
- Toutes les rules techniques → BC02 (savoir-faire son, « SPECIFIQUE OPTION SON »).
- R5/R6/R7 (tally, larsen, N-1 = coordination d'antenne/production) → aussi BC03.
- E3 (écrit PTES) : R2 (niveaux), R4 (phantom), R8 (numérique/horloge) — les
  règles à substrat théorique. E4 (pratique) : toutes. E51 : R7 (le N-1 est un
  sujet de projet/production). BC01/BC04 : `inGame:false` — pas couverts par le
  jeu v1, affichés grisés (honnêteté du radar, jamais de fausse readiness).

**2. Quelles rules exerce une victoire ?** `rulesOfLevel = {R1,R2,R3} ∪ logicChecks`
— les invariants engine sont exercés par TOUT câblage réussi (dérivé des
levels chargés, zéro duplication de data — anti-drift).

**3. Score par rule** = ratio de réussite × couverture :
`coverage = min(1, wins/2)` (il faut ≥2 victoires exerçant la rule pour une
couverture pleine) ; `ratio = wins/(wins+errors)` ; `score = ratio × coverage`.
Jamais pratiqué → 0. Transparent, explicable à l'étudiant, sans magie.
BC/épreuve = moyenne de leurs rules ; readiness globale = moyenne des épreuves
pondérée par coefficient. (Décroissance temporelle/spaced = P2.)

**4. ProgressStore v2 avec MIGRATION** (pas de reset) : v1→v2 ajoute
`wins` (1 si completedAt), `activity: []` (dates YYYY-MM-DD uniques pour le
streak). `recordWin()` nouveau ; `markCompleted()` conservé (sémantique
completedAt inchangée). Interface toujours swappable (backend plus tard).

**5. Streak avec pardon** : un trou d'exactement 1 jour ne casse pas la série
(il ne compte pas, il est pardonné) ; ≥2 jours consécutifs manqués = fin de
série. « La régularité compte, pas la perfection » (Beat 4).

**6. Recommandeur** : rule au score minimal (égalité → ordre R1..R8, puis
erreurs les plus récentes) → parmi les levels qui l'exercent, celui qui a le
moins de wins. Tout ≥ 0.8 → « entretien » du level le moins jouée. Retourne
{levelId, ruleId, reason, tip} — le tip contextuel vient du mapping (voix
d'Oscar, placeholders pour l'instant).

## Alternatives rejetées

- Elo/IRT par item : opaque pour l'étudiant, sur-dimensionné pour 8 rules.
- XP/points : explicitement banni par la vision (« readiness, never vanity »).
- Reset v1→v2 : perdre l'historique d'erreurs d'un utilisateur réel serait
  un anti-Beat 4 ; la migration est triviale.

## Conséquences

- Le dashboard (accueil) lit UNIQUEMENT des fonctions pures
  (`src/ui/readiness.ts`) sur (ProgressData, levels, readiness.json).
- Le mode Tests (tâche 3) réutilisera les mêmes scores pour son rapport.
- La sandbox (tâche 5) écrira dans le même store → « play = assessment ».
