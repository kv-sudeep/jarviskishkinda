import { useEffect, useState } from "react";

export type EnvironmentData = {
  temperature: number | null;
  humidity: number | null;
  pressure: number | null;
  windSpeed: number | null;
  weatherCode: number | null;
  loading: boolean;
  error: string | null;
};

const initial: EnvironmentData = {
  temperature: null,
  humidity: null,
  pressure: null,
  windSpeed: null,
  weatherCode: null,
  loading: true,
  error: null,
};

export function useEnvironment(lat: number | null, lon: number | null): EnvironmentData {
  const [data, setData] = useState<EnvironmentData>(initial);

  useEffect(() => {
    if (lat == null || lon == null) return;
    let cancelled = false;

    const fetchData = async () => {
      try {
        // Open-Meteo: free, no API key, supports CORS
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,weather_code&wind_speed_unit=kmh`;
        const res = await fetch(url);
        const json = await res.json();
        if (cancelled) return;
        const c = json.current ?? {};
        setData({
          temperature: c.temperature_2m ?? null,
          humidity: c.relative_humidity_2m ?? null,
          pressure: c.surface_pressure ?? null,
          windSpeed: c.wind_speed_10m ?? null,
          weatherCode: c.weather_code ?? null,
          loading: false,
          error: null,
        });
      } catch (e: any) {
        if (cancelled) return;
        setData((d) => ({ ...d, loading: false, error: "ENV_FETCH_FAIL" }));
      }
    };

    fetchData();
    const id = setInterval(fetchData, 5 * 60 * 1000); // refresh every 5 min
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [lat, lon]);

  return data;
}
