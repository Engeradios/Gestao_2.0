import * as SQLite from 'expo-sqlite';
const NAME='engeradios-offline.db';
const VERSION=1;
let promise:Promise<SQLite.SQLiteDatabase>|null=null;
export async function offlineDatabase(){
 promise??=SQLite.openDatabaseAsync(NAME);const db=await promise;
 await db.execAsync(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
 CREATE TABLE IF NOT EXISTS offline_outbox(
  id TEXT PRIMARY KEY NOT NULL, kind TEXT NOT NULL, entity_id TEXT NOT NULL,
  payload_json TEXT NOT NULL, file_uri TEXT, status TEXT NOT NULL DEFAULT 'PENDING',
  attempts INTEGER NOT NULL DEFAULT 0, last_error TEXT, created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL, next_attempt_at TEXT NOT NULL
 );
 CREATE UNIQUE INDEX IF NOT EXISTS offline_outbox_active_unique
 ON offline_outbox(kind,entity_id,file_uri) WHERE status IN ('PENDING','SENDING','REVIEW');
 CREATE INDEX IF NOT EXISTS offline_outbox_due_idx ON offline_outbox(status,next_attempt_at,created_at);
 CREATE TABLE IF NOT EXISTS offline_meta(key TEXT PRIMARY KEY NOT NULL,value TEXT NOT NULL);
 INSERT INTO offline_meta(key,value) VALUES('schema_version','${VERSION}') ON CONFLICT(key) DO UPDATE SET value=excluded.value;`);
 return db;
}
