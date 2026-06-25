const nodemailer = require('nodemailer');

let transporter = null;

// Initialize the mailer synchronously to avoid race conditions
function initMailer() {
  const senderEmail = process.env.SENDER_EMAIL;
  const senderPassword = process.env.SENDER_APP_PASSWORD;

  if (!senderEmail || !senderPassword) {
    console.warn('⚠️ Server email credentials are not configured in environment variables.');
    return;
  }

  // Use SMTP provider from env or fallback to Gmail
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  
  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: senderEmail,
      pass: senderPassword,
    },
    // Add a 10 second timeout so it doesn't hang the server indefinitely if Render blocks the port
    connectionTimeout: 10000
  });
  console.log(`✅ Mailer initialized with SMTP Host: ${smtpHost}`);
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
    throw new Error('SMTP Error: Email credentials are not configured in environment variables. Check SENDER_EMAIL and SENDER_APP_PASSWORD.');
  }

  const senderEmail = process.env.SENDER_EMAIL;
  const fromAddress = process.env.SMTP_FROM || `"Travel Loyalty Team" <${senderEmail}>`;

  console.log(`⏳ Attempting to send email to ${to}...`);

  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      text,
      html: html || text, // Fallback to text if html is empty
    });

    console.log(`✅ Email sent successfully to ${to}`);
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   Provider Response: ${info.response}`);

    return { status: "success", message: "Email sent successfully", info };
  } catch (err) {
    console.error('❌ Error sending email:');
    console.error(`   Message: ${err.message}`);
    console.error(`   Stack: ${err.stack}`);
    
    if (err.responseCode === 535) {
      throw new Error('SMTP Authentication Error: Invalid credentials provided. Check your password/API Key.');
    }
    
    // Throw the raw error so the route can handle it
    throw err;
  }
}

module.exports = {
  sendEmail
};
