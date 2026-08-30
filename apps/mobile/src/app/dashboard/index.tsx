import { Redirect } from 'expo-router';
import { ScrollView,StyleSheet,Text,View } from 'react-native';
import { AppModulesMenu } from '../../components/app-modules-menu';
import { MobileAppShell } from '../../components/mobile-app-shell';
import { SyncBanner } from '../../components/sync-banner';
import { WorkShiftPanel } from '../../components/work-shift-panel';
import { useAuthStore } from '../../stores/auth.store';
import { useAppTheme } from '../../theme/use-app-theme';
export default function Home(){const token=useAuthStore(s=>s.token);const user=useAuthStore(s=>s.user) as {nome?:string;name?:string}|null;const p=useAppTheme();if(!token)return <Redirect href="/login"/>;return <MobileAppShell title={`Olá, ${(user?.nome??user?.name??'colaborador').split(' ')[0]}`} subtitle="Seu trabalho de campo em um único lugar."><ScrollView style={{backgroundColor:p.background}} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}><View style={[s.hero,{backgroundColor:p.nav}]}><Text style={s.eyebrow}>OPERAÇÃO DE CAMPO</Text><Text style={s.heroTitle}>Expediente e atividades</Text><Text style={s.heroText}>Acompanhe jornada, localização e tarefas com poucos toques.</Text></View><SyncBanner/><WorkShiftPanel/><AppModulesMenu/><View style={s.space}/></ScrollView></MobileAppShell>}
const s=StyleSheet.create({content:{padding:16,paddingBottom:32},hero:{borderRadius:20,padding:20,marginBottom:14},eyebrow:{color:'#FF9BA5',fontSize:10,fontWeight:'900',letterSpacing:1.4},heroTitle:{color:'#FFF',fontSize:24,fontWeight:'900',marginTop:6},heroText:{color:'#CAD6E1',fontSize:13,lineHeight:19,marginTop:7},space:{height:10}});
