import { cookies } from "next/headers";
import { NextResponse } from "next/server";
type Context = { params: Promise<{ id: string }> };
export async function GET(_: Request, context: Context) {
  const token = (await cookies()).get("engeradios_token")?.value;
  if (!token)
    return NextResponse.json({ message: "Sessão expirada" }, { status: 401 });
  const { id } = await context.params;
  const response = await fetch(
    `${process.env.API_INTERNAL_URL}/api/v1/ferramentas/auditoria/${id}`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
  );
  return NextResponse.json(await response.json(), { status: response.status });
}
