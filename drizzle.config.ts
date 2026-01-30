import { defineConfig } from "drizzle-kit";
import { privateEnv } from "./src/config/privateEnv";

export default defineConfig({
  schema: "./src/db/schema.ts",
  dialect: "postgresql",
  out: "./drizzle",
  dbCredentials: {
    url: privateEnv.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false, // Required for DigitalOcean managed databases
    },
  },
  verbose: true,
  strict: true,
});
