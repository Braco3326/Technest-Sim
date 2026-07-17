# PROMPT — Coach IA : suites possibles (après ADR-0006)

Colle un des blocs ci-dessous dans une session Claude Code ouverte dans D:\teknest\tekpractice.
Lis d'abord : docs/adr/0006-ai-coach.md, src/ai/*, tests/ai/aiCoach.test.ts.

---

## A. Provider Gemini (si Oscar préfère le free tier Google)

Respecte CLAUDE.md et ADR-0006 : le provider est UN fichier derrière `AiProvider`.
1. Crée src/ai/gemini.ts : classe GeminiProvider implements AiProvider, SDK officiel
   `@google/genai`, modèle flash récent, clé passée au constructeur. Pas de temperature
   exotique, max ~400 tokens de sortie.
2. Dans src/ai/index.ts, branche `provider === 'gemini'` sur GeminiProvider.
3. Tests : createAiCoach({key, provider:'gemini'}).status === 'ready' ; le GroundedCoach
   ne change PAS (l'ancrage/validation est déjà testé provider-agnostique).
4. .env.example : documente VITE_AI_COACH_PROVIDER=gemini.

## B. Provider local Ollama (hors-ligne, P2 — voir tableau ADR-0006)

1. src/ai/ollama.ts : OllamaProvider implements AiProvider — fetch POST
   http://localhost:11434/api/chat (pas de SDK nécessaire, API locale), modèle
   configurable (VITE_AI_COACH_MODEL, ex. qwen2.5:7b-instruct).
2. Échec de connexion → throw (le GroundedCoach le transforme déjà en 'error').
3. Ajoute une ligne dans l'ADR-0006 : local devient disponible, cloud reste le défaut.

## C. Durcissements (dans l'ordre de valeur)

1. **Lazy-load du SDK** : `@anthropic-ai/sdk` est bundlé même sans clé. Fais de
   src/ai/anthropic.ts un `await import()` dans createAiCoach (qui devient async,
   appelé une fois au boot de game.ts) — ou un provider proxy qui importe au premier
   explain(). Gate : npm run build, taille du chunk principal en baisse sans clé.
2. **Anti-spam** : un seul explain() en vol à la fois + cooldown 10 s par ruleId
   (Map dans game.ts, pas dans la couche ai/ qui reste pure).
3. **Readiness dans le pack** : game.ts passe déjà par buildGrounding(…, readinessLine?) —
   alimente-le avec ruleScores() de src/ui/readiness.ts (« l'élève a déjà raté R2 4 fois »)
   pour des questions mieux calibrées. Test : la ligne apparaît dans groundingToContext.
4. **e2e** : avec une fausse clé (VITE_AI_COACH_KEY=test + provider mocké par
   page.route sur api.anthropic.com), vérifier : bouton « Pourquoi ? » présent sur un
   toast d'erreur hors examen, ABSENT en mode examen, réponse rendue dans le toast.

GATES habituels : validate:catalog · vitest · playwright · build. Commit atomique par bloc.
