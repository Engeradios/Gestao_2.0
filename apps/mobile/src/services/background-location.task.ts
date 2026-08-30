import * as Battery from "expo-battery";
import * as Location from "expo-location";
import * as Network from "expo-network";
import * as TaskManager from "expo-task-manager";
import type { TelemetryPayload } from "./app-campo.service";
import { getTelemetryContext } from "./telemetry-context.service";
import { submitTelemetryOfflineFirst } from "./telemetry-queue.service";

export const BACKGROUND_LOCATION_TASK = "engeradios-background-location-v1";

const BRAZILIAN_UF: Record<string, string> = {
  acre: "AC", alagoas: "AL", amapa: "AP", amazonas: "AM", bahia: "BA",
  ceara: "CE", "distrito federal": "DF", "espirito santo": "ES",
  goias: "GO", maranhao: "MA", "mato grosso": "MT",
  "mato grosso do sul": "MS", "minas gerais": "MG", para: "PA",
  paraiba: "PB", parana: "PR", pernambuco: "PE", piaui: "PI",
  "rio de janeiro": "RJ", "rio grande do norte": "RN",
  "rio grande do sul": "RS", rondonia: "RO", roraima: "RR",
  "santa catarina": "SC", "sao paulo": "SP", sergipe: "SE", tocantins: "TO",
};

function clean(value: string | null | undefined, max: number) {
  const result = value?.trim();
  return result ? result.slice(0, max) : undefined;
}
function uf(region: string | null | undefined) {
  if (!region) return undefined;
  if (/^[A-Za-z]{2}$/.test(region.trim())) return region.trim().toUpperCase();
  const key = region.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return BRAZILIAN_UF[key];
}

TaskManager.defineTask<{ locations: Location.LocationObject[] }>(
  BACKGROUND_LOCATION_TASK,
  async ({ data, error }) => {
    if (error || !data?.locations?.length) return;
    const context = await getTelemetryContext();
    if (!context || context.status !== "ATIVO") return;

    for (const location of data.locations) {
      if (location.timestamp < new Date(context.startedAt).getTime() - 300_000) continue;
      const [addresses, power, network] = await Promise.all([
        Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        }).catch(() => []),
        Battery.getPowerStateAsync().catch(() => null),
        Network.getNetworkStateAsync().catch(() => null),
      ]);
      const first = addresses[0];
      const logradouro = clean(first?.street, 200);
      const numero = clean(first?.streetNumber, 20);
      const bairro = clean(first?.district, 120);
      const cidade = clean(first?.city ?? first?.subregion, 120);
      const estado = uf(first?.region);
      const completo = clean([
        [logradouro, numero].filter(Boolean).join(", "), bairro,
        [cidade, estado].filter(Boolean).join(" - "),
      ].filter(Boolean).join(" · "), 400);

      const payload: TelemetryPayload = {
        eventoId: `GPS-BG-${context.deviceId}-${Math.round(location.timestamp)}`,
        dispositivoId: context.deviceId,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        precisaoMetros: location.coords.accuracy ?? undefined,
        altitudeMetros: location.coords.altitude ?? undefined,
        velocidadeMetrosSegundo:
          location.coords.speed !== null && location.coords.speed >= 0
            ? location.coords.speed : undefined,
        capturadoEm: new Date(location.timestamp).toISOString(),
        bateriaPercentual:
          power && power.batteryLevel >= 0
            ? Math.round(power.batteryLevel * 100) : undefined,
        carregando: power
          ? power.batteryState === Battery.BatteryState.CHARGING ||
            power.batteryState === Battery.BatteryState.FULL
          : undefined,
        tipoConexao: network ? String(network.type) : undefined,
        online: network?.isConnected ?? undefined,
        enderecoLogradouro: logradouro,
        enderecoNumero: numero,
        enderecoBairro: bairro,
        enderecoCidade: cidade,
        enderecoUf: estado,
        enderecoCompleto: completo,
      };
      await submitTelemetryOfflineFirst(context.shiftId, payload);
    }
  },
);
