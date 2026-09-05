import { docs_v1 } from '@googleapis/docs';
import { CanonicalDoc, ASTBlock, ASTTextRun, ASTBlockType } from '@/types/sync-ast';

export function parseGoogleDocToCanonical(doc: docs_v1.Schema$Document): CanonicalDoc {
  const blocks: ASTBlock[] = [];
  const content = doc.body?.content || [];

  for (const element of content) {
    if (element.paragraph) {
      const p = element.paragraph;
      const namedStyle = p.paragraphStyle?.namedStyleType || 'NORMAL_TEXT';
      const bullet = p.bullet;

      let type: ASTBlockType = 'paragraph';
      if (bullet) {
        type = bullet.listId ? 'bullet' : 'numbered';
      } else if (namedStyle === 'HEADING_1') {
        type = 'heading_1';
      } else if (namedStyle === 'HEADING_2') {
        type = 'heading_2';
      } else if (namedStyle === 'HEADING_3') {
        type = 'heading_3';
      }

      const runs: ASTTextRun[] = [];
      for (const elem of p.elements || []) {
        if (elem.textRun && elem.textRun.content) {
          // Google Docs paragraphs always terminate with \n
          const rawText = elem.textRun.content.replace(/\n$/, '');
          if (!rawText) continue;

          const style = elem.textRun.textStyle || {};
          const isCodeFont =
            style.weightedFontFamily?.fontFamily === 'Consolas' ||
            style.weightedFontFamily?.fontFamily === 'Courier New';

          runs.push({
            text: rawText,
            bold: Boolean(style.bold),
            italic: Boolean(style.italic),
            underline: Boolean(style.underline),
            strike: Boolean(style.strikethrough),
            link: style.link?.url || undefined,
            code: isCodeFont,
          });
        }
      }

      if (runs.length > 0) {
        blocks.push({
          id: `gdoc-${element.startIndex || Math.random().toString(36).substring(2, 9)}`,
          type,
          runs,
        });
      }
    }
  }

  return {
    title: doc.title || 'Untitled Document',
    blocks,
  };
}
