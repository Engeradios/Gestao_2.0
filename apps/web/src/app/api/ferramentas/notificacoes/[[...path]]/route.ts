import { apiProxy } from "@/lib/api-proxy";

type RouteContext = {
  params: Promise<{ path?: string[] }>;
};

async function target(context: RouteContext) {
  const { path = [] } = await context.params;
  const suffix = path.length
    ? `/${path.map(encodeURIComponent).join("/")}`
    : "";

  return `/api/v1/ferramentas/notificacoes${suffix}`;
}

export async function GET(_request: Request, context: RouteContext) {
  return apiProxy(await target(context));
}

export async function PATCH(request: Request, context: RouteContext) {
  return apiProxy(await target(context), {
    method: "PATCH",
    body: await request.text(),
  });
}
