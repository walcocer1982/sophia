// Simple chat runner against the engine turn endpoint (HTTP if available, otherwise direct import)
import 'dotenv/config';
import fs from 'fs';
import path from 'path';

// Ensure .env.local is loaded when available (Next.js style)
try {
  const localPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(localPath)) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('dotenv').config({ path: localPath });
  }
} catch {}

const planUrl = '/courses/SSO001/lessons/lesson02.json';
const sessionKey = `cli-chat-${Date.now()}`;
const base = process.env.BASE_URL || 'http://localhost:3001';

type TurnRes = { message?: string; followUp?: string; assessment?: any; state?: any };

async function httpTurn(body: any): Promise<TurnRes> {
  const res = await fetch(`${base}/api/engine/turn`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as any;
}

async function directTurn(body: any): Promise<TurnRes> {
  const mod = await import('../app/api/engine/turn/route');
  const POST = (mod as any).POST as (req: Request) => Promise<Response>;
  const req = new Request('http://local/api/engine/turn', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const res = await POST(req as any);
  return (await (res as any).json()) as any;
}

async function turn(body: any) {
  try {
    return await httpTurn(body);
  } catch {
    return await directTurn(body);
  }
}

function logStep(tag: string, r: TurnRes) {
  const msg = (r.message || '').trim();
  const fu = (r.followUp || '').trim();
  const compose = (m: string, f: string) => {
    if (m && f) {
      const norm = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();
      if (norm(m).includes(norm(f))) return m; // evitar repetir la pregunta
      const endPunct = /[\.!?]$/.test(m) ? '' : '.';
      return `${m}${endPunct}\n\n${f}`;
    }
    return m || f || '';
  };
  const out = compose(msg, fu);
  console.log(`\n[${tag}]`);
  if (out) console.log(out);
}

async function main() {
  console.log(`Chat clave: ${sessionKey}`);
  // Inicio (reset) → obtener pregunta inicial
  const t0 = await turn({ sessionKey, planUrl, reset: true, userInput: '' });
  logStep('INICIO', t0);

  // "no se" #1 → HINT
  const t1 = await turn({ sessionKey, planUrl, userInput: 'no se' });
  logStep('NO_SE_1', t1);

  // "no se" #2 → HINT (reask más fácil)
  const t2 = await turn({ sessionKey, planUrl, userInput: 'no se' });
  logStep('NO_SE_2', t2);

  // "no se" #3 → avance/puente
  const t3 = await turn({ sessionKey, planUrl, userInput: 'no se' });
  logStep('NO_SE_3', t3);

  // Respuesta tentativa post‑avance
  const t4 = await turn({ sessionKey, planUrl, userInput: 'arnes casco guantes' });
  logStep('POST_AVANCE', t4);
}

main().catch((err) => {
  console.error('[CHAT_ERROR]', err);
  process.exit(1);
});


