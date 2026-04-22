import { useEffect, useState } from "react";

export type LocationData = {
  city: string;
  region: string;
  country: string;
  countryCode: string;
  latitude: number | null;
  longitude: number | null;
  loading: boolean;
  error: string | null;
};

const initial: LocationData = {
  city: "LOCATING",
  region: "—",
  country: "ACQUIRING SIGNAL",
  countryCode: "—",
  latitude: null,
  longitude: null,
  loading: true,
  error: null,
};

export function useLocation(): LocationData {
  const [data, setData] = useState<LocationData>(initial);

  useEffect(() => {
    let cancelled = false;

    const fromCoords = async (lat: number, lon: number) => {
      try {
        // BigDataCloud free reverse geocoding (no API key, browser-friendly)
        const res = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
        );
        const json = await res.json();
        if (cancelled) return;
        setData({
          city: (json.city || json.locality || "UNKNOWN").toUpperCase(),
          region: (json.principalSubdivision || "").toUpperCase(),
          country: (json.countryName || "UNKNOWN").toUpperCase(),
          countryCode: (json.countryCode || "—").toUpperCase(),
          latitude: lat,
          longitude: lon,
          loading: false,
          error: null,
        });
      } catch (e: any) {
        if (cancelled) return;
        setData((d) => ({ ...d, loading: false, error: "REVERSE_GEO_FAIL" }));
      }
    };

    const fromIp = async () => {
      try {
        const res = await fetch("https://ipapi.co/json/");
        const json = await res.json();
        if (cancelled) return;
        setData({
          city: (json.city || "UNKNOWN").toUpperCase(),
          region: (json.region || "").toUpperCase(),
          country: (json.country_name || "UNKNOWN").toUpperCase(),
          countryCode: (json.country_code || "—").toUpperCase(),
          latitude: typeof json.latitude === "number" ? json.latitude : null,
          longitude: typeof json.longitude === "number" ? json.longitude : null,
          loading: false,
          error: null,
        });
      } catch {
        if (cancelled) return;
        setData((d) => ({ ...d, loading: false, error: "LOCATION_FAIL" }));
      }
    };

    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => fromCoords(pos.coords.latitude, pos.coords.longitude),
        () => fromIp(),
        { timeout: 6000, maximumAge: 60_000 }
      );
    } else {
      fromIp();
    }

    return () => {
      cancelled = true;
    };
  }, []);

  return data;
}
