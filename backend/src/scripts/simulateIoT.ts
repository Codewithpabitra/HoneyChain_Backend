/**
 * HoneyChain IoT Telemetry Edge Simulator
 *
 * Simulates external IoT gateways and ESP32 microcontroller nodes transmitting
 * stateful in-hive and environmental telemetry over HTTP POST.
 *
 * Target URL is configured via IOT_TARGET_URL environment variable.
 * Cycle interval is configured via IOT_INTERVAL_MS environment variable (default: 10 minutes).
 */

interface DeviceSimulationState {
  hiveId: string;
  deviceId: string;
  temp: number;
  humidity: number;
  weightKg: number;
  batteryPct: number;
  baseFrequencyHz: number;
  cycleCount: number;
}

const DEFAULT_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const REQUEST_TIMEOUT_MS = 10000; // 10 seconds HTTP timeout

// Initial stateful parameters for the seeded HoneyChain hives
const simulatedDevices: DeviceSimulationState[] = [
  {
    hiveId: "HIVE-SB-101",
    deviceId: "ESP32-SB-GW-01",
    temp: 34.8,
    humidity: 58.2,
    weightKg: 31.45,
    batteryPct: 96.5,
    baseFrequencyHz: 215,
    cycleCount: 0,
  },
  {
    hiveId: "HIVE-SB-102",
    deviceId: "ESP32-SB-GW-02",
    temp: 34.3,
    humidity: 59.1,
    weightKg: 28.7,
    batteryPct: 89.0,
    baseFrequencyHz: 208,
    cycleCount: 0,
  },
  {
    hiveId: "HIVE-KV-201",
    deviceId: "ESP32-KV-GW-01",
    temp: 33.9,
    humidity: 55.4,
    weightKg: 36.1,
    batteryPct: 92.3,
    baseFrequencyHz: 236,
    cycleCount: 0,
  },
  {
    hiveId: "HIVE-KV-202",
    deviceId: "ESP32-KV-GW-02",
    temp: 34.5,
    humidity: 56.8,
    weightKg: 32.8,
    batteryPct: 98.0,
    baseFrequencyHz: 212,
    cycleCount: 0,
  },
  {
    hiveId: "HIVE-WG-301",
    deviceId: "ESP32-WG-GW-01",
    temp: 35.1,
    humidity: 61.2,
    weightKg: 29.85,
    batteryPct: 95.0,
    baseFrequencyHz: 220,
    cycleCount: 0,
  },
];

/**
 * Validates target URL configuration and parses target endpoint.
 */
export function resolveTargetEndpoint(rawUrl?: string): string {
  const url = rawUrl?.trim();

  if (!url) {
    console.error("\n=======================================================");
    console.error(" [FATAL] Missing required environment variable: IOT_TARGET_URL");
    console.error(" The simulator requires a backend target URL to transmit telemetry.");
    console.error(" Example: IOT_TARGET_URL=https://your-honeychain-service.onrender.com");
    console.error("=======================================================\n");
    throw new Error("Missing required environment variable: IOT_TARGET_URL");
  }

  // Strip trailing slashes
  const cleanBase = url.replace(/\/+$/, "");

  if (cleanBase.endsWith("/api/iot/telemetry")) {
    return cleanBase;
  }
  if (cleanBase.endsWith("/api/iot")) {
    return `${cleanBase}/telemetry`;
  }
  if (cleanBase.endsWith("/api")) {
    return `${cleanBase}/iot/telemetry`;
  }

  return `${cleanBase}/api/iot/telemetry`;
}

/**
 * Resolves simulation cycle interval.
 */
export function resolveIntervalMs(rawInterval?: string): number {
  if (!rawInterval) return DEFAULT_INTERVAL_MS;
  const parsed = parseInt(rawInterval, 10);
  if (isNaN(parsed) || parsed <= 0) {
    console.warn(`[SIMULATOR] Invalid IOT_INTERVAL_MS "${rawInterval}". Defaulting to ${DEFAULT_INTERVAL_MS} ms`);
    return DEFAULT_INTERVAL_MS;
  }
  return parsed;
}

