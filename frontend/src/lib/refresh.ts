// src/lib/refresh.ts
import { clearApiCache } from "./apiCache";

/**
 * Executes a manual refresh function while clearing the client-side API cache
 * and guaranteeing a minimum visual loading duration so spinner animations render smoothly.
 *
 * @param fetchFn The async data loading function to execute.
 * @param minDurationMs Minimum duration in milliseconds to hold the visual loading state (default: 500ms).
 */
export async function refreshWithFeedback<T>(
  fetchFn: () => Promise<T>,
  minDurationMs = 500
): Promise<T> {
  clearApiCache();
  const [result] = await Promise.all([
    fetchFn(),
    new Promise((resolve) => setTimeout(resolve, minDurationMs)),
  ]);
  return result;
}
