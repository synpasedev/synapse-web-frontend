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

const wss = new WebSocketServer({ port: PORT });

console.log(`[ws-server] ⚡ Synapse Real-time WebSocket server running on ws://localhost:${PORT} (Event-Driven Mode)`);

wss.on('connection', (ws) => {
  const meta = { ws, workspaceId: '', isAlive: true };
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

      // Broadcast to room members immediately (like a chat message)
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

      // Broadcast to room members immediately
      broadcastToRoom(workspaceId, {
        type: 'BLOCKS_UPDATED',
        workspaceId,
        noteId,
        blocks: formatted,
        author: user || meta.user,
        timestamp: Date.now(),
      }, ws);
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

function leaveRoom(ws, meta) {
  if (!meta || !meta.workspaceId) return;
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
  meta.workspaceId = '';
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



// Keepalive pings
setInterval(() => {
  wss.clients.forEach((ws) => {
    const meta = clientMeta.get(ws);
    if (!meta || !meta.isAlive) {
      leaveRoom(ws, meta);
      return ws.terminate();
    }
    meta.isAlive = false;
    ws.ping();
  });
}, 15000);
