import { docs_v1 } from '@googleapis/docs';
import { drive_v3 } from '@googleapis/drive';
import { CanonicalDoc } from '@/types/sync-ast';

export async function writeCanonicalToGoogleDoc(
  docsClient: docs_v1.Docs,
  docId: string,
  canonical: CanonicalDoc,
  driveClient?: drive_v3.Drive
): Promise<string> {
  // 1. Fetch current doc bounds to clear previous body
  const current = await docsClient.documents.get({ documentId: docId });
  const docContent = current.data.body?.content || [];
  const lastElement = docContent[docContent.length - 1];
  const endIndex = (lastElement?.endIndex || 2) - 1;

  const requests: docs_v1.Schema$Request[] = [];

  // Update title if needed via Drive API
  if (driveClient && canonical.title && canonical.title !== current.data.title) {
    try {
      await driveClient.files.update({
        fileId: docId,
        requestBody: { name: canonical.title },
      });
    } catch (titleErr) {
      console.warn('[Google Sync] Failed to update Google Doc title in Drive:', titleErr);
    }
  }

  // 2. Clear document if not empty (index 1 must be preserved in Google Docs API)
  if (endIndex > 1) {
    requests.push({
      deleteContentRange: {
        range: {
          startIndex: 1,
          endIndex: endIndex,
        },
      },
    });
  }

  // 3. Insert blocks sequentially
  let currentIndex = 1;

  for (const block of canonical.blocks) {
    const blockText = (block.runs.map((r) => r.text).join('') || ' ') + '\n';
    const insertStartIndex = currentIndex;

    requests.push({
      insertText: {
        location: { index: insertStartIndex },
        text: blockText,
      },
    });

    // Formatting text runs
    let runOffset = 0;
    for (const run of block.runs) {
      if (!run.text) continue;
      const runStart = insertStartIndex + runOffset;
      const runEnd = runStart + run.text.length;
      runOffset += run.text.length;

      const textStyle: docs_v1.Schema$TextStyle = {};
      const fieldsArr: string[] = [];

      if (run.bold) {
        textStyle.bold = true;
        fieldsArr.push('bold');
      }
      if (run.italic) {
        textStyle.italic = true;
        fieldsArr.push('italic');
      }
      if (run.underline) {
        textStyle.underline = true;
        fieldsArr.push('underline');
      }
      if (run.link) {
        textStyle.link = { url: run.link };
        fieldsArr.push('link');
      }
      if (run.code) {
        textStyle.weightedFontFamily = { fontFamily: 'Consolas' };
        fieldsArr.push('weightedFontFamily');
      }

      if (fieldsArr.length > 0) {
        requests.push({
          updateTextStyle: {
            range: { startIndex: runStart, endIndex: runEnd },
            textStyle,
            fields: fieldsArr.join(','),
          },
        });
      }
    }

    // Paragraph Style (Headings)
    if (block.type === 'heading_1' || block.type === 'heading_2' || block.type === 'heading_3') {
      const styleType = block.type.toUpperCase();
      requests.push({
        updateParagraphStyle: {
          range: { startIndex: insertStartIndex, endIndex: insertStartIndex + blockText.length },
          paragraphStyle: { namedStyleType: styleType },
          fields: 'namedStyleType',
        },
      });
    }

    currentIndex += blockText.length;
  }

  // 4. Execute atomic batch update with retry backoff
  const response = await executeWithExponentialBackoff(() =>
    docsClient.documents.batchUpdate({
      documentId: docId,
      requestBody: { requests },
    })
  );

  return response.data.documentId!;
}

async function executeWithExponentialBackoff<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  let delay = 1000;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      if ((err.status === 429 || err.code === 429) && attempt < retries - 1) {
        await new Promise((res) => setTimeout(res, delay + Math.random() * 500));
        delay *= 2;
        continue;
      }
      throw err;
    }
  }
  throw new Error('Exhausted retry budget for Google API batchUpdate.');
}
