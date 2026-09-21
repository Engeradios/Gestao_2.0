import { cookies } from "next/headers";
import { NextResponse } from "next/server";

async function forward(request: Request, method: "GET" | "POST") {
  const token = (await cookies()).get("engeradios_token")?.value;
  if (!token)
    return NextResponse.json({ message: "Sessão expirada" }, { status: 401 });
  const response = await fetch(
    `${process.env.API_INTERNAL_URL}/api/v1/ferramentas/perfis`,
    {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(method === "POST" ? { "Content-Type": "application/json" } : {}),
      },
      ...(method === "POST"
        ? { body: JSON.stringify(await request.json()) }
        : {}),
      cache: "no-store",
    },
  );
  return NextResponse.json(await response.json(), { status: response.status });
}

export function GET(request: Request) {
  return forward(request, "GET");
}
export function POST(request: Request) {
  return forward(request, "POST");
}
