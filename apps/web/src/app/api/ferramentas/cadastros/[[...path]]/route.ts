import { apiProxy } from "@/lib/api-proxy";

type RouteContext = {
  params: Promise<{ path?: string[] }>;
};

async function target(request: Request, context: RouteContext) {
  const { path = [] } = await context.params;

  const suffix = path.length
    ? `/${path.map(encodeURIComponent).join("/")}`
    : "";

  return `/api/v1/ferramentas/cadastros${suffix}${new URL(request.url).search}`;
}

export async function GET(request: Request, context: RouteContext) {
  return apiProxy(await target(request, context));
}

export async function POST(request: Request, context: RouteContext) {
  return apiProxy(await target(request, context), {
    method: "POST",
    body: await request.text(),
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  return apiProxy(await target(request, context), {
    method: "PATCH",
    body: await request.text(),
  });
}
