import { Redirect } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import { AppModulesMenu } from "../../components/app-modules-menu";
import { MobileAppShell } from "../../components/mobile-app-shell";
import { WorkShiftPanel } from "../../components/work-shift-panel";
import { useAuthStore } from "../../stores/auth.store";

export default function Home() {
  const token = useAuthStore((state) => state.token);
  if (!token) return <Redirect href="/login" />;
  return (
    <MobileAppShell title="Início" subtitle="Expediente, localização, telemetria e módulos operacionais.">
      <ScrollView style={styles.page} contentContainerStyle={styles.content}>
        <WorkShiftPanel />
        <AppModulesMenu />
        <View style={styles.space} />
      </ScrollView>
    </MobileAppShell>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#F1F5F9" },
  content: { padding: 16, paddingBottom: 28 },
  space: { height: 10 },
});
