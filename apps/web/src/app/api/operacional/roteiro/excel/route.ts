import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const token = (await cookies()).get("engeradios_token")?.value;

  if (!token) {
    return NextResponse.json(
      { message: "Sessão expirada." },
      { status: 401 },
    );
  }

  const data = request.nextUrl.searchParams.get("data") || "";
  const unidade =
    request.nextUrl.searchParams.get("unidade") === "SP" ? "SP" : "RJ";

  const statusOperacional =
    request.nextUrl.searchParams.get("statusOperacional") || "";

  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    return NextResponse.json(
      { message: "Data inválida." },
      { status: 400 },
    );
  }

  const parameters = new URLSearchParams({
    data,
    unidade,
  });

  if (statusOperacional) {
    parameters.set("statusOperacional", statusOperacional);
  }

  const apiInternalUrl = process.env.API_INTERNAL_URL;

  if (!apiInternalUrl) {
    return NextResponse.json(
      { message: "API interna não configurada." },
      { status: 500 },
    );
  }

  const response = await fetch(
    `${apiInternalUrl}/api/v1/operacional/roteiro/excel?${parameters}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const text = await response.text();

    return NextResponse.json(
      {
        message:
          text || "Não foi possível gerar a planilha.",
      },
      { status: response.status },
    );
  }

  const file = await response.arrayBuffer();

  return new NextResponse(file, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        response.headers.get("content-disposition") ??
        `attachment; filename="roteiro-tecnico-${data}-${unidade}.xlsx"`,
      "Content-Length": String(file.byteLength),
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
