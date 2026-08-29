import * as Application from "expo-application";
import * as Device from "expo-device";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { api } from "./api";

const INSTALLATION_KEY = "engeradios.appcampo.installation-id";

export type AppCampoTerm = {
  id: string;
  versao: string;
  titulo: string;
  conteudo: string;
  conteudoHash: string;
  publicadoEm: string;
};
export type TermStatus = { termo: AppCampoTerm; aceito: boolean; aceite: unknown | null };
export type AppCampoDevice = { id: string; identificador: string; plataforma: string; modelo?: string | null; fabricante?: string | null };
export type AppCampoPause = { id: string; iniciadaServidorEm: string; finalizadaServidorEm?: string | null };
export type WorkShift = {
  id: string;
  status: "ATIVO" | "PAUSADO" | "FINALIZADO" | "CANCELADO";
  iniciadoServidorEm: string;
  finalizadoServidorEm?: string | null;
  dispositivo?: AppCampoDevice | null;
  pausas?: AppCampoPause[];
};

function eventId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}
async function installationId() {
  if (Platform.OS === "android") {
    const id = Application.getAndroidId();
    if (id) return `android-${id}`;
  }
  let id = await SecureStore.getItemAsync(INSTALLATION_KEY);
  if (!id) {
    id = `install-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
    await SecureStore.setItemAsync(INSTALLATION_KEY, id);
  }
  return id;
}
export async function termStatus() {
  const { data } = await api.get<TermStatus>("/app-campo/termos/status");
  return data;
}
export async function registerDevice() {
  const identificador = await installationId();
  const { data } = await api.post<AppCampoDevice>("/app-campo/dispositivos/registrar", {
    identificador,
    plataforma: Platform.OS === "ios" ? "IOS" : Platform.OS === "android" ? "ANDROID" : "WEB",
    modelo: Device.modelName ?? undefined,
    fabricante: Device.manufacturer ?? undefined,
    versaoSistema: String(Platform.Version),
    versaoAplicativo: Application.nativeApplicationVersion ?? "1.0.0",
    corporativo: false,
  });
  return data;
}
export async function acceptTerm(termId: string, deviceId: string) {
  const { data } = await api.post(`/app-campo/termos/${encodeURIComponent(termId)}/aceitar`, { dispositivoId: deviceId });
  return data;
}
export async function currentShift() {
  const { data } = await api.get<WorkShift | null>("/app-campo/expedientes/atual");
  return data;
}
export async function startShift(deviceId: string) {
  const now = new Date().toISOString();
  const { data } = await api.post<WorkShift>("/app-campo/expedientes/iniciar", {
    eventoInicioId: eventId("EXP-INICIO"), dispositivoId: deviceId, iniciadoDispositivoEm: now,
  });
  return data;
}
export async function pauseShift(shiftId: string) {
  const { data } = await api.post(`/app-campo/expedientes/${encodeURIComponent(shiftId)}/pausar`, {
    eventoInicioId: eventId("PAUSA-INICIO"), iniciadaDispositivoEm: new Date().toISOString(), motivo: "INTERVALO",
  });
  return data;
}
export async function resumeShift(shiftId: string) {
  const { data } = await api.post(`/app-campo/expedientes/${encodeURIComponent(shiftId)}/retomar`, {
    eventoFimId: eventId("PAUSA-FIM"), finalizadaDispositivoEm: new Date().toISOString(),
  });
  return data;
}
export async function finishShift(shiftId: string) {
  const { data } = await api.patch(`/app-campo/expedientes/${encodeURIComponent(shiftId)}/finalizar`, {
    eventoFimId: eventId("EXP-FIM"), finalizadoDispositivoEm: new Date().toISOString(),
  });
  return data;
}

export type TelemetryPayload = {
  eventoId: string;
  dispositivoId: string;
  latitude: number;
  longitude: number;
  precisaoMetros?: number;
  altitudeMetros?: number;
  velocidadeMetrosSegundo?: number;
  capturadoEm: string;
  bateriaPercentual?: number;
  carregando?: boolean;
  tipoConexao?: string;
  qualidadeSinal?: number;
  online?: boolean;
};

export async function sendTelemetry(
  shiftId: string,
  payload: TelemetryPayload,
) {
  const { data } = await api.post(
    `/app-campo/expedientes/${encodeURIComponent(
      shiftId,
    )}/telemetria`,
    payload,
  );

  return data;
}
