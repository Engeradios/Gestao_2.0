import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { detailedOutboxSummary } from '../services/evidence-outbox.service';
import { telemetryQueueCount } from '../services/telemetry-queue.service';
import { useAppTheme } from '../theme/use-app-theme';

export function SyncBanner(){
  const p=useAppTheme();
  const [telemetry,setTelemetry]=useState(0);
  const [evidence,setEvidence]=useState(0);
  const load=useCallback(async()=>{
    const [t,o]=await Promise.all([telemetryQueueCount(),detailedOutboxSummary()]);
    setTelemetry(t);setEvidence(o.evidencePending+o.evidenceReview+o.evidenceFailed);
  },[]);
  useEffect(()=>{void load();const timer=setInterval(()=>void load(),15000);return()=>clearInterval(timer)},[load]);
  const total=telemetry+evidence;
  if(!total)return null;
  const parts=[telemetry?`${telemetry} telemetria(s)`:null,evidence?`${evidence} evidência(s)`:null].filter(Boolean).join(' + ');
  return <Pressable accessibilityRole="button" accessibilityLabel={`${parts} aguardando sincronização`} onPress={()=>router.push('/sincronizacao')} style={[s.card,{backgroundColor:p.surface,borderColor:p.border}]}><View><Text style={[s.title,{color:p.text}]}>Sincronização disponível</Text><Text style={[s.text,{color:p.textMuted}]}>{parts} aguardando envio</Text></View><Text style={[s.open,{color:p.primary}]}>ABRIR</Text></Pressable>
}
const s=StyleSheet.create({card:{borderWidth:1,borderRadius:18,padding:16,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12},title:{fontSize:15,fontWeight:'900'},text:{fontSize:12,marginTop:5},open:{fontSize:11,fontWeight:'900'}});
