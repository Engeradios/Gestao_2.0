import * as Network from "expo-network";
import * as SQLite from "expo-sqlite";
import { api } from "./api";
import type { TelemetryPayload } from "./app-campo.service";

const DATABASE_NAME = "engeradios-offline.db";
const MAX_ATTEMPTS = 10;
const DEFAULT_BATCH = 25;
let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;
let synchronizationPromise: Promise<SyncResult> | null = null;

export type QueuedTelemetry = {
  eventoId: string;
  shiftId: string;
  payload: TelemetryPayload;
  attempts: number;
};
export type SyncResult = { sent: number; failed: number; pending: number };

async function database() {
  databasePromise ??= SQLite.openDatabaseAsync(DATABASE_NAME);
  const db = await databasePromise;
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS telemetry_queue (
      evento_id TEXT PRIMARY KEY NOT NULL,
      shift_id TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      created_at TEXT NOT NULL,
      next_attempt_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS telemetry_queue_next_idx
      ON telemetry_queue(next_attempt_at, created_at);
  `);
  return db;
}

export async function enqueueTelemetry(shiftId: string, payload: TelemetryPayload) {
  const db = await database();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT OR IGNORE INTO telemetry_queue
      (evento_id, shift_id, payload_json, created_at, next_attempt_at)
     VALUES (?, ?, ?, ?, ?)`,
    payload.eventoId, shiftId, JSON.stringify(payload), now, now,
  );
}

export async function pendingTelemetry(limit = DEFAULT_BATCH): Promise<QueuedTelemetry[]> {
  const db = await database();
  const rows = await db.getAllAsync<{
    evento_id: string; shift_id: string; payload_json: string; attempts: number;
  }>(
    `SELECT evento_id, shift_id, payload_json, attempts
       FROM telemetry_queue
      WHERE attempts < ? AND next_attempt_at <= ?
      ORDER BY created_at ASC LIMIT ?`,
    MAX_ATTEMPTS, new Date().toISOString(), Math.max(1, Math.min(limit, 100)),
  );
  return rows.flatMap((row) => {
    try {
      return [{ eventoId: row.evento_id, shiftId: row.shift_id,
        payload: JSON.parse(row.payload_json) as TelemetryPayload,
        attempts: row.attempts }];
    } catch {
      return [];
    }
  });
}

export async function markTelemetrySent(eventoId: string) {
  const db = await database();
  await db.runAsync("DELETE FROM telemetry_queue WHERE evento_id = ?", eventoId);
}

export async function markTelemetryFailed(eventoId: string, reason: unknown, attempts: number) {
  const db = await database();
  const delay = Math.min(15 * 60_000, 30_000 * 2 ** Math.min(attempts, 5));
  const next = new Date(Date.now() + delay).toISOString();
  const message = reason instanceof Error ? reason.message : String(reason);
  await db.runAsync(
    `UPDATE telemetry_queue SET attempts = attempts + 1,
      last_error = ?, next_attempt_at = ? WHERE evento_id = ?`,
    message.slice(0, 500), next, eventoId,
  );
}

export async function telemetryQueueCount() {
  const db = await database();
  const row = await db.getFirstAsync<{ total: number }>(
    "SELECT COUNT(*) AS total FROM telemetry_queue",
  );
  return row?.total ?? 0;
}

async function synchronizeBatch(): Promise<SyncResult> {
  const network = await Network.getNetworkStateAsync();
  if (!network.isConnected || network.isInternetReachable === false) {
    return { sent: 0, failed: 0, pending: await telemetryQueueCount() };
  }
  let sent = 0;
  let failed = 0;
  const items = await pendingTelemetry();
  for (const item of items) {
    try {
      await api.post(
        `/app-campo/expedientes/${encodeURIComponent(item.shiftId)}/telemetria`,
        item.payload,
      );
      await markTelemetrySent(item.eventoId);
      sent += 1;
    } catch (error) {
      await markTelemetryFailed(item.eventoId, error, item.attempts);
      failed += 1;
      if (!Network.getNetworkStateAsync) break;
    }
  }
  return { sent, failed, pending: await telemetryQueueCount() };
}

export function synchronizeTelemetryQueue() {
  synchronizationPromise ??= synchronizeBatch().finally(() => {
    synchronizationPromise = null;
  });
  return synchronizationPromise;
}

export async function submitTelemetryOfflineFirst(
  shiftId: string,
  payload: TelemetryPayload,
) {
  await enqueueTelemetry(shiftId, payload);
  return synchronizeTelemetryQueue();
}
