import { cookies } from "next/headers";
import { NextResponse } from "next/server";

type Context = { params: Promise<{ path?: string[] }> };

async function proxy(request: Request, context: Context) {
  const token = (await cookies()).get("engeradios_token")?.value;
  if (!token) return NextResponse.json({ message: "Sessão expirada" }, { status: 401 });

  const { path = [] } = await context.params;
  const suffix = path.length ? `/${path.map(encodeURIComponent).join("/")}` : "";
  const target = `${process.env.API_INTERNAL_URL}/api/v1/administrativo/contratos${suffix}${new URL(request.url).search}`;
  const headers = new Headers();
  headers.set("Authorization", `Bearer ${token}`);
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);
  const body = request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer();
  const upstream = await fetch(target, { method: request.method, headers, body: body?.byteLength ? body : undefined, cache: "no-store" });

  const responseHeaders = new Headers();
  for (const name of ["content-type", "content-disposition", "content-length", "x-content-type-options"]) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
