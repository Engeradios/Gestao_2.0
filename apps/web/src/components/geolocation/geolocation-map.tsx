"use client";

import L from "leaflet";
import Image from "next/image";
import {
  Battery,
  Clock3,
  LocateFixed,
  MapPin,
  RefreshCw,
  Route,
  Search,
  Signal,
  Users,
  Wifi,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  Popup,
  Polyline,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";

type Status = "TODOS" | "ATIVO_RECENTE" | "ATIVO_SEM_SINAL" | "ENCERRADO";
type Address = {
  logradouro: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  completo: string | null;
};
type Position = {
  usuarioId: string;
  nome: string;
  email: string | null;
  funcao: string | null;
  cargo: string | null;
  unidade: string | null;
  fotoPerfilCaminho: string | null;
  expedienteId: string | null;
  expedienteStatus: string | null;
  latitude: number;
  longitude: number;
  precisaoMetros: number | null;
  bateriaPercentual: number | null;
  tipoConexao: string | null;
  online: boolean | null;
  capturadoEm: string;
  minutosDesdeCaptura: number;
  estado: Exclude<Status, "TODOS">;
  endereco: Address;
};
type TeamResponse = { itens: Position[]; geradoEm: string };

type TrackResponse = {
  expediente: { id: string; nome: string; status: string | null };
  totalPontos: number;
  pontos: Array<{ latitude: number; longitude: number; capturadoEm: string }>;
};

const styles = {
  ATIVO_RECENTE: { color: "#16a34a", label: "Ativo", chip: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" },
  ATIVO_SEM_SINAL: { color: "#d97706", label: "Sem sinal", chip: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" },
  ENCERRADO: { color: "#64748b", label: "Encerrado", chip: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
} as const;

async function request<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((payload as { message?: string }).message || "Falha ao carregar geolocalizacao");
  }
  return payload as T;
}

function FitBounds({ points }: { points: Position[] }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    const bounds = L.latLngBounds(points.map((p) => [p.latitude, p.longitude]));
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 16 });
  }, [map, points]);
  return null;
}

function TrackPolyline({ track }: { track: TrackResponse | null }) {
  const map = useMap();
  const points = useMemo(
    () => track?.pontos.map((point) => [point.latitude, point.longitude] as [number, number]) ?? [],
    [track],
  );

  useEffect(() => {
    if (points.length < 2) return;
    map.fitBounds(L.latLngBounds(points), { padding: [56, 56], maxZoom: 17 });
  }, [map, points]);

  if (points.length < 2) return null;
  return <Polyline positions={points} pathOptions={{ color: "#dc2626", weight: 5, opacity: 0.8 }} />;
}

