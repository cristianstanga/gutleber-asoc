import nodemailer from 'nodemailer'
import { logger } from '../index'

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const baseUrl = process.env.APP_URL || 'https://app.automatizapp.pro'
  const resetUrl = `${baseUrl}/reset-password?token=${token}`
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@gutleber.com.ar'

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    logger.warn(`📧 SMTP no configurado — token de reset para ${email}: ${token}`)
    return
  }

  const transporter = createTransport()

  await transporter.sendMail({
    from: `"Gutleber & Asoc." <${from}>`,
    to: email,
    subject: 'Recuperación de contraseña — Gutleber & Asoc.',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#1a1a2e;margin-bottom:8px">Recuperación de contraseña</h2>
        <p style="color:#555;margin-bottom:24px">
          Recibimos una solicitud para restablecer la contraseña de tu cuenta.
          Si no la solicitaste, podés ignorar este email.
        </p>
        <a href="${resetUrl}"
           style="display:inline-block;background:#1a1a2e;color:#fff;padding:12px 28px;
                  border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">
          Restablecer contraseña
        </a>
        <p style="color:#999;font-size:12px;margin-top:24px">
          El enlace expira en 1 hora.<br>
          Si el botón no funciona, copiá este enlace: ${resetUrl}
        </p>
        <hr style="border:none;border-top:1px solid #eee;margin-top:32px">
        <p style="color:#bbb;font-size:11px">Gutleber &amp; Asoc. · Posadas, Misiones</p>
      </div>
    `,
  })

  logger.info(`📧 Email de reset enviado a ${email}`)
}
