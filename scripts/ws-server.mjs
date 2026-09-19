import { WebSocketServer, WebSocket } from 'ws';
import fs from 'fs';
import path from 'path';

const PORT = parseInt(process.env.WS_PORT || '3001', 10);
const DATA_DIR = path.join(process.cwd(), '.synapse-data');

function readJsonFile(filename, fallback) {
  try {
    const fp = path.join(DATA_DIR, filename);
    if (fs.existsSync(fp)) {
      const raw = fs.readFileSync(fp, 'utf-8');
      return JSON.parse(raw);
    }
  } catch {}
  return fallback;
}

function writeJsonFile(filename, data) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const fp = path.join(DATA_DIR, filename);
    fs.writeFileSync(fp, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn(`[ws-server] Write warning (${filename}):`, err.message);
  }
}

const rooms = new Map(); // workspaceId -> Set<WebSocket>
const clientMeta = new WeakMap();

// Presence tracking for collaborative notes:
// noteId -> Map<WebSocket, { user, activeBlockIndex, activeBlockId, lastActivity, isTyping }>
const activeNoteEditors = new Map();
// noteId -> Set<number> of active collision block indices
const activeCollisionsByNote = new Map();

const wss = new WebSocketServer({ port: PORT });

console.log(`[ws-server] ⚡ Synapse Real-time WebSocket server running on ws://localhost:${PORT} (Collaborative Multi-User Guard Mode)`);

wss.on('connection', (ws) => {
  const meta = {
    ws,
    workspaceId: '',
    user: null,
    activeNoteId: null,
    activeBlockIndex: null,
    isAlive: true,
  };
  clientMeta.set(ws, meta);

  ws.on('pong', () => { meta.isAlive = true; });

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      handleMessage(ws, meta, msg);
    } catch (e) {
      console.warn('[ws-server] Bad JSON:', e.message);
    }
  });

  ws.on('close', () => leaveRoom(ws, meta));
  ws.on('error', () => leaveRoom(ws, meta));

  ws.send(JSON.stringify({ type: 'CONNECTED', port: PORT, serverTime: Date.now() }));
});

