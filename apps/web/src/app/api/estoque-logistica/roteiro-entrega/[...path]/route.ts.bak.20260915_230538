import { cookies } from "next/headers";
import { NextResponse } from "next/server";

type Context = {
  params: Promise<{ path: string[] }>;
};

async function proxy(request: Request, context: Context) {
  const token = (await cookies()).get("engeradios_token")?.value;

  if (!token) {
    return NextResponse.json({ message: "Sessão expirada" }, { status: 401 });
  }

  const { path } = await context.params;
  const suffix = path.length ? `/${path.join("/")}` : "";
  const url =
    `${process.env.API_INTERNAL_URL}` +
    `/api/v1/estoque-logistica/roteiro-entrega${suffix}` +
    new URL(request.url).search;

  const init: RequestInit = {
    method: request.method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": request.headers.get("content-type") ?? "application/json",
    },
    cache: "no-store",
  };

  if (!["GET", "HEAD"].includes(request.method)) {
    init.body = await request.text();
  }

  const response = await fetch(url, init);
  const body = await response.arrayBuffer();

  const headers = new Headers();

  for (const name of [
    "content-type",
    "content-disposition",
    "content-length",
    "cache-control",
  ]) {
    const value = response.headers.get(name);

    if (value) headers.set(name, value);
  }

  return new NextResponse(body, {
    status: response.status,
    headers,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
