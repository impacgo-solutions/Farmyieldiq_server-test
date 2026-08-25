import pg from "pg";
import dotenv from "dotenv";
import { SchemaClient } from "../utils/queryBuilder.js";

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error("Missing DATABASE_URL in .env file");
}

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on("error", (err) => {
  console.error("[DB] Unexpected pool error:", err.message);
});

// Primary database client — exposes .from() and .schema() to match
// the Supabase JS client API used throughout all controllers.
const dbClient = new SchemaClient(pool, "public");

// If Supabase Storage credentials are present, attach the storage client
// so document/avatar upload routes keep working without any changes.
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  try {
    const { createClient } = await import("@supabase/supabase-js");
    const ws = (await import("ws")).default;
    const storageSupabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: { autoRefreshToken: false, persistSession: false },
        realtime: { transport: ws },
      }
    );
    dbClient.storage = storageSupabase.storage;
  } catch (e) {
    console.warn("[DB] Supabase storage not initialised:", e.message);
  }
}

export const supabase = dbClient;
export default supabase;
