import { AIProvider } from './provider';

export class GroqProvider implements AIProvider {
  name = 'Groq Cloud';
  private apiKey: string;
  private model: string;

  constructor(
    apiKey = process.env.GROQ_API_KEY || '',
    model = process.env.GROQ_MODEL || 'llama-3.1-70b-versatile'
  ) {
    this.apiKey = apiKey;
    this.model = model;
  }

  private async chat(systemPrompt: string, userPrompt: string): Promise<string> {
    if (!this.apiKey) throw new Error('Groq API Key not configured in environment.');

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Groq API Error: ${err}`);
    }

    const data = await res.json();
    return data.choices[0]?.message?.content?.trim() || '';
  }

  async summarize(text: string): Promise<string> {
    return this.chat('You are an expert workspace assistant. Summarize the text concisely with key takeaways and action items in markdown.', text);
  }

  async expand(bullet: string): Promise<string> {
    return this.chat('Expand the provided bullet point into a well-crafted, informative paragraph.', bullet);
  }

  async generateTemplate(prompt: string): Promise<{ title: string; content: string }> {
    const content = await this.chat('Generate a clean, reusable document template in markdown for the following request. Include variable placeholders like {{date}} and {{user}}.', prompt);
    return {
      title: prompt.slice(0, 40),
      content,
    };
  }
}
