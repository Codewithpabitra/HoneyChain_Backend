import app from "./app.js";
import { env } from "./config/env.js";
import { connectDB, setupGracefulShutdown } from "./config/db.js";
import { startBackgroundSimulator, stopBackgroundSimulator } from "./scripts/simulateIoT.js";

const PORT = env.PORT || 5000;

async function startServer() {
  try {
    // Initialize production-quality database connection with connection pooling
    await connectDB(env.MONGO_URI);

    const server = app.listen(PORT, () => {
      console.log(`[HoneyChain] API server running on http://localhost:${PORT}`);
      console.log(`[HoneyChain] Connected to Ethereum Sepolia contract: ${env.CONTRACT_ADDRESS}`);

      // Initiate integrated IoT background simulator
      // Hits backend itself over HTTP if IOT_TARGET_URL is provided, or remains idle until configured
      startBackgroundSimulator(env.IOT_TARGET_URL, env.IOT_INTERVAL_MS);
    });

    // Register graceful shutdown listeners for SIGINT and SIGTERM with simulator cleanup
    setupGracefulShutdown(server, () => {
      stopBackgroundSimulator();
    });
  } catch (err: any) {
    console.error("[HoneyChain] Fatal startup failure:", err.message);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== "test") {
  startServer();
}

export default app;