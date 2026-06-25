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
    const { friendEmail, referralCode } = req.body;

    if (!friendEmail || !referralCode) {
      return res.status(400).json({ message: 'Friend email and referral code are required.' });
    }

    // Note: We'll use standard environment variables for Vercel
    const senderEmail = process.env.VITE_GMAIL_USER || process.env.GMAIL_USER;
    const senderPassword = process.env.VITE_GMAIL_PASS || process.env.GMAIL_PASS;

    if (!senderEmail || !senderPassword) {
      console.error('Server email credentials are not configured.');
      return res.status(500).json({ message: 'Server email credentials are not configured.' });
    }

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465, // 465 is the secure port for Gmail
      secure: true,
      auth: {
        user: senderEmail,
        pass: senderPassword,
      },
    });

    const emailHtml = `
      <h2>You've been invited to Travel Rewards!</h2>
      <p>Your friend has invited you to join our loyalty program.</p>
      <p>Use their referral code <strong>${referralCode}</strong> during registration to get a 100-point head start on your first booking!</p>
    `;

    console.log(`Sending email to ${friendEmail} via Gmail SMTP...`);

    const info = await transporter.sendMail({
      from: `"Travel Loyalty Team" <${senderEmail}>`,
      to: friendEmail,
      subject: 'Invitation to Travel Rewards',
      html: emailHtml,
    });

    console.log('Email sent successfully:', info.messageId);

    return res.status(200).json({
      message: \`Invitation sent successfully to \${friendEmail}!\`,
    });
  } catch (error) {
    console.error('Email send error:', error);
    return res.status(500).json({
      message: 'Server error sending invitation.',
      error: error.message,
    });
  }
}
