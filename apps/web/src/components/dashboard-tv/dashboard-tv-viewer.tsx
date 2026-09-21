"use client";
// DASHBOARD_TV_FASE1_IDENTIDADE
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
// DASHBOARD_TV_FASE2_4_CONFIABILIDADE
// DASHBOARD_TV_FASE4B_LAYOUT
// DASHBOARD_TV_FASE5B_WIDGET_OPTIONS
import type {
  TvPayload,
  TvSceneLayout,
  TvWidgetColor,
  TvWidgetSize,
} from "@/lib/dashboard-tv-types";
import { TvWidgetView } from "./widget-view";
const WIDGET_COLORS: Record<TvWidgetColor, string> = {
  VERMELHO: "#dc2626",
  LARANJA: "#f59e0b",
  VERDE: "#22c55e",
  AZUL: "#38bdf8",
  ROXO: "#8b5cf6",
  ROSA: "#ec4899",
  CIANO: "#14b8a6",
};
export function DashboardTvViewer({
  id,
  preview = false,
}: {
  id: string;
  preview?: boolean;
}) {
  const [payload, setPayload] = useState<TvPayload | null>(null);
  const [scene, setScene] = useState(0);
  const [now, setNow] = useState(new Date());
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const requestRef = useRef<Promise<void> | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const [weather, setWeather] = useState<{
    city: string;
    temperature: number;
    description: string;
    weatherCode: number;
  } | null>(null);
  const load = useCallback(() => {
    if (requestRef.current) return requestRef.current;
    const controller = new AbortController();
    controllerRef.current = controller;
    setRefreshing(true);
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    const request = (async () => {
      try {
        const response = await fetch(`/api/dashboard-tv/${id}/dados`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok)
          throw new Error("Não foi possível atualizar o painel.");
        setPayload(await response.json());
        setError("");
      } catch (cause) {
        setError(
          controller.signal.aborted
            ? "Atualização excedeu o tempo limite. Exibindo últimos dados."
            : cause instanceof Error
              ? cause.message
              : "Falha de conexão. Exibindo últimos dados.",
        );
      } finally {
        window.clearTimeout(timeout);
        setRefreshing(false);
        if (controllerRef.current === controller) controllerRef.current = null;
        requestRef.current = null;
      }
    })();
    requestRef.current = request;
    return request;
  }, [id]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") void load();
    };
    const onOnline = () => void load();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", onOnline);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onOnline);
      controllerRef.current?.abort();
    };
  }, [load]);
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  // DASHBOARD_TV_FASE6C_HEARTBEAT
  useEffect(() => {
    if (preview) return;

    const storageKey = `dashboard-tv-device:${id}`;

    const deviceId = (() => {
      try {
        const stored = window.localStorage.getItem(storageKey);

        if (stored) return stored;

        const generated = window.crypto.randomUUID();
        window.localStorage.setItem(storageKey, generated);

        return generated;
      } catch {
        return window.crypto.randomUUID();
      }
    })();

    const sendHeartbeat = async () => {
      try {
        await fetch(`/api/dashboard-tv/${id}/heartbeat`, {
          method: "POST",
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            identificador: deviceId,
            resolucao: `${window.screen.width}x${window.screen.height}`,
            navegador: navigator.userAgent.slice(0, 120),
            versaoApp: "6.0",
          }),
          signal: AbortSignal.timeout(10000),
        });
      } catch {
        // O heartbeat não pode interromper a exibição da TV.
      }
    };

    const initial = window.setTimeout(() => void sendHeartbeat(), 2000);

    const interval = window.setInterval(() => void sendHeartbeat(), 60000);

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void sendHeartbeat();
      }
    };

    const onOnline = () => void sendHeartbeat();

    document.addEventListener("visibilitychange", onVisible);

    window.addEventListener("online", onOnline);

    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);

      document.removeEventListener("visibilitychange", onVisible);

      window.removeEventListener("online", onOnline);
    };
  }, [id, preview]);
  useEffect(() => {
    if (!payload?.painel.mostrarClima) return;

    const loadWeather = async () => {
      try {
        const response = await fetch("/api/clima", {
          cache: "no-store",
          signal: AbortSignal.timeout(10000),
        });
        if (response.ok) setWeather(await response.json());
      } catch {
        // Mantém o último clima válido sem interromper o painel.
      }
    };

    const timer = window.setTimeout(() => void loadWeather(), 0);
    const interval = window.setInterval(() => void loadWeather(), 600000);

    return () => {
      window.clearTimeout(timer);
      window.clearInterval(interval);
    };
  }, [payload?.painel.mostrarClima]);
  const scenes = useMemo(
    () =>
      payload?.painel.cenas
        .filter((x) => x.ativa)
        .sort((a, b) => a.ordem - b.ordem) || [],
    [payload],
  );
  const safeScene = scenes.length > 0 ? scene % scenes.length : 0;
  useEffect(() => {
    if (!payload) return;
    const t = setInterval(
      () => void load(),
      Math.max(1, payload.painel.atualizacaoMinutos) * 60000,
    );
    return () => clearInterval(t);
  }, [payload, load]);
  useEffect(() => {
    if (!scenes.length) return;
    const seconds =
      scenes[safeScene]?.duracaoSegundos || payload?.painel.cenaSegundos || 12;
    const t = setTimeout(
      () => setScene((x) => (x + 1) % scenes.length),
      seconds * 1000,
    );
    return () => clearTimeout(t);
  }, [safeScene, scenes, payload]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight")
        setScene((x) => (x + 1) % Math.max(1, scenes.length));
      if (e.key === "ArrowLeft")
        setScene(
          (x) =>
            (x - 1 + Math.max(1, scenes.length)) % Math.max(1, scenes.length),
        );
      if (e.key.toLowerCase() === "f" && !preview)
        void document.documentElement.requestFullscreen?.();
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [scenes.length, preview]);
  if (!payload && error)
    return (
      <div className="grid min-h-screen place-items-center bg-[#0b0d10] text-red-300">
        {error}
      </div>
    );
  if (!payload)
    return (
      <div className="grid min-h-screen place-items-center bg-[#0b0d10] text-slate-300">
        Carregando Dashboard TV...
      </div>
    );
  const current = scenes[safeScene];
  const widgets =
    current?.widgets
      .filter((x) => x.ativo)
      .sort((a, b) => a.ordem - b.ordem)
      .slice(0, 4) || [];
  const layout =
    (current?.configuracao.layout as TvSceneLayout | undefined) || "AUTO";
  const gridClass =
    widgets.length <= 1
      ? "grid-cols-1 grid-rows-1"
      : widgets.length === 2
        ? "grid-cols-2 grid-rows-1"
        : "grid-cols-2 grid-rows-2";
  const widgetSpan = (index: number, tamanho?: TvWidgetSize) => {
    if (widgets.length <= 1) return "col-span-1 row-span-1";
    if (tamanho === "TOTAL" || tamanho === "GRANDE")
      return "col-span-2 row-span-1";
    if (layout === "DESTAQUE" && index === 0 && widgets.length >= 3)
      return "row-span-2";
    return "col-span-1 row-span-1";
  };
  return (
    <div
      className={`${preview ? "h-full min-h-0" : "h-[100dvh] min-h-screen"} flex flex-col overflow-hidden bg-[radial-gradient(circle_at_15%_0%,rgba(220,38,38,.20),transparent_34%),radial-gradient(circle_at_90%_10%,rgba(245,158,11,.08),transparent_25%),linear-gradient(145deg,#111318_0%,#08090b_58%,#050607_100%)] text-slate-200`}
    >
      <header className="mx-[clamp(22px,3vw,64px)] flex min-h-[82px] shrink-0 items-center justify-between border-b border-white/10 px-1 py-4">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/logo_claro.png"
            alt="Engerádios"
            className="h-11 w-auto max-w-[240px] object-contain"
          />
          <b className="hidden text-sm font-bold uppercase tracking-[0.18em] text-slate-400 2xl:block">
            Gestão 2.0
          </b>
        </div>
        <h1 className="truncate px-6 text-center text-[clamp(18px,1.7vw,31px)] font-black uppercase tracking-[0.08em] text-white">
          {current?.nome || payload.painel.nome}
        </h1>
        <div className="flex items-center gap-6">
          {payload.painel.mostrarClima && weather && (
            <div className="flex items-center gap-3">
              <span className="text-4xl" aria-hidden="true">
                {weather.weatherCode === 0
                  ? "☀️"
                  : weather.weatherCode <= 3
                    ? "⛅"
                    : weather.weatherCode <= 48
                      ? "🌫️"
                      : weather.weatherCode <= 65
                        ? "🌧️"
                        : "⛈️"}
              </span>
              <div>
                <b className="block text-2xl text-white">
                  {Math.round(weather.temperature)}°
                </b>
                <span className="block max-w-44 truncate text-xs text-slate-400">
                  {weather.description} · {weather.city}
                </span>
              </div>
            </div>
          )}
          <div className="border-l border-white/10 pl-6 text-right">
            <b className="text-2xl">
              {now.toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </b>
            <p className="text-xs capitalize text-slate-400">
              {now.toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "2-digit",
                month: "long",
              })}
            </p>
          </div>
        </div>
      </header>
      <main className="min-h-0 flex-1 px-[clamp(28px,4vw,78px)] py-[clamp(20px,2.5vh,38px)]">
        {current ? (
          <div
            className={`grid h-full min-h-0 auto-rows-fr gap-[clamp(16px,2vh,26px)] ${gridClass}`}
          >
            {widgets.map((w, index) => (
              <section
                key={w.id}
                className={`flex min-h-0 flex-col overflow-hidden rounded-[clamp(18px,1.5vw,28px)] border border-white/10 bg-[linear-gradient(145deg,rgba(28,31,38,.94),rgba(13,15,19,.94))] p-[clamp(18px,1.5vw,30px)] shadow-[0_24px_70px_rgba(0,0,0,.22)] backdrop-blur ${widgetSpan(index, w.configuracao.tamanho as TvWidgetSize | undefined)}`}
              >
                <h2
                  className="mb-4 truncate border-l-4 pl-3 text-[clamp(16px,1.2vw,23px)] font-extrabold uppercase tracking-[0.06em] text-white"
                  style={{
                    borderLeftColor:
                      WIDGET_COLORS[
                        (w.configuracao.cor as TvWidgetColor | undefined) ||
                          "VERMELHO"
                      ],
                  }}
                >
                  {w.titulo}
                </h2>
                <div className="min-h-0 flex-1">
                  <TvWidgetView widget={w} data={payload.dados[w.tipo]} />
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="grid h-full place-items-center text-slate-400">
            Nenhuma cena ativa configurada.
          </div>
        )}
      </main>
      <footer className="mx-[clamp(22px,3vw,64px)] flex min-h-12 shrink-0 items-center gap-3 border-t border-white/10 px-1 py-3">
        <div className="flex gap-2">
          {scenes.map((_, i) => (
            <button
              key={i}
              aria-label={`Mostrar cena ${i + 1}`}
              onClick={() => setScene(i)}
              className={`h-3 rounded-full transition-all ${i === safeScene ? "w-8 bg-gradient-to-r from-red-700 to-red-400" : "w-3 bg-slate-700"}`}
            />
          ))}
        </div>
        <div className="ml-auto flex items-center gap-4 text-xs text-slate-500">
          <span
            className={`flex items-center gap-2 ${error ? "text-amber-400" : "text-emerald-400"}`}
            title={error || "Conexão normal"}
          >
            <span
              className={`h-2 w-2 rounded-full ${error ? "bg-amber-400" : "bg-emerald-400"}`}
            />
            {error ? "Últimos dados" : refreshing ? "Atualizando" : "Online"}
          </span>
          <span>
            Atualizado em{" "}
            {new Date(payload.geradoEm).toLocaleTimeString("pt-BR")}
          </span>
        </div>
      </footer>
    </div>
  );
}
