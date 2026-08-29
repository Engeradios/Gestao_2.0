import { apiProxy } from "@/lib/api-proxy";

type Context = {
  params: Promise<{
    path?: string[];
  }>;
};

async function target(context: Context) {
  const { path = [] } = await context.params;
  const suffix = path.length ? `/${path.join("/")}` : "";

  return `/api/v1/ferramentas/sla-os/feriados${suffix}`;
}

export async function POST(
  request: Request,
  context: Context,
) {
  return apiProxy(await target(context), {
    method: "POST",
    body: await request.text(),
  });
}

export async function PATCH(
  request: Request,
  context: Context,
) {
  return apiProxy(await target(context), {
    method: "PATCH",
    body: await request.text(),
  });
}

export async function DELETE(
  _request: Request,
  context: Context,
) {
  return apiProxy(await target(context), {
    method: "DELETE",
  });
}
