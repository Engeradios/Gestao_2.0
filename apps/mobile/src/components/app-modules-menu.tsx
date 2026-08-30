import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { visibleModules } from '../permissions/access-control';
import { MOBILE_MODULES } from '../permissions/mobile-modules';
import { useAuthStore } from '../stores/auth.store';
import { useAppTheme } from '../theme/use-app-theme';

export function AppModulesMenu(){
 const p=useAppTheme();const user=useAuthStore(s=>s.user);const modules=visibleModules(user,MOBILE_MODULES);
 return <View style={s.wrap}><Text style={[s.heading,{color:p.text}]}>Módulos</Text><Text style={[s.description,{color:p.textMuted}]}>Recursos disponíveis para seu perfil</Text>
 <View style={s.grid}>{modules.map(item=><Pressable key={item.key} accessibilityRole="button" accessibilityLabel={`Abrir ${item.title}`} style={({pressed})=>[s.card,{backgroundColor:p.surface,borderColor:p.border},pressed&&s.pressed]} onPress={()=>router.push(item.href as never)}><View style={[s.icon,{backgroundColor:p.primary}]}><Text style={s.iconText}>{item.symbol}</Text></View><Text style={[s.title,{color:p.text}]}>{item.title}</Text><Text style={[s.subtitle,{color:p.textMuted}]}>{item.subtitle}</Text><Text style={[s.open,{color:p.primary}]}>ABRIR</Text></Pressable>)}</View></View>
}
const s=StyleSheet.create({wrap:{marginTop:22},heading:{fontSize:22,fontWeight:'900'},description:{marginTop:4,marginBottom:14},grid:{flexDirection:'row',flexWrap:'wrap',gap:12},card:{width:'48%',minHeight:170,borderWidth:1,borderRadius:18,padding:14},pressed:{opacity:.7},icon:{width:44,height:44,borderRadius:13,alignItems:'center',justifyContent:'center',marginBottom:13},iconText:{color:'#FFF',fontWeight:'900'},title:{fontSize:15,fontWeight:'900'},subtitle:{fontSize:12,lineHeight:17,marginTop:5,flex:1},open:{fontSize:10,fontWeight:'900',marginTop:10}});