function handleMessage(ws, meta, msg) {
  if (!msg || !msg.type) return;

  switch (msg.type) {
    case 'JOIN': {
      const { workspaceId, user } = msg;
      if (!workspaceId) return;

      leaveRoom(ws, meta);
      meta.workspaceId = workspaceId;
      meta.user = user;

      if (!rooms.has(workspaceId)) {
        rooms.set(workspaceId, new Set());
      }
      rooms.get(workspaceId).add(ws);

      console.log(`[ws-server] 👤 User ${user?.name || user?.email || 'member'} joined workspace: ${workspaceId} (${rooms.get(workspaceId).size} online)`);

      // Immediately send current notes & blocks
      const allNotes = readJsonFile('notes.json', []);
      const allBlocks = readJsonFile('blocks.json', []);

      const notes = allNotes.filter((n) => n.workspace_id === workspaceId && !n.is_archived);
      const blocks = allBlocks.filter((b) => b.workspace_id === workspaceId);

      ws.send(JSON.stringify({
        type: 'SYNC_FULL',
        workspaceId,
        notes,
        blocks,
        timestamp: Date.now(),
      }));

      // Broadcast member joined to others
      broadcastToRoom(workspaceId, {
        type: 'MEMBER_JOINED',
        workspaceId,
        user,
        activeMembers: rooms.get(workspaceId).size,
      }, ws);
      break;
    }

    case 'NOTE_JOIN': {
      const { workspaceId, noteId, user } = msg;
      if (!noteId) return;
      if (workspaceId) meta.workspaceId = workspaceId;
      if (user) meta.user = user;
      meta.activeNoteId = noteId;
      meta.activeBlockIndex = -1;

      if (!activeNoteEditors.has(noteId)) {
        activeNoteEditors.set(noteId, new Map());
      }
      activeNoteEditors.get(noteId).set(ws, {
        user: meta.user || user,
        activeBlockIndex: -1,
        activeBlockId: null,
        lastActivity: Date.now(),
        isTyping: false,
      });

      checkAndBroadcastCollisions(meta.workspaceId, noteId);
      break;
    }

    case 'NOTE_LEAVE': {
      const { noteId } = msg;
      const targetNoteId = noteId || meta.activeNoteId;
      if (targetNoteId && activeNoteEditors.has(targetNoteId)) {
        const map = activeNoteEditors.get(targetNoteId);
        map.delete(ws);
        if (map.size === 0) {
          activeNoteEditors.delete(targetNoteId);
        } else {
          checkAndBroadcastCollisions(meta.workspaceId, targetNoteId);
        }
      }
      meta.activeNoteId = null;
      meta.activeBlockIndex = null;
      break;
    }

    case 'PRESENCE_EDITING': {
      const { workspaceId, noteId, user, activeBlockIndex, activeBlockId, isTyping } = msg;
      if (!noteId) return;
      if (workspaceId) meta.workspaceId = workspaceId;
      if (user) meta.user = user;
      meta.activeNoteId = noteId;
      meta.activeBlockIndex = typeof activeBlockIndex === 'number' ? activeBlockIndex : -1;

      if (!activeNoteEditors.has(noteId)) {
        activeNoteEditors.set(noteId, new Map());
      }
      const map = activeNoteEditors.get(noteId);
      map.set(ws, {
        user: meta.user || user,
        activeBlockIndex: meta.activeBlockIndex,
        activeBlockId: activeBlockId || null,
        lastActivity: Date.now(),
        isTyping: Boolean(isTyping),
      });

      checkAndBroadcastCollisions(meta.workspaceId, noteId);
      break;
    }

    case 'NOTE_CHANGE': {
      const { workspaceId, note, user } = msg;
      if (!workspaceId || !note) return;

      // Update disk notes.json
      const allNotes = readJsonFile('notes.json', []);
      const idx = allNotes.findIndex((n) => n.id === note.id);
      if (idx >= 0) {
        allNotes[idx] = { ...allNotes[idx], ...note, updated_at: new Date().toISOString() };
      } else {
        allNotes.unshift(note);
      }
      writeJsonFile('notes.json', allNotes);

      // Broadcast to room members immediately
      broadcastToRoom(workspaceId, {
        type: 'NOTE_UPDATED',
        workspaceId,
        note,
        author: user || meta.user,
        timestamp: Date.now(),
      }, ws);
      break;
    }

    case 'BLOCKS_CHANGE': {
      const { workspaceId, noteId, blocks, user } = msg;
      if (!workspaceId || !noteId || !Array.isArray(blocks)) return;

      // Update disk blocks.json
      const allBlocks = readJsonFile('blocks.json', []);
      const kept = allBlocks.filter((b) => b.note_id !== noteId);
      const formatted = blocks.map((b, idx) => ({
        ...b,
        note_id: noteId,
        workspace_id: workspaceId || b.workspace_id,
        sort_order: b.sort_order !== undefined ? b.sort_order : (idx + 1) * 1000,
        updated_at: b.updated_at || new Date().toISOString(),
      }));
      writeJsonFile('blocks.json', [...kept, ...formatted]);

      // Broadcast to all room members immediately without delay
      broadcastToRoom(workspaceId, {
        type: 'BLOCKS_UPDATED',
        workspaceId,
        noteId,
        blocks: formatted,
        author: user || meta.user,
        timestamp: Date.now(),
      }, ws);

      // Refresh collision check
      checkAndBroadcastCollisions(workspaceId, noteId);
      break;
    }

    case 'REQUEST_SYNC': {
      const { workspaceId } = msg;
      if (!workspaceId) return;

      const allNotes = readJsonFile('notes.json', []);
      const allBlocks = readJsonFile('blocks.json', []);
      const notes = allNotes.filter((n) => n.workspace_id === workspaceId && !n.is_archived);
      const blocks = allBlocks.filter((b) => b.workspace_id === workspaceId);

      ws.send(JSON.stringify({
        type: 'SYNC_FULL',
        workspaceId,
        notes,
        blocks,
        timestamp: Date.now(),
      }));
      break;
    }

    default:
      break;
  }
}

/**
 * Detects whether 2 or more distinct users are actively editing the same block index.
 * Broadcasts COLLISION_ALERT or COLLISION_CLEAR accordingly.
 */
