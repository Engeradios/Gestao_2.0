import { useColorScheme } from 'react-native';
import { useThemeStore } from '../stores/theme.store';
import { dark, light } from './tokens';
export function useAppTheme(){const mode=useThemeStore(s=>s.mode);const system=useColorScheme();const selected=mode==='system'?(system??'light'):mode;return selected==='dark'?dark:light;}
