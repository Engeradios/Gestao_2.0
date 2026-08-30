import '../services/background-location.task';
import * as Network from 'expo-network';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { synchronizeTelemetryQueue } from '../services/telemetry-queue.service';
import { useAuthStore } from '../stores/auth.store';

export default function RootLayout() {
  const hydrated = useAuthStore((s) => s.hydrated);
  const restore = useAuthStore((s) => s.restore);
  useEffect(() => { void restore(); }, [restore]);
  useEffect(() => {
    void synchronizeTelemetryQueue();
    const subscription = Network.addNetworkStateListener((state) => {
      if (state.isConnected && state.isInternetReachable !== false) {
        void synchronizeTelemetryQueue();
      }
    });
    return () => subscription.remove();
  }, []);
  if (!hydrated) return <View style={{ flex:1, alignItems:'center', justifyContent:'center' }}><ActivityIndicator /></View>;
  return <Stack screenOptions={{ headerShown:false }} />;
}
