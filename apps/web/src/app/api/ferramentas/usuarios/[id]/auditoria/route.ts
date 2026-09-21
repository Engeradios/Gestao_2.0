import { apiProxy } from "@/lib/api-proxy";

type Context = { params: Promise<{ id: string }> };

export async function GET(_: Request, context: Context) {
  const { id } = await context.params;
  return apiProxy(
    `/api/v1/ferramentas/usuarios/${encodeURIComponent(id)}/auditoria`,
  );
}
