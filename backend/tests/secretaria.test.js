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

const SECRETARY_ID = 'a6f04bbb-8249-42a8-919f-d6a2ed285c7c';
const PATIENT_ID = '12c59db5-35f2-40f2-ad98-3a0f8f38ccf9';
const CITA_ID = '824ffffb-5c63-476f-8593-444bd7a46311';

describe('Secretaria Routes', () => {
  let secretaryToken;
  let patientToken;

  beforeAll(() => {
    secretaryToken = jwt.sign(
      { id: SECRETARY_ID, role: 'secretaria', email: 'secretary@test.com' },
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
    it('should reject a non-secretary role', async () => {
      const res = await request(app)
        .get('/api/secretaria/citas?fecha=2026-08-31')
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/secretaria/citas', () => {
    it('should list appointments for a given date', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{ id: CITA_ID, fecha: '2026-08-31', estado: 'CONFIRMADA' }],
      });

      const res = await request(app)
        .get('/api/secretaria/citas?fecha=2026-08-31')
        .set('Authorization', `Bearer ${secretaryToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });

    it('should reject when fecha query param is missing', async () => {
      const res = await request(app)
        .get('/api/secretaria/citas')
        .set('Authorization', `Bearer ${secretaryToken}`);

      expect(res.status).toBe(400);
      expect(db.query).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /api/secretaria/citas/:id/no-show', () => {
    it('should mark a confirmed appointment as NO_SHOW', async () => {
      db.query
        // Cita.findById
        .mockResolvedValueOnce({ rows: [{ id: CITA_ID, estado: 'CONFIRMADA' }] })
        // Cita.marcarNoShow
        .mockResolvedValueOnce({ rows: [{ id: CITA_ID, estado: 'NO_SHOW' }] })
        // audit log
        .mockResolvedValueOnce({ rows: [{}] });

      const res = await request(app)
        .patch(`/api/secretaria/citas/${CITA_ID}/no-show`)
        .set('Authorization', `Bearer ${secretaryToken}`);

      expect(res.status).toBe(200);
      expect(res.body.cita.estado).toBe('NO_SHOW');
    });

    it('should return 404 when the appointment does not exist', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .patch(`/api/secretaria/citas/${CITA_ID}/no-show`)
        .set('Authorization', `Bearer ${secretaryToken}`);

      expect(res.status).toBe(404);
    });

    it('should reject marking NO_SHOW on an appointment that is not CONFIRMADA', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ id: CITA_ID, estado: 'CANCELADA' }] });

      const res = await request(app)
        .patch(`/api/secretaria/citas/${CITA_ID}/no-show`)
        .set('Authorization', `Bearer ${secretaryToken}`);

      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /api/secretaria/citas/:id/reconsulta', () => {
    it('should mark a NO_SHOW appointment as RECONSULTA', async () => {
      db.query
        // Cita.findById
        .mockResolvedValueOnce({ rows: [{ id: CITA_ID, estado: 'NO_SHOW' }] })
        // Cita.marcarReconsulta
        .mockResolvedValueOnce({ rows: [{ id: CITA_ID, estado: 'RECONSULTA' }] })
        // audit log
        .mockResolvedValueOnce({ rows: [{}] });

      const res = await request(app)
        .patch(`/api/secretaria/citas/${CITA_ID}/reconsulta`)
        .set('Authorization', `Bearer ${secretaryToken}`);

      expect(res.status).toBe(200);
      expect(res.body.cita.estado).toBe('RECONSULTA');
    });

    it('should reject marking RECONSULTA on an appointment that is not NO_SHOW', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ id: CITA_ID, estado: 'CONFIRMADA' }] });

      const res = await request(app)
        .patch(`/api/secretaria/citas/${CITA_ID}/reconsulta`)
        .set('Authorization', `Bearer ${secretaryToken}`);

      expect(res.status).toBe(400);
    });

    it('should return 404 when the appointment does not exist', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .patch(`/api/secretaria/citas/${CITA_ID}/reconsulta`)
        .set('Authorization', `Bearer ${secretaryToken}`);

      expect(res.status).toBe(404);
    });
  });
});
