import { cookies } from "next/headers";
import { NextResponse } from "next/server";

type Context = {
  params: Promise<{ path: string[] }>;
};

const allowed = new Set(["dashboard", "painel", "laboratorio"]);

export async function GET(request: Request, context: Context) {
  const token = (await cookies()).get("engeradios_token")?.value;

  if (!token) {
    return NextResponse.json({ message: "Sessão expirada" }, { status: 401 });
  }

  const { path } = await context.params;

  if (path.length !== 1 || !allowed.has(path[0])) {
    return NextResponse.json(
      { message: "Rota não permitida" },
      { status: 404 },
    );
  }

  const target =
    `${process.env.API_INTERNAL_URL}` +
    `/api/v1/operacional/os/${path[0]}` +
    new URL(request.url).search;

  const response = await fetch(target, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  return new NextResponse(await response.arrayBuffer(), {
    status: response.status,
    headers: {
      "content-type":
        response.headers.get("content-type") ?? "application/json",
    },
  });
}
