// FASE4A_MOBILE_APP_SHELL
// FASE4B_ACTIVE_NAV
import { router, usePathname } from "expo-router";
import type { ReactNode } from "react";
import {
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { useAuthStore } from "../stores/auth.store";
import { useThemeStore } from "../stores/theme.store";

type Props = {
  children: ReactNode;
  title: string;
  subtitle?: string;
};

export function MobileAppShell({ children, title, subtitle }: Props) {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const mode = useThemeStore((state) => state.mode);
  const system = useColorScheme();
  const dark = mode === "dark" || (mode === "system" && system === "dark");
  const palette = dark ? colors.dark : colors.light;
  const name = user?.nome ?? user?.name ?? user?.email ?? "Usuário";
  const initial = name.trim().charAt(0).toUpperCase() || "U";

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]}>
      <View style={[styles.topbar, { backgroundColor: palette.surface, borderBottomColor: palette.border }]}>
        <Image
          source={dark
            ? require("../../assets/brand/logo_escuro.png")
            : require("../../assets/brand/logo_claro.png")}
          resizeMode="contain"
          style={styles.logo}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Abrir meu perfil"
          onPress={() => router.push("/meu-perfil")}
          style={styles.userButton}
        >
          <View style={styles.avatar}><Text style={styles.avatarText}>{initial}</Text></View>
          <View style={styles.userCopy}>
            <Text numberOfLines={1} style={[styles.userName, { color: palette.text }]}>{name}</Text>
            <Text style={[styles.userHint, { color: palette.muted }]}>Meu perfil</Text>
          </View>
        </Pressable>
      </View>

      <View style={[styles.heading, { backgroundColor: palette.hero }]}>
        <Text style={styles.eyebrow}>GESTÃO ENGERÁDIOS 2.0</Text>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>

      <View style={styles.body}>{children}</View>

      <View style={[styles.bottom, { backgroundColor: palette.surface, borderTopColor: palette.border }]}>
        <Nav active={pathname === "/dashboard"} label="Início" symbol="IN" onPress={() => router.replace("/dashboard")} palette={palette} />
        <Nav active={pathname.startsWith("/os")} label="OS" symbol="OS" onPress={() => router.push("/os")} palette={palette} />
        <Nav active={pathname.startsWith("/roteiro-entrega")} label="Entregas" symbol="RE" onPress={() => router.push("/roteiro-entrega")} palette={palette} />
        <Nav active={pathname.startsWith("/meu-perfil")} label="Perfil" symbol="●" onPress={() => router.push("/meu-perfil")} palette={palette} />
      </View>
    </SafeAreaView>
  );
}

function Nav({ active, label, symbol, onPress, palette }: {
  active: boolean;
  label: string;
  symbol: string;
  onPress: () => void;
  palette: typeof colors.light;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.navItem, active && { backgroundColor: palette.background }]}>
      <Text style={[styles.navSymbol, { color: active ? palette.accent : palette.muted }]}>{symbol}</Text>
      <Text style={[styles.navLabel, { color: active ? palette.accent : palette.muted }]}>{label}</Text>
    </Pressable>
  );
}

const colors = {
  light: { background: "#F1F5F9", surface: "#FFFFFF", border: "#E2E8F0", text: "#111827", muted: "#64748B", accent: "#D90000", hero: "#111827" },
  dark: { background: "#0F172A", surface: "#111827", border: "#334155", text: "#F8FAFC", muted: "#94A3B8", accent: "#F87171", hero: "#090F1C" },
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topbar: { minHeight: 68, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1 },
  logo: { width: 142, height: 42 },
  userButton: { flexDirection: "row", alignItems: "center", maxWidth: "52%" },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#D90000", alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#FFFFFF", fontWeight: "900" },
  userCopy: { marginLeft: 9, flexShrink: 1 },
  userName: { fontSize: 12, fontWeight: "900" },
  userHint: { fontSize: 10, marginTop: 2 },
  heading: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 24 },
  eyebrow: { color: "#FCA5A5", fontSize: 10, fontWeight: "900", letterSpacing: 1.3 },
  title: { color: "#FFFFFF", fontSize: 28, fontWeight: "900", marginTop: 6 },
  subtitle: { color: "#CBD5E1", lineHeight: 19, marginTop: 7 },
  body: { flex: 1 },
  bottom: { minHeight: 66, flexDirection: "row", borderTopWidth: 1, paddingBottom: 4 },
  navItem: { flex: 1, alignItems: "center", justifyContent: "center" },
  navSymbol: { fontSize: 14, fontWeight: "900" },
  navLabel: { fontSize: 10, fontWeight: "800", marginTop: 3 },
});
