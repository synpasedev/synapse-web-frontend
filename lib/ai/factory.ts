import { AIProvider } from './provider';
import { OllamaProvider } from './ollama';
import { GroqProvider } from './groq';
import { FallbackLocalProvider } from './fallback';

export function getAIProvider(): AIProvider {
  const providerType = (process.env.AI_PROVIDER || '').toLowerCase();

  if (providerType === 'groq' && process.env.GROQ_API_KEY) {
    return new GroqProvider();
  }

  if (providerType === 'ollama') {
    return new OllamaProvider();
  }

  // If user configured GROQ_API_KEY without setting AI_PROVIDER
  if (process.env.GROQ_API_KEY) {
    return new GroqProvider();
  }

  return new FallbackLocalProvider();
}
