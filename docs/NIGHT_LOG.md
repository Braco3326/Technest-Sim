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

## Tache 4 - ENVIRONNEMENTS SUPPLEMENTAIRES OK (Beat 3)

**Livre :**
- 3 nouveaux presets data : theatre (chaud, 20x16), plein-air (froid clair, 30x20, camera large), reportage/ENG (compact 10x8, camera serree). Total : 6 pieces, toutes data-only.
- BONUS utilisabilite immediate : la sandbox accepte ?env=<preset> + une rangee de "pieces" cliquables dans le panneau etageres ("she picks the theatre just to try" - Beat 3 mot pour mot).
- Validateur etendu aux 6 presets. 110 vitest + 20 e2e verts.

## Tache 5 - LEFTOVERS : prompt 01 EXECUTE, 02 en passation, 03 SKIP

**Fait (prompt 01, ADR-0005 Accepted) :**
- Engine : removeInstance (deconnecte via disconnect(), jamais de chirurgie de maps) + clear(). 3 tests unit.
- LOAD_RIG intent : clear -> respawn ids EXACTS -> recable -> controls -> refresh ; appareil disparu du catalog => toast, pas de crash. Liste des rigs dans le panneau (Charger).
- Signal "rig propre" : >=2 connexions + 0 violation a la sauvegarde => recordWin('sandbox'), credite dans ruleScores R1/R2/R3 UNIQUEMENT (correction en cours de route : crediter toutes les rules sur-creditait le radar - 2 rigs de 2 cables auraient rempli R4-R8. Radar honnete > genereux). Rig sale : se sauvegarde sans credit ni punition.
- 113 vitest + 21 e2e verts (e2e complet : build->save propre->reload page->Charger->cable restaure via PORT_OCCUPIED).

**Skips assumes :**
- Prompt 02 (controls enum + R8 sample-rate) : NON lance - extension d'interface engine en fin de tres longue session = risque de qualite ; le prompt docs/prompts/02 est autonome et pret.
- Prompt 03 (patchbay) : ADR-0002 toujours Proposed, pas de GO d'Oscar dans l'historique -> skip conforme a la consigne.
- Prompt 04 : les fixes objectifs (spawn centre, vignettes, [hidden] shelf) faits en tache 3 ; le reste attend les decisions design d'Oscar.

---

# BRIEFING DE PASSATION - RUN n.2 (2026-07-17, ~apres-midi)

## Score du run : 5/5 taches traitees (4 livrees + leftovers 1/3 livre, 2 skips justifies)
1. COACH (Beats 4+2) - 13 tips placeholder [A REMPLACER PAR OSCAR], detection moments bas/comeback, tone engine (1 msg max, 1x/session, jamais en examen).
2. ONBOARDING (Beat 1) - date + 2 questions -> seed du recommandeur (ne surpasse JAMAIS une faiblesse mesuree) -> redirection directe en jeu ; J-XX au dashboard ; option "Passer".
3. 2D MOTION (Beats 1/3) - pulses de signal sur cables (pointAlong pur), snap qui respire, meter VU de chaine, stagger dashboard, prefers-reduced-motion CSS+3D.
4. ENVIRONNEMENTS (Beat 3) - theatre/plein-air/reportage + picker de piece dans la sandbox (?env=).
5. LEFTOVERS - rig load complet (ADR-0005) ; 02 pret-a-coller ; 03 attend ton GO ADR-0002.

Etat final : 113 vitest + 21 e2e verts, build OK. ADRs du run : 0005 (Accepted).
Commits : night2: coach / onboarding / 2D motion / room presets / (rig load dans ce commit).

## RESTE EN HAUT DE LA PILE
1. VERCEL (toi) : www.teknest.fr sert toujours un bundle d'avant-hier - reconnecter le Git du projet (2 min) puis Redeploy. ~25 commits attendent en ligne.
2. Tes textes coach (docs/REVIEW-ME.md - 13 placeholders + questions onboarding).
3. docs/prompts/02 (R8 sample-rate) puis 03 (patchbay, apres ton GO).
4. Mode Learn (micro-lecons Tekskol) : pas commence - le prochain gros morceau P1 de la vision.

## Run coach IA (2026-07-17, apres-midi) — ADR-0006

Objectif : couche COACH IA temps-reel (Beats 2/4), distincte des Conseils d'Oscar authores.

