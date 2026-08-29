import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuthStore } from '../stores/auth.store';

export default function RootLayout() {
  const hydrated = useAuthStore((s) => s.hydrated);
  const restore = useAuthStore((s) => s.restore);
  useEffect(() => { void restore(); }, [restore]);
  if (!hydrated) return <View style={{ flex:1, alignItems:'center', justifyContent:'center' }}><ActivityIndicator /></View>;
  return <Stack screenOptions={{ headerShown:false }} />;
}
