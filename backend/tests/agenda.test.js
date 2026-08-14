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
const DOCTOR_ID = '632871a3-277b-4fbc-930a-a6571666586e';
const ADMIN_ID = '824ffffb-5c63-476f-8593-444bd7a46311';
const PATIENT_ID = '12c59db5-35f2-40f2-ad98-3a0f8f38ccf9';
const BLOQUE_1 = '99cae7d7-4a18-4488-b687-5f20d32ff59e';
const BLOQUE_2 = '543ffb6d-71db-4b66-bd38-345c01787987';
const BLOQUE_3 = '01acb09e-1dc6-432e-a866-6ccf1313f9db';

describe('Agenda (Schedule) Routes', () => {
  let doctorToken;
  let adminToken;
  let patientToken;

  beforeAll(() => {
    doctorToken = jwt.sign(
      { id: DOCTOR_ID, role: 'medico', email: 'doc@test.com' },
      env.jwtSecret,
      { expiresIn: '1h' }
    );
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

  describe('POST /api/agenda - Load Schedule', () => {
    it('should load schedule for a week ahead', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 8);
      const fecha_inicio = futureDate.toISOString().split('T')[0];

      const bloques = [
        { bloque_horario_id: BLOQUE_1, disponible: true },
        { bloque_horario_id: BLOQUE_2, disponible: true },
        { bloque_horario_id: BLOQUE_3, disponible: false },
      ];

      // Mock createBulk (creates each entry)
      db.query
        .mockResolvedValueOnce({ rows: [{ id: 'agenda-1', medico_id: DOCTOR_ID, disponible: true }] })
        .mockResolvedValueOnce({ rows: [{ id: 'agenda-2', medico_id: DOCTOR_ID, disponible: true }] })
        .mockResolvedValueOnce({ rows: [{ id: 'agenda-3', medico_id: DOCTOR_ID, disponible: false }] })
        .mockResolvedValueOnce({ rows: [{}] }); // audit log

      const res = await request(app)
        .post('/api/agenda')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ fecha_inicio, bloques });

      expect(res.status).toBe(201);
      expect(res.body.message).toContain('cargada');
      expect(res.body.entries).toHaveLength(3);
    });

    it('should reject schedule less than 1 week ahead', async () => {
      const nearDate = new Date();
      nearDate.setDate(nearDate.getDate() + 3);
      const fecha_inicio = nearDate.toISOString().split('T')[0];

      const res = await request(app)
        .post('/api/agenda')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          fecha_inicio,
          bloques: [{ bloque_horario_id: BLOQUE_1, disponible: true }],
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('1 semana');
    });

    it('should reject if not a doctor', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 8);

      const res = await request(app)
        .post('/api/agenda')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          fecha_inicio: futureDate.toISOString().split('T')[0],
          bloques: [{ bloque_horario_id: BLOQUE_1, disponible: true }],
        });

      expect(res.status).toBe(403);
    });

    it('should return 401 without authentication', async () => {
      const res = await request(app)
        .post('/api/agenda')
        .send({
          fecha_inicio: '2099-01-01',
          bloques: [{ bloque_horario_id: BLOQUE_1, disponible: true }],
        });

      expect(res.status).toBe(401);
    });
  });

  describe('PUT /api/agenda/confirmar - Confirm Schedule', () => {
    it('should confirm a schedule for the week', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 8);
      const semana_fecha = futureDate.toISOString().split('T')[0];

      db.query
        // confirmarSemana
        .mockResolvedValueOnce({
          rows: [
            { id: 'agenda-1', confirmado: true },
            { id: 'agenda-2', confirmado: true },
          ],
        })
        // audit log
        .mockResolvedValueOnce({ rows: [{}] });

      const res = await request(app)
        .put('/api/agenda/confirmar')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ semana_fecha });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('confirmada');
    });

    it('should reject confirmation without date', async () => {
      const res = await request(app)
        .put('/api/agenda/confirmar')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/agenda/:medicoId/semana/:fecha', () => {
    it('should return week schedule for a doctor', async () => {
      const fecha = '2024-12-16';

      db.query.mockResolvedValueOnce({
        rows: [
          { id: 'a1', fecha: '2024-12-16', hora_inicio: '08:00', hora_fin: '09:00', disponible: true },
          { id: 'a2', fecha: '2024-12-16', hora_inicio: '09:00', hora_fin: '10:00', disponible: true },
          { id: 'a3', fecha: '2024-12-17', hora_inicio: '08:00', hora_fin: '09:00', disponible: false },
        ],
      });

      const res = await request(app)
        .get(`/api/agenda/${DOCTOR_ID}/semana/${fecha}`)
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(3);
    });
  });

  describe('GET /api/agenda/last-config', () => {
    it('should return last configuration for doctor', async () => {
      db.query.mockResolvedValueOnce({
        rows: [
          { bloque_horario_id: BLOQUE_1, disponible: true, dia_semana: 1, hora_inicio: '08:00' },
          { bloque_horario_id: BLOQUE_2, disponible: true, dia_semana: 1, hora_inicio: '09:00' },
        ],
      });

      const res = await request(app)
        .get('/api/agenda/last-config')
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });
  });

  describe('POST /api/agenda/admin-override', () => {
    it('should allow admin to load schedule for a doctor', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 8);
      const fecha_inicio = futureDate.toISOString().split('T')[0];

      db.query
        // createBulk entries
        .mockResolvedValueOnce({ rows: [{ id: 'agenda-1' }] })
        .mockResolvedValueOnce({ rows: [{ id: 'agenda-2' }] })
        // confirmarSemana
        .mockResolvedValueOnce({ rows: [{ id: 'agenda-1', confirmado: true }, { id: 'agenda-2', confirmado: true }] })
        // audit log
        .mockResolvedValueOnce({ rows: [{}] });

      const res = await request(app)
        .post('/api/agenda/admin-override')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          medico_id: DOCTOR_ID,
          fecha_inicio,
          bloques: [
            { bloque_horario_id: BLOQUE_1, disponible: true },
            { bloque_horario_id: BLOQUE_2, disponible: true },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.message).toContain('administrador');
    });

    it('should reject admin override by non-admin', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 8);

      const res = await request(app)
        .post('/api/agenda/admin-override')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          medico_id: DOCTOR_ID,
          fecha_inicio: futureDate.toISOString().split('T')[0],
          bloques: [{ bloque_horario_id: BLOQUE_1, disponible: true }],
        });

      expect(res.status).toBe(403);
    });
  });
});
