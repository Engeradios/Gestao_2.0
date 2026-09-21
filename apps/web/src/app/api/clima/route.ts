import { NextResponse } from "next/server";

export const revalidate = 900;

const WEATHER_DESCRIPTIONS: Record<number, string> = {
  0: "Céu limpo",
  1: "Predominantemente limpo",
  2: "Parcialmente nublado",
  3: "Nublado",
  45: "Neblina",
  48: "Neblina com geada",
  51: "Garoa leve",
  53: "Garoa moderada",
  55: "Garoa intensa",
  61: "Chuva leve",
  63: "Chuva moderada",
  65: "Chuva forte",
  80: "Pancadas leves",
  81: "Pancadas moderadas",
  82: "Pancadas fortes",
  95: "Trovoadas",
  96: "Trovoadas com granizo",
  99: "Trovoadas fortes com granizo",
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const requestedLatitude = Number(url.searchParams.get("latitude"));
  const requestedLongitude = Number(url.searchParams.get("longitude"));
  const hasValidCoordinates =
    Number.isFinite(requestedLatitude) &&
    requestedLatitude >= -90 &&
    requestedLatitude <= 90 &&
    Number.isFinite(requestedLongitude) &&
    requestedLongitude >= -180 &&
    requestedLongitude <= 180;
  const latitude = hasValidCoordinates
    ? String(requestedLatitude)
    : process.env.WEATHER_LATITUDE || "-22.9064";
  const longitude = hasValidCoordinates
    ? String(requestedLongitude)
    : process.env.WEATHER_LONGITUDE || "-43.1822";
  const city = hasValidCoordinates
    ? "Localização atual"
    : process.env.WEATHER_CITY || "Rio de Janeiro";
  const params = new URLSearchParams({
    latitude,
    longitude,
    current:
      "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m",
    timezone: "America/Sao_Paulo",
  });

  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?${params}`,
      { next: { revalidate: 900 } },
    );
    if (!response.ok) throw new Error(`Open-Meteo HTTP ${response.status}`);
    const source = await response.json();
    const current = source.current;
    if (!current) throw new Error("Resposta meteorológica sem dados atuais");

    return NextResponse.json(
      {
        city,
        temperature: current.temperature_2m,
        apparentTemperature: current.apparent_temperature,
        humidity: current.relative_humidity_2m,
        precipitation: current.precipitation,
        windSpeed: current.wind_speed_10m,
        weatherCode: current.weather_code,
        description:
          WEATHER_DESCRIPTIONS[current.weather_code] || "Condição variável",
        isDay: Boolean(current.is_day),
        observedAt: current.time,
        latitude: Number(latitude),
        longitude: Number(longitude),
        locationSource: hasValidCoordinates ? "device" : "fallback",
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800",
        },
      },
    );
  } catch (error) {
    console.error("Falha ao consultar clima:", error);
    return NextResponse.json(
      { message: "Clima indisponível no momento" },
      { status: 503 },
    );
  }
}
