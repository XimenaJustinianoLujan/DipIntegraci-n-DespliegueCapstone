/**
 * Seed de datos de demostracion.
 *
 * Crea un usuario por cada rol (administrador, medico, secretaria, paciente) con
 * contrasenas conocidas, y genera agenda disponible para el medico de demo en los
 * proximos dias habiles para que un paciente pueda reservar citas de inmediato.
 *
 * Es idempotente: puede ejecutarse varias veces sin duplicar datos.
 *
 * Requisito: ejecutar primero las migraciones (`npm run migrate`), ya que las
 * especialidades y los bloques horarios se crean alli.
 *
 * Usuarios y contrasenas de demo (NO usar en produccion real):
 *   Administrador -> email: admin@clinica.com       | usuario: admin       | pass: Admin123!
 *   Medico        -> email: medico@clinica.com       | usuario: dr.garcia   | pass: Medico123!
 *   Secretaria    -> email: secretaria@clinica.com   | usuario: secretaria  | pass: Secre123!
 *   Paciente      -> email: paciente@clinica.com                            | pass: Paciente123!
 *
 * Usage:
 *   DATABASE_URL=postgresql://... node scripts/seed.js
 *   npm run seed
 */
const bcrypt = require('bcryptjs');
const { pool } = require('../src/config/database');

async function hash(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

async function seed() {
  const client = await pool.connect();
  try {
    // --- Especialidad base para el medico de demo ---
    const espRes = await client.query(
      "SELECT id FROM especialidades WHERE nombre = 'Medicina General' LIMIT 1"
    );
    if (espRes.rows.length === 0) {
      throw new Error(
        "No se encontro la especialidad 'Medicina General'. Ejecuta primero las migraciones (npm run migrate)."
      );
    }
    const especialidadId = espRes.rows[0].id;

    // --- Administrador ---
    await client.query(
      `INSERT INTO administradores (nombre, apellido, email, telefono, username, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (email) DO NOTHING`,
      ['Ana', 'Administradora', 'admin@clinica.com', '1150000001', 'admin', await hash('Admin123!')]
    );

    // --- Secretaria ---
    await client.query(
      `INSERT INTO secretarias (nombre, apellido, email, telefono, username, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (email) DO NOTHING`,
      ['Sofia', 'Secretaria', 'secretaria@clinica.com', '1150000002', 'secretaria', await hash('Secre123!')]
    );

    // --- Medico ---
    await client.query(
      `INSERT INTO medicos (nombre, apellido, email, telefono, username, password_hash, especialidad_id, estado)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'ACTIVO')
       ON CONFLICT (email) DO NOTHING`,
      ['Carlos', 'Garcia', 'medico@clinica.com', '1150000003', 'dr.garcia', await hash('Medico123!'), especialidadId]
    );

    // --- Paciente (email ya verificado para poder iniciar sesion en la demo) ---
    await client.query(
      `INSERT INTO pacientes (nombre, apellido, email, telefono, fecha_nacimiento, password_hash, email_verificado)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE)
       ON CONFLICT (email) DO NOTHING`,
      ['Lucia', 'Paciente', 'paciente@clinica.com', '1150000004', '1990-05-15', await hash('Paciente123!')]
    );

    // --- Agenda del medico de demo: proximos 21 dias, solo bloques no-emergencia
    //     cuyo dia de la semana coincide con la fecha (ISODOW: 1=Lun ... 7=Dom). ---
    const medRes = await client.query(
      "SELECT id FROM medicos WHERE email = 'medico@clinica.com' LIMIT 1"
    );
    const medicoId = medRes.rows[0].id;

    const agendaRes = await client.query(
      `INSERT INTO agenda_medico (medico_id, bloque_horario_id, fecha, disponible, confirmado, creado_por, creado_por_rol)
       SELECT $1, b.id, d::date, TRUE, TRUE, $1, 'medico'
       FROM generate_series(CURRENT_DATE + 1, CURRENT_DATE + 21, INTERVAL '1 day') AS d
       JOIN bloques_horarios b
         ON b.dia_semana = EXTRACT(ISODOW FROM d)::int
        AND b.es_emergencia = FALSE
        AND b.activo = TRUE
       ON CONFLICT (medico_id, bloque_horario_id, fecha) DO NOTHING`,
      [medicoId]
    );

    console.log('Seed completado:');
    console.log('  - Administrador: admin@clinica.com     / Admin123!');
    console.log('  - Medico:        medico@clinica.com     / Medico123!  (usuario: dr.garcia)');
    console.log('  - Secretaria:    secretaria@clinica.com / Secre123!   (usuario: secretaria)');
    console.log('  - Paciente:      paciente@clinica.com   / Paciente123!');
    console.log(`  - Agenda del medico: ${agendaRes.rowCount} bloque(s) disponibles creados (proximos 21 dias).`);
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error('Seed fallido:', err.message);
  process.exit(1);
});
