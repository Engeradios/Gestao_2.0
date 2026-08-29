import { apiProxy } from "@/lib/api-proxy";

export async function PATCH() {
  return apiProxy("/api/v1/usuarios/me/notificacoes/marcar-todas-lidas", {
    method: "PATCH",
  });
}
