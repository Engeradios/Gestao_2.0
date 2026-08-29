import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

const modules = [
  { title: "Ordens de serviço", subtitle: "Atendimentos e evidências", href: "/os", active: true, symbol: "OS" },
  { title: "Roteiro de entrega", subtitle: "Planejamento e acompanhamento", href: "/roteiro-entrega", active: true, symbol: "RE" },
  { title: "Vistoria", subtitle: "Em construção", href: "/vistoria", active: false, symbol: "VI" },
  { title: "Roteiro técnico", subtitle: "Em construção", href: "/roteiro-tecnico", active: false, symbol: "RT" },
  { title: "Orçamento", subtitle: "Em construção", href: "/orcamento", active: false, symbol: "OR" },
  { title: "Justificar ausência", subtitle: "Próxima fase", href: "/justificativa-ausencia", active: false, symbol: "JA" },
  { title: "Meu perfil", subtitle: "Conta e preferências", href: "/meu-perfil", active: true, symbol: "PF" },
  { title: "Sobre", subtitle: "Versão e conectividade", href: "/sobre", active: true, symbol: "i" },
] as const;

export function AppModulesMenu() {
  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>Módulos</Text>
      <Text style={styles.description}>Recursos disponíveis e em construção</Text>
      <View style={styles.grid}>
        {modules.map((item) => (
          <Pressable
            key={item.href}
            disabled={!item.active}
            accessibilityRole="button"
            accessibilityState={{ disabled: !item.active }}
            style={({ pressed }) => [styles.card, !item.active && styles.cardBuilding, pressed && styles.pressed]}
            onPress={() => router.push(item.href as never)}
          >
            <View style={[styles.icon, item.active ? styles.iconActive : styles.iconBuilding]}>
              <Text style={[styles.iconText, !item.active && styles.iconTextBuilding]}>{item.symbol}</Text>
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.subtitle}>{item.subtitle}</Text>
            <Text style={item.active ? styles.open : styles.building}>{item.active ? "ABRIR" : "EM CONSTRUÇÃO"}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 22 }, heading: { color: "#111827", fontSize: 22, fontWeight: "900" },
  description: { color: "#64748B", marginTop: 4, marginBottom: 14 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  card: { width: "48%", minHeight: 170, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 18, padding: 14 },
  cardBuilding: { opacity: 0.78 }, pressed: { opacity: 0.7 },
  icon: { width: 44, height: 44, borderRadius: 13, alignItems: "center", justifyContent: "center", marginBottom: 13 },
  iconActive: { backgroundColor: "#D90000" }, iconBuilding: { backgroundColor: "#F1F5F9" },
  iconText: { color: "#FFFFFF", fontWeight: "900" }, iconTextBuilding: { color: "#475569" },
  title: { color: "#111827", fontSize: 15, fontWeight: "900" },
  subtitle: { color: "#64748B", fontSize: 12, lineHeight: 17, marginTop: 5, flex: 1 },
  open: { color: "#D90000", fontSize: 10, fontWeight: "900", marginTop: 10 },
  building: { color: "#92400E", fontSize: 9, fontWeight: "900", marginTop: 10 },
});
