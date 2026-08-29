"use client";
import { useCallback, useEffect, useState } from "react";
type ConfigRow = { id: string | number; tipo?: string; nome?: string; ordem?: number; email?: string; recAbertura?: boolean; recFaturamento?: boolean }; function messageOf(e: unknown) { return e instanceof Error ? e.message : "Falha"; } async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch("/api/operacional/" + path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.message || "Falha");
  return j as T;
}
export default function Page() {
  const [tab, setTab] = useState<"listas" | "notificacoes">("listas");
  const [data, setData] = useState<ConfigRow[]>([]);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      setData(await api<ConfigRow[]>(tab));
      setError("");
    } catch (e: unknown) {
      setError(messageOf(e));
    }
  }, [tab]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  const save = async (r: ConfigRow) => {
    await api(`${tab}/${r.id}`, { method: "PATCH", body: JSON.stringify(r) });
    await load();
  };
  const del = async (r: ConfigRow) => {
    if (confirm("Excluir registro?")) {
      await api(`${tab}/${r.id}`, { method: "DELETE" });
      await load();
    }
  };
  return (
    <main className="mx-auto max-w-6xl space-y-4 p-6">
      <h1 className="text-2xl font-bold">Configurações do Operacional</h1>
      <div className="flex gap-2">
        <button
          onClick={() => setTab("listas")}
          className="rounded-xl border px-4 py-2"
        >
          Listas
        </button>
        <button
          onClick={() => setTab("notificacoes")}
          className="rounded-xl border px-4 py-2"
        >
          Notificações
        </button>
      </div>
      {error && <p className="text-red-600">{error}</p>}
      <div className="space-y-3">
        {data.map((r, i) => (
          <div
            key={String(r.id)}
            className="grid gap-2 rounded-2xl border p-4 md:grid-cols-6"
          >
            {tab === "listas" ? (
              <>
                <input
                  value={r.tipo || ""}
                  onChange={(e) => {
                    const x = [...data];
                    x[i] = { ...r, tipo: e.target.value };
                    setData(x);
                  }}
                />
                <input
                  value={r.nome || ""}
                  onChange={(e) => {
                    const x = [...data];
                    x[i] = { ...r, nome: e.target.value };
                    setData(x);
                  }}
                />
                <input
                  type="number"
                  value={r.ordem || 0}
                  onChange={(e) => {
                    const x = [...data];
                    x[i] = { ...r, ordem: Number(e.target.value) };
                    setData(x);
                  }}
                />
              </>
            ) : (
              <>
                <input
                  value={r.nome || ""}
                  onChange={(e) => {
                    const x = [...data];
                    x[i] = { ...r, nome: e.target.value };
                    setData(x);
                  }}
                />
                <input
                  value={r.email || ""}
                  onChange={(e) => {
                    const x = [...data];
                    x[i] = { ...r, email: e.target.value };
                    setData(x);
                  }}
                />
                <label>
                  <input
                    type="checkbox"
                    checked={!!r.recAbertura}
                    onChange={(e) => {
                      const x = [...data];
                      x[i] = { ...r, recAbertura: e.target.checked };
                      setData(x);
                    }}
                  />{" "}
                  Abertura
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={!!r.recFaturamento}
                    onChange={(e) => {
                      const x = [...data];
                      x[i] = { ...r, recFaturamento: e.target.checked };
                      setData(x);
                    }}
                  />{" "}
                  Fechamento
                </label>
              </>
            )}
            <button
              onClick={() => save(r)}
              className="rounded bg-blue-600 px-3 py-2 text-white"
            >
              Salvar
            </button>
            <button
              onClick={() => del(r)}
              className="rounded bg-red-600 px-3 py-2 text-white"
            >
              Excluir
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}
