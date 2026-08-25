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
export const supabase = new SchemaClient(pool, "public");
export default supabase;
