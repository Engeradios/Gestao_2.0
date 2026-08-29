import * as SecureStore from "expo-secure-store";
import { create } from "zustand";
import type { AuthUser } from "../services/auth.service";

type State = {
  token: string | null; user: AuthUser | null; hydrated: boolean;
  restore: () => Promise<void>;
  setAuth: (token: string, refreshToken: string, user: AuthUser) => Promise<void>;
  logout: () => Promise<void>;
};

export const useAuthStore = create<State>((set) => ({
  token: null, user: null, hydrated: false,
  restore: async () => {
    const token = await SecureStore.getItemAsync("engeradios.token");
    const raw = await SecureStore.getItemAsync("engeradios.user");
    set({ token, user: raw ? JSON.parse(raw) : null, hydrated: true });
  },
  setAuth: async (token, refreshToken, user) => {
    await Promise.all([
      SecureStore.setItemAsync("engeradios.token", token),
      SecureStore.setItemAsync("engeradios.refresh_token", refreshToken),
      SecureStore.setItemAsync("engeradios.user", JSON.stringify(user)),
    ]);
    set({ token, user, hydrated: true });
  },
  logout: async () => {
    const refreshToken = await SecureStore.getItemAsync("engeradios.refresh_token");
    if (refreshToken) await apiLogout(refreshToken);
    await Promise.allSettled([
      SecureStore.deleteItemAsync("engeradios.token"),
      SecureStore.deleteItemAsync("engeradios.refresh_token"),
      SecureStore.deleteItemAsync("engeradios.user"),
    ]);
    set({ token: null, user: null, hydrated: true });
  },
}));

async function apiLogout(refreshToken: string) {
  try {
    const { api } = await import("../services/api");
    await api.post("/auth/logout", { refreshToken });
  } catch {
    // Logout local continua mesmo sem conexão.
  }
}
