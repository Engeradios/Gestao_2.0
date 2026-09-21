import { cookies } from "next/headers";
import { NextResponse } from "next/server";
async function proxy(
  req: Request,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const token = (await cookies()).get("engeradios_token")?.value;
  if (!token)
    return NextResponse.json({ message: "Sessão expirada" }, { status: 401 });
  const { path } = await ctx.params;
  const url = `${process.env.API_INTERNAL_URL}/api/v1/operacional/${path.join("/")}${new URL(req.url).search}`;
  const init: RequestInit = {
    method: req.method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": req.headers.get("content-type") || "application/json",
    },
    cache: "no-store",
  };
  if (!["GET", "HEAD"].includes(req.method)) init.body = await req.text();
  const r = await fetch(url, init);
  const text = await r.text();
  return new NextResponse(text, {
    status: r.status,
    headers: {
      "content-type": r.headers.get("content-type") || "application/json",
    },
  });
}
export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
