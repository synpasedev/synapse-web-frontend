import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { serverStore } from '@/lib/server-store';

// ---------------------------------------------------------------------------
// File-based & in-memory persistence — shares survive server restarts
// Safe for both local development and Vercel serverless (/var/task is read-only)
// ---------------------------------------------------------------------------

function isServerlessReadOnly(): boolean {
  return Boolean(
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    (typeof process !== 'undefined' && process.cwd && process.cwd().startsWith('/var/task'))
  );
}

function getSharesDir(): string {
  if (isServerlessReadOnly()) {
    return path.join('/tmp', '.synapse-shares');
  }
  return path.join(process.cwd(), '.synapse-shares');
}

function ensureSharesDir(): string | null {
  const primaryDir = getSharesDir();
  try {
    if (!fs.existsSync(primaryDir)) {
      fs.mkdirSync(primaryDir, { recursive: true });
    }
    return primaryDir;
  } catch {
    // If writing in primary failed (e.g. read-only filesystem), fallback to /tmp
    try {
      const tmpDir = path.join('/tmp', '.synapse-shares');
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
      return tmpDir;
    } catch {
      return null;
    }
  }
}

function shareFilePath(type: string, id: string, baseDir?: string): string {
  const dir = baseDir || getSharesDir();
  const safeName = `${type.toLowerCase()}__${id.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  return path.join(dir, `${safeName}.json`);
}

function readShare(type: string, id: string): object | null {
  // 1. In-memory store
  const fromMemory = serverStore.getShare(type.toLowerCase(), id);
  if (fromMemory) return fromMemory;

  // 2. Check disk in primary directory
  const primaryPath = shareFilePath(type, id, getSharesDir());
  try {
    if (fs.existsSync(primaryPath)) {
      const data = JSON.parse(fs.readFileSync(primaryPath, 'utf-8'));
      serverStore.publishShare(data as any);
      return data;
    }
  } catch {}

  // 3. Check /tmp disk fallback if different from primary
  const tmpPath = shareFilePath(type, id, path.join('/tmp', '.synapse-shares'));
  try {
    if (fs.existsSync(tmpPath)) {
      const data = JSON.parse(fs.readFileSync(tmpPath, 'utf-8'));
      serverStore.publishShare(data as any);
      return data;
    }
  } catch {}

  return null;
}

function writeShare(type: string, id: string, snapshot: any): void {
  // 1. Always store in memory
  serverStore.publishShare(snapshot);

  // 2. Best-effort disk persistence (does not crash on read-only environments)
  const dir = ensureSharesDir();
  if (dir) {
    try {
      const filePath = shareFilePath(type, id, dir);
      fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2), 'utf-8');
    } catch (err: any) {
      console.warn('[app/api/share] Disk persistence warning (falling back to memory):', err.message);
    }
  }
}

// ---------------------------------------------------------------------------

/**
 * POST /api/share
 * Body: { type, id, resource, blocks?, publisherName? }
 * Publishes a snapshot to memory and disk — survives restarts without throwing on Vercel.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, id, resource, blocks, publisherName } = body;

    if (!type || !id || !resource) {
      return NextResponse.json(
        { error: 'Missing required fields: type, id, resource' },
        { status: 400 }
      );
    }

    const snapshot = {
      id,
      type: type.toLowerCase(),
      resource,
      blocks: blocks || [],
      publishedAt: new Date().toISOString(),
      publisherName: publisherName || 'Synapse User',
    };

    writeShare(snapshot.type, snapshot.id, snapshot);

    return NextResponse.json({
      success: true,
      shareKey: `${snapshot.type}::${snapshot.id}`,
      publishedAt: snapshot.publishedAt,
    });
  } catch (err: any) {
    console.error('Error publishing share:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to publish share' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/share?type=note&id=note-welcome
 * Returns the published snapshot from memory or disk.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const id = searchParams.get('id');

  if (!type || !id) {
    return NextResponse.json(
      { error: 'Missing required query params: type, id' },
      { status: 400 }
    );
  }

  const snapshot = readShare(type.toLowerCase(), id);

  if (!snapshot) {
    return NextResponse.json(
      {
        error:
          'Shared content not found. The owner needs to open this document and click "Share" to publish it.',
      },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, snapshot });
}
