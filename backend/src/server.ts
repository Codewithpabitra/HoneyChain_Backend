import mongoose from "mongoose";
import app from "./app.js";
import { env } from "./config/env.js";

const PORT = env.PORT || 5000;

async function startServer() {
  try {
    if (env.MONGO_URI) {
      await mongoose.connect(env.MONGO_URI);
      console.log("Connected to MongoDB successfully");
    }

    app.listen(PORT, () => {
      console.log(`HoneyChain server running on http://localhost:${PORT}`);
      console.log(`Connected to Ethereum Sepolia contract: ${env.CONTRACT_ADDRESS}`);
    });
  } catch (err) {
    console.error("Failed to start HoneyChain server:", err);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== "test") {
  startServer();
}

export default app;