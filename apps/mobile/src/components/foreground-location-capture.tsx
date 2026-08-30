// FASE5C_TELEMETRIA_AMPLIADA
// FASE5C_R2_ENVIO_BATERIA_CONEXAO
import * as Battery from "expo-battery";
import * as Location from "expo-location";
import * as Network from "expo-network";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { startBackgroundLocation, stopBackgroundLocation } from "../services/background-location.service";
import type { TelemetryPayload } from "../services/app-campo.service";
import { submitTelemetryOfflineFirst, telemetryQueueCount } from "../services/telemetry-queue.service";

type Props = {
  enabled: boolean;
  shiftId?: string;
  deviceId?: string;
};

type Position = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  capturedAt: string;
  address: string;
};

const BRAZILIAN_UF: Record<string, string> = {
  acre: "AC", alagoas: "AL", amapa: "AP", amazonas: "AM", bahia: "BA",
  ceara: "CE", "distrito federal": "DF", "espirito santo": "ES",
  goias: "GO", maranhao: "MA", "mato grosso": "MT",
  "mato grosso do sul": "MS", "minas gerais": "MG", para: "PA",
  paraiba: "PB", parana: "PR", pernambuco: "PE", piaui: "PI",
  "rio de janeiro": "RJ", "rio grande do norte": "RN",
  "rio grande do sul": "RS", rondonia: "RO", roraima: "RR",
  "santa catarina": "SC", "sao paulo": "SP", sergipe: "SE",
  tocantins: "TO",
};

function normalizeUf(region: string | null | undefined) {
  if (!region) return undefined;
  const compact = region.trim();
  if (/^[A-Za-z]{2}$/.test(compact)) return compact.toUpperCase();
  const key = compact.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return BRAZILIAN_UF[key];
}

function clean(value: string | null | undefined, max: number) {
  const result = value?.trim();
  return result ? result.slice(0, max) : undefined;
}

