export interface AIProvider {
  name: string;
  summarize(text: string): Promise<string>;
  expand(bullet: string): Promise<string>;
  improve(text: string): Promise<string>;
  actionItems(text: string): Promise<string>;
  chat(prompt: string, context?: string): Promise<string>;
  generateTemplate(prompt: string): Promise<{ title: string; content: string }>;
}
