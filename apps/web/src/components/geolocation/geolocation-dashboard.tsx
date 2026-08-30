"use client";

import dynamic from "next/dynamic";

const GeolocationMap = dynamic(() => import("./geolocation-map"), {
  ssr: false,
  loading: () => (
    <div className="grid min-h-[620px] place-items-center rounded-2xl border border-slate-200 bg-slate-100 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
      Carregando mapa operacional...
    </div>
  ),
});

export function GeolocationDashboard() {
  return <GeolocationMap />;
}