- src/ai/ : AiCoach (interface swappable) + AiProvider (bas niveau) + GroundedCoach
  (ancrage strict + validation de sortie) + AnthropicProvider (SDK officiel, opus-4-8,
  navigateur) + createAiCoach (cle .env DIFFEREE -> unconfigured propre, jamais de crash).
- Ancrage RAG : buildGrounding()/validateReply() PURES — la reponse doit citer [Rn] ou
  [catalog:id], toute regle inconnue / materiel hors montage => rejet, l'UI garde le teach.
- Socratique : system prompt "teach don't cheat" (pourquoi + questions, jamais le geste exact).
- Examen : silence par DOUBLE garde (askCoach court-circuite + game.ts ne cable pas le bouton).
- UI : bouton "Pourquoi ?" sur les toasts d'erreur (rejections R1-R3 ET violations R4-R8),
  reponse rendue dans le toast avec ligne Sources. CSS tokens uniquement.
- Tests : 17 nouveaux vitest (ancrage, degradation, silence examen, prompt structurel).
Etat : 130 vitest + 21 e2e verts, build OK. Suites -> docs/prompts/05-ai-coach.md
(Gemini, Ollama, lazy-load SDK, anti-spam, readiness dans le pack, e2e mocke).

## Run enrichissement contenu (2026-07-17, apres-midi #2) — SUBSTANCE des niveaux

Objectif : enrichir b1/c1/d1 en scenarios multi-etapes, +niveaux env-variants, en editant
UNIQUEMENT content/ (ZERO changement engine). Cite les Beats 3 (profondeur) et 1-5 (regles).

Fait (pur content/, gates verts) :
- c1 : le vrai maillon mince (4 conn / R7) -> DUPLEX 4 ETAPES / 6 conn. Ajout du monitoring
  regie (bus monitor console -> 2 Genelec). Genelec passe en levels ["b1","c1","d1"].
  R7 (N-1 echo) reste l'etoile ; aucun fait pedagogique invente (tout du catalog/regles).
- b1 / d1 : deja au plafond du catalog simplifie -> brief/objectif/successMessage/notes
  reecrits pour rendre EXPLICITE la structure multi-etapes reelle (b1 signal+discipline
  R5/R6 ; d1 3 sous-chaines + verrous R4/R8). Aucun cable fabrique.
- e2e : c1 chain 4->6 ; +2 tests multi-etapes joues en SEQUENCE (partiel -> violation ->
  fix -> win) : b1 (R5 tally puis R6 feedback) et c1 (N-1 send ferme -> echo -> mix-minus).

Blocages (skip+log) :
- "Ajouter des niveaux" n'est PAS content-only : la liste des niveaux est codee en dur
  dans main.ts + hud.ts + validate-catalog.ts. Un niveau data-seul est injoignable/non
  valide. Pas de fichiers morts ecrits. -> docs/prompts/06 (registry dynamique glob +
  variantes a2/b2/c2) leve le blocage dans un run ou l'engine est autorise.
- Profondeur b1/d1 plafonnee par le catalog 2-of-N ports + pas de loom XLR->DB25 ni de
  normalling patchbay -> aucun cable requis honnete a ajouter. Detail docs/REVIEW-ME.md §6.

Etat : validate:catalog VERT · 130 vitest VERT · 23 e2e VERT (2 nouveaux) · build OK.
ADR du run : aucun (pur data). Relecture : docs/REVIEW-ME.md §6 ([A VERIFIER] c1 monitoring).

## Run durcissement "smooth/clean/fast" (2026-07-17, soir) — 4 axes

### FAIT (gates verts a chaque commit : validate + vitest + e2e + build)
1. **Deep-scan** (agent read-only) -> corrections sures appliquees :
   - ProgressStore.save + saveRig : setItem protege (QuotaExceeded/private-mode) -> warn, jamais de throw.
   - mistakes[] borne a 50/niveau (la readiness ne lit que .length).
   - win-card retractee si un niveau gagne regresse (cable requis retire).
   Le reste (NEEDS-DECISION) -> docs/REVIEW-ME.md §7.
2. **Perf** :
   - SPAWN sandbox cape a 24 appareils (toast "Rack plein").
   - markerScale : O(instances×ports)/pointer-move -> O(1) (2 markers touches).
   - **FALLBACK 2D basse-fidelite (exigence VISION)** : render/detect (decideRenderer PUR :
     ?render=2d|3d + pref persistee + auto no-WebGL/low-end) + render/Render2D (board SVG
     sans WebGL, jouable : clic 2 ports -> connect avec dry-run vert/rouge, clic cable ->
     disconnect) + game2d (racine de composition sans Babylon, reutilise engine+Hud+
     ControlsPanel+Exam+ProgressStore+coach). main.ts route 2D/3D par detection. Toggle "Vue 3D".
     Sandbox reste 3D (logge). 8 vitest + 3 e2e.
