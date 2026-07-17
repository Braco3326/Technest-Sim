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
