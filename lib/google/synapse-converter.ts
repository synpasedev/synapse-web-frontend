import { Block, BlockType, Note } from '@/types/domain';
import { CanonicalDoc, ASTBlock, ASTBlockType } from '@/types/sync-ast';

function extractTextFromNodes(nodes: any[]): string {
  if (!nodes || !nodes.length) return '';
  return nodes
    .map((n) => {
      if (n.text) return n.text;
      if (n.content) return extractTextFromNodes(n.content);
      return '';
    })
    .join('');
}

function extractSafeText(content: any): string {
  if (!content) return '';
  if (typeof content === 'string') return content;
  if (typeof content.text === 'string') return content.text;
  if (Array.isArray(content)) return extractTextFromNodes(content);
  if (Array.isArray(content.nodes)) return extractTextFromNodes(content.nodes);
  return '';
}

export function synapseBlocksToCanonical(note: Note, blocks: Block[]): CanonicalDoc {
  const sorted = [...blocks].sort((a, b) => a.sort_order - b.sort_order);

  const astBlocks: ASTBlock[] = sorted.flatMap((b): ASTBlock[] => {
    // 1. Checkboxes / Task Lists
    const isTaskBlock =
      b.type === 'todo_list' ||
      (b.type as string) === 'task_list' ||
      (b.type as string) === 'taskList' ||
      (b.type as string) === 'taskItem' ||
      (b.type as string) === 'task_item' ||
      (b.properties && typeof b.properties.checked === 'boolean');

    if (isTaskBlock) {
      const nodes = b.content?.nodes || (Array.isArray(b.content) ? b.content : []);
      const taskNodes = Array.isArray(nodes)
        ? nodes.filter((n: any) => n.type === 'taskItem')
        : [];

      if (taskNodes.length > 0) {
        return taskNodes.map((item: any, itemIdx: number) => {
          const rawText = extractSafeText(item.content || []).trim();
          const cleanText = rawText.replace(/^\s*(?:[-*]\s+)?\[([ xX]?)\]\s*/, '');
          const isChecked = Boolean(item.attrs?.checked);
          const prefix = isChecked ? '[x] ' : '[] ';

          return {
            id: `${b.id}-${itemIdx}`,
            type: 'paragraph' as ASTBlockType,
            runs: [{ text: `${prefix}${cleanText}` }],
            properties: { isTask: true, checked: isChecked },
          };
        });
      }

      const rawText = extractSafeText(b.content).trim();
      const cleanText = rawText.replace(/^\s*(?:[-*]\s+)?\[([ xX]?)\]\s*/, '');
      const isChecked = Boolean(
        b.properties?.checked ?? b.properties?.attrs?.checked ?? false
      );
      const prefix = isChecked ? '[x] ' : '[] ';

      return [
        {
          id: b.id,
          type: 'paragraph' as ASTBlockType,
          runs: [{ text: `${prefix}${cleanText}` }],
          properties: { isTask: true, checked: isChecked },
        },
      ];
    }

    let type: ASTBlockType = 'paragraph';
    if (b.type === 'heading_1' || b.type === 'heading_2' || b.type === 'heading_3') {
      type = b.type;
    } else if (b.type === 'bullet_list' || (b.type as string) === 'bulletList') {
      type = 'bullet';
    } else if (b.type === 'numbered_list' || (b.type as string) === 'orderedList') {
      type = 'numbered';
    } else if (b.type === 'code' || (b.type as string) === 'codeBlock') {
      type = 'code';
    } else if (b.type === 'quote' || (b.type as string) === 'blockquote') {
      type = 'quote';
    } else if (b.type === 'callout') {
      type = 'callout';
    } else if (b.type === 'divider' || (b.type as string) === 'horizontalRule') {
      type = 'divider';
    } else if (b.type === 'table') {
      type = 'table';
    }

    let textContent = extractSafeText(b.content).trim();

    // Check if plain paragraph text is formatted as checkbox like `[] `, `[ ] `, or `[x] `
    if (type === 'paragraph') {
      const taskMatch = textContent.match(/^\s*(?:[-*]\s+)?\[([ xX]?)\]\s*(.*)$/);
      if (taskMatch) {
        const isChecked = taskMatch[1]?.toLowerCase() === 'x';
        const cleanText = taskMatch[2] || '';
        const prefix = isChecked ? '[x] ' : '[] ';
        return [
          {
            id: b.id,
            type: 'paragraph' as ASTBlockType,
            runs: [{ text: `${prefix}${cleanText}` }],
            properties: { isTask: true, checked: isChecked },
          },
        ];
      }
    }

    return [
      {
        id: b.id,
        type,
        runs: [
          {
            text: textContent,
            code: b.type === 'code',
          },
        ],
        properties: b.properties,
      },
    ];
  });

  return {
    title: note.title || 'Untitled',
    blocks: astBlocks,
  };
}

export function canonicalToSynapseBlocks(
  canonical: CanonicalDoc,
  noteId: string,
  workspaceId: string,
  userId: string
): { noteTitle: string; blocks: Partial<Block>[] } {
  const blocks: Partial<Block>[] = canonical.blocks.map((b, idx) => {
    const text = b.runs.map((r) => r.text).join('');

    // Detect checkbox format: `[] `, `[ ] `, `[x] `, `[X] `, `- [] `, `- [ ] `, `* [] `
    const taskMatch = text.match(/^\s*(?:[-*]\s+)?\[([ xX]?)\]\s*(.*)$/);
    if (taskMatch) {
      const isChecked = taskMatch[1]?.toLowerCase() === 'x';
      const taskText = taskMatch[2] || '';

      return {
        note_id: noteId,
        workspace_id: workspaceId,
        type: 'todo_list' as BlockType,
        sort_order: (idx + 1) * 1000,
        content: {
          text: taskText,
          nodes: [
            {
              type: 'taskItem',
              attrs: { checked: isChecked },
              content: [
                {
                  type: 'paragraph',
                  content: taskText ? [{ type: 'text', text: taskText }] : [],
                },
              ],
            },
          ],
        },
        properties: { checked: isChecked },
        created_by: userId,
        updated_by: userId,
      };
    }

    let blockType: BlockType = 'paragraph';
    if (b.type === 'heading_1' || b.type === 'heading_2' || b.type === 'heading_3') {
      blockType = b.type;
    } else if (b.type === 'bullet') {
      blockType = 'bullet_list';
    } else if (b.type === 'numbered') {
      blockType = 'numbered_list';
    } else if (b.type === 'code') {
      blockType = 'code';
    } else if (b.type === 'quote') {
      blockType = 'quote';
    } else if (b.type === 'callout') {
      blockType = 'callout';
    } else if (b.type === 'divider') {
      blockType = 'divider';
    } else if (b.type === 'table') {
      blockType = 'table';
    }

    return {
      note_id: noteId,
      workspace_id: workspaceId,
      type: blockType,
      sort_order: (idx + 1) * 1000,
      content: { text },
      properties: b.properties || {},
      created_by: userId,
      updated_by: userId,
    };
  });

  return {
    noteTitle: canonical.title,
    blocks,
  };
}
