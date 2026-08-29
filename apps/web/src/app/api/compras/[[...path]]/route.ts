import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ path?: string[] }> };

async function proxy(request: Request, context: Context, method: string) {
  const token = (await cookies()).get("engeradios_token")?.value;
  if (!token) return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  const { path = [] } = await context.params;
  const incoming = new URL(request.url);
  const target = `${process.env.API_INTERNAL_URL}/api/v1/compras/${path.join("/")}${incoming.search}`;
  const headers: HeadersInit = { Authorization: `Bearer ${token}` };
  if (method !== "GET") headers["Content-Type"] = request.headers.get("content-type") ?? "application/json";
  const response = await fetch(target, {
    method,
    headers,
    body: method === "GET" ? undefined : await request.arrayBuffer(),
    cache: "no-store",
  });
  return new NextResponse(await response.arrayBuffer(), {
    status: response.status,
    headers: { "content-type": response.headers.get("content-type") ?? "application/json",
      ...(response.headers.get("content-disposition") ? { "content-disposition": response.headers.get("content-disposition")! } : {}) },
  });
}
export function GET(request: Request, context: Context) { return proxy(request, context, "GET"); }
export function POST(request: Request, context: Context) { return proxy(request, context, "POST"); }
export function PATCH(request: Request, context: Context) { return proxy(request, context, "PATCH"); }
