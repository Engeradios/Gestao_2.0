import { cookies } from "next/headers";
import { NextResponse } from "next/server";

type Context = { params: Promise<{ id: string }> };

async function forward(
  request: Request,
  context: Context,
  method: "GET" | "PATCH",
) {
  const token = (await cookies()).get("engeradios_token")?.value;
  if (!token)
    return NextResponse.json({ message: "Sessão expirada" }, { status: 401 });
  const { id } = await context.params;
  const response = await fetch(
    `${process.env.API_INTERNAL_URL}/api/v1/ferramentas/perfis/${id}`,
    {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(method === "PATCH" ? { "Content-Type": "application/json" } : {}),
      },
      ...(method === "PATCH"
        ? { body: JSON.stringify(await request.json()) }
        : {}),
      cache: "no-store",
    },
  );
  return NextResponse.json(await response.json(), { status: response.status });
}

export function GET(request: Request, context: Context) {
  return forward(request, context, "GET");
}
export function PATCH(request: Request, context: Context) {
  return forward(request, context, "PATCH");
}
