const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { verifyToken } = require('../middleware/auth');
const { sendEmail } = require('../utils/mailer');

// Helper to generate a unique referral code
function generateReferralCode(name) {
  const prefix = 'TRV';
  const cleanName = name.replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase();
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${cleanName}${randomNum}`;
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { email, password, name, phone, referralCodeUsed } = req.body;

  if (!email || !password || !name || !phone) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters.' });
  }

  try {
    // Check if user already exists
    const userExists = await db.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ message: 'User with this email already exists.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Generate unique referral code for new customer
    let newReferralCode = generateReferralCode(name);
    let codeConflict = await db.query('SELECT id FROM customers WHERE referral_code = $1', [newReferralCode]);

    // Regenerate in the rare case of conflict
    while (codeConflict.rows.length > 0) {
      newReferralCode = generateReferralCode(name);
      codeConflict = await db.query('SELECT id FROM customers WHERE referral_code = $1', [newReferralCode]);
    }

    // Check if referred by someone — always normalize to uppercase
    let referrerId = null;
    let refereeSignupBonus = 100; // default bonus points for referee
    let referrerCodeRecord = null;

    if (referralCodeUsed && referralCodeUsed.trim() !== '') {
      const normalizedCode = referralCodeUsed.trim().toUpperCase();

      // Prevent using own referral code (can't self-refer)
      if (normalizedCode === newReferralCode) {
        return res.status(400).json({ message: 'You cannot use your own referral code.' });
      }

      const referrerQuery = await db.query(
        'SELECT id, user_id FROM customers WHERE referral_code = $1',
        [normalizedCode]
      );
      if (referrerQuery.rows.length > 0) {
        referrerCodeRecord = referrerQuery.rows[0];
        referrerId = referrerCodeRecord.id;
      } else {
        return res.status(400).json({ message: 'Invalid referral code. Please check and try again.' });
      }
    }

    // Insert user
    await db.query(
      'INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4)',
      [email.toLowerCase().trim(), passwordHash, name.trim(), 'customer']
    );

    // Get the newly inserted user ID
    const userQuery = await db.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    const userId = userQuery.rows[0].id;

    // Award signup bonus points if referred
    const initialPoints = referrerId ? refereeSignupBonus : 0;

    // Insert customer profile
    await db.query(
      'INSERT INTO customers (user_id, phone, referral_code, referred_by_id, loyalty_points, tier, total_spent) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [userId, phone.trim(), newReferralCode, referrerId, initialPoints, 'Bronze', 0.00]
    );

    const customerQuery = await db.query('SELECT id FROM customers WHERE user_id = $1', [userId]);
    const customerId = customerQuery.rows[0].id;

    // Create notifications and referral records if referred
    if (referrerId && referrerCodeRecord) {
      // Create Referral entry
      await db.query(
        'INSERT INTO referrals (referrer_id, referee_id, code_used, status, reward_points_referrer, reward_points_referee) VALUES ($1, $2, $3, $4, $5, $6)',
        [referrerId, customerId, referralCodeUsed.trim().toUpperCase(), 'Pending', 250, refereeSignupBonus]
      );

      // Notify Referee
      await db.query(
        'INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)',
        [userId, 'Referral Bonus Applied!', `Welcome! You earned ${refereeSignupBonus} bonus points for signing up via referral.`, 'Referral']
      );

      // Notify Referrer
      await db.query(
        'INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)',
        [referrerCodeRecord.user_id, 'New Referral Signup!', `${name.trim()} signed up using your referral code. You will receive 250 loyalty points once they complete their first trip!`, 'Referral']
      );
    }

    // Create a general welcome notification
    await db.query(
      'INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)',
      [userId, 'Welcome to Travel Rewards!', `Thank you for joining our Referral & Loyalty Program. Your referral code is ${newReferralCode}. Start booking trips to earn points!`, 'System']
    );

    // Send Welcome Email in the background so it doesn't block registration
    const welcomeHtml = `
      <h2>Welcome to Travel Rewards, ${name.trim()}!</h2>
      <p>We are thrilled to have you join our Referral & Loyalty Program.</p>
      <p>Your unique referral code is: <strong>${newReferralCode}</strong></p>
      <p>Share this code with your friends! When they book their first trip, you will earn 250 loyalty points, and they will get a 100 point head start.</p>
      <br/>
      <p>Safe travels,</p>
      <p>The Travel Loyalty Team</p>
    `;
    
    try {
      await sendEmail(email.toLowerCase().trim(), 'Welcome to Travel Rewards!', '', welcomeHtml);
    } catch (emailErr) {
      console.error('Welcome email failed, but registration will continue:', emailErr.message);
    }

    return res.status(201).json({
      message: 'User registered successfully!',
      referralCode: newReferralCode
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ message: err.message || 'Server error during registration.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    // Check if user exists (case-insensitive)
    const userQuery = await db.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (userQuery.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    const user = userQuery.rows[0];

    // Check password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    // Fetch customer details if they are a customer
    let customerDetails = null;
    if (user.role === 'customer') {
      const custQuery = await db.query('SELECT * FROM customers WHERE user_id = $1', [user.id]);
      if (custQuery.rows.length > 0) {
        customerDetails = custQuery.rows[0];
      }
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET || 'travel_loyalty_super_secret_key_123!',
      { expiresIn: '24h' }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      customer: customerDetails
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Server error during login.', error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', verifyToken, async (req, res) => {
  try {
    const userQuery = await db.query('SELECT id, email, name, role, created_at FROM users WHERE id = $1', [req.user.id]);
    if (userQuery.rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const user = userQuery.rows[0];
    let customer = null;

    if (user.role === 'customer') {
      const custQuery = await db.query('SELECT * FROM customers WHERE user_id = $1', [user.id]);
      if (custQuery.rows.length > 0) {
        customer = custQuery.rows[0];
      }
    }

    return res.json({ user, customer });
  } catch (err) {
    console.error('Get profile error:', err);
    return res.status(500).json({ message: 'Server error retrieving user profile.', error: err.message });
  }
});

// PUT /api/auth/profile
router.put('/profile', verifyToken, async (req, res) => {
  const { name, phone } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Name is required.' });
  }

  try {
    // Update name in users table
    await db.query('UPDATE users SET name = $1 WHERE id = $2', [name.trim(), req.user.id]);

    // Update phone in customers table if user is a customer
    if (req.user.role === 'customer' && phone !== undefined) {
      await db.query('UPDATE customers SET phone = $1 WHERE user_id = $2', [phone.trim(), req.user.id]);
    }

    // Fetch updated user
    const userQuery = await db.query('SELECT id, email, name, role, created_at FROM users WHERE id = $1', [req.user.id]);
    const user = userQuery.rows[0];
    let customer = null;

    if (user.role === 'customer') {
      const custQuery = await db.query('SELECT * FROM customers WHERE user_id = $1', [user.id]);
      if (custQuery.rows.length > 0) {
        customer = custQuery.rows[0];
      }
    }

    return res.json({ message: 'Profile updated successfully', user, customer });
  } catch (err) {
    console.error('Update profile error:', err);
    return res.status(500).json({ message: 'Server error updating user profile.', error: err.message });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: 'Email is required.' });
  }

  try {
    const userQuery = await db.query('SELECT id, email, name, password_hash FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (userQuery.rows.length === 0) {
      // Return 200 even if user not found to prevent email enumeration
      return res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
    }

    const user = userQuery.rows[0];
    
    // Create a one-time use token utilizing the current password hash
    const secret = (process.env.JWT_SECRET || 'travel_loyalty_super_secret_key_123!') + user.password_hash;
    const token = jwt.sign({ id: user.id, email: user.email }, secret, { expiresIn: '1h' });

    // Dynamically get the frontend URL from the request headers so it works on Vercel automatically
    const frontendUrl = req.headers.origin || process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetLink = `${frontendUrl}/?resetToken=${token}&userId=${user.id}`;

    const resetHtml = `
      <h2>Password Reset Request</h2>
      <p>Hi ${user.name},</p>
      <p>We received a request to reset the password for your Travel Rewards account.</p>
      <p>Click the link below to set a new password. This link will expire in 1 hour.</p>
      <a href="${resetLink}" style="display: inline-block; padding: 10px 20px; background-color: #059669; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
      <p>If you did not request this, you can safely ignore this email.</p>
    `;

    console.log('\n--- DEVELOPMENT RESET LINK ---');
    console.log(resetLink);
    console.log('------------------------------\n');

    try {
      // Forward the email request to the Vercel Serverless Function to bypass local SMTP issues
      const emailRes = await fetch(`${frontendUrl}/api/send-reset-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userEmail: user.email, resetHtml })
      });
      
      if (!emailRes.ok) {
        throw new Error('Vercel API returned an error status.');
      }
    } catch (emailErr) {
      console.error('Password reset email via Vercel failed (you can use the link above to test):', emailErr.message);
      // We don't return 500 here so local testing can continue
    }

    return res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ message: 'Server error processing request.' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { userId, token, newPassword } = req.body;

  if (!userId || !token || !newPassword) {
    return res.status(400).json({ message: 'User ID, token, and new password are required.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters.' });
  }

  try {
    const userQuery = await db.query('SELECT id, email, password_hash FROM users WHERE id = $1', [userId]);
    if (userQuery.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired reset token.' });
    }

    const user = userQuery.rows[0];
    const secret = (process.env.JWT_SECRET || 'travel_loyalty_super_secret_key_123!') + user.password_hash;

    try {
      jwt.verify(token, secret);
    } catch (jwtErr) {
      return res.status(400).json({ message: 'Invalid or expired reset token.' });
    }

    // Token is valid, hash new password
    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    // Update password in db
    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newPasswordHash, user.id]);

    return res.json({ message: 'Password has been reset successfully. You can now log in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ message: 'Server error during password reset.' });
  }
});

module.exports = router;
