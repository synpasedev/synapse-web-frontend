import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// ---------------------------------------------------------------------------
// File-based persistence — shares survive server restarts
// Stored in: <project-root>/.synapse-shares/<type>__<id>.json
// ---------------------------------------------------------------------------

const SHARES_DIR = path.join(process.cwd(), '.synapse-shares');

function ensureSharesDir() {
  if (!fs.existsSync(SHARES_DIR)) {
    fs.mkdirSync(SHARES_DIR, { recursive: true });
  }
}

function shareFilePath(type: string, id: string): string {
  // Sanitise to safe filename
  const safeName = `${type.toLowerCase()}__${id.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  return path.join(SHARES_DIR, `${safeName}.json`);
}

function readShare(type: string, id: string): object | null {
  const filePath = shareFilePath(type, id);
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

function writeShare(type: string, id: string, snapshot: object): void {
  ensureSharesDir();
  const filePath = shareFilePath(type, id);
  fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2), 'utf-8');
}

// ---------------------------------------------------------------------------

/**
 * POST /api/share
 * Body: { type, id, resource, blocks?, publisherName? }
 * Publishes a snapshot to disk — persists across server restarts.
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
    return NextResponse.json(
      { error: err.message || 'Failed to publish share' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/share?type=note&id=note-welcome
 * Returns the published snapshot from disk.
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
