import { Pool } from 'pg';

const globalForPg = globalThis;

/**
 * Singleton PostgreSQL connection pool using node-postgres (`pg`).
 * Reused across hot-reloads in development to avoid exhausting DB connections.
 */
const pool =
  globalForPg.__pgPool ||
  new Pool({
    connectionString: process.env.DATABASE_URL,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPg.__pgPool = pool;
}

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err);
});

/**
 * Execute a parameterized SQL query using the shared connection pool.
 * @param {string} text - Parameterized SQL query ($1, $2, ...)
 * @param {Array} [params=[]] - Query parameter values
 * @returns {Promise<import('pg').QueryResult>}
 */
export async function query(text, params = []) {
  return pool.query(text, params);
}

/**
 * Run a callback inside an atomic PostgreSQL transaction (BEGIN ... COMMIT / ROLLBACK).
 * @template T
 * @param {(client: import('pg').PoolClient) => Promise<T>} callback
 * @returns {Promise<T>}
 */
export async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export default pool;
