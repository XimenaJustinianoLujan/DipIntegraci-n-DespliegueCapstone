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
const PATIENT_ID = '12c59db5-35f2-40f2-ad98-3a0f8f38ccf9';
const DOCTOR_ID = '632871a3-277b-4fbc-930a-a6571666586e';
const SECRETARY_ID = 'a6f04bbb-8249-42a8-919f-d6a2ed285c7c';
const SPECIALTY_ID = '99cae7d7-4a18-4488-b687-5f20d32ff59e';
const CITA_ID = '824ffffb-5c63-476f-8593-444bd7a46311';
const AGENDA_ID = '543ffb6d-71db-4b66-bd38-345c01787987';
const OTHER_PATIENT_ID = '01acb09e-1dc6-432e-a866-6ccf1313f9db';
const OTHER_DOCTOR_ID = '8b6d3f4b-7f1b-4a3a-9b0a-2f6e9b6d3f4b';
const ADMIN_ID = 'f3f8e6a2-3f4a-4a3b-9a1a-1a2b3c4d5e6f';

describe('Citas (Appointments) Routes', () => {
  let patientToken;
  let doctorToken;
  let secretaryToken;
  let adminToken;

  beforeAll(() => {
    patientToken = jwt.sign(
      { id: PATIENT_ID, role: 'paciente', email: 'patient@test.com' },
      env.jwtSecret,
      { expiresIn: '1h' }
    );
    doctorToken = jwt.sign(
      { id: DOCTOR_ID, role: 'medico', email: 'doctor@test.com' },
      env.jwtSecret,
      { expiresIn: '1h' }
    );
    secretaryToken = jwt.sign(
      { id: SECRETARY_ID, role: 'secretaria', email: 'secretary@test.com' },
      env.jwtSecret,
      { expiresIn: '1h' }
    );
    adminToken = jwt.sign(
      { id: ADMIN_ID, role: 'administrador', email: 'admin@test.com' },
      env.jwtSecret,
      { expiresIn: '1h' }
    );
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('POST /api/citas - Create Appointment', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    const futureDate = tomorrow.toISOString().split('T')[0];

    const validCita = {
      medico_id: DOCTOR_ID,
      especialidad_id: SPECIALTY_ID,
      fecha: futureDate,
      hora_inicio: '09:00',
      motivo_consulta: 'Control general',
    };

    it('should create an appointment successfully', async () => {
      db.query
        // findById paciente
        .mockResolvedValueOnce({
          rows: [{ id: PATIENT_ID, nombre: 'Juan', apellido: 'Perez', email: 'patient@test.com' }],
        })
        // findById medico
        .mockResolvedValueOnce({
          rows: [{ id: DOCTOR_ID, nombre: 'Dr', apellido: 'Smith', estado: 'ACTIVO' }],
        })
        // countActivasByPaciente
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        // hasActiveInEspecialidad
        .mockResolvedValueOnce({ rows: [] })
        // hasActiveWithMedico
        .mockResolvedValueOnce({ rows: [] })
        // isSlotAvailable
        .mockResolvedValueOnce({ rows: [] })
        // findAvailableSlots
        .mockResolvedValueOnce({
          rows: [{
            id: AGENDA_ID,
            hora_inicio: '09:00:00',
            hora_fin: '10:00:00',
          }],
        })
        // create cita
        .mockResolvedValueOnce({
          rows: [{
            id: CITA_ID,
            paciente_id: PATIENT_ID,
            medico_id: DOCTOR_ID,
            especialidad_id: SPECIALTY_ID,
            fecha: futureDate,
            hora_inicio: '09:00',
            hora_fin: '10:00',
            estado: 'CONFIRMADA',
          }],
        })
        // audit log
        .mockResolvedValueOnce({ rows: [{}] });

      const res = await request(app)
        .post('/api/citas')
        .set('Authorization', `Bearer ${patientToken}`)
        .send(validCita);

      expect(res.status).toBe(201);
      expect(res.body.cita.estado).toBe('CONFIRMADA');
    });

    it('should allow booking an appointment for today when the doctor still has that slot open', async () => {
      const todayDate = new Date().toISOString().split('T')[0];
      const slotRow = { id: AGENDA_ID, hora_inicio: '09:00:00', hora_fin: '10:00:00' };

      db.query
        .mockResolvedValueOnce({ rows: [{ id: PATIENT_ID, nombre: 'Juan', email: 'patient@test.com' }] })
        .mockResolvedValueOnce({ rows: [{ id: DOCTOR_ID, estado: 'ACTIVO' }] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [] }) // hasActiveInEspecialidad
        .mockResolvedValueOnce({ rows: [] }) // hasActiveWithMedico
        // Como faltan menos de 24hs, el servicio primero chequea si el
        // horario sigue libre en la agenda (excepcion de "misma hora
        // disponible") antes de rechazar por anticipacion minima.
        .mockResolvedValueOnce({ rows: [slotRow] })
        .mockResolvedValueOnce({ rows: [] }) // isSlotAvailable
        .mockResolvedValueOnce({ rows: [slotRow] }) // findAvailableSlots (agenda entry)
        .mockResolvedValueOnce({
          rows: [{ id: CITA_ID, fecha: todayDate, hora_inicio: '09:00', estado: 'CONFIRMADA' }],
        })
        .mockResolvedValueOnce({ rows: [{}] }); // audit log

      const res = await request(app)
        .post('/api/citas')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ ...validCita, fecha: todayDate });

      expect(res.status).toBe(201);
    });

    it('should reject when patient has 3 active appointments (max limit)', async () => {
      db.query
        // findById paciente
        .mockResolvedValueOnce({
          rows: [{ id: PATIENT_ID, nombre: 'Juan', email: 'patient@test.com' }],
        })
        // findById medico
        .mockResolvedValueOnce({
          rows: [{ id: DOCTOR_ID, estado: 'ACTIVO' }],
        })
        // countActivasByPaciente - returns 3 (max reached)
        .mockResolvedValueOnce({ rows: [{ count: '3' }] });

      const res = await request(app)
        .post('/api/citas')
        .set('Authorization', `Bearer ${patientToken}`)
        .send(validCita);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('3 citas activas');
    });

    it('should reject appointment in same specialty', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ id: PATIENT_ID, nombre: 'Juan', email: 'p@t.com' }] })
        .mockResolvedValueOnce({ rows: [{ id: DOCTOR_ID, estado: 'ACTIVO' }] })
        .mockResolvedValueOnce({ rows: [{ count: '1' }] }) // active count
        .mockResolvedValueOnce({ rows: [{ id: 'existing-cita' }] }); // has specialty

      const res = await request(app)
        .post('/api/citas')
        .set('Authorization', `Bearer ${patientToken}`)
        .send(validCita);

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('especialidad');
    });

    it('should reject appointment with same doctor', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ id: PATIENT_ID, nombre: 'Juan', email: 'p@t.com' }] })
        .mockResolvedValueOnce({ rows: [{ id: DOCTOR_ID, estado: 'ACTIVO' }] })
        .mockResolvedValueOnce({ rows: [{ count: '1' }] }) // active count
        .mockResolvedValueOnce({ rows: [] }) // no specialty conflict
        .mockResolvedValueOnce({ rows: [{ id: 'existing-cita' }] }); // has same doctor

      const res = await request(app)
        .post('/api/citas')
        .set('Authorization', `Bearer ${patientToken}`)
        .send(validCita);

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('medico');
    });

    it('should reject if slot is occupied', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ id: PATIENT_ID, nombre: 'Juan', email: 'p@t.com' }] })
        .mockResolvedValueOnce({ rows: [{ id: DOCTOR_ID, estado: 'ACTIVO' }] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 'occupied-cita' }] }); // slot occupied

      const res = await request(app)
        .post('/api/citas')
        .set('Authorization', `Bearer ${patientToken}`)
        .send(validCita);

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('ocupado');
    });

    it('should return 401 without token', async () => {
      const res = await request(app)
        .post('/api/citas')
        .send(validCita);

      expect(res.status).toBe(401);
    });

    it('should return 403 if not a patient', async () => {
      const res = await request(app)
        .post('/api/citas')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send(validCita);

      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /api/citas/:id/cancelar - Cancel Appointment', () => {
    it('should cancel appointment with 2+ hours notice', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const fecha = futureDate.toISOString().split('T')[0];

      db.query
        // findById
        .mockResolvedValueOnce({
          rows: [{
            id: CITA_ID,
            paciente_id: PATIENT_ID,
            estado: 'CONFIRMADA',
            fecha,
            hora_inicio: '10:00:00',
          }],
        })
        // cancelar
        .mockResolvedValueOnce({
          rows: [{
            id: CITA_ID,
            estado: 'CANCELADA',
            motivo_cancelacion: 'No puedo asistir',
          }],
        })
        // audit log
        .mockResolvedValueOnce({ rows: [{}] });

      const res = await request(app)
        .patch(`/api/citas/${CITA_ID}/cancelar`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ motivo_cancelacion: 'No puedo asistir' });

      expect(res.status).toBe(200);
      expect(res.body.cita.estado).toBe('CANCELADA');
    });

    it('should reject cancellation of non-CONFIRMADA appointment', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{
          id: CITA_ID,
          paciente_id: PATIENT_ID,
          estado: 'COMPLETADA',
          fecha: '2099-01-01',
          hora_inicio: '10:00:00',
        }],
      });

      const res = await request(app)
        .patch(`/api/citas/${CITA_ID}/cancelar`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('should reject cancellation by wrong patient', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{
          id: CITA_ID,
          paciente_id: OTHER_PATIENT_ID,
          estado: 'CONFIRMADA',
          fecha: '2099-01-01',
          hora_inicio: '10:00:00',
        }],
      });

      const res = await request(app)
        .patch(`/api/citas/${CITA_ID}/cancelar`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({});

      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /api/citas/:id/no-show - Mark No Show', () => {
    it('should allow doctor to mark no-show', async () => {
      db.query
        // findById
        .mockResolvedValueOnce({
          rows: [{ id: CITA_ID, estado: 'CONFIRMADA', medico_id: DOCTOR_ID }],
        })
        // marcarNoShow
        .mockResolvedValueOnce({
          rows: [{ id: CITA_ID, estado: 'NO_SHOW' }],
        })
        // audit log
        .mockResolvedValueOnce({ rows: [{}] });

      const res = await request(app)
        .patch(`/api/citas/${CITA_ID}/no-show`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send();

      expect(res.status).toBe(200);
      expect(res.body.cita.estado).toBe('NO_SHOW');
    });

    it('should allow secretary to mark no-show', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ id: CITA_ID, estado: 'CONFIRMADA', medico_id: DOCTOR_ID }] })
        .mockResolvedValueOnce({ rows: [{ id: CITA_ID, estado: 'NO_SHOW' }] })
        .mockResolvedValueOnce({ rows: [{}] });

      const res = await request(app)
        .patch(`/api/citas/${CITA_ID}/no-show`)
        .set('Authorization', `Bearer ${secretaryToken}`)
        .send();

      expect(res.status).toBe(200);
    });

    it('should reject no-show on non-CONFIRMADA appointment', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{ id: CITA_ID, estado: 'COMPLETADA' }],
      });

      const res = await request(app)
        .patch(`/api/citas/${CITA_ID}/no-show`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send();

      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /api/citas/:id/reconsulta - Mark Reconsulta', () => {
    it('should allow secretary to mark reconsulta from NO_SHOW', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ id: CITA_ID, estado: 'NO_SHOW' }] })
        .mockResolvedValueOnce({ rows: [{ id: CITA_ID, estado: 'RECONSULTA' }] })
        .mockResolvedValueOnce({ rows: [{}] });

      const res = await request(app)
        .patch(`/api/citas/${CITA_ID}/reconsulta`)
        .set('Authorization', `Bearer ${secretaryToken}`)
        .send();

      expect(res.status).toBe(200);
      expect(res.body.cita.estado).toBe('RECONSULTA');
    });

    it('should reject reconsulta on non-NO_SHOW appointment', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{ id: CITA_ID, estado: 'CONFIRMADA' }],
      });

      const res = await request(app)
        .patch(`/api/citas/${CITA_ID}/reconsulta`)
        .set('Authorization', `Bearer ${secretaryToken}`)
        .send();

      expect(res.status).toBe(400);
    });

    it('should reject reconsulta by patient', async () => {
      const res = await request(app)
        .patch(`/api/citas/${CITA_ID}/reconsulta`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send();

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/citas/:id', () => {
    it('should return appointment details', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{
          id: CITA_ID,
          paciente_id: PATIENT_ID,
          medico_id: DOCTOR_ID,
          estado: 'CONFIRMADA',
          fecha: '2024-12-20',
          hora_inicio: '09:00',
        }],
      });

      const res = await request(app)
        .get(`/api/citas/${CITA_ID}`)
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(CITA_ID);
    });

    it('should return 404 for non-existent appointment', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get(`/api/citas/${OTHER_PATIENT_ID}`)
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(404);
    });

    it('should not include the doctor private notes when the requester is the patient', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{
          id: CITA_ID,
          paciente_id: PATIENT_ID,
          medico_id: DOCTOR_ID,
          estado: 'CONFIRMADA',
          notas: 'Paciente hipertenso, revisar presion en cada visita',
        }],
      });

      const res = await request(app)
        .get(`/api/citas/${CITA_ID}`)
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(200);
      expect(res.body.notas).toBeUndefined();
    });

    it('should include the doctor private notes when the requester is the treating doctor', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{
          id: CITA_ID,
          paciente_id: PATIENT_ID,
          medico_id: DOCTOR_ID,
          estado: 'CONFIRMADA',
          notas: 'Paciente hipertenso, revisar presion en cada visita',
        }],
      });

      const res = await request(app)
        .get(`/api/citas/${CITA_ID}`)
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.notas).toBe('Paciente hipertenso, revisar presion en cada visita');
    });
  });

  describe('PATCH /api/citas/:id/notas - Doctor private notes', () => {
    it('should let the treating doctor save a private note', async () => {
      db.query
        // Cita.findById
        .mockResolvedValueOnce({ rows: [{ id: CITA_ID, medico_id: DOCTOR_ID }] })
        // Cita.updateNotas
        .mockResolvedValueOnce({
          rows: [{ id: CITA_ID, medico_id: DOCTOR_ID, notas: 'Alergico a la penicilina' }],
        });

      const res = await request(app)
        .patch(`/api/citas/${CITA_ID}/notas`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ notas: 'Alergico a la penicilina' });

      expect(res.status).toBe(200);
      expect(res.body.cita.notas).toBe('Alergico a la penicilina');
    });

    it('should let an admin save a private note on any appointment', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ id: CITA_ID, medico_id: DOCTOR_ID }] })
        .mockResolvedValueOnce({ rows: [{ id: CITA_ID, notas: 'Revisado por administracion' }] });

      const res = await request(app)
        .patch(`/api/citas/${CITA_ID}/notas`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ notas: 'Revisado por administracion' });

      expect(res.status).toBe(200);
    });

    it('should reject a doctor trying to add notes to another doctor\'s appointment', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ id: CITA_ID, medico_id: OTHER_DOCTOR_ID }] });

      const res = await request(app)
        .patch(`/api/citas/${CITA_ID}/notas`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ notas: 'Intento no autorizado' });

      expect(res.status).toBe(403);
    });

    it('should reject a patient or secretary trying to write notes', async () => {
      const resPatient = await request(app)
        .patch(`/api/citas/${CITA_ID}/notas`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ notas: 'No deberia poder' });
      expect(resPatient.status).toBe(403);

      const resSecretary = await request(app)
        .patch(`/api/citas/${CITA_ID}/notas`)
        .set('Authorization', `Bearer ${secretaryToken}`)
        .send({ notas: 'No deberia poder' });
      expect(resSecretary.status).toBe(403);

      expect(db.query).not.toHaveBeenCalled();
    });

    it('should return 404 when the appointment does not exist', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .patch(`/api/citas/${CITA_ID}/notas`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ notas: 'Cualquier cosa' });

      expect(res.status).toBe(404);
    });

    it('should reject notes longer than 1000 characters', async () => {
      const res = await request(app)
        .patch(`/api/citas/${CITA_ID}/notas`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ notas: 'a'.repeat(1001) });

      expect(res.status).toBe(400);
      expect(db.query).not.toHaveBeenCalled();
    });
  });
});
