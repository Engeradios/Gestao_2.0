import { cookies } from "next/headers";
import { NextResponse } from "next/server";
export async function GET(request: Request) {
  const token = (await cookies()).get("engeradios_token")?.value;
  if (!token)
    return NextResponse.json({ message: "Sessão expirada" }, { status: 401 });
  const response = await fetch(
    `${process.env.API_INTERNAL_URL}/api/v1/operacional/os${new URL(request.url).search}`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
  );
  return NextResponse.json(await response.json(), { status: response.status });
}
