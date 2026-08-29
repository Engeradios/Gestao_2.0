import { cookies } from "next/headers";
import { NextResponse } from "next/server";

async function proxy(request: Request, path: string[]) {
  const token = (await cookies()).get("engeradios_token")?.value;
  if (!token)
    return NextResponse.json({ message: "Sessão expirada" }, { status: 401 });
  const source = new URL(request.url);
  const target = `${process.env.API_INTERNAL_URL}/api/v1/propostas/${path.join("/")}${source.search}`;
  const headers: HeadersInit = { Authorization: `Bearer ${token}` };
  const init: RequestInit = {
    method: request.method,
    headers,
    cache: "no-store",
  };
  if (!["GET", "HEAD"].includes(request.method)) {
    const type = request.headers.get("content-type");
    if (type) (headers as Record<string, string>)["Content-Type"] = type;
    init.body = await request.arrayBuffer();
  }
  const response = await fetch(target, init);
  return new NextResponse(await response.arrayBuffer(), {
    status: response.status,
    headers: {
      "Content-Type":
        response.headers.get("content-type") || "application/json",
    },
  });
}

type Context = { params: Promise<{ path: string[] }> };
export async function GET(req: Request, ctx: Context) {
  return proxy(req, (await ctx.params).path);
}
export async function POST(req: Request, ctx: Context) {
  return proxy(req, (await ctx.params).path);
}
export async function PATCH(req: Request, ctx: Context) {
  return proxy(req, (await ctx.params).path);
}
