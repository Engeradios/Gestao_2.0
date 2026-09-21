import { NextRequest } from "next/server";

import { apiProxy } from "@/lib/api-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ path?: string[] }>;
};

async function apiPath(request: NextRequest, context: RouteContext) {
  const { path = [] } = await context.params;
  const suffix = path.length
    ? `/${path.map((segment) => encodeURIComponent(segment)).join("/")}`
    : "";
  return `/api/v1/dp-rh${suffix}${request.nextUrl.search}`;
}

async function withoutBody(request: NextRequest, context: RouteContext) {
  return apiProxy(await apiPath(request, context), {
    method: request.method,
    cache: "no-store",
  });
}

async function withBody(request: NextRequest, context: RouteContext) {
  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);

  return apiProxy(await apiPath(request, context), {
    method: request.method,
    headers,
    body: await request.arrayBuffer(),
    cache: "no-store",
  });
}

export async function GET(request: NextRequest, context: RouteContext) {
  return withoutBody(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return withBody(request, context);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return withBody(request, context);
}
