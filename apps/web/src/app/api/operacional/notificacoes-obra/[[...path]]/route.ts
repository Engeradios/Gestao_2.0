import { cookies } from "next/headers";
import { NextResponse } from "next/server";
async function proxy(
  request: Request,
  context: { params: Promise<{ path?: string[] }> },
) {
  const token = (await cookies()).get("engeradios_token")?.value;
  if (!token)
    return NextResponse.json({ message: "Sessão expirada" }, { status: 401 });
  const { path = [] } = await context.params;
  const url = `${process.env.API_INTERNAL_URL}/api/v1/operacional/notificacoes-obra/${path.join("/")}`;
  const body = request.method === "GET" ? undefined : await request.text();
  const response = await fetch(url, {
    method: request.method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body,
    cache: "no-store",
  });
  const text = await response.text();
  return new NextResponse(text, {
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
