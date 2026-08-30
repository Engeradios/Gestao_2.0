import * as SecureStore from '../services/secure-store';
import { create } from "zustand";
export type ThemeMode = "light" | "dark" | "system";
type State = {
  mode: ThemeMode;
  hydrated: boolean;
  restore: () => Promise<void>;
  setMode: (mode: ThemeMode) => Promise<void>;
};
const KEY = "engeradios.theme";
export const useThemeStore = create<State>((set) => ({
  mode: "system",
  hydrated: false,
  restore: async () => {
    const value = await SecureStore.getItemAsync(KEY);
    set({
      mode: value === "light" || value === "dark" ? value : "system",
      hydrated: true,
    });
  },
  setMode: async (mode) => {
    await SecureStore.setItemAsync(KEY, mode);
    set({ mode });
  },
}));