3. **A11y WCAG AA** : focus-visible global, cellules de routage 18->24px + aria-label,
   #hud-toasts aria-live=polite, nav aria-current, warningInk (5.1:1) pour le texte warning
   (l'ancien 2.9:1 echouait). Verifie par screenshots headless (dashboard, boards c1/d1, toasts).
4. **R8 sample-rate** (ADR-0007) : controls enum (toggle|enum discrimine), ConnectionGraph
   valide les options (INVALID_CONTROL_VALUE), logic/clock detecte le mismatch de frequence
   sur un lien numerique, ControlsPanel rend un <select>. sample-rate sur hdx/hdio/ocx
   (defaut 48000 -> D1 inchange). 8 vitest. Patchbay (ADR-0002) SKIP (attend Oscar).

### DECISIONS
- 2D = fallback pour les NIVEAUX gradues (a1-d1, le coeur pedagogique). Sandbox 3D-only en v1.
- Sample-rate : defaut identique partout -> piege optionnel + teste, PAS une etape requise de D1
  (ne casse pas l'arc phantom+clock). Option future : le rendre requis (ADR-0007 §Rejete).
- game2d duplique la boucle d'orchestration de game.ts (~120 l). Assume pour v1 ; extraction
  d'un "GameSession" partage = candidat P2 (docs/prompts/07).

### RESTE (-> docs/prompts/07-hardening-leftovers.md, pret a coller)
- Deep-scan NEEDS-DECISION : fader iQ ouvert par defaut = surprise sandbox R5 ; cross-ref
  loadLevel au boot ; flags morts isDantePrimary/isClockMaster ; garde map vide dans recommend ;
  couverture de tests du tier scene/orchestration.
- 2D : support sandbox + polish overlap des labels a gauche ; extraction GameSession partagee.
- getElementById(...)! sans garde (hardening mineur).

## RUN AUTONOME LONG (2026-07-18, ~5h) — FOCUS & PATCH (le coeur, Beat 3)

Source de verite : docs/TekPractice_Interaction-and-Assets.md (relue en ouverture).
Contexte assume : le drag-to-connect 3D etait l'anti-pattern rejete par la spec §1 —
autorisation d'Oscar de faire LE gros build et de REMPLACER le drag (pas de double flow).

### FAIT (gates verts a chaque commit : tsc + vitest + e2e + build)
1. **focusMachine** (commit d1b08b0) — state machine PURE Ensemble<->Focus + curseur
   selection + cable en main. 15 tests unitaires. ADR-0008.
2. **CameraRig + FocusPatch + wiring** (ea9ed39) — vol eased 300 ms (arc le plus court),
   auto-frame du panneau -Z, reduced-motion = cut sec ; double-clic focus (corps des
   devices rendus pickables, glb inclus), clic port = cable en main (survit au retour
   Ensemble), clic droit / clic vide = retour, Esc = annulation du plus recent, clavier
   Tab/Entree/fleches (sans voler le focus DOM du HUD), contextmenu supprime ; glow
   outline des devices compatibles + dim des ports incompatibles via canConnect injecte ;
   connexion refusee => le cable REVIENT en main (teach-then-retry). Interaction.ts (drag)
   SUPPRIME ; snap.ts reduit au type PortPoint ; __audioSim: +deviceScreen/view/glowCount/
   hints, -snap. La camera ne mute jamais le graphe (test statique).
3. **Indices mode-gated** (828d821) — spec §3 : ON Learn/Levels, OFF DUR en Examen
   (glow + tint dry-run du cable), toggle "Indices ON/OFF" en Sandbox (defaut ON).
   FIX AUDITE : le board 2D (Render2D) coupait PAS son glow ok/bad en examen — corrige
   (le port arme reste visible : c'est de l'etat, pas un indice).
4. **Gates spec §8** (8bbacd4) — e2e "A1 cable UNIQUEMENT au double-clic + focus + clics
   ports, ZERO zoom manuel -> win" (vraie souris, zero dispatch programmatique, helper
   Esc-recovery qui modelise un vrai utilisateur qui se rate) ; e2e "examen : rien ne glow"
   (3D focus + ensemble, et 2D) + controle inverse en Levels ; test statique d'architecture
   (les modules camera n'importent pas ConnectionGraph, focusMachine 100% pure, aucun
   vocabulaire de regle reimplemente en scene) ; verification par screenshots headless.
   Lisibilite du glow : overlay translucide sur les corps + CARTELS teintes (un mic de
   20 px a distance Ensemble ne porte pas un outline seul) — verifie a l'image.

### DECISIONS (ADR-0008)
- Politique Esc : annule l'engagement le plus recent (cable d'abord, focus ensuite) ;
  clic droit / clic vide reviennent en Ensemble AVEC le cable (le flow §1 etape 4).
