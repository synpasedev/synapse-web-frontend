import { AIProvider } from './provider';

export class GeminiProvider implements AIProvider {
  name = 'Google Gemini (1.5 Flash)';
  private apiKey: string;
  private model: string;

  constructor(
    apiKey = process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.GOOGLE_AI_API_KEY ||
      '',
    model = process.env.GEMINI_MODEL || 'gemini-1.5-flash'
  ) {
    this.apiKey = apiKey.trim();
    this.model = model.trim();
    if (this.model.includes('2.0')) {
      this.name = 'Google Gemini (2.0 Flash)';
    } else if (this.model.includes('pro')) {
      this.name = 'Google Gemini Pro';
    }
  }

  private async callGemini(systemPrompt: string, userPrompt: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error(
        'Gemini API Key is not configured. Please set GEMINI_API_KEY or GOOGLE_API_KEY in your .env file.'
      );
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      this.model
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
      throw new Error(`Gemini API Error (${res.status}): ${parsedMessage}`);
    }

    const data = await res.json();
    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text?.trim();

    if (!text) {
      throw new Error('Gemini returned an empty response. Please check your prompt.');
    }

    return text;
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
