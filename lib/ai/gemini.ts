import { AIProvider } from './provider';

export class GeminiProvider implements AIProvider {
  name = 'Google Gemini';
  private apiKey: string;
  private model: string;

  constructor(
    apiKey = process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.GOOGLE_AI_API_KEY ||
      '',
    model = process.env.GEMINI_MODEL || 'gemini-3.6-flash'
  ) {
    this.apiKey = apiKey.trim();
    this.model = model.trim();
    this.name = `Google Gemini (${this.model.replace('models/', '').replace(/^gemini-/, '')})`;
  }

  private async callGemini(systemPrompt: string, userPrompt: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error(
        'Gemini API Key is not configured. Please set GEMINI_API_KEY or GOOGLE_API_KEY in your .env file.'
      );
    }

    const candidateModels = Array.from(
      new Set([
        this.model,
        'gemini-3.6-flash',
        'gemini-3.5-flash',
        'gemini-3.5-flash-lite',
        'gemini-2.5-flash',
      ])
    ).filter(Boolean);

    let lastError: Error | null = null;

    for (const modelToTry of candidateModels) {
      try {
        const cleanModel = modelToTry.replace(/^models\//, '');
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
          cleanModel
        )}:generateContent?key=${encodeURIComponent(this.apiKey)}`;

        const payload = {
          system_instruction: {
            parts: [{ text: systemPrompt }],
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: userPrompt }],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2048,
          },
        };

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errorText = await res.text();
          let parsedMessage = errorText;
          try {
            const errorJson = JSON.parse(errorText);
            parsedMessage = errorJson.error?.message || errorText;
          } catch {}

          // If model is deprecated or not found (404) or busy (503), try next candidate
          if (res.status === 404 || res.status === 503) {
            lastError = new Error(`Gemini (${cleanModel}): ${parsedMessage}`);
            continue;
          }

          throw new Error(`Gemini API Error (${res.status}): ${parsedMessage}`);
        }

        const data = await res.json();
        const candidate = data.candidates?.[0];
        const text = candidate?.content?.parts?.[0]?.text?.trim();

        if (text) {
          return text;
        }
      } catch (err: any) {
        lastError = err;
        if (candidateModels.indexOf(modelToTry) === candidateModels.length - 1) {
          throw err;
        }
      }
    }

    throw lastError || new Error('All Gemini candidate models failed to respond.');
  }

  async summarize(text: string): Promise<string> {
    return this.callGemini(
      'You are a workspace knowledge assistant. Summarize the provided document or notes with a concise overview, key takeaways, and relevant bullet points in clean GitHub markdown.',
      text
    );
  }

  async improve(text: string): Promise<string> {
    return this.callGemini(
      'You are a professional editor. Polish and improve the following text: fix spelling and grammatical errors, refine sentence flow and tone, and enhance clarity while strictly preserving the original meaning. Return only the improved text in clean markdown without meta commentary.',
      text
    );
  }

  async actionItems(text: string): Promise<string> {
    return this.callGemini(
      'You are an executive assistant. Extract all explicit and implied action items, tasks, and follow-ups from the text into a clean markdown checklist (- [ ] task). If none exist, suggest 2-3 logical next steps based on the context.',
      text
    );
  }

  async expand(bullet: string): Promise<string> {
    return this.callGemini(
      'You are a creative thinking partner and technical writer. Elaborate on the provided bullet point or thought into a rich, structured, informative paragraph with concrete context in markdown.',
      bullet
    );
  }

  async chat(prompt: string, context?: string): Promise<string> {
    const systemPrompt = context
      ? `You are Synapse AI, an intelligent workspace copilot. Use the following note context to answer the user's request accurately:\n\n=== NOTE CONTEXT ===\n${context}\n====================`
      : 'You are Synapse AI, a smart, helpful workspace copilot assisting the user with their notes, documents, and ideas.';

    return this.callGemini(systemPrompt, prompt);
  }

  async generateTemplate(prompt: string): Promise<{ title: string; content: string }> {
    const raw = await this.callGemini(
      'You are a document architecture expert. Generate a clean, reusable document template in markdown for the following request. Include realistic placeholders like {{date}} and {{user}}. Put the title on the first line starting with #.',
      prompt
    );

    const firstLineMatch = raw.match(/^#\s+(.+)$/m);
    const title = firstLineMatch ? firstLineMatch[1].trim() : prompt.slice(0, 40);

    return {
      title,
      content: raw,
    };
  }
}
