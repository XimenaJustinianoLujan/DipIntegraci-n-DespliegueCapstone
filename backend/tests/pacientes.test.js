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
const OTHER_PATIENT_ID = '01acb09e-1dc6-432e-a866-6ccf1313f9db';
const DOCTOR_ID = '632871a3-277b-4fbc-930a-a6571666586e';
const ADMIN_ID = 'f3f8e6a2-3f4a-4a3b-9a1a-1a2b3c4d5e6f';

describe('Pacientes Routes', () => {
  let patientToken;
  let otherPatientToken;
  let doctorToken;
  let adminToken;

  beforeAll(() => {
    patientToken = jwt.sign(
      { id: PATIENT_ID, role: 'paciente', email: 'patient@test.com' },
      env.jwtSecret,
      { expiresIn: '1h' }
    );
    otherPatientToken = jwt.sign(
      { id: OTHER_PATIENT_ID, role: 'paciente', email: 'other@test.com' },
      env.jwtSecret,
      { expiresIn: '1h' }
    );
    doctorToken = jwt.sign(
      { id: DOCTOR_ID, role: 'medico', email: 'doctor@test.com' },
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

  describe('GET /api/pacientes/:id', () => {
    it('should let a patient view their own profile without the password hash', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{ id: PATIENT_ID, nombre: 'Juan', password_hash: 'secret' }],
      });

      const res = await request(app)
        .get(`/api/pacientes/${PATIENT_ID}`)
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(200);
      expect(res.body.password_hash).toBeUndefined();
    });

    it('should reject a patient viewing someone else\'s profile', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ id: OTHER_PATIENT_ID }] });

      const res = await request(app)
        .get(`/api/pacientes/${OTHER_PATIENT_ID}`)
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(403);
    });

    it('should let an admin view any patient\'s profile', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ id: PATIENT_ID }] });

      const res = await request(app)
        .get(`/api/pacientes/${PATIENT_ID}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });

    it('should return 404 when the patient does not exist', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get(`/api/pacientes/${PATIENT_ID}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/pacientes/:id', () => {
    it('should let a patient update their own profile', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{ id: PATIENT_ID, nombre: 'Juan Actualizado', password_hash: 'secret' }],
      });

      const res = await request(app)
        .put(`/api/pacientes/${PATIENT_ID}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ nombre: 'Juan Actualizado' });

      expect(res.status).toBe(200);
      expect(res.body.nombre).toBe('Juan Actualizado');
      expect(res.body.password_hash).toBeUndefined();
    });

    it('should reject a patient updating someone else\'s profile', async () => {
      const res = await request(app)
        .put(`/api/pacientes/${OTHER_PATIENT_ID}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ nombre: 'Hackeo' });

      expect(res.status).toBe(403);
      expect(db.query).not.toHaveBeenCalled();
    });

    it('should reject a doctor trying to update a patient (not in allowed roles)', async () => {
      const res = await request(app)
        .put(`/api/pacientes/${PATIENT_ID}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ nombre: 'X' });

      expect(res.status).toBe(403);
      expect(db.query).not.toHaveBeenCalled();
    });

    it('should return 404 when updating a patient that does not exist', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .put(`/api/pacientes/${PATIENT_ID}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nombre: 'Juan' });

      expect(res.status).toBe(404);
    });

    it('should reject an invalid phone number', async () => {
      const res = await request(app)
        .put(`/api/pacientes/${PATIENT_ID}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ telefono: 'abc' });

      expect(res.status).toBe(400);
      expect(db.query).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/pacientes/:id/citas', () => {
    it('should let a patient list their own appointments', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ id: 'c1', estado: 'CONFIRMADA' }] });

      const res = await request(app)
        .get(`/api/pacientes/${PATIENT_ID}/citas`)
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });

    it('should never include the doctor private notes, even for a doctor consulting the list', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{ id: 'c1', estado: 'CONFIRMADA', notas: 'Nota privada de otro medico' }],
      });

      const res = await request(app)
        .get(`/api/pacientes/${PATIENT_ID}/citas`)
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.status).toBe(200);
      expect(res.body[0].notas).toBeUndefined();
    });

    it('should reject a patient listing someone else\'s appointments', async () => {
      const res = await request(app)
        .get(`/api/pacientes/${OTHER_PATIENT_ID}/citas`)
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(403);
      expect(db.query).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/pacientes/:id/ficha-clinica', () => {
    it('should let a doctor view a patient\'s clinical record', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ id: 'f1', diagnostico: 'Gripe' }] });

      const res = await request(app)
        .get(`/api/pacientes/${PATIENT_ID}/ficha-clinica`)
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.status).toBe(200);
    });

    it('should reject a patient viewing someone else\'s clinical record', async () => {
      const res = await request(app)
        .get(`/api/pacientes/${OTHER_PATIENT_ID}/ficha-clinica`)
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(403);
      expect(db.query).not.toHaveBeenCalled();
    });
  });
});
