import { headers } from "next/headers";

export default async function HmlBanner() {
  const h = await headers();

  const host =
    h.get("x-forwarded-host") ||
    h.get("host") ||
    "";

  const isHml =
    host.includes("hml.gestao.engeradios.com.br");

  if (!isHml) {
    return null;
  }

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 999999,
        width: "100%",
        background: "#dc2626",
        color: "#ffffff",
        textAlign: "center",
        padding: "10px",
        fontWeight: 700,
        fontSize: "14px",
        boxShadow: "0 2px 4px rgba(0,0,0,.25)"
      }}
    >
      🧪 AMBIENTE DE HOMOLOGAÇÃO • TESTES • NÃO UTILIZAR PARA OPERAÇÃO REAL
    </div>
  );
}
