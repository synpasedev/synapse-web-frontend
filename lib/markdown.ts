import { marked } from 'marked';

/**
 * Checks if a string contains typical Markdown formatting syntax.
 */
export function isMarkdown(text: string): boolean {
  if (!text || typeof text !== 'string') return false;

  // 1. Headings: `# Heading`, `## Heading`, etc.
  const hasHeadings = /(?:^|\n)\s*#{1,6}\s+\S+/.test(text);

  // 2. Bold / Italic: `**bold**`, `__bold__`, `***bold italic***`
  const hasBold = /\*\*[^\s*][^*]*\*\*|__(?!\s)[\s\S]+?__(?!\s)/.test(text);

  // 3. Strikethrough: `~~strike~~`
  const hasStrike = /~~[^\s~][^~]*~~/.test(text);

  // 4. Task list: `- [ ] ` or `- [x] ` or `* [ ] `
  const hasTaskList = /(?:^|\n)\s*[-*]?\s*\[[ xX]\]\s+/.test(text);

  // 5. Code blocks: ```language ... ```
  const hasCodeBlock = /```[\s\S]*?```/.test(text);

  // 6. Blockquote: `> quote`
  const hasBlockquote = /(?:^|\n)\s*>\s+\S+/.test(text);

  // 7. Horizontal rule: `---` or `***` on its own line
  const hasHr = /(?:^|\n)\s*[-*_]{3,}\s*(?:\n|$)/.test(text);

  // 8. Markdown links: `[title](url)`
  const hasMdLink = /\[[^\]]+\]\((?:https?:\/\/[^\s)]+|\/[^\s)]+)\)/.test(text);

  return (
    hasHeadings ||
    hasBold ||
    hasStrike ||
    hasTaskList ||
    hasCodeBlock ||
    hasBlockquote ||
    hasHr ||
    hasMdLink
  );
}

/**
 * Converts a Markdown string into clean, TipTap-compatible HTML.
 * Handles headings, bold, italic, lists, task items, blockquotes, code blocks, etc.
 */
export function markdownToHTML(markdown: string): string {
  if (!markdown || typeof markdown !== 'string') return '';

  let html = marked.parse(markdown, { async: false, breaks: true, gfm: true }) as string;

  // Transform marked task checkboxes into TipTap taskList & taskItem
  html = html.replace(
    /<li><input\s+([^>]*?)type="checkbox"([^>]*?)>\s*([\s\S]*?)<\/li>/gi,
    (_match, p1, p2, text) => {
      const attrs = `${p1} ${p2}`;
      const isChecked = /checked/i.test(attrs);
      const cleanText = text.trim();
      return `<li data-type="taskItem" data-checked="${isChecked}"><p>${cleanText}</p></li>`;
    }
  );

  // If a <ul> contains taskItem <li>s, change <ul> to <ul data-type="taskList">
  html = html.replace(
    /<ul>([\s\S]*?)<\/ul>/gi,
    (match, inner) => {
      if (/data-type="taskItem"/i.test(inner)) {
        return `<ul data-type="taskList">${inner}</ul>`;
      }
      return match;
    }
  );

  return html;
}

/**
 * Parses inline markdown symbols (***bold italic***, **bold**, *italic*, ~~strike~~, `code`)
 * into an array of TipTap/ProseMirror text nodes with proper marks.
 */
export function parseInlineMarkdownToNodes(text: string): Array<{ type: 'text'; text: string; marks?: Array<{ type: string }> }> {
  if (!text) return [];

  const tokenRegex = /(\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|__[^_\n]+__|\*[^*\n]+\*|_[^_\n]+_|~~[^~\n]+~~|`[^`\n]+`)/g;
  const parts = text.split(tokenRegex);
  const nodes: Array<{ type: 'text'; text: string; marks?: Array<{ type: string }> }> = [];

  for (const part of parts) {
    if (!part) continue;

    // Bold + Italic: ***text***
    if (part.startsWith('***') && part.endsWith('***') && part.length > 6) {
      nodes.push({
        type: 'text',
        text: part.slice(3, -3),
        marks: [{ type: 'bold' }, { type: 'italic' }],
      });
    }
    // Bold: **text** or __text__
    else if (
      (part.startsWith('**') && part.endsWith('**') && part.length > 4) ||
      (part.startsWith('__') && part.endsWith('__') && part.length > 4)
    ) {
      nodes.push({
        type: 'text',
        text: part.slice(2, -2),
        marks: [{ type: 'bold' }],
      });
    }
    // Italic: *text* or _text_
    else if (
      (part.startsWith('*') && part.endsWith('*') && part.length > 2) ||
      (part.startsWith('_') && part.endsWith('_') && part.length > 2)
    ) {
      nodes.push({
        type: 'text',
        text: part.slice(1, -1),
        marks: [{ type: 'italic' }],
      });
    }
    // Strikethrough: ~~text~~
    else if (part.startsWith('~~') && part.endsWith('~~') && part.length > 4) {
      nodes.push({
        type: 'text',
        text: part.slice(2, -2),
        marks: [{ type: 'strike' }],
      });
    }
    // Inline code: `text`
    else if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      nodes.push({
        type: 'text',
        text: part.slice(1, -1),
        marks: [{ type: 'code' }],
      });
    }
    // Regular text
    else {
      nodes.push({
        type: 'text',
        text: part,
      });
    }
  }

  return nodes.length ? nodes : [{ type: 'text', text }];
}

/**
 * Traverses an array of TipTap node objects and splits any unstyled text nodes
 * that contain inline markdown syntax into properly formatted text nodes with marks.
 */
export function enrichNodesWithMarkdown(nodes: any[]): any[] {
  if (!Array.isArray(nodes)) return nodes;

  const result: any[] = [];
  for (const node of nodes) {
    if (
      node.type === 'text' &&
      typeof node.text === 'string' &&
      (!node.marks || node.marks.length === 0) &&
      /(\*\*|__|\*|_|~~|`)/.test(node.text)
    ) {
      result.push(...parseInlineMarkdownToNodes(node.text));
    } else if (node.content && Array.isArray(node.content)) {
      result.push({
        ...node,
        content: enrichNodesWithMarkdown(node.content),
      });
    } else {
      result.push(node);
    }
  }
  return result;
}
