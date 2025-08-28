import { describe, it, expect } from 'vitest';
import { getClient, pickModel } from '@/lib/ai';
import { MongoClient } from 'mongodb';

describe('Healthchecks: LLM and MongoDB', () => {
  it('LLM: should create OpenAI client and echo minimal output', async () => {
    // Falla claramente si no hay clave; mostramos mensaje útil
    const key = process.env.OPENAI_API_KEY;
    expect(key, 'OPENAI_API_KEY must be set').toBeTruthy();
    const client = getClient();
    const model = pickModel('cheap');
    const r: any = await client.responses.create({
      model,
      input: [
        { role: 'system', content: [{ type: 'text', text: 'Eres un verificador. Responde solo la palabra OK.' }] },
        { role: 'user', content: [{ type: 'input_text', text: 'Di OK si recibiste este mensaje.' }] }
      ],
      temperature: 0
    });
    const out = String(r?.output_text || '').trim().toUpperCase();
    expect(out.includes('OK')).toBe(true);
  }, 20000);

  it('MongoDB: should connect and upsert a health document', async () => {
    const uri = process.env.MONGO_URI as string;
    const dbn = (process.env.MONGO_DB as string) || 'docenteia';
    expect(uri, 'MONGO_URI must be set').toBeTruthy();
    const c = new MongoClient(uri);
    await c.connect();
    const db = c.db(dbn);
    const col = db.collection('health');
    await col.updateOne({ _id: 'vitest' }, { $set: { at: Date.now() } }, { upsert: true });
    const doc = await col.findOne({ _id: 'vitest' });
    expect(Boolean(doc)).toBe(true);
    await c.close();
  }, 20000);
});


