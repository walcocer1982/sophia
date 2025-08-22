import OpenAI from 'openai';

let client: OpenAI | null = null;

export function pickModel(tier: 'cheap'|'thinker'|'embed'='cheap'): string {
  if (tier === 'thinker') return process.env.THINKER_MODEL || 'o3-mini';
  if (tier === 'embed')  return process.env.EMBED_MODEL  || 'text-embedding-3-small';
  return process.env.CHEAP_MODEL || 'gpt-4o-mini';
}

export function getClient() {
  if (client) return client;
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error('OPENAI_API_KEY is required to initialize OpenAI client');
  }
  client = new OpenAI({ apiKey: key });
  return client;
}
