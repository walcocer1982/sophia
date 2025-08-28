import fs from 'fs/promises';
import path from 'path';
import { getCollection } from '@/lib/mongo';

function historyPath(sessionKey: string) {
  const dir = path.join(process.cwd(), '.data', 'history');
  const file = path.join(dir, `${sessionKey}.jsonl`);
  return { dir, file };
}

export async function appendHistory(sessionKey: string, record: unknown): Promise<void> {
  const payload = { ts: Date.now(), sessionKey, ...((record as object) || {}) } as any;
  if ((process.env.HISTORY_STORE || '').toLowerCase() === 'mongo') {
    const col = await getCollection('history');
    await col.insertOne(payload);
    return;
  }
  const { dir, file } = historyPath(sessionKey);
  try { await fs.mkdir(dir, { recursive: true }); } catch {}
  const line = JSON.stringify(payload) + '\n';
  await fs.appendFile(file, line, 'utf-8');
}

export async function clearHistory(sessionKey: string): Promise<void> {
  if ((process.env.HISTORY_STORE || '').toLowerCase() === 'mongo') {
    const col = await getCollection('history');
    await col.deleteMany({ sessionKey });
    return;
  }
  const { file } = historyPath(sessionKey);
  try { await fs.unlink(file); } catch {}
}

export async function getRecentHistory(sessionKey: string, limit: number = 6): Promise<string[]> {
  if ((process.env.HISTORY_STORE || '').toLowerCase() === 'mongo') {
    const col = await getCollection('history');
    const docs = await col
      .find({ sessionKey })
      .sort({ ts: 1 })
      .project({ message: 1, followUp: 1, content: 1, _id: 0 })
      .toArray();
    const tail = docs.slice(-limit);
    const out: string[] = [];
    for (const rec of tail) {
      try {
        if (typeof (rec as any)?.content === 'string') { out.push((rec as any).content); continue; }
        const msg = (rec as any).message as string | undefined;
        const fu = (rec as any).followUp as string | undefined;
        const combined = [msg, fu].filter(Boolean).join('\n\n');
        if (combined) out.push(combined);
      } catch {}
    }
    return out;
  }
  const { file } = historyPath(sessionKey);
  try {
    const raw = await fs.readFile(file, 'utf-8');
    const lines = raw.trim().split(/\n+/).filter(Boolean);
    const tail = lines.slice(-limit);
    const out: string[] = [];
    for (const ln of tail) {
      try {
        const rec: any = JSON.parse(ln);
        if (typeof rec?.content === 'string') { out.push(rec.content); continue; }
        if (typeof rec?.message === 'string' || typeof rec?.followUp === 'string') {
          const combined = [rec.message, rec.followUp].filter(Boolean).join('\n\n');
          if (combined) out.push(combined);
          continue;
        }
      } catch {}
    }
    return out;
  } catch {
    return [];
  }
}

export type StoredHistoryItem = {
  ts: number;
  sessionKey: string;
  planUrl?: string;
  stepIdx?: number;
  momentIdx?: number;
  message?: string;
  followUp?: string;
  content?: string;
  sender?: 'ai' | 'student';
  email?: string;
};

export async function getFullHistory(sessionKey: string): Promise<StoredHistoryItem[]> {
  if ((process.env.HISTORY_STORE || '').toLowerCase() === 'mongo') {
    const col = await getCollection<StoredHistoryItem>('history');
    const docs = await col.find({ sessionKey }).sort({ ts: 1 }).toArray();
    return docs as StoredHistoryItem[];
  }
  const { file } = historyPath(sessionKey);
  try {
    const raw = await fs.readFile(file, 'utf-8');
    const lines = raw.trim().split(/\n+/).filter(Boolean);
    return lines.map((ln) => {
      try { return JSON.parse(ln) as StoredHistoryItem; } catch { return undefined as any; }
    }).filter(Boolean);
  } catch {
    return [];
  }
}

export async function setUserLastSession(email: string, sessionKey: string): Promise<void> {
  if (!email) return;
  if ((process.env.HISTORY_STORE || '').toLowerCase() === 'mongo') {
    const col = await getCollection<{ _id: string; sessionKey: string; updatedAt: number }>('user_last_session');
    await col.updateOne({ _id: email }, { $set: { sessionKey, updatedAt: Date.now() } }, { upsert: true });
  }
}

export async function getUserLastSession(email: string): Promise<string | null> {
  if (!email) return null;
  if ((process.env.HISTORY_STORE || '').toLowerCase() === 'mongo') {
    const col = await getCollection<{ _id: string; sessionKey: string }>('user_last_session');
    const doc = await col.findOne({ _id: email });
    return doc?.sessionKey || null;
  }
  return null;
}


