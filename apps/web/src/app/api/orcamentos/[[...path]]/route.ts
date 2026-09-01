import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    path?: string[];
  }>;
};

const forwardedResponseHeaders = [
  "content-type",
  "content-disposition",
  "content-length",
  "x-content-type-options",
] as const;

async function proxy(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const token = (await cookies()).get("engeradios_token")?.value;

  if (!token) {
    return NextResponse.json(
      {
        message: "Sessão expirada",
      },
      {
        status: 401,
      },
    );
  }

  const apiBase = process.env.API_INTERNAL_URL;

  if (!apiBase) {
    return NextResponse.json(
      {
        message: "API interna não configurada no servidor Web.",
      },
      {
        status: 503,
      },
    );
  }

  const { path = [] } = await context.params;

  const suffix = path.length
    ? `/${path.map(encodeURIComponent).join("/")}`
    : "";

  const search = new URL(request.url).search;

  const target = `${apiBase}/api/v1/orcamentos${suffix}${search}`;

  const headers = new Headers({
    Accept: "*/*",
    Authorization: `Bearer ${token}`,
  });

  const contentType = request.headers.get("content-type");

  if (contentType) {
    headers.set("Content-Type", contentType);
  }

  const hasBody = !["GET", "HEAD"].includes(request.method);

  const requestBody = hasBody ? await request.arrayBuffer() : undefined;

  const upstream = await fetch(target, {
    method: request.method,
    headers,
    body: requestBody && requestBody.byteLength > 0 ? requestBody : undefined,
    cache: "no-store",
    redirect: "manual",
  });

  const responseHeaders = new Headers();

  for (const name of forwardedResponseHeaders) {
    const value = upstream.headers.get(name);

    if (value) {
      responseHeaders.set(name, value);
    }
  }

  responseHeaders.set("Cache-Control", "no-store, max-age=0");

  responseHeaders.set("X-Content-Type-Options", "nosniff");

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const HEAD = proxy;
