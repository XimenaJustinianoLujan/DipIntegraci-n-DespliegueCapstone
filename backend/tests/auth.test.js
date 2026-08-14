const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

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

describe('Auth Routes', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('POST /api/auth/register', () => {
    const validPatient = {
      nombre: 'Juan',
      apellido: 'Perez',
      email: 'juan@example.com',
      password: 'Password1',
      telefono: '1234567890',
    };

    it('should register a new patient successfully', async () => {
      // Mock: no existing patient
      db.query
        .mockResolvedValueOnce({ rows: [] }) // findByEmail returns empty
        .mockResolvedValueOnce({
          rows: [{
            id: '12c59db5-35f2-40f2-ad98-3a0f8f38ccf9',
            nombre: 'Juan',
            apellido: 'Perez',
            email: 'juan@example.com',
            email_verificado: false,
            created_at: new Date(),
          }],
        }); // create patient

      const res = await request(app)
        .post('/api/auth/register')
        .send(validPatient);

      expect(res.status).toBe(201);
      expect(res.body.message).toContain('Registro exitoso');
      expect(res.body.token).toBeUndefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.role).toBe('paciente');
    });

    it('should return 409 if email already exists', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{ id: 'existing-id', email: 'juan@example.com' }],
      });

      const res = await request(app)
        .post('/api/auth/register')
        .send(validPatient);

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('email ya esta registrado');
    });

    it('should return 400 for invalid email format', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ ...validPatient, email: 'invalid-email' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('invalidos');
    });

    it('should return 400 for weak password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ ...validPatient, password: 'weak' });

      expect(res.status).toBe(400);
    });

    it('should return 400 for password without uppercase', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ ...validPatient, password: 'password1' });

      expect(res.status).toBe(400);
    });

    it('should return 400 for password without number', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ ...validPatient, password: 'Password' });

      expect(res.status).toBe(400);
    });

    it('should return 400 for empty name', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ ...validPatient, nombre: '' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login a patient with verified email', async () => {
      const hashedPassword = await bcrypt.hash('Password1', 10);

      // Login searches: paciente by email (found)
      db.query.mockResolvedValueOnce({
        rows: [{
          id: '11111111-1111-1111-1111-111111111111',
          nombre: 'Juan',
          apellido: 'Perez',
          email: 'juan@example.com',
          email_verificado: true,
          password_hash: hashedPassword,
        }],
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'juan@example.com', password: 'Password1' });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.role).toBe('paciente');
    });

    it('should return 403 for patient with unverified email', async () => {
      const hashedPassword = await bcrypt.hash('Password1', 10);

      db.query.mockResolvedValueOnce({
        rows: [{
          id: '11111111-1111-1111-1111-111111111111',
          nombre: 'Juan',
          apellido: 'Perez',
          email: 'juan@example.com',
          email_verificado: false,
          password_hash: hashedPassword,
        }],
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'juan@example.com', password: 'Password1' });

      expect(res.status).toBe(403);
    });

    it('should return 401 for wrong password', async () => {
      const hashedPassword = await bcrypt.hash('Password1', 10);

      db.query.mockResolvedValueOnce({
        rows: [{
          id: '11111111-1111-1111-1111-111111111111',
          nombre: 'Juan',
          apellido: 'Perez',
          email: 'juan@example.com',
          email_verificado: true,
          password_hash: hashedPassword,
        }],
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'juan@example.com', password: 'WrongPass1' });

      expect(res.status).toBe(401);
    });

    it('should return 401 for non-existent user', async () => {
      // All role table lookups return empty
      db.query
        .mockResolvedValueOnce({ rows: [] }) // paciente
        .mockResolvedValueOnce({ rows: [] }) // medico
        .mockResolvedValueOnce({ rows: [] }) // administrador
        .mockResolvedValueOnce({ rows: [] }); // secretaria

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nobody@example.com', password: 'Password1' });

      expect(res.status).toBe(401);
    });

    it('should login a doctor by username', async () => {
      const hashedPassword = await bcrypt.hash('Password1', 10);

      // No email provided, so login goes straight to username search
      // First it searches by username in medico table (found)
      db.query.mockResolvedValueOnce({
        rows: [{
          id: '22222222-2222-2222-2222-222222222222',
          nombre: 'Maria',
          apellido: 'Garcia',
          username: 'mgarcia',
          email: 'maria@clinic.com',
          password_hash: hashedPassword,
        }],
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'mgarcia', password: 'Password1' });

      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe('medico');
    });
  });

  describe('POST /api/auth/verify-email', () => {
    it('should verify email with valid token', async () => {
      const token = jwt.sign(
        { id: '12c59db5-35f2-40f2-ad98-3a0f8f38ccf9', purpose: 'email_verification' },
        env.jwtSecret,
        { expiresIn: '24h' }
      );

      db.query.mockResolvedValueOnce({
        rows: [{
          id: '12c59db5-35f2-40f2-ad98-3a0f8f38ccf9',
          email_verificado: true,
        }],
      });

      const res = await request(app)
        .post('/api/auth/verify-email')
        .send({ token });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('verificado');
    });

    it('should return 400 for invalid token', async () => {
      const res = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: 'invalid-token' });

      expect(res.status).toBe(400);
    });

    it('should return 400 for missing token', async () => {
      const res = await request(app)
        .post('/api/auth/verify-email')
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/refresh-token', () => {
    it('should return new access token with valid refresh token', async () => {
      const refreshToken = jwt.sign(
        { id: '11111111-1111-1111-1111-111111111111', role: 'paciente' },
        env.jwtRefreshSecret,
        { expiresIn: '7d' }
      );

      const res = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
    });

    it('should return 401 for invalid refresh token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken: 'invalid-token' });

      expect(res.status).toBe(401);
    });

    it('should return 400 for missing refresh token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh-token')
        .send({});

      expect(res.status).toBe(400);
    });
  });
});
