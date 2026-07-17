# REVIEW-ME — ce qui attend explicitement la relecture d'Oscar

> Mis à jour par les runs autonomes. Rien ici n'est un fait établi : ce sont
> des placeholders ou des jugements à valider/remplacer.

## 1. Contenu COACH — 13 placeholders "[À REMPLACER PAR OSCAR]"

`content/coach/tips.json` — la voix du mentor est la tienne, je n'ai RIEN
inventé comme vécu (chaque texte dit seulement ce qu'il doit devenir) :

| id | Déclencheur | Ce que le texte doit raconter |
|---|---|---|
| coach-r1..r8 | violation de la rule (1×/session, jamais en examen) | ton anecdote/réflexe perso par règle (R4 = « le piège classique du fantôme », Beat 2) |
| coach-low-moment | ≥3 jours actifs PUIS ≥2 jours d'absence (dashboard) | le message des soirs difficiles (Beat 4 : « j'étais persuadé d'échouer ») |
| coach-comeback | retour aujourd'hui après ≥2 jours de trou | zéro culpabilité, reprendre petit |
| coach-forgiveness | le streak a utilisé son pardon | « la régularité compte, pas la perfection » |
| coach-exam-low | score d'examen < 10 | le score est une carte, pas un verdict |
| coach-first-win | toute première victoire | « tu viens de faire une vraie prise de son propre » (Beat 1) |

Écris-les à la première personne, calmes, courts (2-3 phrases max — le tone
engine n'affiche jamais plus d'un message à la fois).

## 2. Jugements pédagogiques des runs de nuit (rappel)

- Mapping rules→BC/épreuves + tips techniques : `content/readiness.json` (ADR-0003)
- Barème examen 60/40 −0,5pt : `src/ui/exam.ts`
- Seuil sandbox guidée : 15 % de readiness globale (ADR-0004)
- Détection "moment bas" : ≥3 jours actifs puis ≥2 jours de gap (src/ui/coach.ts) — fenêtres à ajuster à ton feeling

## 3. Design (voir docs/design-system.md §"À relire")

- Accent bleu #2E5FE6 vs vert studio · intensité des ombres (0.20) · cartels de ports (hover-only ?)

## 4. ADR en attente de décision

- ADR-0002 (patchbay normalled/half-normalled) : Proposed — dis GO et le prompt
  docs/prompts/03 l'implémente.

## 5. Coach IA (ADR-0006) — a activer et relire

- **Pour l'activer** : copie `.env.example` en `.env` et mets ta cle Anthropic dans
  VITE_AI_COACH_KEY (console.anthropic.com). Sans cle, le bouton "Pourquoi ?" n'existe
  simplement pas — rien ne casse.
- **A relire (ta voix, pas la mienne)** : le system prompt dans `src/ai/prompt.ts` —
  ton, longueur (120 mots), et surtout la ligne socratique ("ne nomme jamais le port
  exact"). C'est LE texte qui pilote la pedagogie IA.
- **A decider** : modele (defaut claude-opus-4-8, qualite max ; claude-haiku-4-5 = ~5x
  moins cher si le volume devient un sujet — change VITE_AI_COACH_MODEL, rien d'autre) ;
  et provider Gemini/Ollama si tu preferes (docs/prompts/05-ai-coach.md, pret a coller).

## 6. Run enrichissement contenu (2026-07-17) — SUBSTANCE des niveaux

### Ce qui a été fait (pur content/, gates verts)
- **c1** (le vrai maillon mince : 4 connexions / 1 règle) → **duplex 4 étapes, 6 connexions** :
  captation terrain (RE50B→Scoopy+) · lien IP (codec↔codec) · retour studio (Scoop5→console)
  · **monitoring régie ajouté** (bus monitor console→2 Genelec). R7 (N-1 echo) reste l'étoile.
  Genelec 8030C ajouté à la salle radio (levels ["b1","c1","d1"]) — réutilisation d'un device
  existant, aucun fait inventé.
- **b1 / d1** : brief/objectif/successMessage réécrits pour rendre EXPLICITE leur structure
  multi-étapes réelle (b1 = signal path + discipline broadcast R5/R6 ; d1 = 3 sous-chaînes
  parallèles + 2 verrous d'état R4/R8). Pas de câble fabriqué : voir blocage ci-dessous.
- 2 nouveaux e2e multi-étapes (arc « partiel → violation → fix → win » joué en séquence).

### [À VÉRIFIER PAR OSCAR] — choix pédagogiques non tranchés en silence
- **c1 monitoring** : j'ai routé le bus monitor de la console vers les Genelec pour que
  l'opérateur entende l'échange. Confirme que c'est le bon point d'écoute (vs un aux dédié /
  un casque régie). Si tu préfères, on retire les 2 Genelec et c1 revient à 4 connexions.

### BLOCAGES rencontrés (skip + log, comme convenu)
1. **« Ajouter des niveaux » ≠ content-only.** La liste des niveaux est codée en dur à 3
   endroits (src/main.ts imports+LEVELS, src/ui/hud.ts nav, tools/validate-catalog.ts
   LEVEL_IDS). Un niveau data-seul est donc INJOIGNABLE et NON validé. C'est une dette qui
   contredit la promesse CLAUDE.md « nouveau niveau = data ». → **docs/prompts/06** lève ça
   (registry dynamique `import.meta.glob`) PUIS ajoute a2/b2/c2 (variantes d'environnement).
   Je n'ai PAS écrit de fichiers de niveaux morts (contenu non validé = anti-source-de-vérité).
2. **Profondeur multi-étapes de b1/d1 plafonnée par le catalog simplifié.** b1 : l'iQ ne
   modélise qu'une entrée micro + une entrée ligne pro, et la seule source ligne-pro de la
   salle est la console elle-même → aucun câble requis honnête à ajouter. d1 : le chemin
   d'enregistrement (préampli XLR-out → interface DB25-in) et le patchbay bay-1 ne sont pas
   câblables (pas de loom XLR→DB25 fan-in, pas de normalling patchbay modélisé). Fermer ce
   trou = soit un device catalog (loom XLR→DB25), soit ADR-0002 (normalling) — hors périmètre
   d'un run content-only. bay-1 reste sur le bureau comme promesse visible.

## 7. Run durcissement (2026-07-17 soir) — décisions en attente

### Deep-scan NEEDS-DECISION (aucune tranchée en silence — à toi)
1. **[À VÉRIFIER PAR OSCAR] Axia iQ `fader-in-mic-1` ouvert par défaut** : dans la sandbox,
   déposer une iQ seule déclenche R5 (« câble la tally ») sans aucun câble — cohérent avec
   la réalité broadcast (un studio est on-air par défaut) mais surprenant en bac à sable, et
   ça bloque le crédit « rig propre » tant que l'élève n'a pas trouvé le fader. Options :
   (a) garder ; (b) ne déclencher R5/R6 que si l'appareil a au moins un port connecté ;
   (c) fader fermé par défaut au catalog + le brief B1 dit « ouvre le fader ». Mon avis : (b).
2. **loadLevel ne fait que valider la forme** (zod), pas les références de requiredChain ni
   les logicChecks — ça vit dans validate-catalog (CI). Un niveau livré sans CI pourrait être
   injouable sans erreur claire. Option : passe de cross-ref légère au boot. Décision : garder
   la CI comme garde (statu quo) ou durcir ?
3. **Flags `isDantePrimary` / `isClockMaster` définis mais lus par AUCUN code** (P2 : redondance
   Dante, double-master). Garder comme intention documentée, ou retirer jusqu'à ce que le
   consommateur arrive ? (Lié à ADR-0007 §Rejeté double-master.)
4. **recommend() suppose `map.rules` non vide** — vrai avec R1–R8, mais pas de garde/temps.

### A11y — état
Contrastes AA vérifiés (ink 15:1, muted 6.4:1, accent/​info 4.6:1, error 4.5:1, warning **texte**
corrigé à 5.1:1 via warningInk). Focus clavier visible partout, cibles de routage à 24px,
toasts annoncés (aria-live), nav aria-current. Vérifié par screenshots headless.
Reste (non-bloquant) : le canvas 3D lui-même n'est pas navigable au clavier (le board 2D l'est,
lui — c'est le chemin accessible). Les `getElementById(...)!` sans garde = hardening mineur.

### 2D fallback — périmètre v1
Couvre les niveaux gradués a1–d1 (le cœur). **Sandbox reste 3D** (pas de spawn/étagères en 2D).
Petit défaut cosmétique : les labels des appareils à gauche passent sous le panneau objectifs.
game2d.ts duplique la boucle de game.ts (~120 l) — candidat à une extraction « GameSession »
partagée (docs/prompts/07).
