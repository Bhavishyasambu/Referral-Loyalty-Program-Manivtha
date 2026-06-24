const nodemailer = require('nodemailer');

let transporter = null;

// Initialize the mailer asynchronously
function initMailer() {
  const senderEmail = process.env.SENDER_EMAIL;
  const senderPassword = process.env.SENDER_APP_PASSWORD;

  if (!senderEmail || !senderPassword) {
    console.warn('⚠️ Server email credentials are not configured in environment variables.');
    return;
  }

  // Use SMTP provider from env or fallback to Gmail
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: senderEmail,
      pass: senderPassword,
    },
    tls: {
      rejectUnauthorized: false
    },
    // Force Node's net module to use IPv4 instead of IPv6
    family: 4
  });
  console.log('✅ Mailer initialized with real Gmail SMTP credentials.');
}

// Call init on module load
initMailer();

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
