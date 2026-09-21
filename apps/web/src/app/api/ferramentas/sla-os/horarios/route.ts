import { apiProxy } from "@/lib/api-proxy";

export async function PATCH(request: Request) {
  return apiProxy("/api/v1/ferramentas/sla-os/horarios", {
    method: "PATCH",
    body: await request.text(),
  });
}
