import { apiProxy } from "@/lib/api-proxy";

export async function GET() {
  return apiProxy("/api/v1/ferramentas/usuarios/perfis");
}
