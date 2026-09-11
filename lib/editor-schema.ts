import { Block, BlockType, Note } from '@/types/domain';
import { parseInlineMarkdownToNodes, enrichNodesWithMarkdown } from '@/lib/markdown';

export function extractSafeText(content: any): string {
  if (!content) return '';
  if (typeof content === 'string') return content;
  if (typeof content.text === 'string') return content.text;
  if (Array.isArray(content)) return extractTextFromNodes(content);
  if (Array.isArray(content.nodes)) return extractTextFromNodes(content.nodes);
  return '';
}

/**
 * Converts domain Block[] stored in IndexedDB/PostgreSQL into a valid ProseMirror/TipTap JSON document.
 * Ensures strict schema compatibility so lists, code blocks, quotes, and headings hydrate properly.
 */
export function blocksToTipTapDoc(blocks: Block[]): any {
  if (!blocks || !blocks.length) {
    return {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
        },
      ],
    };
  }

  const docContent = blocks.map((b) => {
    const textContent = extractSafeText(b.content);
    const textNodes = textContent ? parseInlineMarkdownToNodes(textContent) : [];
    const blockAttrs = b.properties && Object.keys(b.properties).length ? { ...b.properties } : undefined;

    // 1. Headings
    if (b.type.startsWith('heading_')) {
      const level = b.properties?.level || parseInt(b.type.replace('heading_', ''), 10) || 1;
      const parsedNodes = b.content?.nodes ? enrichNodesWithMarkdown(b.content.nodes) : null;
      return {
        type: 'heading',
        attrs: { ...(blockAttrs || {}), level },
        content: parsedNodes || (textNodes.length ? textNodes : [{ type: 'text', text: ' ' }]),
      };
    }

    // 2. Bullet Lists
    if (b.type === 'bullet_list' || (b.type as string) === 'bulletList') {
      if (b.content?.nodes && b.content.nodes[0]?.type === 'listItem') {
        return {
          type: 'bulletList',
          attrs: blockAttrs,
          content: enrichNodesWithMarkdown(b.content.nodes),
        };
      }
      return {
        type: 'bulletList',
        attrs: blockAttrs,
        content: [
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: textNodes.length ? textNodes : [{ type: 'text', text: 'List item' }],
              },
            ],
          },
        ],
      };
    }

    // 3. Numbered / Ordered Lists
    if (b.type === 'numbered_list' || (b.type as string) === 'orderedList') {
      if (b.content?.nodes && b.content.nodes[0]?.type === 'listItem') {
        return {
          type: 'orderedList',
          attrs: blockAttrs,
          content: enrichNodesWithMarkdown(b.content.nodes),
        };
      }
      return {
        type: 'orderedList',
        attrs: blockAttrs,
        content: [
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: textNodes.length ? textNodes : [{ type: 'text', text: '1. List item' }],
              },
            ],
          },
        ],
      };
    }

    // 4. Checkboxes / Task List (supports todo_list, taskItem, taskList, task_item, or properties.checked)
    const isTaskBlock =
      b.type === 'todo_list' ||
      (b.type as string) === 'task_list' ||
      (b.type as string) === 'taskList' ||
      (b.type as string) === 'taskItem' ||
      (b.type as string) === 'task_item' ||
      (b.properties && typeof b.properties.checked === 'boolean');

    if (isTaskBlock) {
      const isChecked = Boolean(
        b.properties?.checked ?? b.properties?.attrs?.checked ?? false
      );

      if (b.content?.nodes && b.content.nodes[0]?.type === 'taskItem') {
        return {
          type: 'taskList',
          attrs: blockAttrs,
          content: enrichNodesWithMarkdown(b.content.nodes),
        };
      }

      const cleanText = textContent.replace(/^\s*(?:[-*]\s+)?\[([ xX]?)\]\s*/, '');
      const checkedFromText = /^\s*(?:[-*]\s+)?\[[xX]\]/.test(textContent);

      return {
        type: 'taskList',
        attrs: blockAttrs,
        content: [
          {
            type: 'taskItem',
            attrs: { checked: isChecked || checkedFromText },
            content: [
              {
                type: 'paragraph',
                content: cleanText ? parseInlineMarkdownToNodes(cleanText) : [],
              },
            ],
          },
        ],
      };
    }

    // 5. Quotes / Callouts
    if (b.type === 'quote' || b.type === 'callout' || (b.type as string) === 'blockquote') {
      return {
        type: 'blockquote',
        attrs: blockAttrs,
        content: [
          {
            type: 'paragraph',
            content: b.content?.nodes ? enrichNodesWithMarkdown(b.content.nodes) : textNodes,
          },
        ],
      };
    }

    // 6. Code Blocks
    if (b.type === 'code' || (b.type as string) === 'code_block' || (b.type as string) === 'codeBlock') {
      return {
        type: 'codeBlock',
        attrs: { ...blockAttrs, language: b.properties?.language || 'typescript' },
        content: textContent ? [{ type: 'text', text: textContent }] : [{ type: 'text', text: '// Code block' }],
      };
    }

    // 7. Dividers / Horizontal Rule
    if (b.type === 'divider' || (b.type as string) === 'horizontalRule') {
      return {
        type: 'horizontalRule',
        attrs: blockAttrs,
      };
    }

    // 8. Plain paragraph starting with Markdown Headings (# through ######)
    const headingMatch = textContent.match(/^(#{1,6})\s+(.*)$/);
    if (b.type === 'paragraph' && headingMatch) {
      const level = Math.min(6, headingMatch[1].length);
      const cleanHeading = headingMatch[2];
      return {
        type: 'heading',
        attrs: { ...blockAttrs, level },
        content: parseInlineMarkdownToNodes(cleanHeading),
      };
    }

    // 9. Plain paragraph starting with Markdown Blockquote (> quote)
    const quoteMatch = textContent.match(/^>\s*(.*)$/);
    if (b.type === 'paragraph' && quoteMatch) {
      return {
        type: 'blockquote',
        attrs: blockAttrs,
        content: [
          {
            type: 'paragraph',
            content: parseInlineMarkdownToNodes(quoteMatch[1]),
          },
        ],
      };
    }

    // 10. Paragraph that starts with [] or [x]
    const taskMatch = textContent.match(/^\s*(?:[-*]\s+)?\[([ xX]?)\]\s*(.*)$/);
    if (taskMatch) {
      const isChecked = taskMatch[1]?.toLowerCase() === 'x';
      const cleanText = taskMatch[2] || '';
      return {
        type: 'taskList',
        attrs: blockAttrs,
        content: [
          {
            type: 'taskItem',
            attrs: { checked: isChecked },
            content: [
              {
                type: 'paragraph',
                content: cleanText ? parseInlineMarkdownToNodes(cleanText) : [],
              },
            ],
          },
        ],
      };
    }

    // 11. Default Paragraph (with enriched markdown formatting for bold, italic, code, etc.)
    const parsedNodes = b.content?.nodes ? enrichNodesWithMarkdown(b.content.nodes) : null;
    return {
      type: 'paragraph',
      ...(blockAttrs ? { attrs: blockAttrs } : {}),
      content: parsedNodes || (textNodes.length ? textNodes : undefined),
    };
  });

  return {
    type: 'doc',
    content: docContent.filter(Boolean),
  };
}

