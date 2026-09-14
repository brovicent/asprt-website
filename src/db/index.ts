import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

if (!DB_HOST || !DB_USER || !DB_PASSWORD || !DB_NAME) {
  throw new Error("Database credentials (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME) are required");
}

// Fix: Use a global singleton for the pool in ALL environments (not just dev).
// Without this, Next.js production builds create a new pool per hot module reload
// or per serverless function cold start, causing connection leaks.
const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsMysqlPool?: mysql.Pool;
};

const config = {
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  connectionLimit: 3,
};

export const pool =
  globalForDb.__arenaNextJsMysqlPool ??
  mysql.createPool(config);

// Fix: Assign global in all envs so the pool is truly a singleton.
// Previously this was only set in development, causing a new pool per request
// in production (connection leak).
if (!globalForDb.__arenaNextJsMysqlPool) {
  globalForDb.__arenaNextJsMysqlPool = pool;
}

export const db = drizzle(pool);
