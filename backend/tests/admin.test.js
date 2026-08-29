const request = require('supertest');
const jwt = require('jsonwebtoken');

// Set test environment
process.env.NODE_ENV = 'test';

// Mock database module
jest.mock('../src/config/database', () => ({
  query: jest.fn(),
  getClient: jest.fn(),
  pool: { on: jest.fn() },
}));

// Mock nodemailer
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' }),
  })),
}));

const app = require('../src/index');
const db = require('../src/config/database');
const env = require('../src/config/env');

// Valid UUIDs (properly formatted v4)
const ADMIN_ID = 'f3f8e6a2-3f4a-4a3b-9a1a-1a2b3c4d5e6f';
const PATIENT_ID = '12c59db5-35f2-40f2-ad98-3a0f8f38ccf9';
const DOCTOR_ID = '632871a3-277b-4fbc-930a-a6571666586e';
const SPECIALTY_ID = '99cae7d7-4a18-4488-b687-5f20d32ff59e';
const CITA_ID = '824ffffb-5c63-476f-8593-444bd7a46311';
const BLOQUE_ID = '11111111-1111-4111-8111-111111111111';

describe('Admin Routes', () => {
  let adminToken;
  let patientToken;

  beforeAll(() => {
    adminToken = jwt.sign(
      { id: ADMIN_ID, role: 'administrador', email: 'admin@test.com' },
      env.jwtSecret,
      { expiresIn: '1h' }
    );
    patientToken = jwt.sign(
      { id: PATIENT_ID, role: 'paciente', email: 'patient@test.com' },
      env.jwtSecret,
      { expiresIn: '1h' }
    );
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('Authorization', () => {
    it('should reject requests without a token', async () => {
      const res = await request(app).get('/api/admin/especialidades');
      expect(res.status).toBe(401);
    });

    it('should reject requests from a non-admin role', async () => {
      const res = await request(app)
        .get('/api/admin/especialidades')
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Sin permisos');
    });
  });

  describe('PATCH /api/admin/citas/:id/cancelar', () => {
    it('should cancel an appointment and notify the patient', async () => {
      db.query
        // Cita.findById
        .mockResolvedValueOnce({
          rows: [{
            id: CITA_ID,
            paciente_id: PATIENT_ID,
            medico_id: DOCTOR_ID,
            estado: 'CONFIRMADA',
            fecha: '2026-09-01',
            hora_inicio: '09:00',
          }],
        })
        // Cita.cancelar
        .mockResolvedValueOnce({
          rows: [{ id: CITA_ID, estado: 'CANCELADA' }],
        })
        // Paciente.findById
        .mockResolvedValueOnce({
          rows: [{ id: PATIENT_ID, nombre: 'Juan', email: 'patient@test.com' }],
        })
        // Medico.findById
        .mockResolvedValueOnce({
          rows: [{ id: DOCTOR_ID, nombre: 'Dr', apellido: 'Smith' }],
        })
        // audit log
        .mockResolvedValueOnce({ rows: [{}] });

      const res = await request(app)
        .patch(`/api/admin/citas/${CITA_ID}/cancelar`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ motivo_cancelacion: 'Emergencia del medico' });

      expect(res.status).toBe(200);
      expect(res.body.cita.estado).toBe('CANCELADA');
      expect(res.body.message).toContain('notifico al paciente');
    });

    it('should return 404 when the appointment does not exist', async () => {
      db.query.mockResolvedValueOnce({ rows: [] }); // Cita.findById

      const res = await request(app)
        .patch(`/api/admin/citas/${CITA_ID}/cancelar`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(404);
    });

    it('should return 400 when the appointment is already cancelled', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{ id: CITA_ID, estado: 'CANCELADA' }],
      });

      const res = await request(app)
        .patch(`/api/admin/citas/${CITA_ID}/cancelar`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('should return 400 for an invalid appointment id', async () => {
      const res = await request(app)
        .patch('/api/admin/citas/not-a-uuid/cancelar')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(db.query).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/admin/turnos-domingo', () => {
    it('should assign doctors to Sunday emergency blocks', async () => {
      db.query
        // AgendaMedico.create x2 (1 medico x 2 bloques)
        .mockResolvedValueOnce({ rows: [{ id: 'a1', medico_id: DOCTOR_ID }] })
        .mockResolvedValueOnce({ rows: [{ id: 'a2', medico_id: DOCTOR_ID }] })
        // confirmarSemana
        .mockResolvedValueOnce({ rows: [{ id: 'a1' }, { id: 'a2' }] })
        // audit log
        .mockResolvedValueOnce({ rows: [{}] });

      const res = await request(app)
        .post('/api/admin/turnos-domingo')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          fecha: '2026-08-30', // a Sunday
          medico_ids: [DOCTOR_ID],
          bloque_horario_ids: [BLOQUE_ID, 'a2222222-2222-4222-8222-222222222222'],
        });

      expect(res.status).toBe(201);
      expect(res.body.bloques_creados).toBe(2);
    });

    it('should reject a date that is not a Sunday', async () => {
      const res = await request(app)
        .post('/api/admin/turnos-domingo')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          fecha: '2026-08-31', // a Monday
          medico_ids: [DOCTOR_ID],
          bloque_horario_ids: [BLOQUE_ID],
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('domingo');
      expect(db.query).not.toHaveBeenCalled();
    });

    it('should reject when medico_ids is missing', async () => {
      const res = await request(app)
        .post('/api/admin/turnos-domingo')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ fecha: '2026-08-30' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/admin/turnos-domingo', () => {
    it('should list upcoming Sunday assignments', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{ id: 'a1', medico_id: DOCTOR_ID, fecha: '2026-08-30', medico_nombre: 'Dr Smith' }],
      });

      const res = await request(app)
        .get('/api/admin/turnos-domingo')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });
  });

  describe('DELETE /api/admin/turnos-domingo/:id', () => {
    it('should remove a Sunday assignment', async () => {
      db.query
        // find medico_id/fecha for the row
        .mockResolvedValueOnce({ rows: [{ medico_id: DOCTOR_ID, fecha: '2026-08-30' }] })
        // delete
        .mockResolvedValueOnce({ rowCount: 2 })
        // audit log
        .mockResolvedValueOnce({ rows: [{}] });

      const res = await request(app)
        .delete('/api/admin/turnos-domingo/a1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.eliminados).toBe(2);
    });

    it('should return 404 when the assignment does not exist', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .delete('/api/admin/turnos-domingo/does-not-exist')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/admin/stats', () => {
    it('should return dashboard summary counters', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ count: 5 }] }) // doctors
        .mockResolvedValueOnce({ rows: [{ count: 3 }] }) // todayCitas
        .mockResolvedValueOnce({ rows: [{ estado: 'CONFIRMADA', count: 3 }] }) // porEstado
        .mockResolvedValueOnce({ rows: [{ fecha: '2026-08-28', count: 1 }] }); // ultimos7dias

      const res = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.doctors).toBe(5);
      expect(res.body.todayCitas).toBe(3);
      expect(res.body.porEstado).toHaveLength(1);
      expect(res.body.ultimos7dias).toHaveLength(1);
    });
  });

  describe('POST /api/admin/medicos', () => {
    const validMedico = {
      nombre: 'Ana',
      apellido: 'Gomez',
      email: 'ana.gomez@example.com',
      password: 'Password1',
      especialidad_id: SPECIALTY_ID,
    };

    it('should create a doctor and generate a username', async () => {
      db.query
        // Medico.findByEmail
        .mockResolvedValueOnce({ rows: [] })
        // Medico.usernameExists (generateUsername strategy 1)
        .mockResolvedValueOnce({ rows: [] })
        // INSERT medicos
        .mockResolvedValueOnce({
          rows: [{
            id: DOCTOR_ID,
            nombre: 'Ana',
            apellido: 'Gomez',
            email: 'ana.gomez@example.com',
            username: 'agomez',
            password_hash: 'hashed',
          }],
        })
        // audit log
        .mockResolvedValueOnce({ rows: [{}] });

      const res = await request(app)
        .post('/api/admin/medicos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validMedico);

      expect(res.status).toBe(201);
      expect(res.body.medico.username).toBe('agomez');
      expect(res.body.medico.password_hash).toBeUndefined();
    });

    it('should reject a duplicate email with 409', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ id: DOCTOR_ID }] }); // findByEmail finds one

      const res = await request(app)
        .post('/api/admin/medicos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validMedico);

      expect(res.status).toBe(409);
    });

    it('should reject an invalid payload (weak password)', async () => {
      const res = await request(app)
        .post('/api/admin/medicos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...validMedico, password: '123' });

      expect(res.status).toBe(400);
      expect(db.query).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/admin/medicos', () => {
    it('should list doctors without exposing password_hash', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{ id: DOCTOR_ID, nombre: 'Ana', password_hash: 'secret' }],
      });

      const res = await request(app)
        .get('/api/admin/medicos')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body[0].password_hash).toBeUndefined();
    });
  });

  describe('PATCH /api/admin/medicos/:id/estado', () => {
    it('should update the doctor status', async () => {
      db.query
        // Medico.findById
        .mockResolvedValueOnce({ rows: [{ id: DOCTOR_ID, estado: 'ACTIVO' }] })
        // Medico.updateEstado
        .mockResolvedValueOnce({ rows: [{ id: DOCTOR_ID, estado: 'BAJA', password_hash: 'x' }] })
        // audit log
        .mockResolvedValueOnce({ rows: [{}] });

      const res = await request(app)
        .patch(`/api/admin/medicos/${DOCTOR_ID}/estado`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ estado: 'BAJA' });

      expect(res.status).toBe(200);
      expect(res.body.medico.estado).toBe('BAJA');
      expect(res.body.medico.password_hash).toBeUndefined();
    });

    it('should return 404 when the doctor does not exist', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .patch(`/api/admin/medicos/${DOCTOR_ID}/estado`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ estado: 'BAJA' });

      expect(res.status).toBe(404);
    });

    it('should reject an invalid estado value', async () => {
      const res = await request(app)
        .patch(`/api/admin/medicos/${DOCTOR_ID}/estado`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ estado: 'JUBILADO' });

      expect(res.status).toBe(400);
      expect(db.query).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/admin/especialidades', () => {
    it('should list all specialties, including inactive ones', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{ id: SPECIALTY_ID, nombre: 'Cardiologia', activo: false }],
      });

      const res = await request(app)
        .get('/api/admin/especialidades')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body[0].activo).toBe(false);
    });
  });

  describe('POST /api/admin/especialidades', () => {
    it('should create a new specialty', async () => {
      db.query
        // findByNombre
        .mockResolvedValueOnce({ rows: [] })
        // create
        .mockResolvedValueOnce({ rows: [{ id: SPECIALTY_ID, nombre: 'Dermatologia' }] })
        // audit log
        .mockResolvedValueOnce({ rows: [{}] });

      const res = await request(app)
        .post('/api/admin/especialidades')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nombre: 'Dermatologia' });

      expect(res.status).toBe(201);
      expect(res.body.especialidad.nombre).toBe('Dermatologia');
    });

    it('should reject a duplicate specialty name with 409', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ id: SPECIALTY_ID }] });

      const res = await request(app)
        .post('/api/admin/especialidades')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nombre: 'Dermatologia' });

      expect(res.status).toBe(409);
    });
  });

  describe('PUT /api/admin/especialidades/:id', () => {
    it('should update fields of an existing specialty', async () => {
      db.query
        // Especialidad.findById
        .mockResolvedValueOnce({ rows: [{ id: SPECIALTY_ID, nombre: 'Cardiologia' }] })
        // Especialidad.findByNombre (chequeo de duplicado al cambiar el nombre)
        .mockResolvedValueOnce({ rows: [] })
        // update
        .mockResolvedValueOnce({ rows: [{ id: SPECIALTY_ID, nombre: 'Cardiologia Pediatrica' }] })
        // audit log
        .mockResolvedValueOnce({ rows: [{}] });

      const res = await request(app)
        .put(`/api/admin/especialidades/${SPECIALTY_ID}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nombre: 'Cardiologia Pediatrica' });

      expect(res.status).toBe(200);
      expect(res.body.especialidad.nombre).toBe('Cardiologia Pediatrica');
    });

    it('should fall back to the full list when the specialty is inactive', async () => {
      db.query
        // Especialidad.findById -> not found (findById only looks at active)
        .mockResolvedValueOnce({ rows: [] })
        // Especialidad.findAll({ includeInactive: true })
        .mockResolvedValueOnce({ rows: [{ id: SPECIALTY_ID, nombre: 'Cardiologia', activo: false }] })
        // update
        .mockResolvedValueOnce({ rows: [{ id: SPECIALTY_ID, nombre: 'Cardiologia', activo: true }] })
        // audit log
        .mockResolvedValueOnce({ rows: [{}] });

      const res = await request(app)
        .put(`/api/admin/especialidades/${SPECIALTY_ID}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ activo: true });

      expect(res.status).toBe(200);
      expect(res.body.especialidad.activo).toBe(true);
    });

    it('should return 404 when the specialty does not exist anywhere', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [] }) // findById
        .mockResolvedValueOnce({ rows: [] }); // findAll(includeInactive)

      const res = await request(app)
        .put(`/api/admin/especialidades/${SPECIALTY_ID}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nombre: 'Nueva' });

      expect(res.status).toBe(404);
    });

    it('should return 400 when no updatable field is sent', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ id: SPECIALTY_ID, nombre: 'Cardiologia' }] });

      const res = await request(app)
        .put(`/api/admin/especialidades/${SPECIALTY_ID}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('should reject renaming to a name that is already taken', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ id: SPECIALTY_ID, nombre: 'Cardiologia' }] }) // findById
        .mockResolvedValueOnce({ rows: [{ id: 'other-id', nombre: 'Dermatologia' }] }); // findByNombre (duplicate)

      const res = await request(app)
        .put(`/api/admin/especialidades/${SPECIALTY_ID}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nombre: 'Dermatologia' });

      expect(res.status).toBe(409);
    });
  });
});
