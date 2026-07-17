/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Clé API du coach IA (ADR-0006) — DÉFÉRÉE : absente = coach désactivé proprement. */
  readonly VITE_AI_COACH_KEY?: string
  /** 'anthropic' (défaut). Gemini/Ollama : voir docs/prompts/05-ai-coach.md. */
  readonly VITE_AI_COACH_PROVIDER?: string
  /** Modèle Anthropic — défaut claude-opus-4-8. */
  readonly VITE_AI_COACH_MODEL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
