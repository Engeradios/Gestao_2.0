import { apiProxy } from "@/lib/api-proxy";

const target = "/api/v1/ferramentas/sla-os";

export async function GET() {
  return apiProxy(target);
}

export async function PATCH(request: Request) {
  return apiProxy(target, {
    method: "PATCH",
    body: await request.text(),
  });
}
