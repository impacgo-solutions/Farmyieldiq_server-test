import nodemailer from 'nodemailer';
import geoip from 'geoip-lite';

export const mailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export function sendSignupNotification({ name, email, organization_name, req }) {
  const clientIp = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  const geo = geoip.lookup(clientIp);
  const location = geo
    ? `${geo.city || ''}, ${geo.region || ''}, ${geo.country || ''}`.replace(/^,\s*|,\s*,/g, '')
    : 'Unknown';

  const html = `
    <h3>New Farmyieldiq Trial Signup</h3>
    <p><b>Organization:</b> ${organization_name}</p>
    <p><b>Name:</b> ${name}</p>
    <p><b>Email:</b> ${email}</p>
    <p><b>IP Address:</b> ${clientIp || 'Unknown'}</p>
    <p><b>Location:</b> ${location}</p>
  `;

  mailTransporter.sendMail({
    from: process.env.SMTP_USER,
    to: process.env.NOTIFY_EMAIL,
    subject: `New Trial Signup: ${organization_name}`,
    html,
  }).catch(err => console.error('Signup email notification failed:', err.message));
}
