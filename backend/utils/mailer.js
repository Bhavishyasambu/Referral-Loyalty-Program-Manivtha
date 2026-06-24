const nodemailer = require('nodemailer');

const dns = require('dns').promises;

let transporter = null;

// Initialize the mailer asynchronously
async function initMailer() {
  const senderEmail = process.env.SENDER_EMAIL;
  const senderPassword = process.env.SENDER_APP_PASSWORD;

  if (!senderEmail || !senderPassword) {
    console.warn('⚠️ Server email credentials are not configured in environment variables.');
    return;
  }

  let smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';

  try {
    // Manually force DNS resolution to strictly IPv4 to bypass Render's IPv6 ENETUNREACH issues
    const { address } = await dns.lookup(smtpHost, { family: 4 });
    smtpHost = address;
    console.log(`✅ SMTP Host resolved to IPv4: ${smtpHost}`);
  } catch (err) {
    console.warn(`⚠️ Failed to resolve IPv4 for ${smtpHost}, falling back to default.`);
  }

  // Use SMTP provider from env or fallback to Gmail
  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: senderEmail,
      pass: senderPassword,
    },
    tls: {
      rejectUnauthorized: false,
      servername: process.env.SMTP_HOST || 'smtp.gmail.com' // Ensure SNI matches the hostname, not the raw IP
    },
    // Add a 10 second timeout so it doesn't hang the server indefinitely if Render blocks the port
    connectionTimeout: 10000
  });
  console.log('✅ Mailer initialized with real Gmail SMTP credentials.');
}

// Call init on module load
initMailer().catch(err => console.error("Mailer init failed:", err));

/**
 * Send an email using Nodemailer.
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} text - Plaintext body
 * @param {string} html - HTML body (optional)
 */
async function sendEmail(to, subject, text, html = '') {
  if (!transporter) {
    throw new Error('SMTP Connection Error: Server email credentials are not configured in environment variables.');
  }

  const senderEmail = process.env.SENDER_EMAIL;
  const fromAddress = process.env.SMTP_FROM || `"Travel Loyalty Team" <${senderEmail}>`;

  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      text,
      html: html || text, // Fallback to text if html is empty
    });

    console.log(`📧 Email sent successfully to ${to}`);
    console.log(`   Message ID: ${info.messageId}`);
    
    // If using Ethereal, log the URL to view the email
    if (process.env.SMTP_HOST === 'smtp.ethereal.email') {
      console.log(`   Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    }

    return { status: "success", message: "Email sent successfully" };
  } catch (err) {
    console.error('❌ Error sending email:', err);
    if (err.responseCode === 535) {
      throw new Error('SMTP Authentication Error: Invalid Gmail credentials or App Password not configured.');
    }
    throw new Error(`An unexpected error occurred while sending email: ${err.message}`);
  }
}

module.exports = {
  sendEmail
};
