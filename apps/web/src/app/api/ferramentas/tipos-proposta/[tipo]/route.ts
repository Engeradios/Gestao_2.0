import { cookies } from "next/headers";
import { NextResponse } from "next/server";

type Context = {
  params: Promise<{ tipo: string }>;
};

export async function PATCH(request: Request, context: Context) {
  const token = (await cookies()).get("engeradios_token")?.value;

  if (!token) {
    return NextResponse.json({ message: "Sessão expirada" }, { status: 401 });
  }

  const { tipo } = await context.params;
  const body = await request.json();

  const response = await fetch(
    `${process.env.API_INTERNAL_URL}/api/v1/ferramentas/tipos-proposta/${encodeURIComponent(tipo)}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    },
  );

  const data = await response.json().catch(() => ({}));

  return NextResponse.json(data, {
    status: response.status,
  });
}
