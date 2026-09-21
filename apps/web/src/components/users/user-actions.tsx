"use client";

import { Ban, CheckCircle2, Copy, History, KeyRound, X } from "lucide-react";
import { useState } from "react";

type UserSummary = {
  id: string;
  nome: string;
  email: string;
  status: "ATIVO" | "INATIVO" | "BLOQUEADO";
};

type AuditRecord = {
  id: string;
  acao: string;
  criadoEm: string;
  ip?: string | null;
  dadosAntes?: unknown;
  dadosDepois?: unknown;
  usuario?: { nome: string; email: string } | null;
};

function messageOf(data: unknown) {
  if (data && typeof data === "object" && "message" in data) {
    const message = (data as { message?: string | string[] }).message;
    return Array.isArray(message) ? message.join(". ") : message;
  }
  return undefined;
}

export function UserActions({ user }: { user: UserSummary }) {
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<AuditRecord[] | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function changeStatus(status: UserSummary["status"]) {
    if (!window.confirm(`Confirma alterar ${user.nome} para ${status}?`))
      return;
    setBusy(true);
    setError("");
    const response = await fetch(
      `/api/ferramentas/usuarios/${user.id}/status`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      },
    );
    const data = await response.json();
    setBusy(false);
    if (!response.ok)
      return setError(messageOf(data) ?? "Falha ao alterar status.");
    window.location.reload();
  }

  async function resetPassword() {
    if (!window.confirm(`Redefinir a senha de ${user.nome}?`)) return;
    setBusy(true);
    setError("");
    const response = await fetch(
      `/api/ferramentas/usuarios/${user.id}/redefinir-senha`,
      { method: "POST" },
    );
    const data = await response.json();
    setBusy(false);
    if (!response.ok)
      return setError(messageOf(data) ?? "Falha ao redefinir senha.");
    setPassword(data.temporaryPassword);
    setOpen(true);
  }

  async function showHistory() {
    setBusy(true);
    setError("");
    const response = await fetch(
      `/api/ferramentas/usuarios/${user.id}/auditoria`,
    );
    const data = await response.json();
    setBusy(false);
    if (!response.ok)
      return setError(messageOf(data) ?? "Falha ao carregar auditoria.");
    setHistory(data);
    setOpen(true);
  }

  return (
    <>
      <div className="flex flex-wrap justify-end gap-1">
        <button
          type="button"
          onClick={showHistory}
          disabled={busy}
          title="Histórico"
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-red-600 dark:hover:bg-slate-800"
        >
          <History size={18} />
        </button>
        <button
          type="button"
          onClick={resetPassword}
          disabled={busy}
          title="Redefinir senha"
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-amber-600 dark:hover:bg-slate-800"
        >
          <KeyRound size={18} />
        </button>
        {user.status === "ATIVO" ? (
          <button
            type="button"
            onClick={() => changeStatus("BLOQUEADO")}
            disabled={busy}
            title="Bloquear"
            className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
          >
            <Ban size={18} />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => changeStatus("ATIVO")}
            disabled={busy}
            title="Reativar"
            className="rounded-lg p-2 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/30"
          >
            <CheckCircle2 size={18} />
          </button>
        )}
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      {open && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-black/60 p-4">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-950">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-red-600">Usuário</p>
                <h3 className="text-xl font-bold">{user.nome}</h3>
                <p className="text-sm text-slate-500">{user.email}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setPassword("");
                  setHistory(null);
                }}
                className="rounded-xl p-2 hover:bg-slate-100 dark:hover:bg-slate-900"
                aria-label="Fechar"
              >
                <X />
              </button>
            </div>
            {password && (
              <div className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 p-5 dark:border-amber-800 dark:bg-amber-950/30">
                <h4 className="font-bold">Senha temporária redefinida</h4>
                <p className="mt-2 text-sm">
                  Copie agora. A senha não será exibida novamente.
                </p>
                <div className="mt-4 flex gap-2">
                  <code className="min-w-0 flex-1 overflow-x-auto rounded-xl bg-white px-4 py-3 font-bold dark:bg-slate-900">
                    {password}
                  </code>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(password)}
                    className="rounded-xl bg-amber-600 px-4 text-white"
                    title="Copiar"
                  >
                    <Copy size={18} />
                  </button>
                </div>
              </div>
            )}
            {history && (
              <div className="mt-6 space-y-3">
                <h4 className="font-bold">Linha do tempo</h4>
                {history.length === 0 && (
                  <p className="text-sm text-slate-500">
                    Nenhum registro encontrado.
                  </p>
                )}
                {history.map((record) => (
                  <article
                    key={record.id}
                    className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800"
                  >
                    <div className="flex flex-col justify-between gap-1 sm:flex-row">
                      <p className="font-semibold">
                        {record.acao.replaceAll("_", " ")}
                      </p>
                      <time className="text-xs text-slate-500">
                        {new Date(record.criadoEm).toLocaleString("pt-BR")}
                      </time>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      Executado por {record.usuario?.nome ?? "Sistema"}
                      {record.ip ? ` · IP ${record.ip}` : ""}
                    </p>
                    {!!(record.dadosAntes || record.dadosDepois) && (
                      <pre className="mt-3 overflow-x-auto rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-900">
                        {JSON.stringify(
                          {
                            antes: record.dadosAntes,
                            depois: record.dadosDepois,
                          },
                          null,
                          2,
                        )}
                      </pre>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
