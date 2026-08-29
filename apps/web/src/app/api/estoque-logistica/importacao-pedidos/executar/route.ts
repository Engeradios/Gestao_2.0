import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const token = (await cookies()).get("engeradios_token")?.value;

  if (!token) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }

  const formData = await request.formData();

  const response = await fetch(
    `${process.env.API_INTERNAL_URL}/api/v1/estoque-logistica/importacao-pedidos/executar`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
      cache: "no-store",
    },
  );

  const body = await response.text();

  return new NextResponse(body, {
    status: response.status,
    headers: {
      "Content-Type":
        response.headers.get("content-type") ?? "application/json",
    },
  });
}
