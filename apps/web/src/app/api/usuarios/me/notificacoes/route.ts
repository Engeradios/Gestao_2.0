import { apiProxy } from "@/lib/api-proxy";

export async function GET(request: Request) {
  const query = new URL(request.url).search;

  return apiProxy(`/api/v1/usuarios/me/notificacoes${query}`);
}
