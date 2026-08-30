import * as Network from 'expo-network';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MobileAppShell } from '../../components/mobile-app-shell';
import { detailedOutboxSummary, synchronizeEvidenceOutbox } from '../../services/evidence-outbox.service';
import { synchronizeTelemetryQueue, telemetryQueueCount } from '../../services/telemetry-queue.service';
import { useAppTheme } from '../../theme/use-app-theme';

type Detail = Awaited<ReturnType<typeof detailedOutboxSummary>>;
const EMPTY: Detail = { evidencePending:0, evidenceReview:0, evidenceFailed:0, otherPending:0, total:0, items:[] };

export default function Sincronizacao(){
  const p=useAppTheme();
  const [busy,setBusy]=useState(false);
  const [online,setOnline]=useState(false);
  const [telemetry,setTelemetry]=useState(0);
  const [detail,setDetail]=useState<Detail>(EMPTY);
  const [message,setMessage]=useState<string|null>(null);

  const load=useCallback(async()=>{
    try {
      const [network,telemetryCount,outbox]=await Promise.all([
        Network.getNetworkStateAsync(), telemetryQueueCount(), detailedOutboxSummary(),
      ]);
      setOnline(Boolean(network.isConnected && network.isInternetReachable !== false));
      setTelemetry(telemetryCount);
      setDetail(outbox);
      setMessage(null);
    } catch {
      setMessage('Os dados locais continuam preservados. Não foi possível atualizar o estado agora.');
    }
  },[]);

  useEffect(()=>{void load()},[load]);

  async function sync(){
    const network=await Network.getNetworkStateAsync().catch(()=>null);
    const connected=Boolean(network?.isConnected && network.isInternetReachable !== false);
    setOnline(connected);
    if(!connected){
      setMessage('Sem conexão. Os envios permanecem preservados e serão sincronizados quando houver internet.');
      return;
    }
    setBusy(true);setMessage(null);
    try {
      await synchronizeTelemetryQueue();
      await synchronizeEvidenceOutbox();
      await load();
      const remainingTelemetry = await telemetryQueueCount();
      const remainingOutbox = await detailedOutboxSummary();
      const remaining = remainingTelemetry + remainingOutbox.total;
      setMessage(remaining > 0 ? `Sincronização parcial. ${remaining} item(ns) ainda aguardam envio.` : 'Sincronização concluída.');
    } catch {
      setMessage('A sincronização não foi concluída. Nenhum item local foi descartado.');
      await load().catch(()=>undefined);
    } finally { setBusy(false); }
  }

  return <MobileAppShell title="Sincronização" subtitle="Contagens separadas e armazenamento local.">
    <ScrollView style={{backgroundColor:p.background}} contentContainerStyle={s.page}>
      <View style={[s.card,{backgroundColor:p.surface,borderColor:p.border}]}>
        <Text style={[s.status,{color:online?p.success:p.warning}]}>{online?'ONLINE':'OFFLINE'}</Text>
        {!online?<Text style={[s.offline,{color:p.textMuted}]}>Modo offline ativo. Nenhum envio será tentado.</Text>:null}
        <Count label="Telemetria pendente" value={telemetry} color={p.text}/>
        <Count label="Evidências pendentes" value={detail.evidencePending} color={p.text}/>
        <Count label="Evidências em revisão" value={detail.evidenceReview} color={detail.evidenceReview?p.warning:p.text}/>
        <Count label="Evidências com falha" value={detail.evidenceFailed} color={detail.evidenceFailed?p.danger:p.text}/>
        <Count label="Outros itens locais" value={detail.otherPending} color={p.text}/>
        <Count label="Total na outbox" value={detail.total} color={p.primary}/>
        {message?<Text style={[s.message,{color:p.textMuted,backgroundColor:p.surfaceAlt}]}>{message}</Text>:null}
        <Pressable accessibilityRole="button" disabled={busy||!online} onPress={()=>void sync()} style={[s.button,{backgroundColor:p.primary},(busy||!online)&&s.disabled]}>
          {busy?<ActivityIndicator color="#FFF"/>:<Text style={s.buttonText}>{online?'Sincronizar agora':'Aguardando conexão'}</Text>}
        </Pressable>
      </View>

      <Text style={[s.heading,{color:p.text}]}>Inspeção segura</Text>
      <Text style={[s.caption,{color:p.textMuted}]}>Exibe somente identificador abreviado, tipo, estado, tentativas e presença do arquivo.</Text>
      {detail.items.length===0?<View style={[s.item,{backgroundColor:p.surface,borderColor:p.border}]}><Text style={{color:p.textMuted}}>Nenhum item na outbox.</Text></View>:detail.items.map(item=><View key={item.shortId} style={[s.item,{backgroundColor:p.surface,borderColor:p.border}]}>
        <Text style={[s.itemTitle,{color:p.text}]}>{item.kind} · …{item.shortId}</Text>
        <Text style={[s.itemText,{color:p.textMuted}]}>Estado: {item.status} · Tentativas: {item.attempts}</Text>
        <Text style={[s.itemText,{color:item.filePresent?p.success:p.warning}]}>Arquivo local: {item.filePresent?'presente':'ausente ou não aplicável'}</Text>
      </View>)}
    </ScrollView>
  </MobileAppShell>
}

function Count({label,value,color}:{label:string;value:number;color:string}){return <View style={s.row}><Text style={[s.label,{color}]}>{label}</Text><Text style={[s.value,{color}]}>{value}</Text></View>}
const s=StyleSheet.create({page:{padding:16,paddingBottom:36},card:{borderWidth:1,borderRadius:20,padding:20},status:{fontSize:12,fontWeight:'900'},offline:{fontSize:12,lineHeight:18,marginTop:8,marginBottom:10},row:{flexDirection:'row',justifyContent:'space-between',gap:12,marginTop:13},label:{fontSize:14,fontWeight:'700'},value:{fontSize:15,fontWeight:'900'},message:{fontSize:12,lineHeight:18,padding:12,borderRadius:12,marginTop:18},button:{height:52,borderRadius:14,alignItems:'center',justifyContent:'center',marginTop:20},buttonText:{color:'#FFF',fontWeight:'900'},disabled:{opacity:.45},heading:{fontSize:17,fontWeight:'900',marginTop:22},caption:{fontSize:12,lineHeight:18,marginTop:5,marginBottom:12},item:{borderWidth:1,borderRadius:15,padding:14,marginBottom:9},itemTitle:{fontSize:13,fontWeight:'900'},itemText:{fontSize:11,marginTop:6}});
