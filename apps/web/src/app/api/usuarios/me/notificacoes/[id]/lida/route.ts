import { apiProxy } from "@/lib/api-proxy";

type Context = {
  params: Promise<{ id: string }>;
};

export async function PATCH(_request: Request, context: Context) {
  const { id } = await context.params;

  return apiProxy(
    `/api/v1/usuarios/me/notificacoes/${encodeURIComponent(id)}/lida`,
    { method: "PATCH" },
  );
}
