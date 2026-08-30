import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../../theme/use-app-theme';
export function StatusPill({label,tone='neutral'}:{label:string;tone?:'success'|'warning'|'danger'|'neutral'}){const p=useAppTheme();const color=tone==='success'?p.success:tone==='warning'?p.warning:tone==='danger'?p.danger:p.textMuted;return <View style={[s.box,{borderColor:color,backgroundColor:`${color}18`}]}><View style={[s.dot,{backgroundColor:color}]}/><Text style={[s.text,{color}]}>{label}</Text></View>}
const s=StyleSheet.create({box:{minHeight:30,borderWidth:1,borderRadius:999,paddingHorizontal:10,flexDirection:'row',alignItems:'center',gap:6},dot:{width:7,height:7,borderRadius:4},text:{fontSize:11,fontWeight:'800'}});