function initials(value: string) {
  return value.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function relative(minutes: number) {
  if (minutes < 1) return "agora";
  if (minutes < 60) return `ha ${Math.round(minutes)} min`;
  return `ha ${Math.round(minutes / 60)} h`;
}

function fullAddress(item: Position) {
  if (item.endereco.completo) return item.endereco.completo;
  const line = [item.endereco.logradouro, item.endereco.numero].filter(Boolean).join(", ");
  const city = [item.endereco.cidade, item.endereco.uf].filter(Boolean).join(" - ");
  return [line, item.endereco.bairro, city].filter(Boolean).join(" · ") || "Endereco ainda nao informado";
}

export default function GeolocationMap() {
  const [data, setData] = useState<TeamResponse>({ itens: [], geradoEm: "" });
  const [filter, setFilter] = useState<Status>("TODOS");
  const [query, setQuery] = useState("");
  const [hours, setHours] = useState(12);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Position | null>(null);
  const [track, setTrack] = useState<TrackResponse | null>(null);
  const [trackLoading, setTrackLoading] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const response = await request<TeamResponse>(
        `/api/operacional/geolocalizacao/equipe?horas=${hours}`,
      );
      setData(response);
      setSelected((current) => current ? response.itens.find((item) => item.usuarioId === current.usuarioId) ?? null : null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Erro ao carregar mapa");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [hours]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (!autoRefresh) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load(true);
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [autoRefresh, load]);

  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    return data.itens.filter((item) => {
      const matchesStatus = filter === "TODOS" || item.estado === filter;
      const searchable = [item.nome, item.funcao, item.cargo, item.unidade, item.endereco.cidade]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("pt-BR");
      return matchesStatus && (!normalized || searchable.includes(normalized));
    });
  }, [data.itens, filter, query]);

  async function showTrack(item: Position) {
    setSelected(item);
    setTrack(null);
    if (!item.expedienteId) return;
    setTrackLoading(true);
    try {
      setTrack(await request<TrackResponse>(`/api/operacional/geolocalizacao/trilha/${item.expedienteId}?limite=1000`));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Erro ao carregar trilha");
    } finally {
      setTrackLoading(false);
    }
  }

  const counts = (status: Exclude<Status, "TODOS">) => data.itens.filter((i) => i.estado === status).length;
  const center: [number, number] = visible[0] ? [visible[0].latitude, visible[0].longitude] : [-22.9068, -43.1729];

  return (
    <section className="space-y-6" aria-labelledby="geolocation-title">
      <header className="rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-red-950 p-6 text-white shadow-xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-300">Operacional</p>
            <h1 id="geolocation-title" className="mt-2 text-3xl font-bold">Geolocalizacao da equipe</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">Posicoes autorizadas do aplicativo de campo, status de jornada e historico do expediente.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm">
              <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
              Atualizacao 30s
            </label>
            <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15 disabled:opacity-50">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Atualizar
            </button>
          </div>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Equipe localizada" value={data.itens.length} icon={Users} />
          <Metric label="Em atividade" value={counts("ATIVO_RECENTE")} icon={LocateFixed} />
          <Metric label="Sem sinal" value={counts("ATIVO_SEM_SINAL")} icon={Signal} />
          <Metric label="Encerrados" value={counts("ENCERRADO")} icon={Clock3} />
        </div>
      </header>

      {error && <div className="rounded-xl bg-red-50 p-4 text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</div>}

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 lg:flex-row lg:items-center lg:justify-between">
        <label className="relative min-w-0 flex-1 lg:max-w-sm">
          <span className="sr-only">Buscar colaborador</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nome, função, unidade ou cidade"
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-3 text-sm outline-none ring-red-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {(["TODOS", "ATIVO_RECENTE", "ATIVO_SEM_SINAL", "ENCERRADO"] as Status[]).map((value) => (
            <button key={value} type="button" onClick={() => setFilter(value)} className={`rounded-xl px-3 py-2 text-sm font-semibold ${filter === value ? "bg-red-600 text-white" : "bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300"}`}>
              {value === "TODOS" ? "Todos" : styles[value].label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          Janela
          <select value={hours} onChange={(e) => setHours(Number(e.target.value))} className="rounded-xl border bg-transparent px-3 py-2 dark:border-slate-700">
            <option value={6}>6 horas</option><option value={12}>12 horas</option><option value={24}>24 horas</option><option value={72}>72 horas</option>
          </select>
        </label>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div
          className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950"
          role="region"
          aria-label={`Mapa com ${visible.length} colaborador(es) localizado(s)`}
        >
          <MapContainer key={`${hours}-${filter}`} center={center} zoom={13} scrollWheelZoom className="h-[680px] w-full">
            <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <FitBounds points={visible} />
            <TrackPolyline track={track} />
            {visible.map((item) => (
              <CircleMarker key={item.usuarioId} center={[item.latitude, item.longitude]} radius={11} pathOptions={{ color: "white", weight: 3, fillColor: styles[item.estado].color, fillOpacity: 1 }} eventHandlers={{ click: () => void showTrack(item) }}>
                <Tooltip direction="top" offset={[0, -10]}>{item.nome}</Tooltip>
                <Popup><strong>{item.nome}</strong><br />{styles[item.estado].label}<br />{relative(item.minutosDesdeCaptura)}</Popup>
              </CircleMarker>
            ))}
          </MapContainer>
          <div className="pointer-events-none absolute bottom-4 left-4 z-[500] flex flex-wrap gap-2 rounded-xl bg-white/95 p-2 text-xs shadow-lg backdrop-blur dark:bg-slate-950/95">
            {(["ATIVO_RECENTE", "ATIVO_SEM_SINAL", "ENCERRADO"] as const).map((status) => (
              <span key={status} className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: styles[status].color }} />
                {styles[status].label}
              </span>
            ))}
            {track && track.totalPontos > 1 && (
              <span className="inline-flex items-center gap-1.5 font-semibold text-red-700 dark:text-red-300">
                <span className="h-1 w-5 rounded bg-red-600" /> Trilha selecionada
              </span>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          {selected ? (
            <DetailCard item={selected} track={track} trackLoading={trackLoading} onTrack={() => void showTrack(selected)} />
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center dark:border-slate-800 dark:bg-slate-950">
              <MapPin className="mx-auto h-8 w-8 text-red-600" />
              <p className="mt-3 font-semibold">Selecione um marcador</p>
              <p className="mt-1 text-sm text-slate-500">Veja dados do funcionario e a trilha do expediente.</p>
            </div>
          )}
          <div className="max-h-[430px] space-y-2 overflow-auto rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
            {visible.map((item) => (
              <button key={item.usuarioId} type="button" onClick={() => void showTrack(item)} className="flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-900">
                <Avatar item={item} />
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{item.nome}</span><span className="block truncate text-xs text-slate-500">{item.funcao || item.cargo || "Funcao nao informada"}</span></span>
                <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${styles[item.estado].chip}`}>{styles[item.estado].label}</span>
              </button>
            ))}
            {!loading && !visible.length && <p className="p-5 text-center text-sm text-slate-500">Nenhuma posição encontrada para os filtros informados.</p>}
          </div>
          <p className="text-center text-xs text-slate-400">Ultima consulta: {data.geradoEm ? new Date(data.geradoEm).toLocaleString("pt-BR") : "aguardando"}</p>
        </aside>
      </div>
    </section>
  );
}

function Metric({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Users }) {
  return <div className="rounded-2xl border border-white/10 bg-white/10 p-4"><div className="flex items-center justify-between"><p className="text-sm text-slate-300">{label}</p><Icon className="h-5 w-5 text-red-300" /></div><p className="mt-2 text-3xl font-bold">{value}</p></div>;
}

function Avatar({ item }: { item: Position }) {
  if (item.fotoPerfilCaminho?.startsWith("/")) {
    return (
      <Image
        src={item.fotoPerfilCaminho}
        alt=""
        width={44}
        height={44}
        unoptimized
        className="h-11 w-11 rounded-xl object-cover"
      />
    );
  }
  return <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-red-100 text-sm font-bold text-red-700 dark:bg-red-950 dark:text-red-300">{initials(item.nome)}</span>;
}

function DetailCard({ item, track, trackLoading, onTrack }: { item: Position; track: TrackResponse | null; trackLoading: boolean; onTrack: () => void }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
    <div className="flex items-center gap-3"><Avatar item={item} /><div className="min-w-0"><h2 className="truncate font-bold">{item.nome}</h2><p className="truncate text-sm text-slate-500">{item.funcao || item.cargo || "Funcao nao informada"}</p></div></div>
    <div className="mt-4 space-y-3 text-sm">
      <Info icon={MapPin} text={fullAddress(item)} />
      <Info icon={Battery} text={`${item.bateriaPercentual ?? "--"}% de bateria`} />
      <Info icon={Wifi} text={item.tipoConexao || "Conexao nao informada"} />
      <Info icon={Clock3} text={`Atualizado ${relative(item.minutosDesdeCaptura)}`} />
    </div>
    <span className={`mt-4 inline-block rounded-full px-3 py-1 text-xs font-semibold ${styles[item.estado].chip}`}>{styles[item.estado].label}</span>
    {item.expedienteId && <button type="button" onClick={onTrack} disabled={trackLoading} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><Route className="h-4 w-4" />{trackLoading ? "Carregando..." : "Carregar trilha"}</button>}
    {track && <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-900"><strong>{track.totalPontos}</strong> pontos no expediente {track.expediente.id}</div>}
  </div>;
}

function Info({ icon: Icon, text }: { icon: typeof MapPin; text: string }) {
  return <div className="flex gap-2 text-slate-600 dark:text-slate-300"><Icon className="mt-0.5 h-4 w-4 shrink-0 text-red-600" /><span>{text}</span></div>;
}
