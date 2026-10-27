import type { KeyValueStorage } from '@newreplica/shared/auth';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

// On a phone, "localhost" is the phone itself, so default to the dev machine's LAN host that Expo is served from.
function resolveApiUrl() {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  const host = Constants.expoConfig?.hostUri?.split(':')[0] ?? 'localhost';
  return `http://${host}:4000`;
}

export const API_URL = resolveApiUrl();

export const storage: KeyValueStorage = {
  get: (key) => SecureStore.getItemAsync(key),
  set: (key, value) => SecureStore.setItemAsync(key, value),
  remove: (key) => SecureStore.deleteItemAsync(key),
};
