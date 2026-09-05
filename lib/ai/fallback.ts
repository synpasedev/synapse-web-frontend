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

  async generateTemplate(prompt: string): Promise<{ title: string; content: string }> {
    return {
      title: prompt.slice(0, 30) || 'Custom Template',
      content: `# ${prompt}\n\n> Author: {{user}} | Date: {{date}}\n\n## 1. Overview & Objectives\nDescribe the primary goals and context here.\n\n## 2. Key Milestones\n- Milestone 1: Initialization\n- Milestone 2: Core Execution\n\n## 3. Action Items\n- [ ] Task A\n- [ ] Task B`,
    };
  }
}
