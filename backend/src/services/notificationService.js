const nodemailer = require('nodemailer');
const env = require('../config/env');

class NotificationService {
  static getTransporter() {
    return nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpPort === 465,
      auth: {
        user: env.smtpUser,
        pass: env.smtpPassword,
      },
    });
  }

  static async sendEmail({ to, subject, html, text }) {
    try {
      if (!env.smtpUser || env.nodeEnv === 'test') {
        console.log(`[Email] To: ${to}, Subject: ${subject}`);
        return { success: true, preview: true };
      }

      const transporter = NotificationService.getTransporter();
      const info = await transporter.sendMail({
        from: env.emailFrom,
        to,
        subject,
        html,
        text,
      });

      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Error sending email:', error.message);
      return { success: false, error: error.message };
    }
  }

  static async sendAppointmentConfirmation({ pacienteEmail, pacienteNombre, medicoNombre, fecha, hora, especialidad }) {
    const subject = 'Confirmacion de Cita Medica';
    const html = `
      <h2>Cita Confirmada</h2>
      <p>Hola ${pacienteNombre},</p>
      <p>Su cita ha sido confirmada con los siguientes detalles:</p>
      <ul>
        <li><strong>Medico:</strong> ${medicoNombre}</li>
        <li><strong>Especialidad:</strong> ${especialidad}</li>
        <li><strong>Fecha:</strong> ${fecha}</li>
        <li><strong>Hora:</strong> ${hora}</li>
      </ul>
      <p>Recuerde asistir puntualmente.</p>
      <p>Saludos,<br>Clinica Medica</p>
    `;

    return NotificationService.sendEmail({
      to: pacienteEmail,
      subject,
      html,
      text: `Cita confirmada: ${medicoNombre} - ${especialidad} - ${fecha} ${hora}`,
    });
  }

  static async sendAppointmentReminder({ pacienteEmail, pacienteNombre, medicoNombre, fecha, hora, especialidad }) {
    const subject = 'Recordatorio: Cita Medica en 24 horas';
    const html = `
      <h2>Recordatorio de Cita</h2>
      <p>Hola ${pacienteNombre},</p>
      <p>Le recordamos que tiene una cita programada para manana:</p>
      <ul>
        <li><strong>Medico:</strong> ${medicoNombre}</li>
        <li><strong>Especialidad:</strong> ${especialidad}</li>
        <li><strong>Fecha:</strong> ${fecha}</li>
        <li><strong>Hora:</strong> ${hora}</li>
      </ul>
      <p>Si necesita cancelar, hagalo con al menos 2 horas de anticipacion.</p>
      <p>Saludos,<br>Clinica Medica</p>
    `;

    return NotificationService.sendEmail({
      to: pacienteEmail,
      subject,
      html,
      text: `Recordatorio de cita: ${medicoNombre} - ${especialidad} - ${fecha} ${hora}`,
    });
  }

  static async sendCancellationNotification({ pacienteEmail, pacienteNombre, medicoNombre, fecha, hora, motivo }) {
    const subject = 'Cita Medica Cancelada';
    const html = `
      <h2>Cita Cancelada</h2>
      <p>Hola ${pacienteNombre},</p>
      <p>Lamentamos informarle que su cita ha sido cancelada por la administracion:</p>
      <ul>
        <li><strong>Medico:</strong> ${medicoNombre}</li>
        <li><strong>Fecha:</strong> ${fecha}</li>
        <li><strong>Hora:</strong> ${hora}</li>
        <li><strong>Motivo:</strong> ${motivo || 'Emergencia'}</li>
      </ul>
      <p>Por favor, agende una nueva cita a su conveniencia.</p>
      <p>Disculpe las molestias.</p>
      <p>Saludos,<br>Clinica Medica</p>
    `;

    return NotificationService.sendEmail({
      to: pacienteEmail,
      subject,
      html,
      text: `Cita cancelada: ${medicoNombre} - ${fecha} ${hora}. Motivo: ${motivo || 'Emergencia'}`,
    });
  }

  static async sendEmailVerification({ email, nombre, token }) {
    const subject = 'Verifique su email - Clinica Medica';
    const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${token}`;
    const html = `
      <h2>Verificacion de Email</h2>
      <p>Hola ${nombre},</p>
      <p>Gracias por registrarse. Por favor verifique su email haciendo clic en el siguiente enlace:</p>
      <p><a href="${verifyUrl}">Verificar Email</a></p>
      <p>O copie y pegue este enlace en su navegador:</p>
      <p>${verifyUrl}</p>
      <p>Este enlace expira en 24 horas.</p>
      <p>Saludos,<br>Clinica Medica</p>
    `;

    return NotificationService.sendEmail({
      to: email,
      subject,
      html,
      text: `Verifique su email: ${verifyUrl}`,
    });
  }
}

module.exports = NotificationService;
