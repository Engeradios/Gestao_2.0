import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import * as SecureStore from "expo-secure-store";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

type Pending = {
  uri: string;
  name: string;
  mimeType: string;
  latitude?: number;
  longitude?: number;
};
type Evidence = {
  id: string;
  nomeOriginal: string | null;
  mimeType: string | null;
  tamanhoBytes: string | null;
  capturadoEm: string | null;
};
const API_BASE = process.env.EXPO_PUBLIC_API_URL;
const TOKEN_KEY = "engeradios.token";
async function authorized(path: string, init?: RequestInit) {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (!token) throw new Error("Sessão expirada");
  if (!API_BASE) throw new Error("API não configurada");
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init?.headers || {}) },
  });
  if (!response.ok)
    throw new Error((await response.text()) || `Falha HTTP ${response.status}`);
  return response;
}
async function location() {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) return {};
  const current = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  return {
    latitude: current.coords.latitude,
    longitude: current.coords.longitude,
  };
}
export function OsEvidencePanel({ orderId }: { orderId: string }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const [items, setItems] = useState<Evidence[]>([]);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      const response = await authorized(
        `/app-campo/os/${encodeURIComponent(orderId)}/evidencias`,
      );
      setItems((await response.json()) as Evidence[]);
    } catch (error) {
      Alert.alert(
        "Evidências",
        error instanceof Error ? error.message : "Falha ao carregar",
      );
    }
  }, [orderId]);
  useEffect(() => {
    void load();
  }, [load]);
  async function select(camera: boolean) {
    const permission = camera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permissão necessária",
        camera ? "Autorize o uso da câmera." : "Autorize o acesso às fotos.",
      );
      return;
    }
    const result = camera
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ["images"],
          quality: 0.8,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          quality: 0.8,
        });
    if (result.canceled) return;
    const asset = result.assets[0];
    const gps = await location();
    setPending({
      uri: asset.uri,
      name: asset.fileName || `evidencia-${Date.now()}.jpg`,
      mimeType: asset.mimeType || "image/jpeg",
      ...gps,
    });
  }
  async function upload() {
    if (!pending) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.append("arquivo", {
        uri: pending.uri,
        name: pending.name,
        type: pending.mimeType,
      } as unknown as Blob);
      form.append("tipo", "FOTO");
      form.append("capturadoEm", new Date().toISOString());
      if (pending.latitude !== undefined)
        form.append("latitude", String(pending.latitude));
      if (pending.longitude !== undefined)
        form.append("longitude", String(pending.longitude));
      await authorized(
        `/app-campo/os/${encodeURIComponent(orderId)}/evidencias`,
        { method: "POST", body: form },
      );
      setPending(null);
      await load();
      Alert.alert("Evidências", "Arquivo enviado com sucesso.");
    } catch (error) {
      Alert.alert(
        "Falha no envio",
        error instanceof Error ? error.message : "Erro inesperado",
      );
    } finally {
      setBusy(false);
    }
  }
  async function remove(id: string) {
    setBusy(true);
    try {
      await authorized(
        `/app-campo/os/${encodeURIComponent(orderId)}/evidencias/${id}`,
        { method: "DELETE" },
      );
      await load();
    } catch (error) {
      Alert.alert(
        "Falha ao excluir",
        error instanceof Error ? error.message : "Erro inesperado",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Evidências</Text>
      <View style={styles.row}>
        <Pressable style={styles.button} onPress={() => void select(true)}>
          <Text style={styles.buttonText}>Câmera</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={() => void select(false)}>
          <Text style={styles.buttonText}>Galeria</Text>
        </Pressable>
      </View>
      {pending && (
        <View>
          <Image source={{ uri: pending.uri }} style={styles.preview} />
          <View style={styles.row}>
            <Pressable
              style={styles.button}
              disabled={busy}
              onPress={() => void upload()}
            >
              <Text style={styles.buttonText}>Enviar</Text>
            </Pressable>
            <Pressable
              style={styles.secondary}
              onPress={() => setPending(null)}
            >
              <Text>Remover</Text>
            </Pressable>
          </View>
        </View>
      )}
      {busy && <ActivityIndicator />}
      {items.map((item) => (
        <View key={item.id} style={styles.item}>
          <View style={styles.flex}>
            <Text>{item.nomeOriginal || "Evidência"}</Text>
            <Text style={styles.meta}>
              {item.capturadoEm
                ? new Date(item.capturadoEm).toLocaleString("pt-BR")
                : ""}
            </Text>
          </View>
          <Pressable onPress={() => void remove(item.id)}>
            <Text style={styles.remove}>Excluir</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}
const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    gap: 12,
    marginTop: 16,
  },
  title: { fontSize: 18, fontWeight: "700" },
  row: { flexDirection: "row", gap: 10 },
  button: {
    backgroundColor: "#075985",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  buttonText: { color: "#fff", fontWeight: "600" },
  secondary: {
    backgroundColor: "#e2e8f0",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  preview: { width: "100%", height: 220, borderRadius: 10, marginBottom: 10 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  flex: { flex: 1 },
  meta: { fontSize: 12, color: "#64748b" },
  remove: { color: "#b91c1c", fontWeight: "600" },
});
