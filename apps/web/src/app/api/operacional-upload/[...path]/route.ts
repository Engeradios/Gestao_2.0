import { cookies } from "next/headers";
import { NextResponse } from "next/server";
export async function POST(
  req: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const token = (await cookies()).get("engeradios_token")?.value;
  if (!token)
    return NextResponse.json({ message: "Sessão expirada" }, { status: 401 });
  const { path } = await params;
  const r = await fetch(
    `${process.env.API_INTERNAL_URL}/api/v1/operacional/${path.join("/")}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: await req.formData(),
      cache: "no-store",
    },
  );
  return new NextResponse(await r.text(), {
    status: r.status,
    headers: {
      "content-type": r.headers.get("content-type") || "application/json",
    },
  });
}
