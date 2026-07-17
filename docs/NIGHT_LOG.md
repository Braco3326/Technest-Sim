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

## Tache 3 - MODE TESTS / EXAMEN OK (Beat 5)

**Livre :**
- src/ui/exam.ts : examScore PURE (/20 : 60% cablage + 40% checks domaine - 0.5pt/erreur, arrondi au demi-point, jamais <0) + ExamController (chrono, rapport final, gel des intents apres fin).
- ?level=X&mode=exam : AUCUN hint - drag toujours neutre (pas de vert/rouge), toasts sans texte pedagogique ("Connexion refusee"), violations non toastees mais TOUJOURS enregistrees (play = assessment).
- examSeconds par level (data : a1 240s, b1/c1 300s, d1 420s) ; timer HUD (rouge < 30s) ; timeout => rapport avec l'etat reel.
- Rapport : note /20, detail transparent (completion, checks, erreurs, temps), ton anti-honte ("une mesure, pas un jugement"), CTA vers la readiness.
- Entree : chip "Examen" dans la nav du HUD. Reutilise 100% l'engine (zero refonte).
- Tests : 6 unit (bareme) + 3 e2e (pas de fuite du teach text, rapport /20, win screen remplace, intents geles).

**Jugement a relire :** le bareme (60/40, -0.5pt) et les textes du rapport.

## Tache 4 - ENVIRONNEMENTS EN PRESETS DATA OK (Beat 3)

