import { AIProvider } from './provider';

export class FallbackLocalProvider implements AIProvider {
  name = 'Synapse Local Intelligence (Built-in)';

  async summarize(text: string): Promise<string> {
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 15);
    if (sentences.length === 0) {
      return '• Note is brief. Add more content to generate a comprehensive summary.';
    }

    const keyPoints = sentences.slice(0, 3).map((s) => `• ${s.trim()}`);
    return `### ⚡ Key Takeaways\n${keyPoints.join('\n')}\n\n*Generated with Synapse Assistant*`;
  }

  async expand(bullet: string): Promise<string> {
    const cleaned = bullet.replace(/^[•\-\*\d\.\s]+/, '').trim();
    return `${cleaned}. Expanding further: this concept forms a vital building block in the knowledge architecture, establishing direct connections across notes, improving contextual recall, and providing actionable clarity for the entire workspace.`;
  }

  async improve(text: string): Promise<string> {
    const cleaned = text.trim();
    if (!cleaned) return text;
    // Basic local capitalization and punctuation normalization
    const normalized = cleaned
      .replace(/\s+/g, ' ')
      .replace(/([.!?]\s*)([a-z])/g, (_, p1, p2) => p1 + p2.toUpperCase());
    return `${normalized.charAt(0).toUpperCase() + normalized.slice(1)}\n\n*(Refined with Synapse Assistant)*`;
  }

  async actionItems(text: string): Promise<string> {
    const sentences = text.split(/[.!?\n]+/).filter((s) => s.trim().length > 10);
    const tasks = sentences.slice(0, 4).map((s) => `- [ ] Follow up on: ${s.trim()}`);
    if (tasks.length === 0) {
      return '- [ ] Review document\n- [ ] Outline next milestones\n- [ ] Align with team';
    }
    return `### ✅ Action Items\n${tasks.join('\n')}\n\n*Generated with Synapse Assistant*`;
  }

  async chat(prompt: string, context?: string): Promise<string> {
    const subject = context ? `context regarding "${context.slice(0, 50)}..."` : 'your query';
    return `**Synapse Assistant Response:**\n\nI processed your request ("${prompt}") considering ${subject}. To unlock deep generative reasoning and real-time completions, configure your \`GEMINI_API_KEY\` in \`.env\`.`;
  }

  async generateTemplate(prompt: string): Promise<{ title: string; content: string }> {
    return {
      title: prompt.slice(0, 30) || 'Custom Template',
      content: `# ${prompt}\n\n> Author: {{user}} | Date: {{date}}\n\n## 1. Overview & Objectives\nDescribe the primary goals and context here.\n\n## 2. Key Milestones\n- Milestone 1: Initialization\n- Milestone 2: Core Execution\n\n## 3. Action Items\n- [ ] Task A\n- [ ] Task B`,
    };
  }
}
