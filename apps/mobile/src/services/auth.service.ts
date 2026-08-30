import * as SecureStore from './secure-store';
import { api } from "./api";

export type AuthUser = { id?: string; sub?: string; nome?: string; name?: string; email?: string; role?: string; roles?: string[]; perfis?: string[]; permissions?: string[]; permissoes?: string[] };
export type LoginResult = { token: string; refreshToken: string; user: AuthUser };

export async function login(identificador: string, senha: string): Promise<LoginResult> {
  const { data } = await api.post("/auth/login", { email: identificador.trim(), senha });
  const token = data.accessToken ?? data.access_token ?? data.token;
  const refreshToken = data.refreshToken ?? data.refresh_token;
  if (!token || !refreshToken) throw new Error("Tokens de autenticação ausentes");
  let user = data.user ?? data.usuario ?? null;
  if (!user) {
    await Promise.all([
      SecureStore.setItemAsync("engeradios.token", token),
      SecureStore.setItemAsync("engeradios.refresh_token", refreshToken),
    ]);
    const profile = await api.get("/auth/profile");
    user = profile.data;
  }
  return { token, refreshToken, user };
}