/**
 * Evolves device telemetry statefully with realistic physics and circadian rhythm.
 */
export function evolveDeviceState(state: DeviceSimulationState): Record<string, any> {
  state.cycleCount += 1;

  // Temperature: holds tight brood nest thermoregulation around 34.5-35.5°C
  const tempDrift = (Math.random() - 0.49) * 0.15;
  state.temp = Number(Math.max(33.2, Math.min(36.2, state.temp + tempDrift)).toFixed(2));

  // Humidity: fluctuates mildly inside hive
  const humDrift = (Math.random() - 0.5) * 0.4;
  state.humidity = Number(Math.max(48.0, Math.min(68.0, state.humidity + humDrift)).toFixed(1));

  // Weight: slow gradual nectar flow accumulation with minor jitter
  const weightGain = Math.random() * 0.015 - 0.003;
  state.weightKg = Number(Math.max(15.0, state.weightKg + weightGain).toFixed(3));

  // Battery: very slow discharge over time
  const batteryDrain = 0.005 + Math.random() * 0.005;
  state.batteryPct = Number(Math.max(5.0, state.batteryPct - batteryDrain).toFixed(1));

  // Acoustics: minor fluctuation around base frequency with occasional active spikes
  const acousticJitter = Math.round((Math.random() - 0.5) * 6);
  const acousticHz = state.baseFrequencyHz + acousticJitter;
  const acousticDb = Number((58.0 + Math.random() * 6.0).toFixed(1));

  // Ambient environment: simulated weather curve
  const now = new Date();
  const hour = now.getHours();
  const diurnalFactor = Math.sin(((hour - 6) * Math.PI) / 12);
  const ambientTemp = Number((25.0 + diurnalFactor * 6.0 + (Math.random() - 0.5)).toFixed(1));
  const ambientHum = Number((65.0 - diurnalFactor * 12.0 + (Math.random() - 0.5) * 2).toFixed(1));

  return {
    hiveId: state.hiveId,
    deviceId: state.deviceId,
    timestamp: now.toISOString(),
    temperature: state.temp,
    humidity: state.humidity,
    weightKg: state.weightKg,
    soundFrequencyHz: acousticHz,
    acousticsDb: acousticDb,
    batteryLevelPct: Math.round(state.batteryPct),
    ambientTemperature: ambientTemp,
    ambientHumidity: ambientHum,
    metadata: {
      source: "simulator",
      simulationVersion: "1.0",
      simulationCycle: state.cycleCount,
      protocol: "HTTP/REST",
      firmwareVersion: "v2.4.0-sim",
      rssi: -76 - Math.round(Math.random() * 10),
      snr: Number((8.5 + Math.random() * 2.5).toFixed(1)),
      gatewayId: "SIM-GATEWAY-ALPHA",
    },
  };
}

/**
 * Transmits a single telemetry payload to the backend with timeout and error handling.
 */
export async function sendTelemetry(
  endpointUrl: string,
  payload: Record<string, any>
): Promise<{ success: boolean; status?: number; message?: string }> {
  try {
    const response = await fetch(endpointUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "HoneyChain-IoTSimulator/1.0",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    const responseBody = (await response.json().catch(() => ({}))) as any;

    if (response.ok) {
      const isDuplicate = responseBody?.duplicate === true;
      return {
        success: true,
        status: response.status,
        message: isDuplicate ? "Duplicate reading accepted" : "Ingested successfully",
      };
    } else {
      return {
        success: false,
        status: response.status,
        message: responseBody?.error?.message || responseBody?.message || "HTTP Error",
      };
    }
  } catch (err: any) {
    // If external call failed with network/timeout error, attempt local loopback fallback
    const isLocal = endpointUrl.includes("127.0.0.1") || endpointUrl.includes("localhost");
    const port = process.env.PORT || "5000";
    if (!isLocal) {
      const localUrl = `http://127.0.0.1:${port}/api/iot/telemetry`;
      try {
        const localRes = await fetch(localUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "HoneyChain-IoTSimulator/1.0",
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(5000),
        });
        const localBody = (await localRes.json().catch(() => ({}))) as any;
        if (localRes.ok) {
          const isDup = localBody?.duplicate === true;
          return {
            success: true,
            status: localRes.status,
            message: isDup ? "Duplicate reading accepted (via loopback)" : "Ingested successfully (via loopback)",
          };
        }
      } catch {
        // Fall back to returning original error
      }
    }

    if (err.name === "TimeoutError") {
      return { success: false, message: `Request timed out after ${REQUEST_TIMEOUT_MS}ms` };
    }
    return { success: false, message: err.message || "Network error connecting to backend" };
  }
}

