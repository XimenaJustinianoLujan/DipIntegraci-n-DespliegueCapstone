/**
 * Migration runner.
 *
 * Applies every .sql file in database/migrations/ in filename order, inside a
 * transaction, and records applied migrations in a `schema_migrations` table so
 * re-running is safe (already-applied files are skipped).
 *
 * Usage:
 *   DATABASE_URL=postgresql://... node scripts/migrate.js
 *   npm run migrate
 */
const fs = require('fs');
const path = require('path');
const { pool } = require('../src/config/database');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'database', 'migrations');

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename   VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMP DEFAULT NOW()
    );
  `);
}

async function getApplied(client) {
  const { rows } = await client.query('SELECT filename FROM schema_migrations');
  return new Set(rows.map((r) => r.filename));
}

async function run() {
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('No hay archivos de migracion.');
    return;
  }

  const client = await pool.connect();
  try {
    await ensureMigrationsTable(client);
    const applied = await getApplied(client);

    let count = 0;
    for (const file of files) {
      if (applied.has(file)) {
        console.log(`- ${file} (ya aplicada, se omite)`);
        continue;
      }

      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      process.stdout.write(`> Aplicando ${file} ... `);

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log('OK');
        count += 1;
      } catch (err) {
        await client.query('ROLLBACK');
        console.log('ERROR');
        throw new Error(`Fallo en ${file}: ${err.message}`);
      }
    }

    console.log(
      count === 0
        ? '\nBase de datos ya estaba al dia. Nada que aplicar.'
        : `\nListo. ${count} migracion(es) aplicada(s).`
    );
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error('\nMigracion fallida:', err.message);
  process.exit(1);
});
