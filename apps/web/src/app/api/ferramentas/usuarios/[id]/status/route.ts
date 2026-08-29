import { apiProxy } from "@/lib/api-proxy";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  const { id } = await context.params;
  return apiProxy(
    `/api/v1/ferramentas/usuarios/${encodeURIComponent(id)}/status`,
    { method: "PATCH", body: JSON.stringify(await request.json()) },
  );
}
