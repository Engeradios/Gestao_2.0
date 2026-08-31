// FASE5B_R3_REFRESH
import axios, { AxiosError, InternalAxiosRequestConfig, create, isAxiosError } from "axios";
import * as SecureStore from './secure-store';

const ACCESS_KEY = "engeradios.token";
const REFRESH_KEY = "engeradios.refresh_token";
const USER_KEY = "engeradios.user";
const baseURL = process.env.EXPO_PUBLIC_API_URL;

export const api = create({ baseURL, timeout: 15000, headers: { Accept: "application/json" } });
const refreshClient = create({ baseURL, timeout: 15000, headers: { Accept: "application/json" } });
let refreshPromise: Promise<string> | null = null;

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean };

async function clearSession() {
  await Promise.allSettled([
    SecureStore.deleteItemAsync(ACCESS_KEY),
    SecureStore.deleteItemAsync(REFRESH_KEY),
    SecureStore.deleteItemAsync(USER_KEY),
  ]);
}

async function renewAccessToken() {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    const refreshToken = await SecureStore.getItemAsync(REFRESH_KEY);
    if (!refreshToken) throw new Error("Refresh token ausente");
    const { data } = await refreshClient.post("/auth/refresh", { refreshToken });
    if (!data?.accessToken || !data?.refreshToken) throw new Error("Resposta de renovação inválida");
    await Promise.all([
      SecureStore.setItemAsync(ACCESS_KEY, data.accessToken),
      SecureStore.setItemAsync(REFRESH_KEY, data.refreshToken),
    ]);
    return data.accessToken as string;
  })().finally(() => { refreshPromise = null; });
  return refreshPromise;
}

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await SecureStore.getItemAsync(ACCESS_KEY);
  if (token) config.headers.set("Authorization", `Bearer ${token}`);
  else config.headers.delete("Authorization");
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetryConfig | undefined;
    const isAuthRoute = config?.url?.includes("/auth/login") || config?.url?.includes("/auth/refresh");
    if (error.response?.status !== 401 || !config || config._retry || isAuthRoute) {
      return Promise.reject(error);
    }
    config._retry = true;
    try {
      const accessToken = await renewAccessToken();
      config.headers.set("Authorization", `Bearer ${accessToken}`);
      return api.request(config);
    } catch (refreshError) {
      if (isAxiosError(refreshError) && refreshError.response?.status === 401) await clearSession();
      return Promise.reject(refreshError);
    }
  },
);

export function apiErrorMessage(error: unknown, fallback: string) {
  if (!isAxiosError(error)) return fallback;
  if (!error.response) return "Sem conexão. Os dados locais serão preservados até a rede retornar.";
  if (error.response.status === 401) return "Sessão expirada. Entre novamente no aplicativo.";
  const data: unknown = error.response.data;
  if (data && typeof data === "object" && "message" in data) {
    const message = (data as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return error.message || fallback;
}

export { axios };

