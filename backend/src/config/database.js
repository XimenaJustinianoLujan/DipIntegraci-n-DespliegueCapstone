const { Pool } = require('pg');
const env = require('./env');

// Cloud Postgres providers (Neon, Supabase, Render, etc.) require SSL, but a local
// Postgres does not. Enable SSL automatically for any non-local DATABASE_URL.
const isLocalDb = !env.databaseUrl || /@(localhost|127\.0\.0\.1)/.test(env.databaseUrl);

const poolConfig = env.databaseUrl
  ? {
      connectionString: env.databaseUrl,
      ssl: isLocalDb ? false : { rejectUnauthorized: false },
    }
  : {
      host: env.pgHost,
      port: env.pgPort,
      user: env.pgUser,
      password: env.pgPassword,
      database: env.pgDatabase,
    };

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

const query = (text, params) => pool.query(text, params);

const getClient = () => pool.connect();

module.exports = {
  pool,
  query,
  getClient,
};
