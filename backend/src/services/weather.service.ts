// backend/src/services/weather.service.ts

export interface HiveWeatherData {
  temperature: number; // °C
  humidity: number; // %
  rain: number; // mm
  windSpeed: number; // km/h
  weatherCode: number;
  condition: string;
  fetchedAt: Date;
}

interface CacheEntry {
  data: HiveWeatherData;
  expiresAt: number;
}

export class WeatherService {
  private cache: Map<string, CacheEntry> = new Map();
  private cacheTtlMs = 30 * 60 * 1000; // 30 minutes

  /**
   * Maps WMO weather interpretation codes to plain human-readable descriptions.
   */
  public mapWmoCode(code: number): string {
    if (code === 0) return "Clear Sky";
    if (code === 1) return "Mainly Clear";
    if (code === 2) return "Partly Cloudy";
    if (code === 3) return "Overcast";
    if (code === 45 || code === 48) return "Foggy";
    if (code >= 51 && code <= 55) return "Drizzle";
    if (code >= 61 && code <= 65) return "Rain";
    if (code >= 71 && code <= 77) return "Snow";
    if (code >= 80 && code <= 82) return "Rain Showers";
    if (code >= 95 && code <= 99) return "Thunderstorm";
    return "Variable Weather";
  }

  /**
   * Retrieves weather for given coordinates with in-memory caching.
   * Resilient: returns null on network or parse failure without throwing.
   */
  public async getWeather(
    latitude: number,
    longitude: number,
    timeoutMs = 5000
  ): Promise<HiveWeatherData | null> {
    if (
      typeof latitude !== "number" ||
      typeof longitude !== "number" ||
      isNaN(latitude) ||
      isNaN(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return null;
    }

    const cacheKey = `${latitude.toFixed(2)},${longitude.toFixed(2)}`;
    const cached = this.cache.get(cacheKey);
    const now = Date.now();

    if (cached && cached.expiresAt > now) {
      return cached.data;
    }

    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,rain,weather_code,wind_speed_10m`;
      const res = await fetch(url, {
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!res.ok) {
        console.warn(`[WeatherService] Open-Meteo returned HTTP ${res.status}`);
        return null;
      }

      const json = (await res.json()) as any;
      const current = json?.current;
      if (!current) return null;

      const code = Number(current.weather_code ?? 0);
      const data: HiveWeatherData = {
        temperature: Number(current.temperature_2m ?? 0),
        humidity: Number(current.relative_humidity_2m ?? 0),
        rain: Number(current.rain ?? 0),
        windSpeed: Number(current.wind_speed_10m ?? 0),
        weatherCode: code,
        condition: this.mapWmoCode(code),
        fetchedAt: new Date(),
      };

      this.cache.set(cacheKey, {
        data,
        expiresAt: now + this.cacheTtlMs,
      });

      return data;
    } catch (err: any) {
      console.warn(`[WeatherService] Could not fetch weather for (${latitude}, ${longitude}): ${err.message}`);
      return null;
    }
  }

  /**
   * Clears in-memory cache (primarily for unit tests).
   */
  public clearCache(): void {
    this.cache.clear();
  }
}

export const weatherService = new WeatherService();
export default weatherService;
