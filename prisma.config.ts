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
    url: process.env.DATABASE_URL ?? "postgresql://neondb_owner:npg_password@ep-host.region.aws.neon.tech/neondb?sslmode=require",

  },
});