function checkAndBroadcastCollisions(workspaceId, noteId) {
  if (!workspaceId || !noteId) return;
  const editorsMap = activeNoteEditors.get(noteId);
  if (!editorsMap) return;

  const now = Date.now();
  // Filter active editors who had activity within the last 5 seconds
  const activeEntries = [];
  for (const [clientWs, entry] of editorsMap.entries()) {
    if (clientWs.readyState === WebSocket.OPEN && now - entry.lastActivity < 5000) {
      activeEntries.push(entry);
    } else if (clientWs.readyState !== WebSocket.OPEN) {
      editorsMap.delete(clientWs);
    }
  }

  // Group by block index
  const blockIndexGroups = new Map(); // blockIndex -> Map<userId, user>
  activeEntries.forEach((entry) => {
    if (typeof entry.activeBlockIndex === 'number' && entry.activeBlockIndex >= 0) {
      if (!blockIndexGroups.has(entry.activeBlockIndex)) {
        blockIndexGroups.set(entry.activeBlockIndex, new Map());
      }
      const userKey = entry.user?.id || entry.user?.email || entry.user?.name || 'anonymous';
      blockIndexGroups.get(entry.activeBlockIndex).set(userKey, entry.user || { name: 'Collaborator' });
    }
  });

  if (!activeCollisionsByNote.has(noteId)) {
    activeCollisionsByNote.set(noteId, new Set());
  }
  const currentCollisions = activeCollisionsByNote.get(noteId);
  const newCollisions = new Set();

  for (const [blockIdx, userMap] of blockIndexGroups.entries()) {
    if (userMap.size >= 2) {
      newCollisions.add(blockIdx);
      const conflictingUsers = Array.from(userMap.values());
      // Broadcast collision warning guard to everyone in the room
      broadcastToRoom(workspaceId, {
        type: 'COLLISION_ALERT',
        workspaceId,
        noteId,
        activeBlockIndex: blockIdx,
        users: conflictingUsers,
        timestamp: now,
      });
    }
  }

  // Check for resolved collisions
  for (const prevBlockIdx of currentCollisions) {
    if (!newCollisions.has(prevBlockIdx)) {
      broadcastToRoom(workspaceId, {
        type: 'COLLISION_CLEAR',
        workspaceId,
        noteId,
        activeBlockIndex: prevBlockIdx,
        timestamp: now,
      });
    }
  }

  activeCollisionsByNote.set(noteId, newCollisions);

  // Broadcast overall active presence list for this note
  const sanitizedPresence = activeEntries.map((e) => ({
    user: e.user || { name: 'Collaborator' },
    activeBlockIndex: e.activeBlockIndex,
    activeBlockId: e.activeBlockId,
    lastActivity: e.lastActivity,
    isTyping: e.isTyping,
  }));

  broadcastToRoom(workspaceId, {
    type: 'PRESENCE_UPDATED',
    workspaceId,
    noteId,
    activeEditors: sanitizedPresence,
    timestamp: now,
  });
}

function leaveRoom(ws, meta) {
  if (!meta) return;

  // Clean from active note editors
  if (meta.activeNoteId && activeNoteEditors.has(meta.activeNoteId)) {
    const map = activeNoteEditors.get(meta.activeNoteId);
    map.delete(ws);
    if (map.size === 0) {
      activeNoteEditors.delete(meta.activeNoteId);
    } else if (meta.workspaceId) {
      checkAndBroadcastCollisions(meta.workspaceId, meta.activeNoteId);
    }
  }

  if (meta.workspaceId) {
    const room = rooms.get(meta.workspaceId);
    if (room) {
      room.delete(ws);
      if (room.size === 0) {
        rooms.delete(meta.workspaceId);
      } else {
        broadcastToRoom(meta.workspaceId, {
          type: 'MEMBER_LEFT',
          workspaceId: meta.workspaceId,
          user: meta.user,
          activeMembers: room.size,
        });
      }
    }
  }
  meta.workspaceId = '';
  meta.activeNoteId = null;
  meta.activeBlockIndex = null;
}

function broadcastToRoom(workspaceId, message, senderWs) {
  const room = rooms.get(workspaceId);
  if (!room) return;

  const payload = JSON.stringify(message);
  for (const client of room) {
    if (client !== senderWs && client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

// Periodic presence maintenance and keepalive
setInterval(() => {
  // Check active collisions & sweep idle editors
  for (const [noteId, map] of activeNoteEditors.entries()) {
    let changed = false;
    const now = Date.now();
    for (const [ws, entry] of map.entries()) {
      if (now - entry.lastActivity > 6000) {
        if (entry.activeBlockIndex >= 0) {
          entry.activeBlockIndex = -1;
          entry.isTyping = false;
          changed = true;
        }
      }
    }
    if (changed) {
      // Find workspaceId from any client in that map
      for (const [ws] of map.entries()) {
        const meta = clientMeta.get(ws);
        if (meta?.workspaceId) {
          checkAndBroadcastCollisions(meta.workspaceId, noteId);
          break;
        }
      }
    }
  }

  // Ping clients
  wss.clients.forEach((ws) => {
    const meta = clientMeta.get(ws);
    if (!meta || !meta.isAlive) {
      leaveRoom(ws, meta);
      return ws.terminate();
    }
    meta.isAlive = false;
    ws.ping();
  });
}, 5000);
