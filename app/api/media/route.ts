import type { NextRequest } from 'next/server';

type MediaMap = Record<string, { images?: string[]; items?: Array<{ url?: string; src?: string; image?: string; name?: string; title?: string; description?: string; desc?: string; caption?: string; label?: string }> } >;

async function loadPlanJson(absPlanUrl: string): Promise<any> {
  const res = await fetch(absPlanUrl, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to load plan: ${res.status}`);
  return await res.json();
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const planUrl = searchParams.get('planUrl') || '/courses/SSO001/lessons/lesson02.json';
    const step = searchParams.get('step');
    const docUrl = searchParams.get('docUrl'); // documento externo opcional con mapping de media

    // Construir URL absoluta contra el mismo host
    const absPlanUrl = new URL(planUrl, req.url).toString();
    const plan = await loadPlanJson(absPlanUrl);
    const mediaPlan: MediaMap = (plan?.media || {}) as MediaMap;
    let mediaDoc: MediaMap = {};
    if (docUrl) {
      const absDocUrl = new URL(docUrl, req.url).toString();
      try {
        mediaDoc = (await loadPlanJson(absDocUrl)) as MediaMap;
      } catch {}
    }
    const media: MediaMap = { ...mediaPlan, ...mediaDoc };

    if (step) {
      const entry = media[String(step)] || { images: [] };
      const images = Array.isArray(entry?.images) ? entry.images : [];
      const items = Array.isArray(entry?.items) ? entry.items : [];
      return new Response(
        JSON.stringify({ step, images, items }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ media }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'media endpoint error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}



