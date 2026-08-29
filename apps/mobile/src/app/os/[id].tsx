import { MobileAppShell } from "../../components/mobile-app-shell";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { obterOs } from "../../services/os.service";
import type { OsDetalhe } from "../../types/os";
import { OsEvidencePanel } from "../../components/os-evidence-panel";

export default function Detalhe() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<OsDetalhe | null>(null);
  useEffect(() => {
    if (id) obterOs(id).then(setItem);
  }, [id]);
  if (!item)
    return (
      <View style={s.center}>
        <ActivityIndicator />
      </View>
    );
  const fields = [
    ["Numero", item.numero],
    ["Cliente", item.clienteNome],
    ["Local", item.local],
    ["UF", item.uf],
    ["Tipo", item.tipo],
    ["Situacao", item.situacao],
    ["Status", item.status],
    ["Tecnico", item.tecnico],
    ["Contrato", item.contrato],
    ["Equipamento", item.equipamento],
    ["Produto", item.produto],
  ];
  return (
    <MobileAppShell title="Detalhes da OS" subtitle="Informações do atendimento e evidências.">
      <ScrollView style={s.page} contentContainerStyle={s.content}>
      <Text style={s.title}>Detalhes da OS</Text>
      {fields.map(([k, v]) => (
        <View style={s.row} key={String(k)}>
          <Text style={s.key}>{k}</Text>
          <Text>{String(v ?? "-")}</Text>
        </View>
      ))}
      <OsEvidencePanel orderId={String(id)} />
    </ScrollView>
    </MobileAppShell>
  );
}
const s = StyleSheet.create({
  center: { flex: 1, justifyContent: "center" },
  page: { flex: 1, backgroundColor: "#f1f5f9" },
  content: { padding: 20, paddingTop: 55 },
  title: { fontSize: 25, fontWeight: "800", marginBottom: 16 },
  row: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  key: { fontWeight: "700", color: "#475569", marginBottom: 3 },
});
