import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { MobileAppShell } from "../../components/mobile-app-shell";
import { listarOs } from "../../services/os.service";
import type { OsResumo } from "../../types/os";

export default function Os() {
  const [items, setItems] = useState<OsResumo[]>([]);
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await listarOs({ busca });
      setItems(result.dados);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Não foi possível carregar as ordens de serviço.");
    } finally {
      setLoading(false);
    }
  }, [busca]);

  useEffect(() => { void load(); }, [load]);

  return (
    <MobileAppShell title="Ordens de serviço" subtitle="Consulte atendimentos e registre evidências em campo.">
      <View style={styles.page}>
        <View style={styles.search}>
          <TextInput style={styles.input} value={busca} onChangeText={setBusca} placeholder="Número, cliente ou técnico" returnKeyType="search" onSubmitEditing={() => void load()} />
          <Pressable style={styles.button} onPress={() => void load()}><Text style={styles.buttonText}>Buscar</Text></Pressable>
        </View>
        {loading ? <ActivityIndicator color="#D90000" style={styles.state} /> : null}
        {error ? <View style={styles.error}><Text style={styles.errorText}>{error}</Text><Pressable onPress={() => void load()}><Text style={styles.retry}>Tentar novamente</Text></Pressable></View> : null}
        {!loading && !error && items.length === 0 ? <Text style={styles.empty}>Nenhuma ordem de serviço encontrada.</Text> : null}
        {!loading && !error ? (
          <FlatList data={items} contentContainerStyle={styles.list} keyExtractor={(item) => item.id} renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => router.push({ pathname: "/os/[id]", params: { id: item.id } })}>
              <Text style={styles.number}>OS {item.numero ?? "-"}</Text>
              <Text style={styles.client}>{item.clienteNome ?? "Cliente não informado"}</Text>
              <Text style={styles.meta}>{item.status ?? item.situacao ?? "-"} | {item.uf ?? "-"}</Text>
              <Text style={styles.meta}>{item.tecnico ?? "Técnico não informado"}</Text>
            </Pressable>
          )} />
        ) : null}
      </View>
    </MobileAppShell>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, padding: 16, backgroundColor: "#F1F5F9" },
  search: { flexDirection: "row", gap: 8, marginBottom: 14 },
  input: { flex: 1, height: 50, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 13, paddingHorizontal: 13 },
  button: { minWidth: 78, backgroundColor: "#D90000", borderRadius: 13, alignItems: "center", justifyContent: "center", paddingHorizontal: 13 },
  buttonText: { color: "#FFFFFF", fontWeight: "900" },
  state: { marginTop: 28 },
  list: { paddingBottom: 22 },
  card: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 16, padding: 16, marginBottom: 10 },
  number: { color: "#D90000", fontWeight: "900", fontSize: 16 },
  client: { color: "#111827", fontWeight: "800", marginVertical: 6 },
  meta: { color: "#64748B", marginTop: 3 },
  error: { backgroundColor: "#FEF2F2", borderRadius: 14, padding: 15 },
  errorText: { color: "#991B1B" },
  retry: { color: "#D90000", fontWeight: "900", marginTop: 10 },
  empty: { textAlign: "center", color: "#64748B", marginTop: 30 },
});