/**
 * Triggers an immediate one-off telemetry simulation cycle across all monitored hives.
 */
export async function triggerSimulationCycle(targetUrl?: string): Promise<{
  success: boolean;
  total: number;
  successful: number;
  results: any[];
}> {
  const rawUrl = targetUrl || process.env.IOT_TARGET_URL || `http://127.0.0.1:${process.env.PORT || 5000}`;
  const endpoint = resolveTargetEndpoint(rawUrl);

  const results: any[] = [];
  let successful = 0;

  for (const device of simulatedDevices) {
    const payload = evolveDeviceState(device);
    const res = await sendTelemetry(endpoint, payload);
    if (res.success) successful += 1;
    results.push({
      deviceId: device.deviceId,
      hiveId: device.hiveId,
      temperature: payload.temperature,
      humidity: payload.humidity,
      weightKg: payload.weightKg,
      success: res.success,
      status: res.status,
      message: res.message,
    });
  }

  return {
    success: successful > 0,
    total: simulatedDevices.length,
    successful,
    results,
  };
}

let backgroundTimer: NodeJS.Timeout | null = null;
let initialStartupTimer: NodeJS.Timeout | null = null;
let isBackgroundRunning = false;

/**
 * Starts the integrated IoT telemetry background service inside the Express backend.
 * The backend itself periodically issues HTTP POST requests to its own ingestion URL.
 * If targetUrl is not provided or empty, it logs an informational note and remains idle.
 */
export function startBackgroundSimulator(targetUrl?: string, intervalMsInput?: number | string): boolean {
  const rawUrl = targetUrl !== undefined ? targetUrl : process.env.IOT_TARGET_URL;

  if (!rawUrl || !rawUrl.trim()) {
    console.log("[HoneyChain IoT Simulator] IOT_TARGET_URL not configured. Integrated simulator service is idle (awaiting IOT_TARGET_URL environment variable).");
    return false;
  }

  let endpointUrl: string;
  try {
    endpointUrl = resolveTargetEndpoint(rawUrl);
  } catch (err: any) {
    console.warn(`[HoneyChain IoT Simulator] Failed to resolve target URL: ${err.message}`);
    return false;
  }

  const intervalMs = typeof intervalMsInput === "number"
    ? intervalMsInput
    : resolveIntervalMs(typeof intervalMsInput === "string" ? intervalMsInput : process.env.IOT_INTERVAL_MS);

  if (isBackgroundRunning) {
    console.log("[HoneyChain IoT Simulator] Background simulator is already running.");
    return true;
  }

  isBackgroundRunning = true;
  console.log(`[HoneyChain IoT Simulator] Integrated background service active.`);
  console.log(`[HoneyChain IoT Simulator] Target endpoint: ${endpointUrl}`);
  console.log(`[HoneyChain IoT Simulator] Cycle interval: ${intervalMs} ms (${(intervalMs / 1000).toFixed(1)}s)`);

  let cycleIndex = 0;

  const executeCycle = async () => {
    if (!isBackgroundRunning) return;
    cycleIndex += 1;
    console.log(`[HoneyChain IoT Simulator] Cycle #${cycleIndex} - Sending telemetry for ${simulatedDevices.length} hives...`);

    for (const device of simulatedDevices) {
      if (!isBackgroundRunning) break;
      const payload = evolveDeviceState(device);
      const result = await sendTelemetry(endpointUrl, payload);
      if (result.success) {
        console.log(
          `  [IoT Sim ✓] ${device.deviceId} (${device.hiveId}): ${payload.temperature}°C, ${payload.humidity}%, ${payload.weightKg}kg -> ${result.message}`
        );
      } else {
        console.warn(
          `  [IoT Sim ✗] ${device.deviceId} (${device.hiveId}): Failed -> [${result.status || "ERR"}] ${result.message}`
        );
      }
    }
  };

  // Schedule first cycle after 5 seconds to let the server complete startup/listen
  initialStartupTimer = setTimeout(() => {
    if (isBackgroundRunning) {
      executeCycle().catch((err) => console.error("[HoneyChain IoT Simulator] Error during cycle:", err.message));
    }
  }, 5000);

  backgroundTimer = setInterval(() => {
    if (isBackgroundRunning) {
      executeCycle().catch((err) => console.error("[HoneyChain IoT Simulator] Error during cycle:", err.message));
    }
  }, intervalMs);

  return true;
}