export function ForegroundLocationCapture({
  enabled,
  shiftId,
  deviceId,
}: Props) {
  const subscription =
    useRef<Location.LocationSubscription | null>(null);

  const generation = useRef(0);
  const sending = useRef(false);
  const lastTimestamp = useRef<number | null>(null);

  const [position, setPosition] =
    useState<Position | null>(null);

  const [status, setStatus] = useState("Inativa");
  const [error, setError] = useState("");
  const [telemetryDetail, setTelemetryDetail] = useState("");

  useEffect(() => {
    const currentGeneration = ++generation.current;
    const startedAt = Date.now();
    let cancelled = false;

    async function start() {
      subscription.current?.remove();
      subscription.current = null;
      sending.current = false;
      lastTimestamp.current = null;

      if (!enabled || !shiftId || !deviceId) {
        await stopBackgroundLocation().catch(() => undefined);
        setStatus("Inativa");
        setError("");
        setPosition(null);
        return;
      }

      const serviceEnabled =
        await Location.hasServicesEnabledAsync();

      if (!serviceEnabled) {
        setStatus("GPS desativado");
        setError("Ative a localização do dispositivo.");
        return;
      }

      const permission =
        await Location.requestForegroundPermissionsAsync();

      if (!permission.granted) {
        setStatus("Permissão negada");
        setError(
          "Autorize a localização durante o uso do aplicativo.",
        );
        return;
      }

      if (
        cancelled ||
        currentGeneration !== generation.current
      ) {
        return;
      }

      const background = await startBackgroundLocation().catch(() => ({
        started: false as const,
        reason: "UNAVAILABLE" as const,
      }));

      if (background.started) {
        setStatus("Ativa em segundo plano");
        setError("");
        return;
      }

      setStatus("Ativa durante o expediente");
      setError(
        background.reason === "BACKGROUND_DENIED"
          ? "Permita localização o tempo todo para manter o monitoramento em segundo plano."
          : "Segundo plano indisponível; captura mantida enquanto o aplicativo estiver aberto.",
      );

      const createdSubscription =
        await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 60000,
            distanceInterval: 0,
          },
          async (location) => {
            if (
              cancelled ||
              currentGeneration !== generation.current ||
              !enabled ||
              !shiftId ||
              !deviceId
            ) {
              return;
            }

            /*
             * Rejeita posição armazenada antes da criação
             * desta assinatura.
             */
            if (location.timestamp < startedAt - 5000) {
              return;
            }

            /*
             * Impede repetição na mesma assinatura.
             */
            if (
              lastTimestamp.current === location.timestamp
            ) {
              return;
            }

            lastTimestamp.current = location.timestamp;

            const capturedAt = new Date(
              location.timestamp,
            ).toISOString();

            setPosition({
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              accuracy: location.coords.accuracy,
              capturedAt,
              address: "Localizando endereço...",
            });

            if (sending.current) {
              return;
            }

            sending.current = true;

            let bateriaPercentual: number | undefined;
            let carregando: boolean | undefined;
            let tipoConexao: string | undefined;
            let online: boolean | undefined;
            let enderecoLogradouro: string | undefined;
            let enderecoNumero: string | undefined;
            let enderecoBairro: string | undefined;
            let enderecoCidade: string | undefined;
            let enderecoUf: string | undefined;
            let enderecoCompleto: string | undefined;

            try {
              const [addresses, power, network] = await Promise.all([
                Location.reverseGeocodeAsync({
                  latitude: location.coords.latitude,
                  longitude: location.coords.longitude,
                }).catch(() => []),
                Battery.getPowerStateAsync(),
                Network.getNetworkStateAsync(),
              ]);

              const first = addresses[0];
              enderecoLogradouro = clean(first?.street, 200);
              enderecoNumero = clean(first?.streetNumber, 20);
              enderecoBairro = clean(first?.district, 120);
              enderecoCidade = clean(first?.city ?? first?.subregion, 120);
              enderecoUf = normalizeUf(first?.region);
              enderecoCompleto = clean(
                [
                  [enderecoLogradouro, enderecoNumero].filter(Boolean).join(", "),
                  enderecoBairro,
                  [enderecoCidade, enderecoUf].filter(Boolean).join(" - "),
                ].filter(Boolean).join(" · "),
                400,
              );

              setPosition((current) =>
                current
                  ? {
                      ...current,
                      address: enderecoCompleto ?? "Endereço indisponível",
                    }
                  : current,
              );

              bateriaPercentual =
                power.batteryLevel >= 0
                  ? Math.round(power.batteryLevel * 100)
                  : undefined;

              carregando =
                power.batteryState === Battery.BatteryState.CHARGING ||
                power.batteryState === Battery.BatteryState.FULL;

              tipoConexao = String(network.type);
              online = network.isConnected ?? undefined;

              if (
                cancelled ||
                currentGeneration !== generation.current
              ) {
                sending.current = false;
                return;
              }

              setTelemetryDetail(
                `Bateria ${bateriaPercentual ?? "indisponível"}% | ` +
                  `Rede ${tipoConexao}`,
              );
            } catch {
              bateriaPercentual = undefined;
              carregando = undefined;
              tipoConexao = undefined;
              online = undefined;
              enderecoLogradouro = undefined;
              enderecoNumero = undefined;
              enderecoBairro = undefined;
              enderecoCidade = undefined;
              enderecoUf = undefined;
              enderecoCompleto = undefined;
            }

            const telemetryPayload: TelemetryPayload = {
              /*
               * Identifica a captura física pelo dispositivo
               * e timestamp, sem depender do expediente.
               */
              eventoId:
                `GPS-${deviceId}-${location.timestamp}`,
              dispositivoId: deviceId,
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              precisaoMetros:
                location.coords.accuracy ?? undefined,
              altitudeMetros:
                location.coords.altitude ?? undefined,
              velocidadeMetrosSegundo:
                location.coords.speed !== null &&
                location.coords.speed >= 0
                  ? location.coords.speed
                  : undefined,
              capturadoEm: capturedAt,
              bateriaPercentual,
              carregando,
              tipoConexao,
              qualidadeSinal: undefined,
              online,
              enderecoLogradouro,
              enderecoNumero,
              enderecoBairro,
              enderecoCidade,
              enderecoUf,
              enderecoCompleto,
            };

            void submitTelemetryOfflineFirst(shiftId, telemetryPayload)
              .then(async (result) => {
                const pending = result.pending ?? await telemetryQueueCount();
                if (
                  !cancelled &&
                  currentGeneration === generation.current
                ) {
                  setStatus(
                    pending === 0
                      ? "Ativa e sincronizada"
                      : `Ativa, ${pending} captura(s) pendente(s)`,
                  );
                  setError("");
                }
              })
              .catch((reason: unknown) => {
                if (
                  !cancelled &&
                  currentGeneration === generation.current
                ) {
                  setStatus(
                    "Ativa, aguardando sincronização",
                  );

                  setError(
                    reason instanceof Error
                      ? reason.message
                      : "Falha ao enviar localização.",
                  );
                }
              })
              .finally(() => {
                if (
                  currentGeneration === generation.current
                ) {
                  sending.current = false;
                }
              });
          },
        );

      /*
       * Descarta assinatura criada depois que o expediente
       * já mudou ou o componente foi desmontado.
       */
      if (
        cancelled ||
        currentGeneration !== generation.current
      ) {
        createdSubscription.remove();
        return;
      }

      subscription.current = createdSubscription;
    }

    void start().catch((reason: unknown) => {
      if (
        !cancelled &&
        currentGeneration === generation.current
      ) {
        setStatus("Falha");

        setError(
          reason instanceof Error
            ? reason.message
            : "Não foi possível iniciar a localização.",
        );
      }
    });

    return () => {
      cancelled = true;
      generation.current += 1;
      subscription.current?.remove();
      subscription.current = null;
      sending.current = false;
      lastTimestamp.current = null;
    };
  }, [deviceId, enabled, shiftId]);

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>
          Localização operacional
        </Text>

        <Text
          style={[
            styles.status,
            enabled ? styles.active : styles.inactive,
          ]}
        >
          {status}
        </Text>
      </View>

      {position && enabled ? (
        <>
          <Text style={styles.detail}>
            Última captura:{" "}
            {new Date(
              position.capturedAt,
            ).toLocaleString("pt-BR")}
          </Text>

          <Text style={styles.detail}>Endereço atual: {position.address}</Text>
          <Text style={styles.detail}>{telemetryDetail}</Text>
          <Text style={styles.detail}>
            Precisão aproximada:{" "}
            {position.accuracy === null
              ? "indisponível"
              : `${Math.round(position.accuracy)} m`}
          </Text>
        </>
      ) : null}

      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : null}

      <Text style={styles.notice}>
        A captura ocorre somente com expediente ativo. Com a permissão
        adequada, permanece ativa quando o aplicativo é minimizado.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#f8fafc",
    borderColor: "#e2e8f0",
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
    padding: 12,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  label: {
    color: "#334155",
    fontWeight: "800",
  },
  status: {
    fontSize: 12,
    fontWeight: "900",
  },
  active: {
    color: "#047857",
  },
  inactive: {
    color: "#64748b",
  },
  detail: {
    color: "#475569",
    fontSize: 12,
    marginTop: 7,
  },
  notice: {
    color: "#64748b",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 8,
  },
  error: {
    color: "#b91c1c",
    fontSize: 12,
    marginTop: 8,
  },
});
