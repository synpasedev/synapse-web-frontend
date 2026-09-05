import { AIProvider } from './provider';

export class OllamaProvider implements AIProvider {
  name = 'Ollama Local';
  private baseUrl: string;
  private model: string;

  constructor(
    baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    model = process.env.OLLAMA_MODEL || 'llama3'
  ) {
    this.baseUrl = baseUrl;
    this.model = model;
  }

  private async generate(systemPrompt: string, userPrompt: string): Promise<string> {
    const res = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        prompt: `${systemPrompt}\n\nUser: ${userPrompt}\n\nAssistant:`,
        stream: false,
      }),
    });

    if (!res.ok) throw new Error(`Ollama Error: ${res.statusText}`);
    const data = await res.json();
    return data.response.trim();
  }

  async summarize(text: string): Promise<string> {
    return this.generate('You are an expert executive assistant. Summarize this note in 3 concise bullet points with key takeaways.', text);
  }

  async expand(bullet: string): Promise<string> {
    return this.generate('Expand this bullet point into a rich, structured paragraph for documentation.', bullet);
  }

  async generateTemplate(prompt: string): Promise<{ title: string; content: string }> {
    const res = await this.generate('Create a clean markdown document template with headings and bullet points for this topic.', prompt);
    return {
      title: prompt.slice(0, 40),
      content: res,
    };
  }
}
