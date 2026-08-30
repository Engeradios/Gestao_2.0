import * as ExpoSecureStore from 'expo-secure-store';
import {
  deleteLocalProfile,
  getLocalProfile,
  isProfileStorageKey,
  setLocalProfile,
} from './profile-storage.service';

export type SecureStoreOptions = ExpoSecureStore.SecureStoreOptions;

export async function setItemAsync(
  key: string,
  value: string,
  options?: SecureStoreOptions,
): Promise<void> {
  if (isProfileStorageKey(key)) {
    await setLocalProfile(value);
    await ExpoSecureStore.deleteItemAsync(key, options).catch(() => undefined);
    return;
  }
  await ExpoSecureStore.setItemAsync(key, value, options);
}

export async function getItemAsync(
  key: string,
  options?: SecureStoreOptions,
): Promise<string | null> {
  if (!isProfileStorageKey(key)) {
    return ExpoSecureStore.getItemAsync(key, options);
  }

  const local = await getLocalProfile();
  if (local) return local;

  // Compatibilidade: migra uma única vez o perfil salvo por versões anteriores.
  const legacy = await ExpoSecureStore.getItemAsync(key, options);
  if (!legacy) return null;

  await setLocalProfile(legacy);
  await ExpoSecureStore.deleteItemAsync(key, options);
  return legacy;
}

export async function deleteItemAsync(
  key: string,
  options?: SecureStoreOptions,
): Promise<void> {
  if (isProfileStorageKey(key)) {
    await deleteLocalProfile();
    await ExpoSecureStore.deleteItemAsync(key, options).catch(() => undefined);
    return;
  }
  await ExpoSecureStore.deleteItemAsync(key, options);
}

export const isAvailableAsync = ExpoSecureStore.isAvailableAsync;
