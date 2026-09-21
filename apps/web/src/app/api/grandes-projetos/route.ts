import { apiProxy } from "@/lib/api-proxy";

function sanitizedSearch(request: Request) {
  const source = new URL(request.url);
  const params = new URLSearchParams();

  for (const [key, value] of source.searchParams.entries()) {
    const normalized = value.trim();

    if (normalized !== "") {
      params.append(key, normalized);
    }
  }

  const query = params.toString();
  return query ? `?${query}` : "";
}

export async function GET(request: Request) {
  return apiProxy(`/api/v1/grandes-projetos${sanitizedSearch(request)}`);
}

export async function POST(request: Request) {
  return apiProxy("/api/v1/grandes-projetos", {
    method: "POST",
    body: JSON.stringify(await request.json()),
  });
}
