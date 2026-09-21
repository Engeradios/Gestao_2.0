import { apiProxy } from "@/lib/api-proxy";

const target = "/api/v1/usuarios/me/preferencias-notificacao";

export async function GET() {
  return apiProxy(target);
}