**Livre :**
- content/environments/{plateau,radio,studio}.json : backdrop (couleurs, taille de sol) + camera par piece. Une nouvelle piece = un JSON, jamais de code engine (VISION par.3).
- Les layouts sortent de game.ts vers les levels (data) : levels/*.json gagnent "environment" + "layout" {instanceId: [x,y,z]}.
- Mapping : a1->plateau, b1->radio, c1->radio, d1->studio. Teintes blanches subtiles par piece (radio legerement chaude, studio legerement froide).
- Schemas zod Environment + Level etendus ; validateur : preset existant + chaque layout pointe une instance reelle du level.
- Champs "status":"stub" perimes retires de b1/c1/d1 (ils sont jouables et testes depuis le run domaine).
- 87 unit + 14 e2e verts, build OK.

## Tache 5 - SANDBOX v1 OK (Beat 3, ADR-0004)

**Livre :**
- Extension engine MINIMALE (ADR-0004) : ConnectionGraph.addInstance(instanceId, deviceId) -> Ok|TypedError (DUPLICATE_INSTANCE / UNKNOWN_DEVICE). Controls aux defauts catalog. Testee (2 unit). Rien d'autre ne change.
- Sandbox = pseudo-level DATA construit par le routeur : requiredChain [], logicChecks [R4..R8] -> meme RuleEvaluator, les regles enseignent en direct (hints ON, contrairement a l'examen). Jamais de win screen (pas de chaine requise).
- Etageres par categorie LUES DU CATALOG (vignettes des assets), intent SPAWN -> spawn dynamique sur grille + ports interactifs immediatement cablables.
- Gating par maitrise : readiness globale < 15% -> palette guidee 3 items (SM58/stagebox/console) + brief "connecte le micro a la console" (le gout du Beat 1) ; sinon etageres completes.
- Play = assessment : les erreurs sandbox s'enregistrent sous "sandbox" et ruleScores compte desormais les erreurs de TOUTES les entrees du store (test dedie).
- Rig nomme sauvegarde (localStorage audio-sim/rigs, versionne, ecrase par nom).
- 90 vitest + 17 e2e verts (3 e2e sandbox : palette guidee, spawn->cablage->toast->store, save rig).

**Reste (voir docs/prompts/) :** CHARGEMENT d'un rig (exige removeInstance/reset -> P2), signal positif "rig propre" vers la readiness, drag&drop physique depuis l'etagere (v1 = clic-pour-poser).

---

# BRIEFING DE PASSATION (fin du run - 2026-07-17 ~04h)

## Fait cette nuit (5/5 taches, chacune commitee+pushee, tests verts a chaque commit)
1. DA BLANCHE - tokens (src/design/tokens.ts), HUD + scene galerie blanche, ombres de contact, design-system.md.
2. READINESS + DASHBOARD - mapping referentiel (content/readiness.json, ADR-0003), ProgressStore v2 (migration), recommandeur "1 action", streak-pardon, radar/barres/chips sur "/".
3. MODE EXAMEN - chrono, zero hint, note /20 transparente, rapport (ADR-light dans le bareme exam.ts), entree via chip "Examen".
4. ENVIRONNEMENTS DATA - content/environments/{plateau,radio,studio}.json + layouts dans les levels ; stubs perimes nettoyes.
5. SANDBOX v1 - etageres catalog, spawn dynamique (ADR-0004, addInstance teste), gating par maitrise, regles live, erreurs->readiness, rigs nommes.

Etat final : 90 vitest + 17 e2e verts - build OK - engine intact sauf addInstance (ADR-0004).
ADRs pris cette nuit : 0003 (readiness, Accepted - mapping a relire), 0004 (sandbox, Accepted).
En attente de decision Oscar : ADR-0002 (patchbay, Proposed depuis le run domaine).

## ATTEND TA RELECTURE (jugements de la nuit)
- PEDAGOGIE : mapping rules->BC/epreuves + tips (content/readiness.json) ; bareme examen (60/40, -0.5/erreur, src/ui/exam.ts) ; textes du rapport d'examen ; gating sandbox a 15%.
- DESIGN : accent bleu vs vert, ombres 0.20, cartels de ports (docs/design-system.md section "A relire").
- Les 4 niveaux + dashboard + examen + sandbox se testent sur http://localhost:3001 (serveur detache) ou npm run dev.

## URGENT (toi uniquement - autre compte Vercel)
www.teknest.fr repond MAIS sert un bundle vieux de 2 jours (pre-dashboard, titre "Audio Sim") :
le projet Vercel ne rebuild PAS sur les push GitHub. Dashboard Vercel -> projet du domaine
teknest.fr -> Settings/Git : reconnecter Braco3326/Technest-Sim, branche main, puis redeployer.
(teknest-simu.vercel.app est mort en 404 - probablement l'ancien projet supprime/renomme.)
Ensuite la regle no-drift du vendredi redevient automatique.

## SI FABLE DISPARAIT CE WEEK-END (prompts prets-a-coller, docs/prompts/)
- 01-sandbox-rig-load.md : chargement de rig + removeInstance/clear (ADR-0005) + signal "rig propre".
- 02-sample-rate-enum-controls.md : R8 complet via controls enum (ADR-0006).
- 03-patchbay-normalling.md : implementation ADR-0002 (APRES ton OK).
- 04-design-review-fixes.md : pass design post-relecture (labels hover, spawn origin, micro-motion).
Chaque prompt est autonome (contexte, fichiers, contraintes, gates) - calibre pour un modele plus faible.
Ordre conseille : Vercel d'abord (toi), puis 04 (visible), puis 01, 02, 03.

## Dettes conscientes (ni bloquantes ni cachees)
- Le 1er spawn sandbox peut apparaitre derriere le panneau etageres (fix dans le prompt 04).
- tools/gate5-proof.ts et gate6-proof.ts pointent encore :3000 (historiques, sans valeur CI).
- Vignettes etageres aux cadrages heterogenes (prompt 04).
- Mode Learn / coach contextuel / onboarding : pas commences (P1 vision, gros morceaux).

---
# RUN DE NUIT n.2 - 2026-07-17 (suite)

## Tache 1 - COACH / CONSEILS D'OSCAR OK (Beats 4 + 2)

**Livre :**
- content/coach/tips.json : 13 tips PLACEHOLDER "[A REMPLACER PAR OSCAR]" (8 par rule + low-moment/comeback/forgiveness/exam-low/first-win). AUCUN fait pedagogique invente - chaque texte decrit ce qu'Oscar doit y raconter. Liste de relecture : docs/REVIEW-ME.md.
- src/ui/coach.ts (pur) : detectLowMoment (>=3 jours actifs PUIS >=2 jours de silence), detectComeback (retour apres trou), tipFor + dedupe session (SeenTips).
- Tone engine = contrat applique : 1 message coach max par moment, 1x/session par tip, JAMAIS pendant un examen, moments bas uniquement sur le dashboard (pas d'interruption culpabilisante en jeu).
- Livraison contextuelle : violation R? -> tip de LA rule (toast "Conseil d'Oscar" stylise a part) ; premiere victoire -> first-win ; dashboard -> forgiveness > comeback > low-moment.
- Validateur : chaque rule du catalog DOIT avoir son tip coach ; ids uniques ; triggers resolus.
- 100 vitest (10 nouveaux coach) + 17 e2e verts.

**A relire (docs/REVIEW-ME.md) :** les 13 textes + les fenetres de detection (3 jours/2 jours).

## Tache 2 - ONBOARDING OK (Beat 1)

**Livre :**
- content/onboarding.json (data, valide) : date d'epreuve + 2 questions (zone fragile -> seed de rules, niveau ressenti) + option "Passer" - AUCUN mur d'inscription, jamais.
- src/ui/onboarding.ts : persistance localStorage v1, daysToExam, rendu formulaire blanc.
- Seed du recommandeur : la peur declaree gagne les egalites a score nul, mais ne SURPASSE JAMAIS une faiblesse mesuree (test dedie) - honnetete du modele.
- Flux Beat 1 : soumission -> redirection DIRECTE vers le level recommande (le "taste" en 90s). Retour accueil -> dashboard avec compte a rebours J-XX.
- 107 vitest (7 nouveaux) + 20 e2e verts (3 nouveaux onboarding ; dashboard.spec adapte pour seeder l'onboarding).

**A relire :** textes des questions/options (REVIEW-ME.md), groupes de rules par option.

## Tache 3 - 2D MOTION OK (Beats 1/3, polish)

**Livre :**
- Pulses de signal-flow : point accent qui parcourt chaque cable commite out->in (pointAlong arc-length pur + teste), periode 2.4s, cap 12 cables (perf), phase decalee par cable.
- Feedback de snap : le marqueur du port candidat "respire" (scale 1.35) pendant le drag (hook onCandidate de l'Interaction).
- Meter de chaine facon VU dans le HUD : segments remplis = connexions requises posees, le dernier pose rebondit UNE fois (motion lie a un evenement reel, jamais oisif) ; VU celebratoire dans le win screen.
- Transitions douces : stagger d'entree du dashboard, transitions token partout.
- ACCESSIBILITE : prefers-reduced-motion tue tout le motion CSS (media query) ET les animations 3D (motionEnabled() cote Babylon).
- Fixes design objectifs (du prompt 04) : origine de spawn sandbox centree (plus sous le panneau), vignettes etageres object-fit contain.
- Piege retrouve : display:flex bat [hidden] -> #hud-shelf vide visible partout - regle desormais notee 2x (win screen, shelf). 110 vitest + 20 e2e verts.
