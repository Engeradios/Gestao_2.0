import { apiProxy } from "@/lib/api-proxy";

type Context = {
  params: Promise<{
    path?: string[];
  }>;
};

export async function GET(
  request: Request,
  context: Context,
) {
  const { path = [] } = await context.params;

  const suffix = path.length
    ? `/${path.map(encodeURIComponent).join("/")}`
    : "";

  const query = new URL(request.url).search;

  return apiProxy(
    `/api/v1/financeiro/documentos-fiscais${suffix}${query}`,
  );
}
