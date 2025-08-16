import fs from 'fs/promises';
import path from 'path';

function historyPath(sessionKey: string) {
  const dir = path.join(process.cwd(), '.data', 'history');
  const file = path.join(dir, `${sessionKey}.jsonl`);
  return { dir, file };
}

export async function appendHistory(sessionKey: string, record: unknown): Promise<void> {
  const { dir, file } = historyPath(sessionKey);
  try { await fs.mkdir(dir, { recursive: true }); } catch {}
  const line = JSON.stringify({ ts: Date.now(), ...((record as object) || {}) }) + '\n';
  await fs.appendFile(file, line, 'utf-8');
}

export async function clearHistory(sessionKey: string): Promise<void> {
  const { file } = historyPath(sessionKey);
  try { await fs.unlink(file); } catch {}
}

export async function getRecentHistory(sessionKey: string, limit: number = 6): Promise<string[]> {
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


