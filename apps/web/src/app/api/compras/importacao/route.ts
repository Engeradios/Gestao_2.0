import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const token = (await cookies()).get("engeradios_token")?.value;
  if (!token) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }

  const action = new URL(request.url).searchParams.get("acao");
  if (action !== "previa" && action !== "executar") {
    return NextResponse.json({ message: "Ação de importação inválida." }, { status: 400 });
  }

  const formData = await request.formData();
  const response = await fetch(
    `${process.env.API_INTERNAL_URL}/api/v1/compras/importacao/${action}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
      cache: "no-store",
    },
  );

  return new NextResponse(await response.arrayBuffer(), {
    status: response.status,
    headers: {
      "content-type": response.headers.get("content-type") ?? "application/json",
    },
  });
}
