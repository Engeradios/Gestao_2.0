import { apiProxy } from "@/lib/api-proxy";

export async function GET(request: Request) {
  const search = new URL(request.url).searchParams.get("search");
  const suffix = search ? `?search=${encodeURIComponent(search)}` : "";
  return apiProxy(`/api/v1/ferramentas/usuarios${suffix}`);
}

export async function POST(request: Request) {
  return apiProxy("/api/v1/ferramentas/usuarios", {
    method: "POST",
    body: JSON.stringify(await request.json()),
  });
}
