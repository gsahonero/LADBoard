/**
 * Weather & Temperature Service
 * Infers city and current weather from free public IP geolocation (wttr.in / open-meteo).
 * Includes 30-minute client-side caching and resilient offline fallback.
 */

export interface WeatherData {
  tempC: number;
  tempF: number;
  conditionText: string;
  cityName: string;
  iconType: 'sun' | 'cloud-sun' | 'cloud' | 'cloud-rain' | 'cloud-snow' | 'cloud-lightning' | 'moon';
  humidity?: string;
  isDaytime: boolean;
  fetchedAt: number;
}

const CACHE_KEY = 'lad_weather_cache_v1';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

export function mapWeatherConditionToIcon(
  desc: string,
  isDay: boolean = true
): 'sun' | 'cloud-sun' | 'cloud' | 'cloud-rain' | 'cloud-snow' | 'cloud-lightning' | 'moon' {
  const lower = desc.toLowerCase();
  if (lower.includes('thunder') || lower.includes('lightning') || lower.includes('storm')) {
    return 'cloud-lightning';
  }
  if (lower.includes('snow') || lower.includes('sleet') || lower.includes('ice') || lower.includes('blizzard')) {
    return 'cloud-snow';
  }
  if (lower.includes('rain') || lower.includes('drizzle') || lower.includes('shower')) {
    return 'cloud-rain';
  }
  if (lower.includes('cloud') || lower.includes('overcast') || lower.includes('fog') || lower.includes('mist')) {
    return isDay ? 'cloud-sun' : 'cloud';
  }
  return isDay ? 'sun' : 'moon';
}

/**
 * Fetches current weather by IP from public free APIs with client-side caching
 */
export async function fetchCurrentWeather(): Promise<WeatherData | null> {
  if (typeof window === 'undefined') return null;

  // 1. Check valid cache in sessionStorage
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed: WeatherData = JSON.parse(cached);
      if (Date.now() - parsed.fetchedAt < CACHE_TTL_MS) {
        return parsed;
      }
    }
  } catch {
    // Ignore cache error
  }

  // 2. Fetch from free public wttr.in endpoint with format=j1
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    const res = await fetch('https://wttr.in/?format=j1', {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const current = data?.current_condition?.[0];
      const area = data?.nearest_area?.[0];

      if (current) {
        const tempC = parseInt(current.temp_C, 10) || 20;
        const tempF = parseInt(current.temp_F, 10) || 68;
        const conditionText = current.weatherDesc?.[0]?.value || 'Clear';
        const cityName =
          area?.areaName?.[0]?.value ||
          area?.region?.[0]?.value ||
          area?.country?.[0]?.value ||
          '';

        const hour = new Date().getHours();
        const isDaytime = hour >= 6 && hour < 20;

        const weather: WeatherData = {
          tempC,
          tempF,
          conditionText,
          cityName,
          iconType: mapWeatherConditionToIcon(conditionText, isDaytime),
          humidity: current.humidity,
          isDaytime,
          fetchedAt: Date.now(),
        };

        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify(weather));
        } catch {
          // Ignore storage quota error
        }

        return weather;
      }
    }
  } catch {
    // If wttr.in is unavailable or blocked, try fallback Open-Meteo with simple IP geolocation
  }

  // 3. Fallback: Free IP geolocation -> Open-Meteo
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const geoRes = await fetch('https://ipapi.co/json/', { signal: controller.signal });
    if (geoRes.ok) {
      const geo = await geoRes.json();
      const lat = geo.latitude;
      const lon = geo.longitude;
      const cityName = geo.city || geo.region || '';

      if (lat && lon) {
        const meteoRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day`,
          { signal: controller.signal }
        );
        clearTimeout(timeoutId);

        if (meteoRes.ok) {
          const meteoData = await meteoRes.json();
          const tempC = Math.round(meteoData.current?.temperature_2m ?? 20);
          const tempF = Math.round((tempC * 9) / 5 + 32);
          const isDaytime = meteoData.current?.is_day === 1;

          const weather: WeatherData = {
            tempC,
            tempF,
            conditionText: isDaytime ? 'Clear Sky' : 'Clear Night',
            cityName,
            iconType: isDaytime ? 'sun' : 'moon',
            isDaytime,
            fetchedAt: Date.now(),
          };

          try {
            sessionStorage.setItem(CACHE_KEY, JSON.stringify(weather));
          } catch {
            // Ignore
          }

          return weather;
        }
      }
    }
    clearTimeout(timeoutId);
  } catch {
    // Offline or network error
  }

  return null;
}
