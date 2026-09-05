import crypto from 'crypto';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getValidGoogleClient } from '@/lib/google/auth';
import { parseGoogleDocToCanonical } from '@/lib/google/parser';
import { writeCanonicalToGoogleDoc } from '@/lib/google/writer';
import { synapseBlocksToCanonical, canonicalToSynapseBlocks } from '@/lib/google/synapse-converter';
import { CanonicalDoc } from '@/types/sync-ast';
import { Note, Block } from '@/types/domain';

export function computeDocHash(canonical: CanonicalDoc): string {
  const blocks = (canonical.blocks || [])
    .map((b) => {
      let text = (b.runs || []).map((r) => r.text).join('').trim();
      // Normalize checkbox variants like `[ ] ` to `[] ` so hash matches regardless of space
      text = text
        .replace(/^\s*(?:[-*]\s+)?\[ \]\s*/, '[] ')
        .replace(/^\s*(?:[-*]\s+)?\[[xX]\]\s*/, '[x] ');
      return { type: b.type, text };
    })
    .filter((b) => b.text.length > 0);

  const normalized = JSON.stringify({
    title: (canonical.title || '').trim(),
    blocks,
  });
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

export async function createGoogleDocFromNote(
  userId: string,
  workspaceId: string,
  noteId: string,
  clientNote?: { title: string; [key: string]: any },
  clientBlocks?: Block[]
): Promise<{ googleDocId: string; googleDocUrl: string }> {
  const supabase = await createServerSupabaseClient();
  const { docs, drive, integrationId } = await getValidGoogleClient(userId);

  // 1. Fetch note from Supabase or fallback to client-provided Dexie note
  const { data: noteInDb } = await supabase
    .from('notes')
    .select('*')
    .eq('id', noteId)
    .maybeSingle();

  const note: Note = {
    id: noteId,
    workspace_id: workspaceId,
    title: clientNote?.title || noteInDb?.title || 'Untitled Note',
    icon: clientNote?.icon || noteInDb?.icon || '📄',
    cover_url: clientNote?.cover_url || noteInDb?.cover_url || null,
    is_favorite: clientNote?.is_favorite ?? noteInDb?.is_favorite ?? false,
    is_archived: clientNote?.is_archived ?? noteInDb?.is_archived ?? false,
    is_public: clientNote?.is_public ?? noteInDb?.is_public ?? false,
    created_by: userId,
    updated_by: userId,
    created_at: noteInDb?.created_at || clientNote?.created_at || new Date().toISOString(),
    updated_at: clientNote?.updated_at || noteInDb?.updated_at || new Date().toISOString(),
    version: (noteInDb?.version || 1) + 1,
    parent_id: clientNote?.parent_id || noteInDb?.parent_id || null,
  };

  let blocks: Block[] = (clientBlocks && clientBlocks.length > 0) ? clientBlocks : [];
  if (blocks.length === 0 && noteInDb) {
    const { data: dbBlocks } = await supabase
      .from('blocks')
      .select('*')
      .eq('note_id', noteId)
      .order('sort_order', { ascending: true });
    if (dbBlocks && dbBlocks.length > 0) {
      blocks = dbBlocks as Block[];
    }
  }

  if (blocks.length === 0) {
    blocks = [
      {
        id: crypto.randomUUID(),
        note_id: noteId,
        workspace_id: workspaceId,
        parent_block_id: null,
        type: 'paragraph',
        content: { text: note.title },
        properties: {},
        sort_order: 1000,
        created_by: userId,
        updated_by: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 1,
      },
    ];
  }

  const canonical = synapseBlocksToCanonical(note, blocks);

  // 2. Create blank document in Google Drive
  const created = await docs.documents.create({
    requestBody: {
      title: note.title || 'Synapse Synced Note',
    },
  });

  const docId = created.data.documentId!;
  const docUrl = `https://docs.google.com/document/d/${docId}/edit`;

  // 3. Write note content into the Google Doc
  await writeCanonicalToGoogleDoc(docs, docId, canonical, drive);

  // Fetch updated document from Google Docs to establish exact parsed baseline hash
  const gDoc = await docs.documents.get({ documentId: docId });
  const parsedGDoc = parseGoogleDocToCanonical(gDoc.data);
  const revisionId = gDoc.data.revisionId || '1';
  const initialHash = computeDocHash(parsedGDoc);

  // 4. Save link in Supabase
  const { error: linkError } = await supabase.from('google_doc_links').upsert(
    {
      workspace_id: workspaceId,
      note_id: noteId,
      integration_id: integrationId,
      google_doc_id: docId,
      google_doc_title: note.title || 'Untitled',
      google_revision_id: revisionId,
      google_modified_time: new Date().toISOString(),
      status: 'synced',
      last_synced_at: new Date().toISOString(),
      last_sync_source: 'synapse',
      last_synced_content_hash: initialHash,
      last_synced_snapshot: parsedGDoc,
    },
    { onConflict: 'note_id' }
  );

  if (linkError) {
    console.error('[Google Sync] Failed to save google_doc_link in DB:', linkError);
    throw new Error(`Failed to save document link: ${linkError.message}`);
  }

  return { googleDocId: docId, googleDocUrl: docUrl };
}

export async function linkExistingGoogleDoc(
  userId: string,
  workspaceId: string,
  noteId: string,
  googleDocId: string
): Promise<{ googleDocUrl: string; noteTitle: string; blocks: Partial<Block>[] }> {
  const supabase = await createServerSupabaseClient();
  const { docs, integrationId } = await getValidGoogleClient(userId);

  // Fetch doc from Google
  const gDoc = await docs.documents.get({ documentId: googleDocId });
  const canonical = parseGoogleDocToCanonical(gDoc.data);
  const hash = computeDocHash(canonical);
  const docTitle = gDoc.data.title || 'Linked Google Doc';

  // Update Synapse Note title and blocks to mirror the Google Doc
  const { blocks } = canonicalToSynapseBlocks(canonical, noteId, workspaceId, userId);

  await supabase
    .from('notes')
    .update({
      title: docTitle,
      updated_at: new Date().toISOString(),
    })
    .eq('id', noteId);

  await supabase.from('blocks').delete().eq('note_id', noteId);
  if (blocks.length > 0) {
    await supabase.from('blocks').insert(blocks);
  }

  // Create link binding
  const { error: linkError } = await supabase.from('google_doc_links').upsert(
    {
      workspace_id: workspaceId,
      note_id: noteId,
      integration_id: integrationId,
      google_doc_id: googleDocId,
      google_doc_title: docTitle,
      google_revision_id: gDoc.data.revisionId || '1',
      google_modified_time: new Date().toISOString(),
      status: 'synced',
      last_synced_at: new Date().toISOString(),
      last_sync_source: 'google_docs',
      last_synced_content_hash: hash,
      last_synced_snapshot: canonical,
    },
    { onConflict: 'note_id' }
  );

  if (linkError) {
    console.error('[Google Sync] Failed to save google_doc_link in DB:', linkError);
    throw new Error(`Failed to save document link: ${linkError.message}`);
  }

  return {
    googleDocUrl: `https://docs.google.com/document/d/${googleDocId}/edit`,
    noteTitle: docTitle,
    blocks,
  };
}

export async function executeTwoWaySync(
  userId: string,
  noteId: string,
  clientNote?: { title: string; [key: string]: any },
  clientBlocks?: Block[]
): Promise<{
  status: string;
  message: string;
  updatedTitle?: string;
  updatedBlocks?: Partial<Block>[];
}> {
  const supabase = await createServerSupabaseClient();
  const { data: link } = await supabase
    .from('google_doc_links')
    .select('*')
    .eq('note_id', noteId)
    .single();

  if (!link) {
    throw new Error('This note is not linked to a Google Doc.');
  }

  const { docs, drive } = await getValidGoogleClient(userId);

  // 1. Fetch current Synapse Note & Blocks
  const { data: noteInDb } = await supabase
    .from('notes')
    .select('*')
    .eq('id', noteId)
    .maybeSingle();

  const note: Note = {
    id: noteId,
    workspace_id: clientNote?.workspace_id || link.workspace_id,
    title: clientNote?.title || noteInDb?.title || link.google_doc_title || 'Untitled',
    icon: clientNote?.icon || noteInDb?.icon || '📄',
    cover_url: clientNote?.cover_url || noteInDb?.cover_url || null,
    is_favorite: clientNote?.is_favorite ?? noteInDb?.is_favorite ?? false,
    is_archived: clientNote?.is_archived ?? noteInDb?.is_archived ?? false,
    is_public: clientNote?.is_public ?? noteInDb?.is_public ?? false,
    created_by: userId,
    updated_by: userId,
    created_at: noteInDb?.created_at || clientNote?.created_at || new Date().toISOString(),
    updated_at: clientNote?.updated_at || noteInDb?.updated_at || new Date().toISOString(),
    version: (noteInDb?.version || 1) + 1,
    parent_id: clientNote?.parent_id || noteInDb?.parent_id || null,
  };

  let blocks: Block[] = (clientBlocks && clientBlocks.length > 0) ? clientBlocks : [];
  if (blocks.length === 0 && noteInDb) {
    const { data: dbBlocks } = await supabase
      .from('blocks')
      .select('*')
      .eq('note_id', noteId)
      .order('sort_order', { ascending: true });
    if (dbBlocks && dbBlocks.length > 0) {
      blocks = dbBlocks as Block[];
    }
  }

  const synapseCanonical = synapseBlocksToCanonical(note, blocks);
  const synapseHash = computeDocHash(synapseCanonical);

  // 2. Fetch current Google Doc
  const gDoc = await docs.documents.get({ documentId: link.google_doc_id });
  const googleCanonical = parseGoogleDocToCanonical(gDoc.data);
  const googleHash = computeDocHash(googleCanonical);
  const currentGoogleRevision = gDoc.data.revisionId || '1';

  const baseHash = link.last_synced_content_hash;
  const synapseModified = synapseHash !== baseHash;
  const googleModified = googleHash !== baseHash;

  console.log(
    `[Google Sync] Note: "${note.title}", SynapseMod: ${synapseModified}, GoogleMod: ${googleModified}, SynapseHash: ${synapseHash.slice(0, 8)}, GoogleHash: ${googleHash.slice(0, 8)}, BaseHash: ${baseHash ? baseHash.slice(0, 8) : 'none'}`
  );

  // Case A: Content is identical
  if (synapseHash === googleHash || (!synapseModified && !googleModified)) {
    await supabase
      .from('google_doc_links')
      .update({
        google_revision_id: currentGoogleRevision,
        google_doc_title: note.title,
        last_synced_content_hash: synapseHash,
        last_synced_snapshot: synapseCanonical,
        last_synced_at: new Date().toISOString(),
        status: 'synced',
      })
      .eq('id', link.id);

    return { status: 'synced', message: 'Documents are already up to date.' };
  }

  // Case B: Only Synapse was modified
  if (synapseModified && !googleModified) {
    await writeCanonicalToGoogleDoc(docs, link.google_doc_id, synapseCanonical, drive);
    const updatedGDoc = await docs.documents.get({ documentId: link.google_doc_id });

    await supabase
      .from('google_doc_links')
      .update({
        google_revision_id: updatedGDoc.data.revisionId || currentGoogleRevision,
        google_doc_title: note.title,
        last_synced_content_hash: synapseHash,
        last_synced_snapshot: synapseCanonical,
        last_synced_at: new Date().toISOString(),
        last_sync_source: 'synapse',
        status: 'synced',
      })
      .eq('id', link.id);

    return { status: 'synced', message: 'Updated Google Doc with Synapse edits.' };
  }

  // Case C: Only Google Doc was modified
  if (!synapseModified && googleModified) {
    const { noteTitle, blocks: newBlocks } = canonicalToSynapseBlocks(
      googleCanonical,
      noteId,
      link.workspace_id,
      userId
    );

    await supabase
      .from('notes')
      .update({
        title: noteTitle,
        updated_at: new Date().toISOString(),
      })
      .eq('id', noteId);

    await supabase.from('blocks').delete().eq('note_id', noteId);
    if (newBlocks.length > 0) {
      await supabase.from('blocks').insert(newBlocks);
    }

    await supabase
      .from('google_doc_links')
      .update({
        google_revision_id: currentGoogleRevision,
        google_doc_title: noteTitle,
        last_synced_content_hash: googleHash,
        last_synced_snapshot: googleCanonical,
        last_synced_at: new Date().toISOString(),
        last_sync_source: 'google_docs',
        status: 'synced',
      })
      .eq('id', link.id);

    return {
      status: 'synced',
      message: 'Updated Synapse note with Google Doc edits.',
      updatedTitle: noteTitle,
      updatedBlocks: newBlocks,
    };
  }

  // Case D: Both modified - resolve based on edit timestamp
  const synapseEditTime = new Date(note.updated_at).getTime();
  const lastSyncTime = new Date(link.last_synced_at).getTime();

  if (synapseEditTime > lastSyncTime) {
    // Synapse has newer active edits
    await writeCanonicalToGoogleDoc(docs, link.google_doc_id, synapseCanonical, drive);
    const updatedGDoc = await docs.documents.get({ documentId: link.google_doc_id });

    await supabase
      .from('google_doc_links')
      .update({
        google_revision_id: updatedGDoc.data.revisionId || currentGoogleRevision,
        google_doc_title: note.title,
        last_synced_content_hash: synapseHash,
        last_synced_snapshot: synapseCanonical,
        last_synced_at: new Date().toISOString(),
        last_sync_source: 'synapse',
        status: 'synced',
      })
      .eq('id', link.id);

    return { status: 'synced', message: 'Synced Synapse changes to Google Doc.' };
  } else {
    // Google Doc has newer edits
    const { noteTitle, blocks: newBlocks } = canonicalToSynapseBlocks(
      googleCanonical,
      noteId,
      link.workspace_id,
      userId
    );

    await supabase
      .from('notes')
      .update({
        title: noteTitle,
        updated_at: new Date().toISOString(),
      })
      .eq('id', noteId);

    await supabase.from('blocks').delete().eq('note_id', noteId);
    if (newBlocks.length > 0) {
      await supabase.from('blocks').insert(newBlocks);
    }

    await supabase
      .from('google_doc_links')
      .update({
        google_revision_id: currentGoogleRevision,
        google_doc_title: noteTitle,
        last_synced_content_hash: googleHash,
        last_synced_snapshot: googleCanonical,
        last_synced_at: new Date().toISOString(),
        last_sync_source: 'google_docs',
        status: 'synced',
      })
      .eq('id', link.id);

    return {
      status: 'synced',
      message: 'Synced Google Doc changes into Synapse.',
      updatedTitle: noteTitle,
      updatedBlocks: newBlocks,
    };
  }
}
