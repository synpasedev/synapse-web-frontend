import { AIProvider } from './provider';
import { GeminiProvider } from './gemini';
import { GroqProvider } from './groq';
import { OllamaProvider } from './ollama';
import { FallbackLocalProvider } from './fallback';

export function getAIProvider(): AIProvider {
  const providerType = (process.env.AI_PROVIDER || '').toLowerCase();

  const hasGeminiKey = Boolean(
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_AI_API_KEY
  );

  if (providerType === 'gemini' || hasGeminiKey) {
    return new GeminiProvider();
  }

  if (providerType === 'groq' || process.env.GROQ_API_KEY) {
    return new GroqProvider();
  }

  if (providerType === 'ollama') {
    return new OllamaProvider();
  }

  return new FallbackLocalProvider();
}
