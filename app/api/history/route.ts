import { NextResponse } from 'next/server';
import { getFullHistory, getUserLastSession } from '@/session/history';
import { getSessionStore } from '@/session/store';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const sessionKey = url.searchParams.get('sessionKey');
    const by = url.searchParams.get('by') || 'session';

    if (by === 'user') {
      const session: any = await getServerSession(authOptions as any);
      const email: string | undefined = session?.user?.email || undefined;
      if (!email) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });
      const last = await getUserLastSession(email);
      if (!last) return NextResponse.json({ items: [], sessionKey: null, state: null });
      const items = await getFullHistory(last);
      const state = await getSessionStore().get(last);
      const stateMin = state ? { stepIdx: state.stepIdx, momentIdx: state.momentIdx, done: state.done, stepCode: (state as any)?.stepCode } : null;
      return NextResponse.json({ items, sessionKey: last, state: stateMin });
    }

    if (!sessionKey) return NextResponse.json({ error: 'missing_sessionKey' }, { status: 400 });
    const items = await getFullHistory(sessionKey);
    const state = await getSessionStore().get(sessionKey);
    const stateMin = state ? { stepIdx: state.stepIdx, momentIdx: state.momentIdx, done: state.done, stepCode: (state as any)?.stepCode } : null;
    return NextResponse.json({ items, sessionKey, state: stateMin });
  } catch (e) {
    return NextResponse.json({ error: 'history_failed' }, { status: 500 });
  }
}


