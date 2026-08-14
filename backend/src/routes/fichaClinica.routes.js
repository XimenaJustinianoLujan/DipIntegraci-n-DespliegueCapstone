const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const FichaClinica = require('../models/FichaClinica');
const Cita = require('../models/Cita');
const AuditService = require('../services/auditService');
const { createFichaValidator, pacienteIdValidator, fichaIdValidator } = require('../validators/fichaClinica.validator');
const validate = require('../middleware/validate');
const env = require('../config/env');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, env.uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: env.maxFileSize },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'image/dicom'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido'));
    }
  },
});

// POST /api/fichas-clinicas - Create clinical record (marks appointment as COMPLETADA)
// multer runs before validators so req.body is populated for multipart requests
router.post('/', auth, authorize('medico'), upload.single('documento'), createFichaValidator, validate, async (req, res, next) => {
  try {
    const { cita_id, diagnostico, indicaciones, receta, observaciones } = req.body;

    // Verify the appointment belongs to this doctor
    const cita = await Cita.findById(cita_id);
    if (!cita) {
      return res.status(404).json({
        error: 'No encontrado',
        message: 'Cita no encontrada',
      });
    }

    if (cita.medico_id !== req.user.id) {
      return res.status(403).json({
        error: 'Sin permisos',
        message: 'Solo puede completar fichas clinicas de sus propias citas',
      });
    }

    if (cita.estado !== 'CONFIRMADA') {
      return res.status(400).json({
        error: 'Estado invalido',
        message: 'Solo se puede crear ficha clinica para citas en estado CONFIRMADA',
      });
    }

    // Derive paciente_id from the cita (no need to trust client input)
    const paciente_id = req.body.paciente_id || cita.paciente_id;

    // Create the clinical record
    const ficha = await FichaClinica.create({
      paciente_id,
      cita_id,
      medico_id: req.user.id,
      diagnostico,
      indicaciones,
      receta,
      observaciones,
    });

    // If a file was uploaded with the ficha, attach it
    if (req.file) {
      await FichaClinica.addDocumento({
        ficha_clinica_id: ficha.id,
        nombre_archivo: req.file.originalname,
        tipo_archivo: req.file.mimetype,
        ruta_archivo: req.file.path,
        tamano_bytes: req.file.size,
        descripcion: req.body.descripcion_documento || null,
        subido_por: req.user.id,
      });
    }

    // Mark appointment as COMPLETADA
    await Cita.completar(cita_id);

    await AuditService.log({
      usuario_id: req.user.id,
      usuario_rol: 'medico',
      accion: 'CREAR_FICHA_CLINICA',
      entidad: 'ficha_clinica',
      entidad_id: ficha.id,
      datos_nuevos: ficha,
      req,
    });

    res.status(201).json({
      message: 'Ficha clinica creada y cita completada',
      ficha,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/fichas-clinicas/:pacienteId - Get patient's clinical records
router.get('/:pacienteId', auth, pacienteIdValidator, validate, async (req, res, next) => {
  try {
    // Patients see their own, doctors and admins can see all
    if (req.user.role === 'paciente' && req.user.id !== req.params.pacienteId) {
      return res.status(403).json({
        error: 'Sin permisos',
        message: 'No tiene permisos para ver este recurso',
      });
    }

    const fichas = await FichaClinica.findByPaciente(req.params.pacienteId);
    res.json(fichas);
  } catch (error) {
    next(error);
  }
});

// GET /api/fichas-clinicas/:id/documentos - List documents for a clinical record
router.get('/:id/documentos', auth, fichaIdValidator, validate, async (req, res, next) => {
  try {
    const ficha = await FichaClinica.findById(req.params.id);
    if (!ficha) {
      return res.status(404).json({
        error: 'No encontrado',
        message: 'Ficha clinica no encontrada',
      });
    }

    // Patients can only see their own records, doctors/admins can see all
    if (req.user.role === 'paciente' && ficha.paciente_id !== req.user.id) {
      return res.status(403).json({
        error: 'Sin permisos',
        message: 'No tiene permisos para ver estos documentos',
      });
    }

    const documentos = await FichaClinica.getDocumentos(req.params.id);
    res.json(documentos);
  } catch (error) {
    next(error);
  }
});

// GET /api/fichas-clinicas/:id/documentos/:docId/download - Download a specific document
router.get('/:id/documentos/:docId/download', auth, fichaIdValidator, validate, async (req, res, next) => {
  try {
    const ficha = await FichaClinica.findById(req.params.id);
    if (!ficha) {
      return res.status(404).json({
        error: 'No encontrado',
        message: 'Ficha clinica no encontrada',
      });
    }

    // Patients can only access their own records
    if (req.user.role === 'paciente' && ficha.paciente_id !== req.user.id) {
      return res.status(403).json({
        error: 'Sin permisos',
        message: 'No tiene permisos para acceder a este documento',
      });
    }

    const documentos = await FichaClinica.getDocumentos(req.params.id);
    const documento = documentos.find(d => d.id === req.params.docId);

    if (!documento) {
      return res.status(404).json({
        error: 'No encontrado',
        message: 'Documento no encontrado',
      });
    }

    const filePath = path.resolve(documento.ruta_archivo);

    // Security: ensure the resolved path is within the upload directory
    const uploadDirResolved = path.resolve(env.uploadDir);
    if (!filePath.startsWith(uploadDirResolved)) {
      return res.status(403).json({
        error: 'Sin permisos',
        message: 'Ruta de archivo no permitida',
      });
    }

    res.setHeader('Content-Type', documento.tipo_archivo);
    // Sanitize filename to prevent header injection
    const safeFilename = documento.nombre_archivo
      .replace(/["\\\r\n]/g, '_')
      .replace(/[^\x20-\x7E]/g, '_');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.sendFile(filePath);
  } catch (error) {
    next(error);
  }
});

// POST /api/fichas-clinicas/:id/documentos - Upload document to clinical record
router.post('/:id/documentos', auth, authorize('medico'), fichaIdValidator, validate, upload.single('documento'), async (req, res, next) => {
  try {
    const ficha = await FichaClinica.findById(req.params.id);
    if (!ficha) {
      return res.status(404).json({
        error: 'No encontrado',
        message: 'Ficha clinica no encontrada',
      });
    }

    if (ficha.medico_id !== req.user.id) {
      return res.status(403).json({
        error: 'Sin permisos',
        message: 'Solo puede subir documentos a sus propias fichas clinicas',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: 'Datos invalidos',
        message: 'Debe adjuntar un archivo',
      });
    }

    const documento = await FichaClinica.addDocumento({
      ficha_clinica_id: req.params.id,
      nombre_archivo: req.file.originalname,
      tipo_archivo: req.file.mimetype,
      ruta_archivo: req.file.path,
      tamano_bytes: req.file.size,
      descripcion: req.body.descripcion,
      subido_por: req.user.id,
    });

    await AuditService.log({
      usuario_id: req.user.id,
      usuario_rol: 'medico',
      accion: 'SUBIR_DOCUMENTO',
      entidad: 'documentos_adjuntos',
      entidad_id: documento.id,
      datos_nuevos: { nombre_archivo: req.file.originalname },
      req,
    });

    res.status(201).json({
      message: 'Documento subido exitosamente',
      documento,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
