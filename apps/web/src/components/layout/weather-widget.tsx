"use client";

import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSun,
  Droplets,
  Moon,
  RefreshCw,
  Sun,
  Wind,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type Weather = {
  city: string;
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  precipitation: number;
  windSpeed: number;
  weatherCode: number;
  description: string;
  isDay: boolean;
  observedAt: string;
  latitude: number;
  longitude: number;
  locationSource: "device" | "fallback";
};

function ConditionIcon({ weather }: { weather: Weather }) {
  const props = { size: 21, className: "text-red-600", "aria-hidden": true };
  if ([95, 96, 99].includes(weather.weatherCode))
    return <CloudLightning {...props} />;
  if ([61, 63, 65, 80, 81, 82].includes(weather.weatherCode))
    return <CloudRain {...props} />;
  if ([51, 53, 55].includes(weather.weatherCode))
    return <CloudDrizzle {...props} />;
  if ([45, 48].includes(weather.weatherCode)) return <CloudFog {...props} />;
  if (weather.weatherCode === 3) return <Cloud {...props} />;
  if ([1, 2].includes(weather.weatherCode)) return <CloudSun {...props} />;
  return weather.isDay ? <Sun {...props} /> : <Moon {...props} />;
}

export function WeatherWidget() {
  const [weather, setWeather] = useState<Weather | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false);
  const [locationStatus, setLocationStatus] = useState<
    "requesting" | "allowed" | "denied" | "unsupported"
  >("requesting");

  const load = useCallback(async (latitude?: number, longitude?: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeof latitude === "number" && typeof longitude === "number") {
        params.set("latitude", String(latitude));
        params.set("longitude", String(longitude));
      }
      const response = await fetch(
        `/api/clima${params.size ? `?${params}` : ""}`,
        {
          cache: "no-store",
        },
      );
      if (!response.ok) throw new Error("Falha no clima");
      setWeather(await response.json());
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const locate = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setLocationStatus("unsupported");
      void load();
      return;
    }
    setLocationStatus("requesting");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationStatus("allowed");
        window.localStorage.setItem(
          "engeradios-weather-location",
          JSON.stringify({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            savedAt: Date.now(),
          }),
        );
        void load(position.coords.latitude, position.coords.longitude);
      },
      () => {
        setLocationStatus("denied");
        void load();
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 30 * 60 * 1000 },
    );
  }, [load]);

  useEffect(() => {
    const saved = window.localStorage.getItem("engeradios-weather-location");
    if (saved) {
      try {
        const location = JSON.parse(saved) as {
          latitude: number;
          longitude: number;
          savedAt: number;
        };
        if (Date.now() - location.savedAt < 12 * 60 * 60 * 1000) {
          const timer = window.setTimeout(() => {
            setLocationStatus("allowed");
            void load(location.latitude, location.longitude);
          }, 0);
          return () => window.clearTimeout(timer);
        } else {
          const timer = window.setTimeout(() => locate(), 0);
          return () => window.clearTimeout(timer);
        }
      } catch {
        const timer = window.setTimeout(() => locate(), 0);
        return () => window.clearTimeout(timer);
      }
    } else {
      const timer = window.setTimeout(() => locate(), 0);
      return () => window.clearTimeout(timer);
    }
  }, [load, locate]);

  useEffect(() => {
    if (!weather) return;
    const timer = window.setInterval(
      () => void load(weather.latitude, weather.longitude),
      15 * 60 * 1000,
    );
    return () => window.clearInterval(timer);
  }, [load, weather]);

  if (loading && !weather) {
    return (
      <div className="hidden h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm xl:flex dark:border-slate-700">
        <RefreshCw size={17} className="animate-spin text-red-600" />
        <span className="text-slate-500">Carregando clima</span>
      </div>
    );
  }

  if (error && !weather) {
    return (
      <button
        type="button"
        onClick={() => locate()}
        className="hidden h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm xl:flex dark:border-slate-700"
        title="Tentar carregar o clima novamente"
      >
        <CloudSun size={18} className="text-slate-400" />
        <span className="text-slate-500">Clima indisponível</span>
      </button>
    );
  }

  if (!weather) return null;

  return (
    <div className="relative hidden xl:block">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm transition hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
        aria-expanded={open}
        aria-label={`Clima em ${weather.city}: ${Math.round(weather.temperature)} graus, ${weather.description}`}
      >
        <ConditionIcon weather={weather} />
        <span className="max-w-32 truncate">{weather.city}</span>
        <b>{Math.round(weather.temperature)}°C</b>
        <span className="max-w-28 truncate text-slate-500">
          {weather.description}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-950">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-red-600">
                Clima agora
              </p>
              <h3 className="font-bold">{weather.city}</h3>
              <p className="text-sm text-slate-500">{weather.description}</p>
            </div>
            <div className="flex items-center gap-2">
              <ConditionIcon weather={weather} />
              <span className="text-3xl font-bold">
                {Math.round(weather.temperature)}°
              </span>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
              <p className="text-xs text-slate-500">Sensação</p>
              <b>{Math.round(weather.apparentTemperature)}°C</b>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
              <p className="flex items-center gap-1 text-xs text-slate-500">
                <Droplets size={13} /> Umidade
              </p>
              <b>{weather.humidity}%</b>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
              <p className="flex items-center gap-1 text-xs text-slate-500">
                <Wind size={13} /> Vento
              </p>
              <b>{Math.round(weather.windSpeed)} km/h</b>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
              <p className="flex items-center gap-1 text-xs text-slate-500">
                <CloudRain size={13} /> Precipitação
              </p>
              <b>{weather.precipitation.toLocaleString("pt-BR")} mm</b>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
            <span>
              {weather.locationSource === "device"
                ? "Localização do dispositivo"
                : "Local padrão"}
              {" · "}
              {new Date(weather.observedAt).toLocaleString("pt-BR")}
            </span>
            <button
              type="button"
              onClick={() => locate()}
              className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Atualizar clima"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
          <div className="mt-2 flex items-center justify-between gap-3 text-[10px] text-slate-400">
            <span>Dados meteorológicos: Open-Meteo</span>
            <button
              type="button"
              onClick={locate}
              className="font-medium text-red-600 hover:underline"
            >
              {locationStatus === "requesting"
                ? "Localizando..."
                : "Usar minha localização"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
