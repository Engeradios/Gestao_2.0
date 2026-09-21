"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  MonitorPlay,
  Plus,
  RefreshCw,
  Save,
  Settings2,
  Trash2,
} from "lucide-react";
import type {
  TvCatalogItem,
  TvDashboard,
  TvDashboardDevice,
  TvSceneLayout,
  TvWidgetColor,
  TvWidgetSize,
} from "@/lib/dashboard-tv-types";
import { DashboardTvViewer } from "./dashboard-tv-viewer";
const jsonHeaders = { "Content-Type": "application/json" };
// DASHBOARD_TV_FASE3_EDITOR
// DASHBOARD_TV_FASE4B_LAYOUT
// DASHBOARD_TV_FASE5B_WIDGET_OPTIONS
// DASHBOARD_TV_FASE6D_DEVICE_ADMIN
async function api(path: string, init?: RequestInit) {
  const r = await fetch(`/api/dashboard-tv${path}`, {
    cache: "no-store",
    ...init,
  });
  const b = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(b.message || "Operação não concluída");
  return b;
}
export function DashboardTvEditor({
  dashboardId,
  canManage = true,
  canPublish = true,
}: {
  dashboardId?: string;
  canManage?: boolean;
  canPublish?: boolean;
}) {
  const router = useRouter();
  const [items, setItems] = useState<TvDashboard[]>([]);
  const [panel, setPanel] = useState<TvDashboard | null>(null);
  const [catalog, setCatalog] = useState<TvCatalogItem[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [notice, setNotice] = useState("");
  const [creating, setCreating] = useState(false);
  const [devices, setDevices] = useState<TvDashboardDevice[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(false);
  const load = useCallback(async () => {
    try {
      setCatalog(await api("/catalogo"));
      if (dashboardId) {
        const p = await api(`/${dashboardId}`);
        setPanel(p);
        setSelected((x: string) => x || p.cenas?.[0]?.id || "");
      } else setItems(await api(""));
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Erro");
    }
  }, [dashboardId]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  const loadDevices = useCallback(async () => {
    if (!dashboardId) return;

    setDevicesLoading(true);

    try {
      setDevices(await api(`/${dashboardId}/dispositivos`));
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Erro ao consultar TVs.",
      );
    } finally {
      setDevicesLoading(false);
    }
  }, [dashboardId]);

  useEffect(() => {
    if (!dashboardId) return;

    const timer = window.setTimeout(() => void loadDevices(), 0);

    const interval = window.setInterval(() => void loadDevices(), 30000);

    return () => {
      window.clearTimeout(timer);
      window.clearInterval(interval);
    };
  }, [dashboardId, loadDevices]);
  const scene = useMemo(
    () => panel?.cenas.find((x) => x.id === selected) || null,
    [panel, selected],
  );
  async function createPanel(form: FormData) {
    setCreating(true);
    try {
      const p = await api("", {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({
          nome: String(form.get("nome") || "Dashboard TV Operacional"),
          slug: String(form.get("slug") || "") || undefined,
        }),
      });
      router.push(`/dashboard-tv/configuracoes/${p.id}`);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Erro");
    } finally {
      setCreating(false);
    }
  }
  async function patchPanel(data: Record<string, unknown>) {
    if (!panel) return;
    await api(`/${panel.id}`, {
      method: "PATCH",
      headers: jsonHeaders,
      body: JSON.stringify(data),
    });
    await load();
    setNotice("Configuração salva.");
  }
  async function patchChild(
    kind: "cenas" | "widgets",
    id: string,
    data: Record<string, unknown>,
  ) {
    try {
      await api(`/${kind}/${id}`, {
        method: "PATCH",
        headers: jsonHeaders,
        body: JSON.stringify(data),
      });
      await load();
      setNotice("Configuração atualizada.");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Erro ao atualizar.");
    }
  }

  async function updateDevice(deviceId: string, apelido: string) {
    try {
      await api(`/dispositivos/${deviceId}`, {
        method: "PATCH",
        headers: jsonHeaders,
        body: JSON.stringify({
          apelido: apelido.trim() || null,
        }),
      });

      await loadDevices();
      setNotice("Apelido da TV atualizado.");
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Erro ao atualizar a TV.",
      );
    }
  }

  async function addScene() {
    if (!panel) return;
    const s = await api(`/${panel.id}/cenas`, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        nome: `Nova cena ${panel.cenas.length + 1}`,
        ordem: panel.cenas.length,
      }),
    });
    await load();
    setSelected(s.id);
  }
  async function addWidget(item: TvCatalogItem) {
    if (!scene) return;
    await api(`/cenas/${scene.id}/widgets`, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        tipo: item.tipo,
        titulo: item.titulo,
        ordem: scene.widgets.length,
      }),
    });
    await load();
  }
  async function move(
    kind: "cenas" | "widgets",
    id: string,
    ordem: number,
    delta: number,
  ) {
    await api(`/${kind}/${id}`, {
      method: "PATCH",
      headers: jsonHeaders,
      body: JSON.stringify({ ordem: Math.max(0, ordem + delta) }),
    });
    await load();
  }
  async function remove(kind: "cenas" | "widgets", id: string) {
    if (!confirm("Remover este item?")) return;
    await api(`/${kind}/${id}`, { method: "DELETE" });
    await load();
  }
  if (!dashboardId)
    return (
      <section>
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="text-sm font-semibold text-red-600">Dashboard TV</p>
            <h2 className="text-2xl font-bold">Painéis e telas</h2>
            <p className="text-sm text-slate-500">
              Crie painéis independentes para TVs e configure cenas
              operacionais.
            </p>
          </div>
        </div>
        <form
          action={createPanel}
          className="mb-5 grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-[1fr_1fr_auto] dark:bg-slate-950"
        >
          <input
            name="nome"
            required
            placeholder="Nome do painel"
            className="rounded-xl border bg-transparent px-3 py-2"
          />
          <input
            name="slug"
            placeholder="Identificador opcional"
            className="rounded-xl border bg-transparent px-3 py-2"
          />
          <button
            disabled={creating || !canManage}
            className="rounded-xl bg-red-600 px-4 py-2 font-semibold text-white disabled:opacity-40"
          >
            <Plus className="mr-2 inline" size={16} />
            Criar painel
          </button>
        </form>
        {notice && (
          <p className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
            {notice}
          </p>
        )}
        <div className="grid gap-4 lg:grid-cols-2">
          {items.map((p) => (
            <article
              key={p.id}
              className="rounded-2xl border bg-white p-5 dark:bg-slate-950"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold">{p.nome}</h3>
                  <p className="text-sm text-slate-500">
                    {p._count?.cenas || 0} cenas ·{" "}
                    {p.publicado ? "Publicado" : "Rascunho"}
                  </p>
                </div>
                <MonitorPlay className="text-red-600" />
              </div>
              <div className="mt-4 flex gap-2">
                <Link
                  href={`/dashboard-tv/configuracoes/${p.id}`}
                  className="rounded-xl border px-3 py-2 text-sm font-semibold"
                >
                  <Settings2 className="mr-2 inline" size={15} />
                  Configurar
                </Link>
                <Link
                  href={`/dashboard-tv/exibir/${p.id}`}
                  className="rounded-xl border px-3 py-2 text-sm"
                >
                  <Eye className="mr-2 inline" size={15} />
                  Visualizar
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    );
  if (!panel) return <p>Carregando editor...</p>;
  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-red-600">Dashboard TV</p>
          <h2 className="text-2xl font-bold">{panel.nome}</h2>
        </div>
        <div className="flex gap-2">
          <Link
            target="_blank"
            href={`/dashboard-tv/exibir/${panel.id}`}
            className="rounded-xl border px-3 py-2 text-sm"
          >
            <Eye className="mr-2 inline" size={15} />
            Abrir modo TV
          </Link>
          {canPublish && (
            <button
              onClick={() =>
                void api(`/${panel.id}/publicar`, {
                  method: "POST",
                  headers: jsonHeaders,
                  body: JSON.stringify({ publicado: !panel.publicado }),
                }).then(load)
              }
              className="rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white"
            >
              {panel.publicado ? "Retirar publicação" : "Publicar"}
            </button>
          )}
        </div>
      </div>
      <section className="mb-5 rounded-2xl border bg-white p-4 dark:bg-slate-950">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-bold">TVs conectadas</h3>
            <p className="text-xs text-slate-500">
              {devices.filter((device) => device.online).length} online ·{" "}
              {devices.filter((device) => !device.online).length} offline
            </p>
          </div>

          <button
            type="button"
            disabled={devicesLoading}
            onClick={() => void loadDevices()}
            className="rounded-xl border px-3 py-2 text-sm disabled:opacity-40"
          >
            <RefreshCw
              size={15}
              className={`mr-2 inline ${devicesLoading ? "animate-spin" : ""}`}
            />
            Atualizar
          </button>
        </div>

        {devices.length ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {devices.map((device) => (
              <article key={device.id} className="rounded-xl border p-3">
                <div className="flex items-center justify-between gap-3">
                  <b className="truncate text-sm">
                    {device.apelido || "TV sem apelido"}
                  </b>

                  <span
                    className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                      device.online
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    {device.online ? "Online" : "Offline"}
                  </span>
                </div>

                <label className="mt-3 block text-[11px] text-slate-500">
                  Apelido administrativo
                  <input
                    key={`${device.id}-${device.apelido || ""}`}
                    defaultValue={device.apelido || ""}
                    maxLength={120}
                    disabled={!canManage}
                    placeholder="Ex.: TV Operacional RJ"
                    onBlur={(event) => {
                      const value = event.target.value.trim();

                      if (value !== (device.apelido || "")) {
                        void updateDevice(device.id, value);
                      }
                    }}
                    className="mt-1 w-full rounded-lg border bg-transparent px-2 py-1.5 text-xs"
                  />
                </label>

                <dl className="mt-3 space-y-1 text-xs text-slate-500">
                  <div className="flex justify-between gap-3">
                    <dt>Resolução</dt>
                    <dd>{device.resolucao || "Não informada"}</dd>
                  </div>

                  <div className="flex justify-between gap-3">
                    <dt>Versão</dt>
                    <dd>{device.versaoApp || "Não informada"}</dd>
                  </div>

                  <div className="flex justify-between gap-3">
                    <dt>Último contato</dt>
                    <dd>
                      {new Date(device.ultimoContatoEm).toLocaleString("pt-BR")}
                    </dd>
                  </div>
                </dl>

                <p
                  className="mt-2 truncate text-[10px] text-slate-400"
                  title={device.navegador || device.identificador}
                >
                  {device.navegador || `ID: ${device.identificador}`}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-500 dark:bg-slate-900">
            Nenhuma TV registrada para este painel.
          </p>
        )}
      </section>

      <div className="grid gap-5 xl:grid-cols-[300px_1fr_360px]">
        <aside className="rounded-2xl border bg-white p-4 dark:bg-slate-950">
          <div className="mb-3 flex justify-between">
            <b>Cenas</b>
            <button
              onClick={() => void addScene()}
              disabled={!canManage}
              className="rounded-lg border p-1"
            >
              <Plus size={16} />
            </button>
          </div>
          <div className="space-y-2">
            {panel.cenas
              .toSorted((a, b) => a.ordem - b.ordem)
              .map((s) => (
                <div
                  key={s.id}
                  className={`rounded-xl border p-2 ${selected === s.id ? "border-red-500 bg-red-50 dark:bg-red-950/20" : ""}`}
                >
                  <button
                    onClick={() => setSelected(s.id)}
                    className="w-full text-left text-sm font-semibold"
                  >
                    {s.nome}
                  </button>
                  <div className="mt-2 grid grid-cols-[1fr_92px] items-end gap-2">
                    <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={s.ativa}
                        disabled={!canManage}
                        onChange={(e) =>
                          void patchChild("cenas", s.id, {
                            ativa: e.target.checked,
                          })
                        }
                        className="h-4 w-4 accent-red-600"
                      />
                      Cena ativa
                    </label>
                    <label className="text-[11px] text-slate-500">
                      Duração (s)
                      <input
                        key={`${s.id}-${s.duracaoSegundos ?? "padrao"}`}
                        type="number"
                        min={5}
                        max={3600}
                        defaultValue={s.duracaoSegundos ?? ""}
                        disabled={!canManage}
                        placeholder="Padrão"
                        onBlur={(e) => {
                          const value = e.target.value.trim();
                          void patchChild("cenas", s.id, {
                            duracaoSegundos: value ? Number(value) : null,
                          });
                        }}
                        className="mt-1 w-full rounded-lg border bg-transparent px-2 py-1 text-xs"
                      />
                    </label>
                  </div>
                  <label className="mt-2 block text-[11px] text-slate-500">
                    Layout
                    <select
                      value={
                        (s.configuracao.layout as TvSceneLayout | undefined) ||
                        "AUTO"
                      }
                      disabled={!canManage}
                      onChange={(event) =>
                        void patchChild("cenas", s.id, {
                          configuracao: { layout: event.target.value },
                        })
                      }
                      className="mt-1 w-full rounded-lg border bg-transparent px-2 py-1.5 text-xs"
                    >
                      <option value="AUTO">Automatico</option>
                      <option value="GRADE">Grade uniforme</option>
                      <option value="DESTAQUE">Primeiro em destaque</option>
                    </select>
                  </label>
                  <div className="mt-2 flex gap-1">
                    <button
                      aria-label="Subir cena"
                      onClick={() => void move("cenas", s.id, s.ordem, -1)}
                    >
                      <ArrowUp size={15} />
                    </button>
                    <button
                      aria-label="Descer cena"
                      onClick={() => void move("cenas", s.id, s.ordem, 1)}
                    >
                      <ArrowDown size={15} />
                    </button>
                    <button
                      aria-label="Excluir cena"
                      className="ml-auto text-red-600"
                      onClick={() => void remove("cenas", s.id)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </aside>
        <main className="min-w-0">
          <div className="mb-4 rounded-2xl border bg-white p-4 dark:bg-slate-950">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm">
                Nome
                <input
                  value={panel.nome}
                  onChange={(e) => setPanel({ ...panel, nome: e.target.value })}
                  className="mt-1 w-full rounded-xl border bg-transparent px-3 py-2"
                />
              </label>
              <label className="text-sm">
                Duração padrão
                <input
                  type="number"
                  value={panel.cenaSegundos}
                  onChange={(e) =>
                    setPanel({ ...panel, cenaSegundos: Number(e.target.value) })
                  }
                  className="mt-1 w-full rounded-xl border bg-transparent px-3 py-2"
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={panel.mostrarClima}
                  onChange={(e) =>
                    setPanel({ ...panel, mostrarClima: e.target.checked })
                  }
                />
                Mostrar clima ao lado do relógio
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={panel.permitirFinanceiro}
                  onChange={(e) =>
                    setPanel({ ...panel, permitirFinanceiro: e.target.checked })
                  }
                />
                Permitir percentuais financeiros
              </label>
            </div>
            <button
              onClick={() =>
                void patchPanel({
                  nome: panel.nome,
                  cenaSegundos: panel.cenaSegundos,
                  mostrarClima: panel.mostrarClima,
                  permitirFinanceiro: panel.permitirFinanceiro,
                })
              }
              className="mt-3 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              <Save className="mr-2 inline" size={15} />
              Salvar painel
            </button>
          </div>
          <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
            <span>Pré-visualização 16:9</span>
            <span>
              {scene?.widgets.filter((widget) => widget.ativo).length || 0}{" "}
              widgets ativos
            </span>
          </div>
          <div className="aspect-video min-h-[420px] overflow-hidden rounded-2xl border bg-[#08090b] shadow-xl">
            <DashboardTvViewer id={panel.id} preview />
          </div>
        </main>
        <aside className="rounded-2xl border bg-white p-4 dark:bg-slate-950">
          <b>Widgets da cena</b>
          {scene ? (
            <>
              <div className="mt-3 space-y-2">
                {scene.widgets
                  .toSorted((a, b) => a.ordem - b.ordem)
                  .map((w) => (
                    <div key={w.id} className="rounded-xl border p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">
                            {w.titulo}
                          </p>
                          <p className="text-xs text-slate-500">{w.tipo}</p>
                        </div>
                        <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs text-slate-500">
                          <input
                            type="checkbox"
                            checked={w.ativo}
                            disabled={!canManage}
                            onChange={(e) =>
                              void patchChild("widgets", w.id, {
                                ativo: e.target.checked,
                              })
                            }
                            className="h-4 w-4 accent-red-600"
                          />
                          Ativo
                        </label>
                      </div>
                      <label className="mt-3 block text-[11px] text-slate-500">
                        Titulo
                        <input
                          key={`${w.id}-${w.titulo}`}
                          defaultValue={w.titulo}
                          maxLength={80}
                          disabled={!canManage}
                          onBlur={(event) => {
                            const titulo = event.target.value.trim();
                            if (titulo && titulo !== w.titulo)
                              void patchChild("widgets", w.id, { titulo });
                          }}
                          className="mt-1 w-full rounded-lg border bg-transparent px-2 py-1.5 text-xs"
                        />
                      </label>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <label className="text-[11px] text-slate-500">
                          Limite
                          <input
                            key={`${w.id}-${w.configuracao.limite ?? 8}`}
                            type="number"
                            min={1}
                            max={20}
                            defaultValue={Number(w.configuracao.limite || 8)}
                            disabled={!canManage}
                            onBlur={(event) =>
                              void patchChild("widgets", w.id, {
                                configuracao: {
                                  limite: Math.max(
                                    1,
                                    Math.min(
                                      20,
                                      Number(event.target.value) || 8,
                                    ),
                                  ),
                                },
                              })
                            }
                            className="mt-1 w-full rounded-lg border bg-transparent px-2 py-1.5 text-xs"
                          />
                        </label>
                        <label className="text-[11px] text-slate-500">
                          Cor
                          <select
                            value={
                              (w.configuracao.cor as
                                TvWidgetColor | undefined) || "VERMELHO"
                            }
                            disabled={!canManage}
                            onChange={(event) =>
                              void patchChild("widgets", w.id, {
                                configuracao: { cor: event.target.value },
                              })
                            }
                            className="mt-1 w-full rounded-lg border bg-transparent px-2 py-1.5 text-xs"
                          >
                            <option value="VERMELHO">Vermelho</option>
                            <option value="LARANJA">Laranja</option>
                            <option value="VERDE">Verde</option>
                            <option value="AZUL">Azul</option>
                            <option value="ROXO">Roxo</option>
                            <option value="ROSA">Rosa</option>
                            <option value="CIANO">Ciano</option>
                          </select>
                        </label>
                      </div>
                      <label className="mt-3 block text-[11px] text-slate-500">
                        Tamanho no painel
                        <select
                          value={
                            (w.configuracao.tamanho as
                              TvWidgetSize | undefined) || "MEDIO"
                          }
                          disabled={!canManage}
                          onChange={(event) =>
                            void patchChild("widgets", w.id, {
                              configuracao: { tamanho: event.target.value },
                            })
                          }
                          className="mt-1 w-full rounded-lg border bg-transparent px-2 py-1.5 text-xs"
                        >
                          <option value="PEQUENO">Pequeno</option>
                          <option value="MEDIO">Medio</option>
                          <option value="GRANDE">Grande</option>
                          <option value="TOTAL">Largura total</option>
                        </select>
                      </label>
                      <div className="mt-2 flex gap-1">
                        <button
                          onClick={() =>
                            void move("widgets", w.id, w.ordem, -1)
                          }
                        >
                          <ArrowUp size={15} />
                        </button>
                        <button
                          onClick={() => void move("widgets", w.id, w.ordem, 1)}
                        >
                          <ArrowDown size={15} />
                        </button>
                        <button
                          className="ml-auto text-red-600"
                          onClick={() => void remove("widgets", w.id)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
              <h3 className="mb-2 mt-5 text-sm font-bold">Catálogo</h3>
              <div className="max-h-96 space-y-2 overflow-auto">
                {catalog.map((item) => (
                  <button
                    key={item.tipo}
                    disabled={item.financeiro && !panel.permitirFinanceiro}
                    onClick={() => void addWidget(item)}
                    className="w-full rounded-xl border p-3 text-left text-sm disabled:opacity-40"
                  >
                    <b>{item.titulo}</b>
                    <span className="block text-xs text-slate-500">
                      {item.grupo} · {item.formato}
                    </span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p className="mt-3 text-sm text-slate-500">
              Selecione ou crie uma cena.
            </p>
          )}
        </aside>
      </div>
      {notice && <p className="mt-4 text-sm">{notice}</p>}
    </section>
  );
}