- Connexion refusee : l'intent part quand meme (le toast R1-R3 EST la lecon), puis
  repickup — l'eleve reessaie sans re-cliquer la source.
- Auto-frame : panneau -Z (la ou DeviceSpawner pose les ports), alpha=-pi/2, beta 1.15,
  radius 2.6x le rayon englobant. Tiendra tel quel quand les .glb remplacent les boites.
- Touch : mapping documente (double-tap/1 doigt/pincement/2 doigts), implementation
  tactile reelle = plus tard (stubs pointes dans l'ADR §5).

### 4c — R8 sample-rate : DEJA LIVRE lors d'un run precedent (ADR-0007, commit 7e38e17).
Rien a refaire ; le prompt docs/prompts/02 est obsolete (garde pour trace).
### SKIP assume : patchbay (ADR-0002) — attend toujours la decision d'Oscar.

### RESTE / EN COURS
- Agent designer lance sur le polish tokens (glow/dim/cable tenu/fly) — verdict en fin de run.
- Voir docs/prompts/08-focus-patch-leftovers.md pour tout ce qui n'est pas fini.

### 4a — Verdict polish designer (fin de run)
Agent designer livre : groupe TOKENS.focus (glowOutline=accent, glowOutlineWidth 0.012,
glowOverlayAlpha 0.3 harmonise, dimVisibility 0.35, heldCableRadius 0.02, flyMs 300) ;
FocusPatch/CableRenderer/CameraRig consomment les tokens (zero constante visuelle locale) ;
cable committed inchange ; design-system.md documente. Verifie par moi : tsc + 164 vitest +
32 e2e + build verts, screenshot de controle OK (cartels compatibles teintes, autres blancs).
Reste mineur (log, pas bloquant) : le cable tenu reste discret en vue Ensemble sur les
petits devices eloignes — l'information passe par le glow des cartels ; a re-regarder si
Oscar le veut plus present (token heldCableRadius, 30 s de reglage).
### 4b — Perf : caps existants juges suffisants (24 devices sandbox, PULSE_CAP 12,
CableBudget) ; applyHints O(instances x ports) OK a cette echelle — pistes chiffrees dans
docs/prompts/08 §E, pas d'optimisation a l'aveugle.

## PASSE DE CORRECTION VISUELLE (2026-07-18, apres Focus & Patch)

Analyse d'Oscar sur capture A1 : modeles douteux, blobs noirs, echelles/orientations
incoherentes, cables flottants, HUD qui chevauche. Deux agents (developer: chargement/
echelle/ancrage ; designer: HUD/layout/materiaux) — les deux tues par des erreurs infra
en plein vol, travail repris et FINI par moi. Diagnostics d'abord, screenshots a chaque fix.

### DIAGNOSTIC GLB (item 1)
- Les 52 glb chargent tous (0 echec). Runtime expose desormais window.__audioSim.assets()
  (glb|placeholder par instance) + console.info [assets] par device avec le scale applique.
- DECOUVERTE MAJEURE : aucun glb ne contient d'empties port_* (contrairement a ASSET_LOG)
  -> REVIEW-ME §10. Ancrage de repli : grille sur la face -Z du modele normalise.
- Echelles corrigees au chargement (table REAL_SIZE_M depuis assets-source/notes.md) :
  rio x2.444, ql1 x1.319, k12/dbr12 x1.44 (et poses au sol — ils flottaient a 10 cm),
  sm58 x0.796, sm57 x0.831. Origines recentrees, orientation panneau -Z.

### CORRIGE
1. Chargement : diagnostic + normalisation (echelle 1:1 reelle, ground, centre, orientation).
2. Blobs noirs : c'etaient (a) les materiaux glb quasi-noirs -> eclaircis via gltf-transform
   (7 glb A1, anthracite lisible, metallic<=0.4) ; (b) l'ombre de contact qui flottait pour
   les devices poses en hauteur (mic sur pied a y=1.35) -> blob compense au sol.
