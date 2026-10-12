import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    path?: string[];
  }>;
};

function apiBase(): string {
  const value = process.env.API_INTERNAL_URL?.trim();

  if (!value) {
    throw new Error("API_INTERNAL_URL não configurada.");
  }

  return value.replace(/\/+$/, "");
}

async function destination(
  request: NextRequest,
  context: RouteContext,
): Promise<string> {
  const parameters = await context.params;
  const suffix = (parameters.path ?? [])
    .map((part) => encodeURIComponent(part))
    .join("/");

  const target = new URL(
    `${apiBase()}/api/v1/financial/received-invoices${
      suffix ? `/${suffix}` : ""
    }`,
  );

  request.nextUrl.searchParams.forEach((value, key) => {
    target.searchParams.append(key, value);
  });

  return target.toString();
}

async function proxy(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const cookieStore = await cookies();
  const token = cookieStore.get("engeradios_token")?.value;

  if (!token) {
    return NextResponse.json(
      { message: "Sessão expirada." },
      { status: 401 },
    );
  }

  try {
    const headers = new Headers();
    const incomingContentType = request.headers.get("content-type");
    const incomingAccept = request.headers.get("accept");

    headers.set("Authorization", `Bearer ${token}`);
    headers.set("Accept", incomingAccept ?? "application/json");

    if (incomingContentType) {
      headers.set("Content-Type", incomingContentType);
    }

    const method = request.method.toUpperCase();
    const hasBody = !["GET", "HEAD"].includes(method);

    const response = await fetch(
      await destination(request, context),
      {
        method,
        headers,
        body: hasBody ? await request.arrayBuffer() : undefined,
        cache: "no-store",
        redirect: "manual",
      },
    );

    const responseHeaders = new Headers();
    const contentType = response.headers.get("content-type");

    if (contentType) {
      responseHeaders.set("Content-Type", contentType);
    }

    return new NextResponse(await response.arrayBuffer(), {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Falha ao acessar o serviço de NF Recebidas.",
      },
      { status: 502 },
    );
  }
}

export async function GET(
  request: NextRequest,
  context: RouteContext,
) {
  return proxy(request, context);
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  return proxy(request, context);
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
) {
  return proxy(request, context);
}

export async function PUT(
  request: NextRequest,
  context: RouteContext,
) {
  return proxy(request, context);
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext,
) {
  return proxy(request, context);
}
