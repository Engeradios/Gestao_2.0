import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MobileAppShell } from "./mobile-app-shell";

export function ConstructionScreen({ title }: { title: string }) {
  return (
    <MobileAppShell title={title} subtitle="Módulo em preparação.">
      <View style={styles.page}>
        <View style={styles.badge}><Text style={styles.badgeText}>EM CONSTRUÇÃO</Text></View>
        <Text style={styles.text}>Este módulo está sendo preparado para uma experiência integrada ao Gestão Engerádios 2.0.</Text>
        <Pressable style={styles.button} onPress={() => router.replace("/dashboard")}><Text style={styles.buttonText}>Voltar ao início</Text></Pressable>
      </View>
    </MobileAppShell>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, justifyContent: "center", padding: 28, backgroundColor: "#F8FAFC" },
  badge: { alignSelf: "flex-start", backgroundColor: "#FEE2E2", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  badgeText: { color: "#B91C1C", fontSize: 12, fontWeight: "800" },
  text: { fontSize: 16, lineHeight: 24, color: "#64748B", marginTop: 18 },
  button: { backgroundColor: "#D90000", padding: 16, borderRadius: 14, marginTop: 28, alignItems: "center" },
  buttonText: { color: "#FFFFFF", fontWeight: "800" },
});
