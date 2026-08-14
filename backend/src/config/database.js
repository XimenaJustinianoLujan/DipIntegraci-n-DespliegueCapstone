const { Pool } = require('pg');
const env = require('./env');

const poolConfig = env.databaseUrl
  ? { connectionString: env.databaseUrl }
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
