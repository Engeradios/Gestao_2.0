import { apiProxy } from "@/lib/api-proxy";
export async function GET(request: Request) {
  return apiProxy(`/api/v1/propostas${new URL(request.url).search}`);
}
