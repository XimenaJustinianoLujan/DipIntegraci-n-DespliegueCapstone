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

const PATIENT_ID = '12c59db5-35f2-40f2-ad98-3a0f8f38ccf9';
const DOCTOR_ID = '632871a3-277b-4fbc-930a-a6571666586e';
const ADMIN_ID = 'f3f8e6a2-3f4a-4a3b-9a1a-1a2b3c4d5e6f';

describe('Medicos Routes', () => {
  let patientToken;
  let adminToken;

  beforeAll(() => {
    patientToken = jwt.sign(
      { id: PATIENT_ID, role: 'paciente', email: 'patient@test.com' },
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

  describe('GET /api/medicos', () => {
    it('should list doctors without exposing password_hash', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{ id: DOCTOR_ID, nombre: 'Ana', password_hash: 'secret' }],
      });

      const res = await request(app)
        .get('/api/medicos')
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(200);
      expect(res.body[0].password_hash).toBeUndefined();
    });

    it('should reject requests without a token', async () => {
      const res = await request(app).get('/api/medicos');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/medicos/especialidades', () => {
    it('should list active specialties', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{ id: 's1', nombre: 'Cardiologia' }],
      });

      const res = await request(app)
        .get('/api/medicos/especialidades')
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });
  });

  describe('GET /api/medicos/:id', () => {
    it('should return a doctor without the password hash', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{ id: DOCTOR_ID, nombre: 'Ana', password_hash: 'secret' }],
      });

      const res = await request(app)
        .get(`/api/medicos/${DOCTOR_ID}`)
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(200);
      expect(res.body.password_hash).toBeUndefined();
    });

    it('should return 404 when the doctor does not exist', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get(`/api/medicos/${DOCTOR_ID}`)
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/medicos/:id/agenda', () => {
    it('should return the weekly schedule for a given date', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{ fecha: '2026-08-31', hora_inicio: '09:00', dia_semana: 1 }],
      });

      const res = await request(app)
        .get(`/api/medicos/${DOCTOR_ID}/agenda?fecha=2026-08-31`)
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });

    it('should reject when fecha query param is missing', async () => {
      const res = await request(app)
        .get(`/api/medicos/${DOCTOR_ID}/agenda`)
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(400);
      expect(db.query).not.toHaveBeenCalled();
    });
  });

  describe('PUT /api/medicos/:id/estado', () => {
    it('should let an admin update a doctor\'s status', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{ id: DOCTOR_ID, estado: 'BAJA', password_hash: 'secret' }],
      });

      const res = await request(app)
        .put(`/api/medicos/${DOCTOR_ID}/estado`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ estado: 'BAJA' });

      expect(res.status).toBe(200);
      expect(res.body.medico.password_hash).toBeUndefined();
    });

    it('should reject a non-admin role', async () => {
      const res = await request(app)
        .put(`/api/medicos/${DOCTOR_ID}/estado`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ estado: 'BAJA' });

      expect(res.status).toBe(403);
      expect(db.query).not.toHaveBeenCalled();
    });

    it('should return 404 when the doctor does not exist', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .put(`/api/medicos/${DOCTOR_ID}/estado`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ estado: 'BAJA' });

      expect(res.status).toBe(404);
    });
  });
});
