import { ForegroundLocationCapture } from "./foreground-location-capture";
import { isOfflineMessage, useConnectivityStore } from "../stores/connectivity.store";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  acceptTerm, currentShift, finishShift, pauseShift, registerDevice, resumeShift, startShift,
  termStatus, type AppCampoDevice, type TermStatus, type WorkShift,
} from "../services/app-campo.service";

export function WorkShiftPanel({ onShiftChange }: { onShiftChange?: (shift: WorkShift | null) => void }) {
  const [term, setTerm] = useState<TermStatus | null>(null);
  const [device, setDevice] = useState<AppCampoDevice | null>(null);
  const [shift, setShift] = useState<WorkShift | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());
  const online = useConnectivityStore((state) => state.online);

  const load = useCallback(async () => {
    setBusy(true); setError("");
    try {
      const [status, registered, active] = await Promise.all([termStatus(), registerDevice(), currentShift()]);
      setTerm(status); setDevice(registered); setShift(active); onShiftChange?.(active);
    } catch (e) { setError(e instanceof Error ? e.message : "Falha ao carregar expediente."); }
    finally { setBusy(false); }
  }, [onShiftChange]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  async function run(action: () => Promise<unknown>) {
    setBusy(true); setError("");
    try { await action(); await load(); }
    catch (e) { const offline=!online||isOfflineMessage(e);const message=offline?"Modo offline. A operação será liberada quando a conexão retornar.":(e instanceof Error?e.message:"Falha na operação.");setError(message);if(!offline)Alert.alert("Expediente",message);setBusy(false); }
  }
  async function accept() {
    if (!term || !device) return;
    await run(() => acceptTerm(term.termo.id, device.id));
  }
  const status = shift?.status ?? "NAO_INICIADO";
  const tempoServico = shift
    ? Math.max(0, now - new Date(shift.iniciadoServidorEm).getTime())
    : 0;
  const horas = Math.floor(tempoServico / 3600000);
  const minutos = Math.floor((tempoServico % 3600000) / 60000);
  const segundos = Math.floor((tempoServico % 60000) / 1000);
  const tempoFormatado = [horas, minutos, segundos]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
  return (
    <View style={s.card}>
      <Text style={s.heading}>Expediente de hoje</Text>
      <View style={s.statusRow}><Text style={s.label}>Status</Text><Text style={s.status}>{status.replaceAll("_", " ")}</Text></View>
      <Text style={s.meta}>Início: {shift ? new Date(shift.iniciadoServidorEm).toLocaleString("pt-BR") : "--"}</Text>
      <Text style={s.meta}>Tempo de serviço no dia: {tempoFormatado}</Text>
      <ForegroundLocationCapture
        enabled={status === "ATIVO"}
        shiftId={shift?.id}
        deviceId={device?.id}
      />
      {error ? <Text style={[s.error,!online&&s.offline]}>{error}</Text> : null}
      {busy ? <ActivityIndicator style={{ marginVertical: 12 }} /> : null}
      <Pressable disabled={busy || !term?.aceito || Boolean(shift)} style={[s.button, (busy || !term?.aceito || Boolean(shift)) && s.disabled]} onPress={() => device && void run(() => startShift(device.id))}>
        <Text style={s.buttonText}>Iniciar expediente</Text>
      </Pressable>
      <Pressable disabled={busy || status !== "ATIVO"} style={[s.button, status !== "ATIVO" && s.disabled]} onPress={() => shift && void run(() => pauseShift(shift.id))}>
        <Text style={s.buttonText}>Iniciar intervalo</Text>
      </Pressable>
      <Pressable disabled={busy || status !== "PAUSADO"} style={[s.button, status !== "PAUSADO" && s.disabled]} onPress={() => shift && void run(() => resumeShift(shift.id))}>
        <Text style={s.buttonText}>Finalizar intervalo</Text>
      </Pressable>
      <Pressable disabled={busy || !["ATIVO", "PAUSADO"].includes(status)} style={[s.button, s.finish, !["ATIVO", "PAUSADO"].includes(status) && s.disabled]} onPress={() => shift && Alert.alert("Finalizar expediente", "Confirma o encerramento do expediente?", [{ text: "Cancelar", style: "cancel" }, { text: "Finalizar", style: "destructive", onPress: () => void run(() => finishShift(shift.id)) }])}>
        <Text style={s.buttonText}>Finalizar expediente</Text>
      </Pressable>
      <Modal visible={Boolean(term && !term.aceito)} animationType="slide" presentationStyle="pageSheet">
        <View style={s.modal}><Text style={s.modalTitle}>{term?.termo.titulo}</Text><Text style={s.version}>Versão {term?.termo.versao}</Text>
          <ScrollView style={s.term}><Text style={s.termText}>{term?.termo.conteudo}</Text></ScrollView>
          <Pressable disabled={busy || !device} style={[s.accept, (busy || !device) && s.disabled]} onPress={() => void accept()}><Text style={s.buttonText}>Li, estou ciente e aceito</Text></Pressable>
        </View>
      </Modal>
    </View>
  );
}
const s = StyleSheet.create({
  card:{backgroundColor:"#fff",borderRadius:16,padding:16,marginBottom:20,borderWidth:1,borderColor:"#e2e8f0"},heading:{fontSize:20,fontWeight:"900",color:"#111827",marginBottom:12},statusRow:{flexDirection:"row",justifyContent:"space-between",marginBottom:8},label:{color:"#64748b"},status:{fontWeight:"900",color:"#0f766e"},meta:{color:"#64748b",marginBottom:6},error:{color:"#b91c1c",marginVertical:8},offline:{color:"#92400e"},button:{backgroundColor:"#0f172a",padding:14,borderRadius:10,marginTop:10},finish:{backgroundColor:"#b91c1c"},disabled:{opacity:.35},buttonText:{color:"#fff",fontWeight:"800",textAlign:"center"},modal:{flex:1,padding:20,paddingTop:54,backgroundColor:"#f8fafc"},modalTitle:{fontSize:22,fontWeight:"900",color:"#111827"},version:{color:"#64748b",marginVertical:8},term:{flex:1,backgroundColor:"#fff",borderRadius:12,padding:14,marginVertical:12},termText:{lineHeight:22,color:"#1f2937"},accept:{backgroundColor:"#0f766e",padding:16,borderRadius:12,marginBottom:20}
});
