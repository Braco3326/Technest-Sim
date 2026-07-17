# ADR-0006 — Coach IA temps-réel (Beats 2/4) : provider, ancrage, socratique

- **Status:** Accepted (run autonome, 2026-07-17)
- **Beat servi:** 2 (mentor qui parle au bon moment) + 4 (jamais de honte, on explique le pourquoi)
- **Distinct de:** `content/coach/tips.json` (les « Conseils d'Oscar » AUTHORÉS restent la voix
  pédagogique de référence ; le coach IA est une couche EN PLUS, à la demande, via « Pourquoi ? »).

## Décision 1 — Cloud d'abord (Anthropic), local en P2

| Option | Pour | Contre |
|---|---|---|
| **Cloud (Anthropic, retenu)** | Zéro installation pour un étudiant BTS sur son laptop ; qualité de français/pédagogie ; latence ~1-3 s acceptable pour un bouton « Pourquoi ? » ; le SDK officiel supporte le navigateur | Clé API à fournir ; coût par requête ; dépend du réseau |
| Cloud (Gemini) | Free tier généreux | Deuxième SDK à maintenir ; l'interface `AiProvider` le permet plus tard sans rien changer d'autre |
| Local (Ollama / MLX) | Gratuit, hors-ligne, privé | Il faudrait installer + télécharger un modèle de plusieurs Go sur chaque machine étudiante — rédhibitoire pour le public cible ; qualité de français des petits modèles insuffisante pour du socratique fiable |

**Retenu : cloud Anthropic** (`claude-opus-4-8` par défaut, surchargeable par
`VITE_AI_COACH_MODEL`). Le choix est isolé derrière `AiProvider { complete(system, user) }` :
ajouter Gemini ou Ollama = UN fichier provider, zéro changement d'interface
(voir docs/prompts/05-ai-coach.md).

Contraintes API respectées (skill claude-api) : SDK officiel `@anthropic-ai/sdk`
(`dangerouslyAllowBrowser` — clé personnelle de l'utilisateur, app locale, pas de secret
partagé), **pas de `temperature`** (rejeté en 400 sur Opus 4.8), pas de prefill assistant.

## Décision 2 — Clé DÉFÉRÉE, dégradation propre

`VITE_AI_COACH_KEY` lue depuis `.env` (jamais commitée — `.gitignore` couvre déjà `.env`).
Absente → `createAiCoach()` retourne un coach `status: 'unconfigured'` : le bouton
« Pourquoi ? » n'apparaît pas, `explain()` résout `{ kind: 'unavailable' }`, **jamais de
throw, jamais de crash**. Le jeu entier fonctionne sans clé.

## Décision 3 — Ancrage (RAG) STRICT, validé en sortie

Le coach ne voit QUE un pack de contexte construit par `buildGrounding()` (fonction PURE,
même discipline que logic/*) : la règle déclenchée (id/title/teach du catalog), les devices
et ports IMPLIQUÉS (specs catalog), le résumé du graphe courant, la readiness de la règle.
Il n'a accès à rien d'autre — pas de web, pas de mémoire.

La réponse est ensuite VALIDÉE par `validateReply()` (pure) :
1. au moins une citation `[Rn]` ou `[catalog:<device-id>]` (il cite sa source) ;
2. toute citation `[Rn]` doit exister dans le catalog ; `[catalog:x]` doit être un device
   du pack de contexte ;
3. aucun id de device du catalog HORS pack ne doit apparaître dans le texte (il ne parle
   jamais de matériel absent du montage).
Réponse invalide → rejetée → l'UI garde le `teach` authoré (dégradation, pas de mensonge).

## Décision 4 — Socratique + silence en examen

Le system prompt impose : expliquer le POURQUOI (physique/métier), poser 1-2 questions
guidantes, **ne JAMAIS nommer le port/geste exact qui corrige** (teach, don't cheat).
En mode Examen le coach est muet par DOUBLE garde : `askCoach()` court-circuite avant
tout appel réseau (`reason: 'exam'`), et game.ts ne câble même pas le bouton.

## Rejetés
- Coach proactif qui commente chaque geste : intrusif, coûteux, anti-Beat 2 (le mentor
  parle au bon moment — ici, quand ON lui demande).
- Backend proxy pour cacher la clé : hors scope YAGNI (pas de comptes/backend) ; la clé
  est celle de l'utilisateur, en local.
- Laisser le LLM répondre sans validation de sortie : risque d'invention de matériel/règles
  — inacceptable pour un outil de révision d'examen.
