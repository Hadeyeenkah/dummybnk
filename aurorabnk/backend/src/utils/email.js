const nodemailer = require('nodemailer');

const smtpHost = process.env.SMTP_HOST || process.env.EMAIL_HOST;
const smtpPort = Number(process.env.SMTP_PORT || 587);
const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER;
const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
const emailFrom = process.env.EMAIL_FROM || smtpUser || 'no-reply@aurorabank.com';

const hasSmtpConfig = Boolean(smtpHost && smtpUser && smtpPass);

const createSmtpTransporter = () => {
  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
};

const sendMail = async ({ to, subject, text, html }) => {
  // If SMTP is configured, use it.
  if (hasSmtpConfig) {
    const transporter = createSmtpTransporter();
    await transporter.sendMail({
      from: emailFrom,
      to,
      subject,
      text,
      html,
    });
    return true;
  }

  // No SMTP configured — create an Ethereal test account and send a preview email.
  try {
    const testAccount = await nodemailer.createTestAccount();
    const transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });

    const info = await transporter.sendMail({
      from: emailFrom || testAccount.user,
      to,
      subject,
      text,
      html,
    });

    const preview = nodemailer.getTestMessageUrl(info);
    console.log(`[EMAIL - ETHEREAL PREVIEW] ${subject} -> ${to}`);
    if (text) console.log(text);
    if (preview) console.log('Preview URL:', preview);
    console.log('Ethereal account (for debugging):', testAccount.user, testAccount.pass);

    return true;
  } catch (err) {
    console.error('Failed to send email (no SMTP configured):', err);
    return false;
  }
};

exports.sendVerificationEmail = async (email, link) => {
  return sendMail({
    to: email,
    subject: 'Verify your Aurora Bank account',
    text: `Verify your Aurora Bank account: ${link}`,
    html: `<p>Verify your Aurora Bank account:</p><p><a href="${link}">${link}</a></p>`,
  });
};

exports.sendPasswordResetEmail = async (email, resetLink, firstName) => {
  return sendMail({
    to: email,
    subject: 'Reset your Aurora Bank password',
    text: `Hello ${firstName}, reset your password here: ${resetLink}`,
    html: `<p>Hello ${firstName},</p><p>Reset your password here:</p><p><a href="${resetLink}">${resetLink}</a></p>`,
  });
};

exports.sendNotificationEmail = async (email, subject, message) => {
  return sendMail({
    to: email,
    subject: subject || 'New Aurora Bank notification',
    text: message,
    html: `<p>${String(message || '').replace(/\n/g, '<br />')}</p>`,
  });
};
