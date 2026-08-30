import * as SecureStore from './secure-store';

const CONTEXT_KEY = "engeradios.telemetry.active-context";

export type TelemetryContext = {
  shiftId: string;
  deviceId: string;
  status: "ATIVO" | "PAUSADO";
  startedAt: string;
  updatedAt: string;
};

export async function saveTelemetryContext(
  shiftId: string,
  deviceId: string,
  status: "ATIVO" | "PAUSADO",
  startedAt: string,
) {
  const value: TelemetryContext = {
    shiftId,
    deviceId,
    status,
    startedAt,
    updatedAt: new Date().toISOString(),
  };
  await SecureStore.setItemAsync(CONTEXT_KEY, JSON.stringify(value));
  return value;
}

export async function getTelemetryContext(): Promise<TelemetryContext | null> {
  const raw = await SecureStore.getItemAsync(CONTEXT_KEY);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<TelemetryContext>;
    if (!value.shiftId || !value.deviceId || !value.startedAt) return null;
    if (value.status !== "ATIVO" && value.status !== "PAUSADO") return null;
    return value as TelemetryContext;
  } catch {
    return null;
  }
}

export async function clearTelemetryContext() {
  await SecureStore.deleteItemAsync(CONTEXT_KEY);
}
