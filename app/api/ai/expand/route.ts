import { NextRequest, NextResponse } from 'next/server';
import { getAIProvider } from '@/lib/ai/factory';

export async function POST(req: NextRequest) {
  try {
    const { bullet } = await req.json();
    if (!bullet || typeof bullet !== 'string') {
      return NextResponse.json({ error: 'Bullet text is required' }, { status: 400 });
    }

    const ai = getAIProvider();
    const result = await ai.expand(bullet);

    return NextResponse.json({ result, provider: ai.name });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'AI request failed' }, { status: 500 });
  }
}
