import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default("5000"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  MONGO_URI: z.string().default("mongodb://localhost:27017/honeychain"),
  JWT_SECRET: z.string().default("honeychain_dev_jwt_secret_change_in_production"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  GOOGLE_CLIENT_ID: z.string().default("dev-google-client-id"),
  RATE_LIMIT_WINDOW_MS: z.string().default("900000"),
  RATE_LIMIT_MAX: z.string().default("100"),

  // Blockchain Configuration (Ethereum Sepolia Testnet - Chain ID: 11155111)
  SEPOLIA_RPC_URL: z.string().default("https://ethereum-sepolia-rpc.publicnode.com"),
  CONTRACT_ADDRESS: z.string().default("0x65afF3B44441FfF68171a9a0AA28063BC83C208d"),

  // Dedicated Testnet Wallets for Backend Role Simulation
  ADMIN_PRIVATE_KEY: z.string().optional(),
  DEPLOYER_PRIVATE_KEY: z.string().optional(),
  BEEKEEPER_PRIVATE_KEY: z.string().optional(),
  LABORATORY_PRIVATE_KEY: z.string().optional(),
  LAB_PRIVATE_KEY: z.string().optional(),
  PROCESSOR_PRIVATE_KEY: z.string().optional(),
  DISTRIBUTOR_PRIVATE_KEY: z.string().optional(),
  AUDITOR_PRIVATE_KEY: z.string().optional(),

  // IoT Telemetry Simulation (hits backend itself over HTTP)
  IOT_TARGET_URL: z.string().optional(),
  IOT_INTERVAL_MS: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.format());
  process.exit(1);
}

export const env = {
  ...parsed.data,
  ADMIN_PRIVATE_KEY: parsed.data.ADMIN_PRIVATE_KEY || parsed.data.DEPLOYER_PRIVATE_KEY,
  LABORATORY_PRIVATE_KEY: parsed.data.LABORATORY_PRIVATE_KEY || parsed.data.LAB_PRIVATE_KEY,
};