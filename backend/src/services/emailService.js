import nodemailer from 'nodemailer';
import logger from './loggerService.js';

let transporter = null;

function initializeEmailService() {
  const emailConfig = {
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  };

  if (process.env.NODE_ENV === 'development' && !process.env.SMTP_HOST) {
    logger.info('Using development email service (logs only)');
    return null;
  }

  try {
    transporter = nodemailer.createTransporter(emailConfig);
    logger.info('Email service initialized', {
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
    });
  } catch (error) {
    logger.error('Failed to initialize email service', {
      error: error.message,
    });
  }

  return transporter;
}

export async function sendEmail(to, subject, html, text = null) {
  try {
    if (!transporter && process.env.NODE_ENV !== 'development') {
      transporter = initializeEmailService();
    }

    const fromEmail = process.env.SMTP_FROM || 'noreply@walletrix.com';
    const fromName = process.env.SMTP_FROM_NAME || 'Walletrix';

    const mailOptions = {
      from: `${fromName} <${fromEmail}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''),
    };

    if (process.env.NODE_ENV === 'development' && !transporter) {
      logger.info('Email (Development Mode)', {
        to,
        subject,
        html: html.substring(0, 200) + '...',
      });
      return { success: true, messageId: 'dev-' + Date.now() };
    }

    if (!transporter) {
      throw new Error('Email service not configured');
    }

    const info = await transporter.sendMail(mailOptions);

    logger.info('Email sent successfully', {
      to,
      subject,
      messageId: info.messageId,
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error('Failed to send email', {
      error: error.message,
      to,
      subject,
    });
    return { success: false, error: error.message };
  }
}

export async function send2FASetupEmail(email, method) {
  const subject = 'Walletrix: Two-Factor Authentication Enabled';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Two-Factor Authentication Enabled</h2>
      <p>Two-factor authentication has been successfully enabled on your Walletrix account using <strong>${method.toUpperCase()}</strong>.</p>

      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #28a745;">✓ Your account is now more secure</h3>
        <p>You'll be prompted for a verification code when signing in from a new device.</p>
      </div>

      <h3>Important Reminders:</h3>
      <ul>
        <li>Keep your backup codes in a safe place</li>
        <li>Don't share your verification codes with anyone</li>
        <li>Contact support if you lose access to your 2FA device</li>
      </ul>

      <p>If you didn't enable 2FA, please secure your account immediately by changing your password.</p>

      <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
      <p style="color: #666; font-size: 12px;">
        This email was sent to ${email}. If you have questions, contact our support team.
      </p>
    </div>
  `;

  return await sendEmail(email, subject, html);
}

export async function sendBackupCodesEmail(email, codes) {
  const subject = 'Walletrix: Your Backup Codes';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Your Backup Codes</h2>
      <p>Here are your backup codes for Walletrix two-factor authentication:</p>

      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; font-family: monospace;">
        ${codes.map(code => `<div style="padding: 5px 0; font-size: 16px; font-weight: bold;">${code}</div>`).join('')}
      </div>

      <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #856404;">⚠️ Important Security Information</h3>
        <ul style="margin: 0;">
          <li>Each code can only be used once</li>
          <li>Store these codes in a secure location</li>
          <li>Don't share these codes with anyone</li>
          <li>Generate new codes if you suspect they're compromised</li>
        </ul>
      </div>

      <p>Use these codes if you lose access to your primary 2FA device.</p>

      <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
      <p style="color: #666; font-size: 12px;">
        This email was sent to ${email}. Delete this email after saving the codes securely.
      </p>
    </div>
  `;

  return await sendEmail(email, subject, html);
}

export async function sendSecurityAlertEmail(email, event, details) {
  const subject = `Walletrix: Security Alert - ${event}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc3545;">🔒 Security Alert</h2>
      <p>We detected a security event on your Walletrix account:</p>

      <div style="background: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #721c24;">${event}</h3>
        <p style="margin-bottom: 0;">${details}</p>
      </div>

      <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>

      <h3>What to do:</h3>
      <ul>
        <li>Change your password if you don't recognize this activity</li>
        <li>Enable two-factor authentication if you haven't already</li>
        <li>Review your account settings for any unauthorized changes</li>
        <li>Contact support if you need assistance</li>
      </ul>

      <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
      <p style="color: #666; font-size: 12px;">
        This email was sent to ${email} for security purposes.
      </p>
    </div>
  `;

  return await sendEmail(email, subject, html);
}

initializeEmailService();

export default {
  sendEmail,
  send2FASetupEmail,
  sendBackupCodesEmail,
  sendSecurityAlertEmail,
};
