import { MobileAppShell } from "../../components/mobile-app-shell";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { api } from "../../services/api";
import { useAuthStore } from "../../stores/auth.store";
import { ThemeMode, useThemeStore } from "../../stores/theme.store";

type Profile = {
  sub?: string;
  nome?: string;
  name?: string;
  email?: string;
  role?: string;
};
export default function MeuPerfil() {
  const user = useAuthStore((s) => s.user) as Profile | undefined;
  const [profile, setProfile] = useState<Profile>(user ?? {});
  const [foto, setFoto] = useState<string | null>(null);
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);
  useEffect(() => {
    api
      .get<Profile>("/auth/profile")
      .then((r) => setProfile(r.data))
      .catch(() => undefined);
  }, []);
  async function escolherFoto() {
    const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!p.granted)
      return Alert.alert("Permissão necessária", "Libere o acesso às fotos.");
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!r.canceled) setFoto(r.assets[0].uri);
  }
  async function alterarSenha() {
    if (!senhaAtual || novaSenha.length < 8)
      return Alert.alert(
        "Atenção",
        "Informe a senha atual e uma nova senha com pelo menos 8 caracteres.",
      );
    try {
      await api.post("/auth/change-password", { senhaAtual, novaSenha });
      setSenhaAtual("");
      setNovaSenha("");
      Alert.alert("Sucesso", "Senha atualizada.");
    } catch {
      Alert.alert("Erro", "Não foi possível atualizar a senha.");
    }
  }
  return (
    <MobileAppShell title="Meu perfil" subtitle="Dados pessoais, segurança e preferências.">
      <ScrollView
      style={[s.page, mode === "dark" && s.dark]}
      contentContainerStyle={s.content}
    >
      <View style={s.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={s.link}>Voltar</Text>
        </Pressable>
        <Text style={[s.title, mode === "dark" && s.white]}>Meu perfil</Text>
      </View>
      <Pressable style={s.avatar} onPress={() => void escolherFoto()}>
        {foto ? (
          <Image source={{ uri: foto }} style={s.avatarImage} />
        ) : (
          <Text style={s.avatarText}>Adicionar foto</Text>
        )}
      </Pressable>
      <View style={s.card}>
        <Text style={s.label}>Nome</Text>
        <Text style={s.value}>
          {profile.nome ?? profile.name ?? "Não informado"}
        </Text>
        <Text style={s.label}>E-mail</Text>
        <Text style={s.value}>{profile.email ?? "Não informado"}</Text>
        <Text style={s.note}>
          Alteração de e-mail e sincronização da foto aguardam endpoint
          administrativo da API.
        </Text>
      </View>
      <View style={s.card}>
        <Text style={s.section}>Alterar senha</Text>
        <TextInput
          style={s.input}
          placeholder="Senha atual"
          secureTextEntry
          value={senhaAtual}
          onChangeText={setSenhaAtual}
        />
        <TextInput
          style={s.input}
          placeholder="Nova senha"
          secureTextEntry
          value={novaSenha}
          onChangeText={setNovaSenha}
        />
        <Pressable style={s.button} onPress={() => void alterarSenha()}>
          <Text style={s.white}>Atualizar senha</Text>
        </Pressable>
      </View>
      <View style={s.card}>
        <Text style={s.section}>Tema</Text>
        <View style={s.row}>
          {(["light", "dark", "system"] as ThemeMode[]).map((item) => (
            <Pressable
              key={item}
              style={[s.choice, mode === item && s.choiceActive]}
              onPress={() => void setMode(item)}
            >
              <Text style={mode === item ? s.white : s.choiceText}>
                {item === "light"
                  ? "Claro"
                  : item === "dark"
                    ? "Escuro"
                    : "Sistema"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </ScrollView>
    </MobileAppShell>
  );
}
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f3f4f6" },
  dark: { backgroundColor: "#111827" },
  content: { padding: 20, paddingTop: 55, paddingBottom: 40 },
  header: { flexDirection: "row", alignItems: "center", gap: 18 },
  title: { fontSize: 25, fontWeight: "800" },
  white: { color: "#fff", fontWeight: "800" },
  link: { color: "#d90000", fontWeight: "800" },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "#d90000",
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 24,
    overflow: "hidden",
  },
  avatarImage: { width: 110, height: 110 },
  avatarText: { color: "#fff", fontWeight: "800", textAlign: "center" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
  },
  label: { fontSize: 12, color: "#6b7280", marginTop: 8 },
  value: { fontSize: 16, fontWeight: "700", color: "#111827", marginTop: 3 },
  note: {
    color: "#92400e",
    backgroundColor: "#fef3c7",
    padding: 10,
    borderRadius: 10,
    marginTop: 14,
  },
  section: { fontSize: 18, fontWeight: "800", marginBottom: 12 },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  button: {
    height: 50,
    backgroundColor: "#d90000",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  row: { flexDirection: "row", gap: 8 },
  choice: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#e5e7eb",
    alignItems: "center",
  },
  choiceActive: { backgroundColor: "#111827" },
  choiceText: { fontWeight: "700", color: "#111827" },
});
