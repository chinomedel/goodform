import nodemailer from 'nodemailer';
import { storage } from './storage';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const smtpConfig = await storage.getSmtpConfig();
    const credentials = await storage.getDecryptedSmtpCredentials();

    // Validate SMTP configuration
    if (!smtpConfig.host || !smtpConfig.fromEmail) {
      console.error('SMTP configuration is incomplete');
      return false;
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      auth: credentials.user && credentials.password ? {
        user: credentials.user,
        pass: credentials.password,
      } : undefined,
    });

    // Send email
    await transporter.sendMail({
      from: smtpConfig.fromName 
        ? `"${smtpConfig.fromName}" <${smtpConfig.fromEmail}>`
        : smtpConfig.fromEmail,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

export function generatePasswordResetEmail(resetLink: string, appName: string = 'GoodForm'): { html: string; text: string } {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Restablecer contraseña</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <tr>
                <td style="padding: 40px 40px 20px 40px; text-align: center;">
                  <h1 style="margin: 0; color: #1f2937; font-size: 24px; font-weight: 600;">
                    Restablecer contraseña
                  </h1>
                </td>
              </tr>
              <tr>
                <td style="padding: 0 40px 20px 40px;">
                  <p style="margin: 0 0 20px 0; color: #6b7280; font-size: 16px; line-height: 1.5;">
                    Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en ${appName}.
                  </p>
                  <p style="margin: 0 0 30px 0; color: #6b7280; font-size: 16px; line-height: 1.5;">
                    Haz clic en el botón de abajo para crear una nueva contraseña:
                  </p>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetLink}" 
                       style="display: inline-block; padding: 14px 32px; background-color: #f97316; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 16px;">
                      Restablecer contraseña
                    </a>
                  </div>
                  <p style="margin: 30px 0 10px 0; color: #6b7280; font-size: 14px; line-height: 1.5;">
                    O copia y pega este enlace en tu navegador:
                  </p>
                  <p style="margin: 0 0 20px 0; color: #9ca3af; font-size: 14px; word-break: break-all;">
                    ${resetLink}
                  </p>
                  <p style="margin: 20px 0 0 0; color: #9ca3af; font-size: 14px; line-height: 1.5;">
                    Este enlace expirará en 1 hora por razones de seguridad.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding: 20px 40px 40px 40px; border-top: 1px solid #e5e7eb;">
                  <p style="margin: 0; color: #9ca3af; font-size: 14px; line-height: 1.5;">
                    Si no solicitaste este cambio de contraseña, puedes ignorar este correo de forma segura.
                  </p>
                </td>
              </tr>
            </table>
            <p style="margin: 20px 0 0 0; color: #9ca3af; font-size: 12px; text-align: center;">
              © ${new Date().getFullYear()} ${appName}. Todos los derechos reservados.
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const text = `
Restablecer contraseña

Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en ${appName}.

Para crear una nueva contraseña, visita el siguiente enlace:
${resetLink}

Este enlace expirará en 1 hora por razones de seguridad.

Si no solicitaste este cambio de contraseña, puedes ignorar este correo de forma segura.

© ${new Date().getFullYear()} ${appName}. Todos los derechos reservados.
  `.trim();

  return { html, text };
}