3. Echelle/orientation : cf. normalisation. Micros a 16 cm REELS (petits en Ensemble —
   assume, les cartels identifient ; la camera Focus les cadre parfaitement).
4. Cables ANCRES : markers/pick-spheres/labels re-ancres sur le modele au chargement +
   resync portPoints + re-render des cables existants (modelReady). Screenshot : la
   catenaire SM58->Rio part du mic sur pied et atterrit DANS la face avant du Rio.
5. Ports : positions sur le modele (grille -Z reelle) ; look/hover = passe designer B
   (prompts/08 §A toujours ouvert).
6. Layout A1 refait (data) : mics a l'avant (SM58 POSE sur le pied K&M a y=1.35),
   stagebox centre-arriere, console centre-avant, enceintes reparties. Rien hors-champ.
7. HUD : panneau borne (max-height 60vh + scroll), translucide premium (backdrop-blur),
   responsive <900px en bandeau haut. Ne recouvre plus la scene, jamais coupe.

### FIXES DE PICKING decouverts par les gates (post-agents)
- deviceUnderPointer : multiPick + centre-le-plus-proche-du-rayon (un mic POSE sur son
  pied etait infocusable — le pied gagnait toujours le pick simple).
- bodyCenter : le centre de visee exclut ombre/cartels (les bounds de hierarchie visaient
  le milieu du pied, pas le mic).
- Double-clic atterrissant sur un port = « plonge sur ce device » : annule le pickup
  accidentel du 1er clic de la paire puis focus le proprietaire (sans ca, un device dont
  la pick-sphere couvre le corps — un mic — ne pouvait JAMAIS etre focus au double-clic).
- e2e : helper assetsSettled() — les glb atterrissent en async et re-ancrent les ports ;
  interagir pendant l'atterrissage etait une course (3 tests flaky -> deterministes).

### ETAT : tsc + 164 vitest + 32 e2e + build VERTS. Screenshots avant/apres dans le
scratchpad de session (before-*/after-*). RESTE (re-modelisation, passe separee) :
REVIEW-ME §10 + nits (micros minuscules en Ensemble, recettes K12/DBR12 identiques,
visuels de connecteurs sur cables).

## RUN SOURCING 3D (2026-07-18) — spec docs/TekPractice_3D-Model-Sourcing.md

CONTRAINTE DECOUVERTE EN OUVERTURE : zero telechargement non-assiste possible (MCP Sketchfab
sans cle, API Poly Pizza 401, hotlink 403, pas de cles IA en .env) -> le run s'est reorganise
en (a) RIG PASS complet sur nos 24 glb + (b) file de sourcing recherchee et verifiee.

### (a) RIG PASS — 22/24 devices LIVRES (commits par device, pushes)
- Pipeline neuf : tools/blender/rig_empties.py (Blender 5.1 headless, scene purgee, export
  AVEC empties) + rig-all.mjs (placements par panneau FONCTIONNEL, verification que les
  empties survivent a l'export, Draco via API gltf-transform — PAS optimize(), qui prune
  les nodes sans mesh, c.-a-d. exactement nos empties ; manifest etendu au schema spec).
- DeviceSpawner prefere desormais les empties port_* (fallback grille -Z) — commit fb93831.
- Placements reels : XLR a la BASE des 5 micros ; I/O au DOS des enceintes/console/racks ;
  face AVANT du Rio (rangees XLR) et du mic ISA One ; patchbay TT devant + DB25 derriere.
- Preuve visuelle : marqueur du SM58 a la base du micro sur son pied (screenshot).
- 2 sans ports (km-210-9, yellowtec-mika) -> skip normal. REVIEW-ME §10 (glb sans empties)
  est CLOS pour le present ; la regle vaut pour tout futur asset (le verifier casse le rig
  si un port manque).
- Gates a chaque lot : 164 vitest + 32 e2e + build verts.

### (b) SOURCING — 3 agents de recherche, licences verifiees a la source
- Methode robuste : pages Sketchfab = SPA vides pour fetch -> licence lue sur l'API
  officielle v3 par modele (la donnee de la page). Poly Pizza lu sur pages /m/.
- Resultat : 5 EXACTS CC-BY (QSC K12.2, SM58, SM57, U87, pied K&M) + 1 quasi-exact
  (Genelec 8340A) + ~12 generiques solides + 7 introuvables (-> IA/modeler).
