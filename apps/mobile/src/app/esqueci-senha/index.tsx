import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { api } from "../../services/api";

export default function EsqueciSenha() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  async function enviar() {
    if (!email.trim()) return Alert.alert("Atenção", "Informe seu e-mail.");
    setBusy(true);
    try {
      await api.post("/auth/forgot-password", { email: email.trim() });
      Alert.alert(
        "Solicitação recebida",
        "Se o e-mail estiver cadastrado, as instruções serão enviadas.",
        [{ text: "OK", onPress: () => router.back() }],
      );
    } catch {
      Alert.alert(
        "Não foi possível enviar",
        "Verifique a conexão e tente novamente.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <KeyboardAvoidingView
      style={s.page}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={s.card}>
        <Text style={s.title}>Recuperar senha</Text>
        <Text style={s.text}>
          Informe o e-mail corporativo associado à sua conta.
        </Text>
        <TextInput
          style={s.input}
          placeholder="E-mail"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
        <Pressable
          style={s.button}
          disabled={busy}
          onPress={() => void enviar()}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.white}>Enviar instruções</Text>
          )}
        </Pressable>
        <Pressable onPress={() => router.back()}>
          <Text style={s.back}>Voltar ao login</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
const s = StyleSheet.create({
  page: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#111827",
  },
  card: { backgroundColor: "#fff", borderRadius: 22, padding: 22 },
  title: { fontSize: 24, fontWeight: "800", color: "#111827" },
  text: { color: "#4b5563", marginVertical: 14 },
  input: {
    height: 54,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 14,
    paddingHorizontal: 15,
  },
  button: {
    height: 54,
    borderRadius: 14,
    backgroundColor: "#d90000",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },
  white: { color: "#fff", fontWeight: "800" },
  back: {
    textAlign: "center",
    color: "#b91c1c",
    fontWeight: "700",
    marginTop: 18,
  },
});
