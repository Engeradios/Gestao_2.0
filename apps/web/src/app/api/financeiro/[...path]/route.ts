import { apiProxy } from "@/lib/api-proxy";
type Context = { params: Promise<{ path: string[] }> };
function target(request: Request, path: string[]) {
  const url = new URL(request.url);
  for (const [key, value] of [...url.searchParams.entries()])
    if (!value.trim()) url.searchParams.delete(key);
  const query = url.searchParams.toString();
  return `/api/v1/financeiro/${path.join("/")}${query ? `?${query}` : ""}`;
}
async function forward(request: Request, context: Context, method: string) {
  const { path } = await context.params;
  const contentType = request.headers.get("content-type") ?? "";
  const body =
    method === "GET" || method === "HEAD"
      ? undefined
      : contentType.includes("application/json")
        ? JSON.stringify(await request.json())
        : await request.arrayBuffer();
  return apiProxy(target(request, path), { method, body });
}
export const GET = (r: Request, c: Context) => forward(r, c, "GET");
export const POST = (r: Request, c: Context) => forward(r, c, "POST");
export const PATCH = (r: Request, c: Context) => forward(r, c, "PATCH");
export const DELETE = (r: Request, c: Context) => forward(r, c, "DELETE");
