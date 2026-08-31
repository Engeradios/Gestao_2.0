import { MobileAppShell } from "../../components/mobile-app-shell";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  DeliveryRoute,
  listarRoteiros,
} from "../../services/delivery-route.service";
import { PermissionGate } from '../../components/permission-gate';
import { useConnectivityStore } from '../../stores/connectivity.store';
const statusColor: Record<string, string> = {
  RASCUNHO: "#92400E",
  EM_PLANEJAMENTO: "#1D4ED8",
  PRONTO_PARA_DESPACHO: "#7C3AED",
  DESPACHADO: "#0369A1",
  EM_ROTA: "#047857",
  FINALIZADO: "#166534",
  FINALIZADO_COM_PENDENCIAS: "#B45309",
  CANCELADO: "#991B1B",
};
function RbacContent() {
  const online = useConnectivityStore((state) => state.online);
  const [items, setItems] = useState<DeliveryRoute[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      setError("");
      setItems(await listarRoteiros());
    } catch (e: any) {
      setError(
        e?.response?.status === 403
          ? "Você não possui permissão para visualizar roteiros."
          : "Sem conexão. Os roteiros serão atualizados quando houver internet.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const view = items.filter((x) =>
    `${x.id} ${x.status} ${x.entregador?.nome ?? ""} ${x.veiculo?.placa ?? ""}`
      .toLowerCase()
      .includes(q.toLowerCase()),
  );
  return (
    <MobileAppShell title="Roteiros de entrega" subtitle="Planejamento e acompanhamento das entregas.">
      <ScrollView
      style={s.page}
      contentContainerStyle={s.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
        />
      }
    >
      <View style={s.hero}>
        <Text style={s.eyebrow}>LOGÍSTICA</Text>
        <Text style={s.title}>Roteiro de entrega</Text>
        <Text style={s.subtitle}>
          Planeje, acompanhe e conclua as entregas com segurança.
        </Text>
      </View>
      <View style={s.actions}>
        <Pressable
          style={s.primary}
          onPress={() => router.push("/roteiro-entrega/novo")}
        >
          <Text style={s.primaryText}>+ Novo rascunho</Text>
        </Pressable>
      </View>
      <TextInput
        style={s.search}
        placeholder="Buscar por motorista, placa, status ou código"
        value={q}
        onChangeText={setQ}
      />
      {loading ? (
        <ActivityIndicator color="#D90000" style={{ marginTop: 28 }} />
      ) : null}
      {error ? (
        <View style={s.error}>
          <Text style={s.errorText}>{error}</Text>
          {online ? <Pressable onPress={load}><Text style={s.retry}>Tentar novamente</Text></Pressable> : null}
        </View>
      ) : null}
      {!loading && !error && view.length === 0 ? (
        <Text style={s.empty}>Nenhum roteiro encontrado.</Text>
      ) : null}
      {view.map((r) => (
        <Pressable
          key={String(r.id)}
          style={s.card}
          onPress={() => router.push(`/roteiro-entrega/${r.id}` as never)}
        >
          <View style={s.cardTop}>
            <Text style={s.cardTitle}>Roteiro #{r.id}</Text>
            <View
              style={[
                s.status,
                { backgroundColor: `${statusColor[r.status] ?? "#475569"}18` },
              ]}
            >
              <Text
                style={[
                  s.statusText,
                  { color: statusColor[r.status] ?? "#475569" },
                ]}
              >
                {r.status.replaceAll("_", " ")}
              </Text>
            </View>
          </View>
          <Text style={s.meta}>
            {new Date(r.dataRota).toLocaleDateString("pt-BR")} •{" "}
            {r.entregador?.nome ?? "Motorista não definido"}
          </Text>
          <Text style={s.meta}>
            {r.veiculo?.placa ?? "Veículo não definido"} •{" "}
            {r.entregas?.length ?? 0} parada(s)
          </Text>
        </Pressable>
      ))}
    </ScrollView>
    </MobileAppShell>
  );
}
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#F1F5F9" },
  content: { paddingBottom: 36 },
  hero: { backgroundColor: "#111827", padding: 24, paddingTop: 34 },
  eyebrow: {
    color: "#FCA5A5",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  title: { color: "#FFF", fontSize: 30, fontWeight: "900", marginTop: 6 },
  subtitle: { color: "#CBD5E1", fontSize: 15, marginTop: 8, lineHeight: 21 },
  actions: { padding: 16, paddingBottom: 8 },
  primary: {
    backgroundColor: "#D90000",
    padding: 15,
    borderRadius: 14,
    alignItems: "center",
  },
  primaryText: { color: "#FFF", fontWeight: "900" },
  search: {
    margin: 16,
    marginTop: 8,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 52,
  },
  card: {
    backgroundColor: "#FFF",
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 17,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  cardTitle: { fontSize: 17, fontWeight: "900", color: "#111827" },
  status: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6 },
  statusText: { fontSize: 10, fontWeight: "900" },
  meta: { color: "#64748B", marginTop: 8 },
  error: {
    margin: 16,
    padding: 16,
    backgroundColor: "#FEF2F2",
    borderRadius: 14,
  },
  errorText: { color: "#991B1B" },
  retry: { color: "#D90000", fontWeight: "900", marginTop: 10 },
  empty: { textAlign: "center", color: "#64748B", marginTop: 30 },
});

export default function ScreenProtected(){return <PermissionGate permission="ESTOQUE_LOGISTICA.ROTEIRO_ENTREGA.VISUALIZAR"><RbacContent/></PermissionGate>}
