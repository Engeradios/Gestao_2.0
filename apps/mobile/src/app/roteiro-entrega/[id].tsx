import { MobileAppShell } from "../../components/mobile-app-shell";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  DeliveryRoute,
  despacharRoteiro,
  obterRoteiro,
} from "../../services/delivery-route.service";
export default function Screen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [r, setR] = useState<DeliveryRoute | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    if (id) setR(await obterRoteiro(id));
  }, [id]);

  useEffect(() => {
    load().catch(() =>
      Alert.alert("Erro", "Não foi possível carregar o roteiro."),
    );
  }, [load]);
  async function dispatch() {
    if (!id) return;
    try {
      setBusy(true);
      await despacharRoteiro(id);
      await load();
    } catch (e: any) {
      Alert.alert(
        "Despacho não realizado",
        e?.response?.data?.message ?? "Verifique o roteiro.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (!r) return <ActivityIndicator color="#D90000" style={{ flex: 1 }} />;
  return (
    <MobileAppShell title="Detalhes do roteiro" subtitle="Paradas, situação e ações do roteiro.">
      <ScrollView style={s.page} contentContainerStyle={s.content}>
      <Text style={s.kicker}>ROTEIRO #{r.id}</Text>
      <Text style={s.title}>{r.status.replaceAll("_", " ")}</Text>
      <Text style={s.meta}>
        {new Date(r.dataRota).toLocaleDateString("pt-BR")} •{" "}
        {r.entregador?.nome ?? "Motorista não definido"}
      </Text>
      <View style={s.section}>
        <Text style={s.sectionTitle}>Paradas</Text>
        {(r.entregas ?? []).map((p, i) => (
          <View key={String(p.id)} style={s.stop}>
            <View style={s.number}>
              <Text style={s.numberText}>{i + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.stopTitle}>
                {p.clienteNome ?? `${p.origem} ${p.origemNumero ?? ""}`}
              </Text>
              <Text style={s.stopMeta}>
                {p.enderecoEntrega ?? "Endereço não informado"}
              </Text>
              <Text style={s.stopMeta}>{p.status}</Text>
            </View>
          </View>
        ))}
        {!r.entregas?.length ? (
          <Text style={s.empty}>Nenhuma parada adicionada.</Text>
        ) : null}
      </View>
      {r.status === "RASCUNHO" ? (
        <>
          <Pressable
            style={s.secondary}
            onPress={() =>
              Alert.alert(
                "Editor de paradas",
                "A edição detalhada será liberada na próxima etapa.",
              )
            }
          >
            <Text style={s.secondaryText}>Editar paradas</Text>
          </Pressable>
          <Pressable disabled={busy} style={s.primary} onPress={dispatch}>
            <Text style={s.primaryText}>
              {busy ? "Processando..." : "Despachar roteiro"}
            </Text>
          </Pressable>
        </>
      ) : null}
      <Pressable style={s.back} onPress={() => router.back()}>
        <Text style={s.backText}>Voltar</Text>
      </Pressable>
    </ScrollView>
    </MobileAppShell>
  );
}
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#F1F5F9" },
  content: { padding: 20, paddingBottom: 40 },
  kicker: { color: "#D90000", fontSize: 12, fontWeight: "900" },
  title: { fontSize: 28, fontWeight: "900", color: "#111827", marginTop: 5 },
  meta: { color: "#64748B", marginTop: 8 },
  section: {
    backgroundColor: "#FFF",
    borderRadius: 17,
    padding: 16,
    marginTop: 22,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  sectionTitle: { fontSize: 18, fontWeight: "900", marginBottom: 14 },
  stop: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  number: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
  },
  numberText: { color: "#FFF", fontWeight: "900" },
  stopTitle: { fontWeight: "800", color: "#111827" },
  stopMeta: { color: "#64748B", marginTop: 4 },
  empty: { color: "#64748B" },
  primary: {
    backgroundColor: "#D90000",
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 12,
  },
  primaryText: { color: "#FFF", fontWeight: "900" },
  secondary: {
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 18,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  secondaryText: { color: "#111827", fontWeight: "900" },
  back: { padding: 16, alignItems: "center" },
  backText: { color: "#64748B", fontWeight: "700" },
});
