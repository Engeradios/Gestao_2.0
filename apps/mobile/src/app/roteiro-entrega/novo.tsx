import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { criarRoteiro } from "../../services/delivery-route.service";
export default function Screen() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  async function save() {
    try {
      setBusy(true);
      const r = await criarRoteiro(date);
      router.replace(`/roteiro-entrega/${r.id}` as never);
    } catch (e: any) {
      Alert.alert(
        "Rascunho não criado",
        e?.response?.data?.message ?? "Verifique a conexão e a permissão.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={s.page}>
      <Text style={s.title}>Novo roteiro</Text>
      <Text style={s.label}>Data da rota</Text>
      <TextInput
        value={date}
        onChangeText={setDate}
        style={s.input}
        placeholder="AAAA-MM-DD"
      />
      <Text style={s.note}>
        Motorista e veículo poderão ser definidos posteriormente enquanto o
        roteiro estiver em rascunho.
      </Text>
      <Pressable disabled={busy} style={s.button} onPress={save}>
        <Text style={s.buttonText}>
          {busy ? "Salvando..." : "Criar rascunho"}
        </Text>
      </Pressable>
    </View>
  );
}
const s = StyleSheet.create({
  page: { flex: 1, padding: 24, backgroundColor: "#F8FAFC" },
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 28,
  },
  label: { fontWeight: "800", color: "#334155", marginBottom: 8 },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFF",
    borderRadius: 13,
    paddingHorizontal: 14,
  },
  note: { color: "#64748B", lineHeight: 21, marginTop: 16 },
  button: {
    backgroundColor: "#D90000",
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 28,
  },
  buttonText: { color: "#FFF", fontWeight: "900" },
});
