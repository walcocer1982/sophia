import { MongoClient, type Db, type Collection, type Document } from 'mongodb';

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

export async function getMongoClient(): Promise<MongoClient> {
  if (client) return client;
  if (!clientPromise) {
    const uri = process.env.MONGO_URI || '';
    if (!uri) throw new Error('MONGO_URI is required');
    clientPromise = new MongoClient(uri, { maxPoolSize: 5 }).connect().then((c) => {
      client = c; return c;
    });
  }
  return clientPromise;
}

export async function getDb(): Promise<Db> {
  const c = await getMongoClient();
  const dbName = process.env.MONGO_DB || 'docenteia';
  return c.db(dbName);
}

export async function getCollection<T extends Document = Document>(name: string): Promise<Collection<T>> {
  const db = await getDb();
  return db.collection<T>(name);
}


