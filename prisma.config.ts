// Load environment variables from .env
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic", // 'classic' engine for better stability
  datasource: {
    url: env("DATABASE_URL"), // Reads from .env
  },
});
