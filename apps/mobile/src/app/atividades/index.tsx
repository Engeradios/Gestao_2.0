import { router } from 'expo-router';
import { Pressable,ScrollView,StyleSheet,Text,View } from 'react-native';
import { MobileAppShell } from '../../components/mobile-app-shell';
import { visibleModules } from '../../permissions/access-control';
import { MOBILE_MODULES } from '../../permissions/mobile-modules';
import { useAuthStore } from '../../stores/auth.store';
import { useAppTheme } from '../../theme/use-app-theme';
export default function Atividades(){const p=useAppTheme();const user=useAuthStore(s=>s.user);const items=visibleModules(user,MOBILE_MODULES).filter(x=>x.operational);return <MobileAppShell title="Atividades" subtitle="Rotinas liberadas para seu perfil."><ScrollView style={{backgroundColor:p.background}} contentContainerStyle={s.content}>{items.length===0?<View style={[s.empty,{backgroundColor:p.surface,borderColor:p.border}]}><Text style={[s.emptyTitle,{color:p.text}]}>Nenhuma atividade disponível</Text><Text style={[s.sub,{color:p.textMuted}]}>Solicite ao administrador a permissão necessária.</Text></View>:items.map(item=><Pressable key={item.key} accessibilityRole="button" onPress={()=>router.push(item.href as never)} style={[s.card,{backgroundColor:p.surface,borderColor:p.border}]}><Text style={[s.title,{color:p.text}]}>{item.title}</Text><Text style={[s.sub,{color:p.textMuted}]}>{item.subtitle}</Text><Text style={[s.open,{color:p.primary}]}>ABRIR</Text></Pressable>)}</ScrollView></MobileAppShell>}
const s=StyleSheet.create({content:{padding:16,paddingBottom:30},card:{borderWidth:1,borderRadius:18,padding:17,marginBottom:11},title:{fontSize:16,fontWeight:'900'},sub:{fontSize:12,marginTop:5},open:{fontSize:10,fontWeight:'900',marginTop:12},empty:{borderWidth:1,borderRadius:18,padding:22},emptyTitle:{fontSize:17,fontWeight:'900'}});
