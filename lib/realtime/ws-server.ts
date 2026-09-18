import { WebSocketServer, WebSocket } from 'ws';
import { serverStore, StoredNote, StoredBlock } from '../server-store';

declare global {
  var __synapse_ws_server: WebSocketServer | undefined;
  var __synapse_ws_interval: NodeJS.Timeout | undefined;
}

interface ClientMeta {
  ws: WebSocket;
  workspaceId: string;
  user?: { name?: string; email?: string; id?: string };
  isAlive: boolean;
}

const clientMap = new WeakMap<WebSocket, ClientMeta>();
const rooms = new Map<string, Set<WebSocket>>();

export function startWebSocketServer(port: number = 3001): WebSocketServer | null {
  if (global.__synapse_ws_server) {
    return global.__synapse_ws_server;
  }

  try {
    const wss = new WebSocketServer({ port });
    global.__synapse_ws_server = wss;

    wss.on('connection', (ws: WebSocket, req) => {
      const meta: ClientMeta = {
        ws,
        workspaceId: '',
        isAlive: true,
      };
      clientMap.set(ws, meta);

      ws.on('pong', () => {
        meta.isAlive = true;
      });

      ws.on('message', (rawData) => {
        try {
          const message = JSON.parse(rawData.toString());
          handleClientMessage(ws, meta, message);
        } catch (err: any) {
          console.warn('[WS Server] Failed to parse client message:', err.message);
        }
      });

      ws.on('close', () => {
        leaveRoom(ws, meta);
      });

      ws.on('error', (err) => {
        console.warn('[WS Server] Socket error:', err.message);
        leaveRoom(ws, meta);
      });

      // Send initial connection ACK
      ws.send(JSON.stringify({ type: 'CONNECTED', serverTime: Date.now() }));
    });

    // 15-second heartbeat ping to detect stale sockets
    const pingInterval = setInterval(() => {
      wss.clients.forEach((ws) => {
        const meta = clientMap.get(ws);
        if (!meta || !meta.isAlive) {
          leaveRoom(ws, meta);
          return ws.terminate();
        }
        meta.isAlive = false;
        ws.ping();
      });
    }, 15000);

    wss.on('close', () => {
      clearInterval(pingInterval);
      global.__synapse_ws_server = undefined;
    });

    console.log(`[WS Server] 🚀 Real-time WebSocket sync server listening on port ${port} (Event-Driven Mode)`);
    return wss;
  } catch (err: any) {
    if (err.code === 'EADDRINUSE') {
      console.log(`[WS Server] Port ${port} is already in use (server running in another process)`);
      return null;
    }
    console.error(`[WS Server] Failed to start WebSocket server on port ${port}:`, err);
    return null;
  }
}

function handleClientMessage(ws: WebSocket, meta: ClientMeta, msg: any) {
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
      rooms.get(workspaceId)!.add(ws);

      console.log(`[WS Server] 👤 User ${user?.name || user?.email || 'member'} joined room: ${workspaceId} (total: ${rooms.get(workspaceId)!.size})`);

      // Send immediate full sync payload to the new joiner
      const currentNotes = serverStore.getNotes(workspaceId).filter((n) => !n.is_archived);
      const currentBlocks = serverStore.getBlocksByWorkspace(workspaceId);

      ws.send(
        JSON.stringify({
          type: 'SYNC_FULL',
          workspaceId,
          notes: currentNotes,
          blocks: currentBlocks,
          timestamp: Date.now(),
        })
      );

      // Notify others that a member joined
      broadcastToRoom(
        workspaceId,
        {
          type: 'MEMBER_JOINED',
          workspaceId,
          user,
          activeCount: rooms.get(workspaceId)!.size,
        },
        ws
      );
      break;
    }

    case 'NOTE_CHANGE': {
      const { workspaceId, note, user } = msg;
      if (!workspaceId || !note) return;

      // 1. Save to server store
      try {
        serverStore.saveNote(note as StoredNote);
      } catch (e) {}

      // 2. Broadcast immediately to all other members in the workspace (like a chat message)
      broadcastToRoom(
        workspaceId,
        {
          type: 'NOTE_UPDATED',
          workspaceId,
          note,
          author: user || meta.user,
          timestamp: Date.now(),
        },
        ws
      );
      break;
    }

    case 'BLOCKS_CHANGE': {
      const { workspaceId, noteId, blocks, user } = msg;
      if (!workspaceId || !noteId || !Array.isArray(blocks)) return;

      // 1. Save blocks in server store
      try {
        serverStore.saveBlocks(noteId, blocks as StoredBlock[], workspaceId);
      } catch (e) {}

      // 2. Broadcast immediately to all other members in the workspace
      broadcastToRoom(
        workspaceId,
        {
          type: 'BLOCKS_UPDATED',
          workspaceId,
          noteId,
          blocks,
          author: user || meta.user,
          timestamp: Date.now(),
        },
        ws
      );
      break;
    }

    case 'REQUEST_SYNC': {
      const { workspaceId } = msg;
      if (!workspaceId) return;

      const notes = serverStore.getNotes(workspaceId).filter((n) => !n.is_archived);
      const blocks = serverStore.getBlocksByWorkspace(workspaceId);

      ws.send(
        JSON.stringify({
          type: 'SYNC_FULL',
          workspaceId,
          notes,
          blocks,
          timestamp: Date.now(),
        })
      );
      break;
    }

    default:
      break;
  }
}

function leaveRoom(ws: WebSocket, meta?: ClientMeta) {
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
        activeCount: room.size,
      });
    }
  }
  meta.workspaceId = '';
}

function broadcastToRoom(workspaceId: string, message: any, senderWs?: WebSocket) {
  const room = rooms.get(workspaceId);
  if (!room) return;

  const payload = JSON.stringify(message);
  for (const client of room) {
    if (client !== senderWs && client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}
