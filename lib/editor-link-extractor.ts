import { localDb } from '@/lib/dexie/db';
import { syncEngine } from '@/lib/dexie/sync-engine';
import { Link, Note } from '@/types/domain';

export async function extractLinksFromEditor(
  workspaceId: string,
  sourceNoteId: string,
  editorJson: any
) {
  if (typeof window === 'undefined') return;

  const foundTargetTitles: Set<string> = new Set();
  const foundTargetIds: Set<string> = new Set();

  function traverse(node: any) {
    if (!node) return;

    // Check custom wikiLink nodes
    if (node.type === 'wikiLink' && node.attrs?.targetId) {
      foundTargetIds.add(node.attrs.targetId);
    }
    if (node.type === 'wikiLink' && node.attrs?.label) {
      foundTargetTitles.add(node.attrs.label.trim());
    }

    // Check text for [[Title]] pattern
    if (node.text && typeof node.text === 'string') {
      const matches = node.text.matchAll(/\[\[(.*?)\]\]/g);
      for (const match of matches) {
        const title = match[1]?.trim();
        if (title) foundTargetTitles.add(title);
      }
    }

    if (Array.isArray(node.content)) {
      node.content.forEach(traverse);
    }
  }

  traverse(editorJson);

  // Fetch notes to resolve titles to IDs
  const allNotes = await localDb.notes.where('workspace_id').equals(workspaceId).toArray();
  const titleToNoteMap = new Map<string, Note>();
  allNotes.forEach((n) => {
    titleToNoteMap.set(n.title.toLowerCase(), n);
  });

  for (const title of foundTargetTitles) {
    const target = titleToNoteMap.get(title.toLowerCase());
    if (target && target.id !== sourceNoteId) {
      foundTargetIds.add(target.id);
    }
  }

  // Remove existing links from this source note and re-insert current ones
  const existingLinks = await localDb.links
    .where('source_note_id')
    .equals(sourceNoteId)
    .toArray();

  const existingTargetIds = new Set(existingLinks.map((l) => l.target_note_id));
  const newTargetIds = Array.from(foundTargetIds).filter((id) => id !== sourceNoteId);

  // Delete removed links
  const linksToDelete = existingLinks.filter((link) => !newTargetIds.includes(link.target_note_id));
  if (linksToDelete.length > 0) {
    await localDb.links.bulkDelete(linksToDelete.map((l) => l.id));
    await syncEngine.enqueueBatch(
      linksToDelete.map((link) => ({
        table: 'links',
        operation: 'DELETE',
        entityId: link.id,
        payload: { id: link.id },
      }))
    );
  }

  // Add newly created links
  const linksToCreate: Link[] = [];
  for (const targetId of newTargetIds) {
    if (!existingTargetIds.has(targetId)) {
      linksToCreate.push({
        id: crypto.randomUUID(),
        workspace_id: workspaceId,
        source_note_id: sourceNoteId,
        source_block_id: null,
        target_note_id: targetId,
        created_at: new Date().toISOString(),
      });
    }
  }

  if (linksToCreate.length > 0) {
    await localDb.links.bulkPut(linksToCreate);
    await syncEngine.enqueueBatch(
      linksToCreate.map((newLink) => ({
        table: 'links',
        operation: 'UPSERT',
        entityId: newLink.id,
        payload: newLink,
      }))
    );
  }
}
