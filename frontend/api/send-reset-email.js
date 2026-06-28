import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { userEmail, resetHtml } = req.body;

    if (!userEmail || !resetHtml) {
      return res.status(400).json({ message: 'User email and reset HTML are required.' });
    }

    const senderEmail = process.env.VITE_GMAIL_USER || process.env.GMAIL_USER;
    const senderPassword = process.env.VITE_GMAIL_PASS || process.env.GMAIL_PASS;

    if (!senderEmail || !senderPassword) {
      console.error('Server email credentials are not configured.');
      return res.status(500).json({ message: 'Server email credentials are not configured.' });
    }

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: senderEmail,
        pass: senderPassword,
      },
    });

    console.log(`Sending password reset email to ${userEmail} via Gmail SMTP...`);

    const info = await transporter.sendMail({
      from: `"Travel Loyalty Team" <${senderEmail}>`,
      to: userEmail,
      subject: 'Password Reset - Travel Rewards',
      html: resetHtml,
    });

    console.log('Password reset email sent successfully:', info.messageId);

    return res.status(200).json({
      message: `Password reset email sent successfully to ${userEmail}!`,
    });
  } catch (error) {
    console.error('Password reset email send error:', error);
    return res.status(500).json({
      message: 'Server error sending password reset email.',
      error: error.message,
    });
  }
}
