// lib/prisma.js (or db.js)
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

// Parse the DATABASE_URL manually
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("❌ DATABASE_URL is not defined");
}

console.log("Using DATABASE_URL:", DATABASE_URL.substring(0, 60) + "...");

// Parse URL to extract components
const url = new URL(DATABASE_URL);
const config = {
  host: url.hostname,
  port: parseInt(url.port),
  database: url.pathname.substring(1), // Remove leading slash
  user: url.username,
  password: decodeURIComponent(url.password), // Decode the password
  ssl: {
    rejectUnauthorized: false, // Required for Supabase
  },
};

console.log("Extracted config:", {
  host: config.host,
  port: config.port,
  database: config.database,
  user: config.user,
  password: config.password ? "✅ Password loaded" : "❌ Password missing",
});

// Create pg Pool with explicit config
const pool = new Pool(config);

// Create Prisma adapter with the pool
const adapter = new PrismaPg(pool);

// Create global PrismaClient instance
const globalForPrisma = globalThis;

export const db =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter: adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "warn", "error"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

// Test connection immediately
db.$connect()
  .then(() => console.log("✅ Prisma connected successfully"))
  .catch((err) => console.error("❌ Prisma connection failed:", err.message));