/**
 * Converts ProseMirror JSON content into stable domain Block[] entities.
 * Maintains stable block IDs to prevent churn and duplicate fragments.
 */
export function tipTapDocToBlocks(
  json: any,
  note: Note,
  existingBlocks: Block[] = []
): Block[] {
  const nodes = json.content || [];
  const existingMap = new Map<number, string>();
  existingBlocks.forEach((b, idx) => existingMap.set(idx, b.id));

  return nodes.map((node: any, index: number): Block => {
    let blockType: BlockType = 'paragraph';

    if (node.type === 'heading') {
      const level = node.attrs?.level || 1;
      blockType = (level === 1 ? 'heading_1' : level === 2 ? 'heading_2' : 'heading_3') as BlockType;
    } else if (node.type === 'taskList' || node.type === 'taskItem') {
      blockType = 'todo_list';
    } else if (node.type === 'bulletList') {
      blockType = 'bullet_list';
    } else if (node.type === 'orderedList') {
      blockType = 'numbered_list';
    } else if (node.type === 'blockquote') {
      blockType = 'quote';
    } else if (node.type === 'codeBlock') {
      blockType = 'code';
    } else if (node.type === 'horizontalRule') {
      blockType = 'divider';
    }

    // Extract text representation
    let text = '';
    if (node.content && node.content.length) {
      text = extractTextFromNodes(node.content);
    }

    let isTask = blockType === 'todo_list';
    let isChecked = Boolean(node.attrs?.checked);

    if (node.type === 'taskList' && Array.isArray(node.content) && node.content.length > 0) {
      isChecked = Boolean(node.content[0]?.attrs?.checked);
    }

    // Check if plain paragraph text is formatted as checkbox like `[] `, `[ ] `, or `[x] `
    if (blockType === 'paragraph') {
      const taskMatch = text.match(/^\s*(?:[-*]\s+)?\[([ xX]?)\]\s*(.*)$/);
      if (taskMatch) {
        blockType = 'todo_list';
        isTask = true;
        isChecked = taskMatch[1]?.toLowerCase() === 'x';
      }
    }

    // Reuse stable ID if available, otherwise preserve node.attrs.blockId or generate new
    const blockId = node.attrs?.blockId || existingMap.get(index) || crypto.randomUUID();

    return {
      id: blockId,
      note_id: note.id,
      workspace_id: note.workspace_id,
      parent_block_id: null,
      type: blockType,
      content: {
        text,
        nodes: node.content || [],
      },
      properties: {
        ...(node.attrs || {}),
        ...(isTask ? { checked: isChecked } : {}),
      },
      sort_order: (index + 1) * 1000,
      created_by: note.created_by,
      updated_by: note.updated_by,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      version: (note.version || 1) + 1,
    };
  });
}

function extractTextFromNodes(nodes: any[]): string {
  return nodes
    .map((n) => {
      if (n.text) return n.text;
      if (n.content) return extractTextFromNodes(n.content);
      return '';
    })
    .join(' ');
}
