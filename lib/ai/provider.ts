export interface AIProvider {
  name: string;
  summarize(text: string): Promise<string>;
  expand(bullet: string): Promise<string>;
  generateTemplate(prompt: string): Promise<{ title: string; content: string }>;
}
