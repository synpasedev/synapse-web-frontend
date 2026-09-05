export interface TemplateVariables {
  title?: string;
  user?: string;
  workspace?: string;
  date?: string;
  time?: string;
}

export function parseTemplateString(text: string, vars: TemplateVariables = {}): string {
  const now = new Date();
  const defaultDate = now.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const defaultTime = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const replacements: Record<string, string> = {
    '{{date}}': vars.date || defaultDate,
    '{{time}}': vars.time || defaultTime,
    '{{title}}': vars.title || 'Untitled Note',
    '{{user}}': vars.user || 'Architect',
    '{{workspace}}': vars.workspace || 'Workspace',
  };

  let result = text;
  for (const [key, value] of Object.entries(replacements)) {
    result = result.replaceAll(key, value);
  }

  return result;
}
