// prisma/prisma.config.ts
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // ✅ Access env variable directly instead of using env() which throws
    url: process.env.DATABASE_URL ?? (() => { throw new Error("DATABASE_URL not set"); })(),

  },
});
