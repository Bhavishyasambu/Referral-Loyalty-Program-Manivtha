const express = require('express');
const router = express.Router();
const { verifyAdmin } = require('../middleware/auth');

// POST /api/messaging/send - Mocked WhatsApp / Email Sending
router.post('/send', verifyAdmin, async (req, res) => {
  try {
    const { to, type, message, subject } = req.body;

    if (!to || !type || !message) {
      return res.status(400).json({ message: 'Missing required fields (to, type, message).' });
    }

    // Simulate sending email via nodemailer or whatsapp via twilio
    console.log('----------------------------------------------------');
    console.log(`🚀 [MOCK MESSAGING SERVICE] Sending ${type.toUpperCase()}...`);
    console.log(`To: ${to}`);
    if (subject) console.log(`Subject: ${subject}`);
    console.log(`Message: ${message}`);
    console.log('----------------------------------------------------');

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    return res.json({ message: `${type} message successfully sent to ${to}.` });
  } catch (err) {
    console.error('Messaging error:', err);
    return res.status(500).json({ message: 'Server error sending message.', error: err.message });
  }
});

module.exports = router;
