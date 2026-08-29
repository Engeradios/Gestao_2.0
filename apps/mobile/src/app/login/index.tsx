import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { login } from "../../services/auth.service";
import { useAuthStore } from "../../stores/auth.store";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [busy, setBusy] = useState(false);
  const setAuth = useAuthStore((state) => state.setAuth);

  async function submit() {
    if (!email.trim() || !senha) {
      Alert.alert("Atenção", "Informe e-mail e senha.");
      return;
    }
    setBusy(true);
    try {
      const result = await login(email.trim(), senha);
      await setAuth(result.token, result.refreshToken, result.user as never);
      router.replace("/dashboard");
    } catch (error: unknown) {
      const status =
        typeof error === "object" && error && "response" in error
          ? Number(
              (error as { response?: { status?: number } }).response?.status,
            )
          : 0;
      Alert.alert(
        "Login não realizado",
        status === 401
          ? "E-mail ou senha inválidos."
          : status
            ? `A API respondeu com HTTP ${status}.`
            : "Não foi possível conectar à API. Verifique a internet e tente novamente.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 24 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={styles.brand}>
          <Image
            source={require("../../../assets/brand/logo_claro.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.subtitle}>Gestão Engerádios 2.0</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.heading}>Acesse sua conta</Text>
          <TextInput
            style={styles.input}
            placeholder="E-mail corporativo"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            returnKeyType="next"
            value={email}
            onChangeText={setEmail}
          />
          <View style={styles.passwordRow}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Senha"
              secureTextEntry={!mostrarSenha}
              returnKeyType="done"
              value={senha}
              onChangeText={setSenha}
              onSubmitEditing={() => void submit()}
            />
            <Pressable
              onPress={() => setMostrarSenha((value) => !value)}
              hitSlop={10}
            >
              <Text style={styles.show}>
                {mostrarSenha ? "Ocultar" : "Mostrar"}
              </Text>
            </Pressable>
          </View>
          <Pressable onPress={() => router.push("/esqueci-senha")}>
            <Text style={styles.forgot}>Esqueci minha senha</Text>
          </Pressable>
          <Pressable
            style={[styles.button, busy && styles.disabled]}
            disabled={busy}
            onPress={() => void submit()}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Entrar</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#111827" },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
    paddingVertical: 48,
  },
  brand: { alignItems: "center", marginBottom: 26 },
  logo: { width: 250, height: 92 },
  subtitle: { marginTop: 8, color: "#d1d5db", fontWeight: "600" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 22,
    elevation: 8,
  },
  heading: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 18,
  },
  input: {
    height: 54,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 14,
    paddingHorizontal: 15,
    marginBottom: 12,
  },
  passwordRow: {
    height: 54,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 14,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
  },
  passwordInput: { flex: 1 },
  show: { color: "#b91c1c", fontWeight: "700" },
  forgot: {
    marginTop: 14,
    textAlign: "right",
    color: "#b91c1c",
    fontWeight: "700",
  },
  button: {
    height: 54,
    borderRadius: 14,
    backgroundColor: "#d90000",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 22,
  },
  disabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
