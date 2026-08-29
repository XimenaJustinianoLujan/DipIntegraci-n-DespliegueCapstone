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
const OTHER_PATIENT_ID = '01acb09e-1dc6-432e-a866-6ccf1313f9db';
const DOCTOR_ID = '632871a3-277b-4fbc-930a-a6571666586e';
const OTHER_DOCTOR_ID = '8b6d3f4b-7f1b-4a3a-9b0a-2f6e9b6d3f4b';
const ADMIN_ID = 'f3f8e6a2-3f4a-4a3b-9a1a-1a2b3c4d5e6f';
const CITA_ID = '824ffffb-5c63-476f-8593-444bd7a46311';
const FICHA_ID = '543ffb6d-71db-4b66-bd38-345c01787987';
const DOC_ID = '99cae7d7-4a18-4488-b687-5f20d32ff59e';

describe('Ficha Clinica Routes', () => {
  let patientToken;
  let otherPatientToken;
  let doctorToken;
  let otherDoctorToken;
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
    otherDoctorToken = jwt.sign(
      { id: OTHER_DOCTOR_ID, role: 'medico', email: 'other.doctor@test.com' },
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

  describe('POST /api/fichas-clinicas', () => {
    const validPayload = {
      cita_id: CITA_ID,
      diagnostico: 'Gripe comun',
      indicaciones: 'Reposo 3 dias',
    };

    it('should create a clinical record and mark the appointment as COMPLETADA', async () => {
      db.query
        // Cita.findById
        .mockResolvedValueOnce({
          rows: [{ id: CITA_ID, medico_id: DOCTOR_ID, paciente_id: PATIENT_ID, estado: 'CONFIRMADA' }],
        })
        // FichaClinica.create
        .mockResolvedValueOnce({
          rows: [{ id: FICHA_ID, cita_id: CITA_ID, paciente_id: PATIENT_ID, diagnostico: 'Gripe comun' }],
        })
        // Cita.completar
        .mockResolvedValueOnce({ rows: [{ id: CITA_ID, estado: 'COMPLETADA' }] })
        // audit log
        .mockResolvedValueOnce({ rows: [{}] });

      const res = await request(app)
        .post('/api/fichas-clinicas')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send(validPayload);

      expect(res.status).toBe(201);
      expect(res.body.ficha.id).toBe(FICHA_ID);
      expect(res.body.message).toContain('completada');
    });

    it('should reject a non-doctor role', async () => {
      const res = await request(app)
        .post('/api/fichas-clinicas')
        .set('Authorization', `Bearer ${patientToken}`)
        .send(validPayload);

      expect(res.status).toBe(403);
      expect(db.query).not.toHaveBeenCalled();
    });

    it('should return 404 when the appointment does not exist', async () => {
      db.query.mockResolvedValueOnce({ rows: [] }); // Cita.findById

      const res = await request(app)
        .post('/api/fichas-clinicas')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send(validPayload);

      expect(res.status).toBe(404);
    });

    it('should reject when the appointment belongs to a different doctor', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{ id: CITA_ID, medico_id: OTHER_DOCTOR_ID, estado: 'CONFIRMADA' }],
      });

      const res = await request(app)
        .post('/api/fichas-clinicas')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send(validPayload);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('propias citas');
    });

    it('should reject when the appointment is not CONFIRMADA', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{ id: CITA_ID, medico_id: DOCTOR_ID, estado: 'COMPLETADA' }],
      });

      const res = await request(app)
        .post('/api/fichas-clinicas')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send(validPayload);

      expect(res.status).toBe(400);
    });

    it('should reject a payload without diagnostico', async () => {
      const res = await request(app)
        .post('/api/fichas-clinicas')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ cita_id: CITA_ID });

      expect(res.status).toBe(400);
      expect(db.query).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/fichas-clinicas/:pacienteId', () => {
    it('should let a patient view their own records', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{ id: FICHA_ID, paciente_id: PATIENT_ID, diagnostico: 'Gripe comun' }],
      });

      const res = await request(app)
        .get(`/api/fichas-clinicas/${PATIENT_ID}`)
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });

    it('should reject a patient viewing someone else\'s records', async () => {
      const res = await request(app)
        .get(`/api/fichas-clinicas/${OTHER_PATIENT_ID}`)
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(403);
      expect(db.query).not.toHaveBeenCalled();
    });

    it('should let a doctor view any patient\'s records', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get(`/api/fichas-clinicas/${PATIENT_ID}`)
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.status).toBe(200);
    });

    it('should reject an invalid patient id', async () => {
      const res = await request(app)
        .get('/api/fichas-clinicas/not-a-uuid')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/fichas-clinicas/:id/documentos', () => {
    it('should list documents for the record', async () => {
      db.query
        // FichaClinica.findById
        .mockResolvedValueOnce({ rows: [{ id: FICHA_ID, paciente_id: PATIENT_ID }] })
        // getDocumentos
        .mockResolvedValueOnce({ rows: [{ id: DOC_ID, nombre_archivo: 'receta.pdf' }] });

      const res = await request(app)
        .get(`/api/fichas-clinicas/${FICHA_ID}/documentos`)
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });

    it('should return 404 when the record does not exist', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get(`/api/fichas-clinicas/${FICHA_ID}/documentos`)
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.status).toBe(404);
    });

    it('should reject a patient viewing another patient\'s documents', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ id: FICHA_ID, paciente_id: OTHER_PATIENT_ID }] });

      const res = await request(app)
        .get(`/api/fichas-clinicas/${FICHA_ID}/documentos`)
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/fichas-clinicas/:id/documentos/:docId/download', () => {
    // Solo se cubren las ramas de error: la ruta feliz usa res.sendFile sobre
    // un archivo real en disco, fuera del alcance de un test unitario con la
    // DB mockeada (requeriria escribir archivos reales durante el test run).
    it('should return 404 when the record does not exist', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get(`/api/fichas-clinicas/${FICHA_ID}/documentos/${DOC_ID}/download`)
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.status).toBe(404);
    });

    it('should reject a patient downloading another patient\'s document', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ id: FICHA_ID, paciente_id: OTHER_PATIENT_ID }] });

      const res = await request(app)
        .get(`/api/fichas-clinicas/${FICHA_ID}/documentos/${DOC_ID}/download`)
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 404 when the document id does not belong to the record', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ id: FICHA_ID, paciente_id: PATIENT_ID }] })
        .mockResolvedValueOnce({ rows: [{ id: 'a-different-doc-id', ruta_archivo: './uploads/x.pdf' }] });

      const res = await request(app)
        .get(`/api/fichas-clinicas/${FICHA_ID}/documentos/${DOC_ID}/download`)
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(404);
    });

    it('should block path traversal attempts outside the upload directory', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ id: FICHA_ID, paciente_id: PATIENT_ID }] })
        .mockResolvedValueOnce({
          rows: [{
            id: DOC_ID,
            ruta_archivo: '../../etc/passwd',
            tipo_archivo: 'application/pdf',
            nombre_archivo: 'passwd',
          }],
        });

      const res = await request(app)
        .get(`/api/fichas-clinicas/${FICHA_ID}/documentos/${DOC_ID}/download`)
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('no permitida');
    });
  });

  describe('POST /api/fichas-clinicas/:id/documentos', () => {
    it('should reject when no doctor and requester is not the owner', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ id: FICHA_ID, medico_id: OTHER_DOCTOR_ID }] });

      const res = await request(app)
        .post(`/api/fichas-clinicas/${FICHA_ID}/documentos`)
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 404 when the record does not exist', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post(`/api/fichas-clinicas/${FICHA_ID}/documentos`)
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.status).toBe(404);
    });

    it('should reject when no file is attached', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ id: FICHA_ID, medico_id: DOCTOR_ID }] });

      const res = await request(app)
        .post(`/api/fichas-clinicas/${FICHA_ID}/documentos`)
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('adjuntar un archivo');
    });

    it('should reject a non-doctor role', async () => {
      const res = await request(app)
        .post(`/api/fichas-clinicas/${FICHA_ID}/documentos`)
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(403);
      expect(db.query).not.toHaveBeenCalled();
    });
  });
});