/**
 * Stops the integrated background simulation loop.
 */
export function stopBackgroundSimulator(): void {
  if (initialStartupTimer) {
    clearTimeout(initialStartupTimer);
    initialStartupTimer = null;
  }
  if (backgroundTimer) {
    clearInterval(backgroundTimer);
    backgroundTimer = null;
  }
  isBackgroundRunning = false;
  console.log("[HoneyChain IoT Simulator] Integrated background service stopped.");
}

/**
 * Main simulation runner loop for standalone CLI execution.
 */
async function runSimulator() {
  console.log("\n=======================================================");
  console.log("       HONEYCHAIN IOT TELEMETRY EDGE SIMULATOR         ");
  console.log("=======================================================\n");

  let endpointUrl: string;
  try {
    endpointUrl = resolveTargetEndpoint(process.env.IOT_TARGET_URL);
  } catch {
    process.exit(1);
  }

  const intervalMs = resolveIntervalMs(process.env.IOT_INTERVAL_MS);

  console.log(`[CONFIG] Ingestion Endpoint: ${endpointUrl}`);
  console.log(`[CONFIG] Transmission Interval: ${intervalMs} ms (${(intervalMs / 1000).toFixed(1)}s)`);
  console.log(`[CONFIG] Monitored Device Count: ${simulatedDevices.length}\n`);

  let isRunning = true;

  // Graceful shutdown handling
  const shutdown = (signal: string) => {
    console.log(`\n[SIMULATOR] Received ${signal}. Shutting down cleanly...`);
    isRunning = false;
    process.exit(0);
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  let cycleIndex = 0;

  while (isRunning) {
    cycleIndex += 1;
    const cycleStartTime = new Date();
    console.log(`--- [Cycle #${cycleIndex}] Transmitting Telemetry at ${cycleStartTime.toLocaleTimeString()} ---`);

    for (const device of simulatedDevices) {
      if (!isRunning) break;

      const payload = evolveDeviceState(device);
      const result = await sendTelemetry(endpointUrl, payload);

      if (result.success) {
        console.log(
          `  [✓] ${device.deviceId} (${device.hiveId}): ${payload.temperature}°C, ${payload.humidity}%, ${payload.weightKg}kg, ${payload.batteryLevelPct}% batt -> ${result.message}`
        );
      } else {
        console.warn(
          `  [✗] ${device.deviceId} (${device.hiveId}): Failed -> [${result.status || "ERR"}] ${result.message}`
        );
      }
    }

    console.log(`--- [Cycle #${cycleIndex} Complete] Waiting ${intervalMs / 1000}s until next cycle...\n`);

    // Sleep for configured interval
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

// Execute standalone if run directly
if (process.argv[1]?.endsWith("simulateIoT.ts") || process.argv[1]?.endsWith("simulateIoT.js")) {
  runSimulator();
}

