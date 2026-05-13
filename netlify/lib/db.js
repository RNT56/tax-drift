"use strict";

let pool;

function databaseUrl(env = process.env) {
  return env.SUPABASE_DATABASE_URL || env.DATABASE_URL || env.POSTGRES_URL || env.NETLIFY_DATABASE_URL || "";
}

async function getPool(env = process.env) {
  const url = databaseUrl(env);
  if (!url) return null;
  if (!pool) {
    const { Pool } = require("pg");
    pool = new Pool({
      connectionString: url,
      ssl: env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
      max: 4,
      idleTimeoutMillis: 15_000
    });
  }
  return pool;
}

async function healthcheck(env = process.env) {
  const clientPool = await getPool(env);
  if (!clientPool) {
    return { configured: false, reachable: false };
  }
  const startedAt = Date.now();
  await clientPool.query("select 1");
  return {
    configured: true,
    reachable: true,
    latencyMs: Date.now() - startedAt
  };
}

module.exports = {
  databaseUrl,
  getPool,
  healthcheck
};
