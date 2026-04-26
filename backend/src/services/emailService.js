import nodemailer from 'nodemailer';
import { config } from '../config.js';

let transporter = null;

function getTransporter() {
  if (!config.smtp.enabled) return null;
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.port === 465,
    auth: { user: config.smtp.user, pass: config.smtp.pass },
  });
  return transporter;
}

export async function sendEmail({ to, subject, text, html }) {
  const t = getTransporter();
  if (!t) {
    console.log(`[email-stub] naar=${to} onderwerp="${subject}"`);
    return;
  }
  try {
    await t.sendMail({ from: config.smtp.from, to, subject, text, html });
  } catch (err) {
    console.error('e-mail verzenden mislukt:', err.message);
  }
}
