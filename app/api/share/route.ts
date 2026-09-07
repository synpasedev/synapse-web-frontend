import { NextRequest, NextResponse } from 'next/server';
import { serverStore, SharedSnapshot } from '@/lib/server-store';

/**
 * POST /api/share
 * Body: { type, id, resource, blocks?, publisherName? }
 * Publishes a snapshot of the resource to the server so anyone with the link can view it.
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

    const snapshot: SharedSnapshot = {
      id,
      type: type.toLowerCase(),
      resource,
      blocks: blocks || [],
      publishedAt: new Date().toISOString(),
      publisherName: publisherName || 'Anonymous',
    };

    serverStore.publishShare(snapshot);

    return NextResponse.json({
      success: true,
      shareKey: `${snapshot.type}::${snapshot.id}`,
      publishedAt: snapshot.publishedAt,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to publish share' }, { status: 500 });
  }
}

/**
 * GET /api/share?type=note&id=note-welcome
 * Returns the published snapshot for a given resource.
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

  const snapshot = serverStore.getShare(type.toLowerCase(), id);

  if (!snapshot) {
    return NextResponse.json(
      { error: 'Shared content not found. The owner needs to re-share this document.' },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, snapshot });
}
