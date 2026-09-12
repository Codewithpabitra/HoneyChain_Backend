import axios, { InternalAxiosRequestConfig, AxiosResponse } from "axios";
import { apiCache } from "./apiCache";

const defaultAdapter = axios.getAdapter(axios.defaults.adapter);

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
  adapter: async (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
    const method = (config.method || "get").toLowerCase();
    const bypassCache = Boolean(
      config.headers?.["x-cache-bypass"] ||
        config.headers?.["X-Cache-Bypass"] ||
        config.headers?.["cache-control"] === "no-cache"
    );

    // Only cache GET requests unless cache is bypassed
    if (method === "get" && !bypassCache) {
      const cacheKey = `${method}:${config.baseURL || ""}${config.url || ""}:${JSON.stringify(
        config.params || {}
      )}`;

      // 1. Check existing fresh cache
      const cached = apiCache.get(cacheKey);
      if (cached) {
        return {
          data: cached.data,
          status: cached.status,
          statusText: cached.statusText,
          headers: cached.headers as any,
          config,
          request: {},
        } as AxiosResponse;
      }

      // 2. Check in-flight deduplication
      const inflight = apiCache.getInflight<AxiosResponse>(cacheKey);
      if (inflight) {
        return inflight;
      }

      // 3. Dispatch network call and cache response
      const requestPromise = (async () => {
        try {
          const response = await defaultAdapter(config);
          if (response.status >= 200 && response.status < 300) {
            apiCache.set(
              cacheKey,
              response.data,
              response.status,
              response.statusText,
              response.headers as any
            );
          }
          return response;
        } finally {
          apiCache.deleteInflight(cacheKey);
        }
      })();

      apiCache.setInflight(cacheKey, requestPromise);
      return requestPromise;
    }

    // For non-GET mutations (POST, PUT, PATCH, DELETE)
    const response = await defaultAdapter(config);
    if (["post", "put", "patch", "delete"].includes(method)) {
      apiCache.invalidateForMutation(config.url);
    }
    return response;
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("honeychain_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("honeychain_token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;