- ZERO CC0 pertinent sur tout le balayage -> tout sera CC-BY avec attribution (CREDITS.md).
- 6 modeles ecartes pour licence NC/ND/SA (listes, a ne jamais reprendre).
- Livrables internes (gitignores) : assets-source/SOURCING-QUEUE.md (file consolidee,
  3 debloquages Oscar) + CREDITS.md (squelette d'attribution).

### RESTE
1. Oscar : login Sketchfab OU cle API MCP -> je telecharge/rig les 15+ candidats tout seul.
2. Oscar : 2 clics Poly Pizza (ql1 generique, re50).
3. Optionnel : cle Tripo/Meshy en .env -> generation des 7 introuvables depuis les photos.
4. Le rig pass re-tournera tel quel sur chaque nouveau fichier (pipeline prouve).

## RUN SOURCING — PHASE TELECHARGEMENT (cle Sketchfab fournie par Oscar)

Pipeline complet OPERATIONNEL : fetch-sketchfab.mjs (API v3 + token .env, meta.json
licence/auteur a la source) -> rig-all --src (Blender: roty/decimate/empties) ->
textures webp 1024 + Draco (ALL_EXTENSIONS) -> manifest download-ccby + CREDITS.md auto.

LIVRE (18 devices remplaces par des modeles CC-BY reels, commits par device) :
- 5 EXACTS + 1 quasi : SM58 (port deplace a l'extremite XLR du mic couche, face '+x'
  ajoutee au rig), SM57, U87 (245k->4k tris), QSC K12.2 (36KB !), pied K&M, Genelec 8340A.
- 12 generiques : SM7B->re20, wedge->dbr12, mixer 8 faders->axia-iq, rack LCD->scoop5,
  Zoom H6->scoopy+, warning light->litt, preampli->isa-one, rack Midiverb->hd-io+ocx-hd,
  tour PC->hdx+playout, ampli casque->m905.
- Tailles : 19-372 KB par glb (textures 1024 webp). Verification visuelle : vrai SM58
  sur vrai pied, K12.2 avec ports au dos, D1 en materiel realiste.
- TOUTES les licences relues a l'API au moment du download (CC Attribution) ;
  attribution auto dans CREDITS.md ; trademark: branded-internal (logos textures) —
  debranding = passe commerciale.

RESTE : ev-re50 + ql1 generique (Poly Pizza, 2 clics Oscar) · 6 proceduraux conserves
(rio, ql1, 9625, mogami, mika, dbr12-procedural remplace en fait — reste rio/ql1/9625/
mogami/mika) · nit : le glb du pied K&M contient 2 variantes (depliee+repliee) -> retirer
la repliee a la prochaine passe Blender.

## RUN ENVIRONNEMENTS 3D (2026-07-18) — specs Set-System (phase decor) + 3D-Model-Sourcing

- Scan API Sketchfab 4 espaces (CC0/CC-BY only, NC/ND ecartes d'office), vignettes jugees
  a l'image. 3 salles retenues + 1 trou honnete (studio : rien de realiste en CC -> blanc
  conserve + queue, la regle de repli du run).
- Pipeline salles : env-scan (candidats+licences) / env-pack (fetch+meta) / env_prep.py
  (Blender : echelle en METRES par largeur reelle, ground/centre, decimation <=100k) ->
  webp1024+Draco. Poids finaux : live 661 KB, theatre 376 KB, radio 971 KB (budget web OK).
- Integration ADR-0009 : Environment.set {glb, position, rotationY, scale} — la SALLE
  s'ancre autour de l'origine du materiel (praticable live : y=-1.05) ; chargement
  non-bloquant, ground blanc retire seulement si la salle charge ; preset blanc ajoute
  (secours selectionnable). Deviation spec loggee : `set` au lieu de `backdrop` (deja pris).
- Verifie a l'image et ITERE : plateau (matos SUR le praticable, truss autour), radio
  (camera resserree DANS la cabine apres 2 iterations, repack 6->9 m), theatre (noir de
  scene realiste — flag couleur). Screenshots dans le scratchpad (env2-*).
- Gates verts a chaque commit : 164 vitest + 32 e2e (dont A1 zero-zoom JOUE DANS la salle
  de concert) + build. Commits par espace + integration. CREDITS/manifest par salle.
- RESTE : studio realiste (queue IA/modelisation), teinte theatre, echelle wedge,
  placement fin par device = passe Set Editor (spec §4).
