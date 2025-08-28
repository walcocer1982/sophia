import type { SessionState } from '@/session/state';
import fs from 'fs/promises';
import path from 'path';
import { getCollection } from '@/lib/mongo';

export interface SessionStore {
  get(sessionKey: string): Promise<SessionState | undefined>;
  set(sessionKey: string, state: SessionState): Promise<void>;
  delete(sessionKey: string): Promise<void>;
}

class MemoryStore implements SessionStore {
  private map = new Map<string, SessionState>();
  async get(k: string) { return this.map.get(k); }
  async set(k: string, v: SessionState) { this.map.set(k, v); }
  async delete(k: string) { this.map.delete(k); }
}

type FileShape = { sessions: Record<string, { state: SessionState; lastActivity: number }> };

class JsonFileStore implements SessionStore {
  private filePath: string;
  private data: FileShape = { sessions: {} };
  private writing = Promise.resolve();
  constructor(filePath?: string) {
    this.filePath = filePath || path.join(process.cwd(), '.data', 'sessions.json');
  }
  private async ensureLoaded() {
    if (Object.keys(this.data.sessions).length) return;
    try {
      await fs.mkdir(path.dirname(this.filePath), { recursive: true });
      const raw = await fs.readFile(this.filePath, 'utf-8');
      this.data = JSON.parse(raw) as FileShape;
    } catch {
      this.data = { sessions: {} };
    }
  }
  private async flush() {
    const payload = JSON.stringify(this.data);
    const tmp = this.filePath + '.tmp';
    await fs.writeFile(tmp, payload, 'utf-8');
    await fs.rename(tmp, this.filePath);
  }
  async get(k: string) {
    await this.ensureLoaded();
    return this.data.sessions[k]?.state;
  }
  async set(k: string, v: SessionState) {
    await this.ensureLoaded();
    this.data.sessions[k] = { state: v, lastActivity: Date.now() };
    this.writing = this.writing.then(() => this.flush());
    await this.writing;
  }
  async delete(k: string) {
    await this.ensureLoaded();
    delete this.data.sessions[k];
    this.writing = this.writing.then(() => this.flush());
    await this.writing;
  }
}

class MongoSessionStore implements SessionStore {
  private async col() { return getCollection<{ _id: string; state: SessionState; lastActivity: number }>('sessions'); }
  async get(k: string) {
    const doc = await (await this.col()).findOne({ _id: k });
    return doc?.state;
  }
  async set(k: string, v: SessionState) {
    await (await this.col()).updateOne(
      { _id: k },
      { $set: { state: v, lastActivity: Date.now() } },
      { upsert: true }
    );
  }
  async delete(k: string) {
    await (await this.col()).deleteOne({ _id: k });
  }
}

let storeInstance: SessionStore | null = null;
export function getSessionStore(): SessionStore {
  if (storeInstance) return storeInstance;
  const mode = (process.env.SESSION_STORE || '').toLowerCase();
  if (mode === 'mongo') storeInstance = new MongoSessionStore();
  else if (mode === 'file') storeInstance = new JsonFileStore();
  else storeInstance = new MemoryStore();
  return storeInstance;
}


