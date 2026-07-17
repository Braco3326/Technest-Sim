/**
 * Provider Anthropic (ADR-0006 décision 1) — SDK officiel, appel navigateur.
 * `dangerouslyAllowBrowser` est assumé : la clé est CELLE de l'utilisateur,
 * lue depuis son .env local, jamais commitée ni partagée.
 * Contraintes Opus 4.8 : pas de temperature/top_p (400), pas de prefill.
 */
import Anthropic from '@anthropic-ai/sdk'
import type { AiProvider } from './AiCoach'

export const DEFAULT_MODEL = 'claude-opus-4-8'

export class AnthropicProvider implements AiProvider {
  private client: Anthropic
  constructor(
    apiKey: string,
    private model: string = DEFAULT_MODEL,
  ) {
    this.client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
  }

  async complete(system: string, user: string): Promise<string> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 400,
      system,
      messages: [{ role: 'user', content: user }],
    })
    return response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
  }
}
