import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export function pickModel(tier: 'cheap'|'thinker'|'embed'='cheap'): string {
  if (tier === 'thinker') return process.env.THINKER_MODEL || 'o3-mini';
  if (tier === 'embed')  return process.env.EMBED_MODEL  || 'text-embedding-3-small';
  return process.env.CHEAP_MODEL || 'gpt-4o-mini';
}

export function getClient() { return client; }
