import { MobileAppShell } from "../../components/mobile-app-shell";
import Constants from "expo-constants";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { api } from "../../services/api";
type State = {
  kind: "idle" | "loading" | "online" | "http" | "timeout" | "network";
  message: string;
  latency?: number;
  status?: number;
  checkedAt?: Date;
};
const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "Não configurada";
export default function AboutScreen() {
  const [state, setState] = useState<State>({
    kind: "idle",
    message: "Ainda não verificada",
  });
  const check = useCallback(async () => {
    const started = Date.now();
    setState({ kind: "loading", message: "Verificando conexão..." });
    try {
      const response = await api.get("/health", { timeout: 8000 });
      setState({
        kind: "online",
        message:
          response.data?.status === "ok" ? "API operacional" : "API respondeu",
        status: response.status,
        latency: Date.now() - started,
        checkedAt: new Date(),
      });
    } catch (error: any) {
      const status = error?.response?.status;
      const code = error?.code;
      if (status)
        setState({
          kind: "http",
          message: `API respondeu com HTTP ${status}`,
          status,
          latency: Date.now() - started,
          checkedAt: new Date(),
        });
      else if (code === "ECONNABORTED" || code === "ETIMEDOUT")
        setState({
          kind: "timeout",
          message: "Tempo limite excedido",
          latency: Date.now() - started,
          checkedAt: new Date(),
        });
      else
        setState({
          kind: "network",
          message: "Não foi possível alcançar a API",
          latency: Date.now() - started,
          checkedAt: new Date(),
        });
    }
  }, []);
  useEffect(() => {
    check();
  }, [check]);
  const version =
    Constants.expoConfig?.version ??
    process.env.EXPO_PUBLIC_VERSION ??
    "Não informada";
  const environment = __DEV__ ? "Desenvolvimento / Expo Go" : "Build instalado";
  const online = state.kind === "online";
  return (
    <MobileAppShell title="Sobre o aplicativo" subtitle="Versão e diagnóstico de conectividade.">
      <ScrollView style={s.page} contentContainerStyle={s.content}>
      <View style={s.hero}>
        <Text style={s.eyebrow}>GESTÃO ENGERÁDIOS 2.0</Text>
        <Text style={s.title}>Sobre o aplicativo</Text>
        <Text style={s.subtitle}>
          Informações técnicas e diagnóstico de conectividade.
        </Text>
      </View>
      <View style={s.card}>
        <Text style={s.section}>Aplicativo</Text>
        <Row label="Versão" value={version} />
        <Row label="Ambiente" value={environment} />
        <Row
          label="Projeto"
          value={Constants.expoConfig?.slug ?? "engeradios-mobile"}
        />
      </View>
      <View style={s.card}>
        <View style={s.statusHead}>
          <View>
            <Text style={s.section}>Conectividade</Text>
            <Text style={s.statusText}>{state.message}</Text>
          </View>
          <View
            style={[
              s.dot,
              {
                backgroundColor: online
                  ? "#16A34A"
                  : state.kind === "loading"
                    ? "#F59E0B"
                    : "#DC2626",
              },
            ]}
          />
        </View>
        <Row label="URL da API" value={apiUrl} />
        {state.status ? (
          <Row label="HTTP" value={String(state.status)} />
        ) : null}
        {state.latency !== undefined ? (
          <Row label="Latência" value={`${state.latency} ms`} />
        ) : null}
        {state.checkedAt ? (
          <Row
            label="Última verificação"
            value={state.checkedAt.toLocaleString("pt-BR")}
          />
        ) : null}
        <Pressable
          disabled={state.kind === "loading"}
          style={s.button}
          onPress={check}
        >
          {state.kind === "loading" ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={s.buttonText}>Testar conexão</Text>
          )}
        </Pressable>
      </View>
      <Text style={s.footer}>Engerádios • Plataforma Corporativa</Text>
    </ScrollView>
    </MobileAppShell>
  );
}
function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.row}>
      <Text style={s.label}>{label}</Text>
      <Text selectable style={s.value}>
        {value}
      </Text>
    </View>
  );
}
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#F1F5F9" },
  content: { paddingBottom: 34 },
  hero: { backgroundColor: "#111827", padding: 24, paddingTop: 36 },
  eyebrow: {
    color: "#FCA5A5",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  title: { color: "#FFF", fontSize: 28, fontWeight: "900", marginTop: 7 },
  subtitle: { color: "#CBD5E1", marginTop: 8, lineHeight: 20 },
  card: {
    backgroundColor: "#FFF",
    margin: 16,
    marginBottom: 0,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  section: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 8,
  },
  row: { paddingVertical: 11, borderTopWidth: 1, borderTopColor: "#F1F5F9" },
  label: { color: "#64748B", fontSize: 12, fontWeight: "800" },
  value: { color: "#111827", fontSize: 14, fontWeight: "700", marginTop: 4 },
  statusHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusText: { color: "#475569", marginBottom: 8 },
  dot: { width: 14, height: 14, borderRadius: 7 },
  button: {
    height: 50,
    borderRadius: 14,
    backgroundColor: "#D90000",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },
  buttonText: { color: "#FFF", fontWeight: "900" },
  footer: {
    textAlign: "center",
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 24,
  },
});
