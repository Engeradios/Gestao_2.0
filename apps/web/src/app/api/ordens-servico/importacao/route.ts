import { cookies } from "next/headers";
import { NextResponse } from "next/server";

async function proxy(request: Request, action: string) {
  const token = (await cookies()).get("engeradios_token")?.value;
  if (!token)
    return NextResponse.json({ message: "Sessão expirada" }, { status: 401 });
  const form = await request.formData();
  const response = await fetch(
    `${process.env.API_INTERNAL_URL}/api/v1/operacional/os/importacao/${action}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
      cache: "no-store",
    },
  );
  const text = await response.text();
  let data: unknown = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text || "Resposta inválida da API" };
  }
  return NextResponse.json(data, { status: response.status });
}
export async function POST(request: Request) {
  const action =
    new URL(request.url).searchParams.get("acao") === "executar"
      ? "executar"
      : "previa";
  return proxy(request, action);
}
