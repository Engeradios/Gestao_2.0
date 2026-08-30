import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'engeradios-mobile.db';
const PROFILE_KEY = 'engeradios.user';
let initialization: Promise<SQLite.SQLiteDatabase> | null = null;

async function database(): Promise<SQLite.SQLiteDatabase> {
  if (!initialization) {
    initialization = (async () => {
      const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS app_local_profile (
          storage_key TEXT PRIMARY KEY NOT NULL,
          payload_json TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);
      return db;
    })();
  }
  return initialization;
}

export function isProfileStorageKey(key: string): boolean {
  return key === PROFILE_KEY;
}

export async function setLocalProfile(value: string): Promise<void> {
  JSON.parse(value);
  const db = await database();
  await db.runAsync(
    `INSERT INTO app_local_profile (storage_key, payload_json, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(storage_key) DO UPDATE SET
       payload_json = excluded.payload_json,
       updated_at = excluded.updated_at`,
    PROFILE_KEY,
    value,
    new Date().toISOString(),
  );
}

export async function getLocalProfile(): Promise<string | null> {
  const db = await database();
  const row = await db.getFirstAsync<{ payload_json: string }>(
    'SELECT payload_json FROM app_local_profile WHERE storage_key = ? LIMIT 1',
    PROFILE_KEY,
  );
  return row?.payload_json ?? null;
}

export async function deleteLocalProfile(): Promise<void> {
  const db = await database();
  await db.runAsync('DELETE FROM app_local_profile WHERE storage_key = ?', PROFILE_KEY);
}
