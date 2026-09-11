import { NextRequest, NextResponse } from 'next/server';
import { getAIProvider } from '@/lib/ai/factory';

export async function POST(req: NextRequest) {
  try {
    const { prompt, context } = await req.json();
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const ai = getAIProvider();
    const result = await ai.chat(prompt, context);

    return NextResponse.json({ result, provider: ai.name });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'AI request failed' }, { status: 500 });
  }
}
