import { apiProxy } from "@/lib/api-proxy";

type RouteContext = {
  params: Promise<{ path?: string[] }>;
};

async function target(context: RouteContext) {
  const { path = [] } = await context.params;
  const suffix = path.length
    ? `/${path.map(encodeURIComponent).join("/")}`
    : "";

  return `/api/v1/ferramentas/configuracao-email${suffix}`;
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

export async function POST(request: Request, context: RouteContext) {
  return apiProxy(await target(context), {
    method: "POST",
    body: await request.text(),
  });
}
