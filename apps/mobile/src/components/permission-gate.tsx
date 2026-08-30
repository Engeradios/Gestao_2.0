import { Redirect } from 'expo-router';
import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { hasPermission } from '../permissions/access-control';
import { useAuthStore } from '../stores/auth.store';
import { useAppTheme } from '../theme/use-app-theme';

export function PermissionGate({ permission, children }:{ permission:string; children:ReactNode }) {
  const p=useAppTheme();
  const hydrated=useAuthStore(s=>s.hydrated);
  const token=useAuthStore(s=>s.token);
  const user=useAuthStore(s=>s.user);
  if (!hydrated) return <View style={[s.page,{backgroundColor:p.background}]}><ActivityIndicator color={p.primary}/></View>;
  if (!token) return <Redirect href="/login"/>;
  if (!hasPermission(user,permission)) return <View style={[s.page,{backgroundColor:p.background}]}><Text style={[s.title,{color:p.text}]}>Acesso não autorizado</Text><Text style={[s.text,{color:p.textMuted}]}>Este módulo não está disponível para o perfil atual.</Text></View>;
  return <>{children}</>;
}
const s=StyleSheet.create({page:{flex:1,alignItems:'center',justifyContent:'center',padding:28},title:{fontSize:20,fontWeight:'900',textAlign:'center'},text:{fontSize:13,lineHeight:20,textAlign:'center',marginTop:8}});
