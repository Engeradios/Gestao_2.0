import { cookies } from "next/headers";
import { NextResponse } from "next/server";
type Context = { params: Promise<{ path: string[] }> };
async function proxy(request: Request, context: Context) {
  const token = (await cookies()).get("engeradios_token")?.value;
  if (!token)
    return NextResponse.json({ message: "Sessão expirada" }, { status: 401 });
  const { path } = await context.params;
  const target = `${process.env.API_INTERNAL_URL}/api/v1/grandes-projetos/${path.join("/")}${new URL(request.url).search}`;
  const headers: HeadersInit = { Authorization: `Bearer ${token}` };
  const init: RequestInit = {
    method: request.method,
    headers,
    cache: "no-store",
  };
  if (!["GET", "HEAD"].includes(request.method)) {
    headers["Content-Type"] =
      request.headers.get("content-type") || "application/json";
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
export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
