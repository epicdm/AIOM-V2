import * as schema from "./schema";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { privateEnv } from "~/config/privateEnv";

const pool = new pg.Pool({
  connectionString: privateEnv.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Required for DigitalOcean managed databases with self-signed certs
  },
});
const database = drizzle(pool, { schema, logger: true });

export { database, pool };
