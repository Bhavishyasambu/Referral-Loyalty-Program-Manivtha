const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const { sendEmail } = require('../utils/mailer');

// POST /api/referrals/invite - Send invite email (mock)
router.post('/invite', verifyToken, async (req, res) => {
  const { friendEmail } = req.body;
  if (!friendEmail) {
    return res.status(400).json({ message: 'Friend email is required.' });
  }

  // Get referrer's code
  try {
    const customerRes = await db.query('SELECT referral_code FROM customers WHERE user_id = $1', [req.user.id]);
    if (customerRes.rows.length === 0) {
      return res.status(404).json({ message: 'Customer profile not found.' });
    }
    const referralCode = customerRes.rows[0].referral_code;
    
    // In a real system, we'd send an email here.
    const emailHtml = `
      <h2>You've been invited to Travel Rewards!</h2>
      <p>Your friend has invited you to join our loyalty program.</p>
      <p>Use their referral code <strong>${referralCode}</strong> during registration to get a 100-point head start on your first booking!</p>
    `;
    await sendEmail(friendEmail, 'Invitation to Travel Rewards', '', emailHtml);

    return res.json({
      message: `Invitation sent successfully to ${friendEmail}! They can use your code ${referralCode} when registering.`
    });
  } catch (err) {
    console.error('Invite error:', err);
    return res.status(500).json({ message: err.message || 'Server error sending invitation.' });
  }
});

// GET /api/referrals/stats - Referral summary for current user
router.get('/stats', verifyToken, async (req, res) => {
  try {
    // Get customer profile
    const customerRes = await db.query('SELECT id, referral_code FROM customers WHERE user_id = $1', [req.user.id]);
    if (customerRes.rows.length === 0) {
      return res.status(404).json({ message: 'Customer profile not found.' });
    }
    const customerId = customerRes.rows[0].id;
    const referralCode = customerRes.rows[0].referral_code;

    // Get stats
    const statsQuery = await db.query(
      `SELECT 
        COUNT(*) as total_referrals,
        SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed_referrals,
        SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending_referrals,
        SUM(CASE WHEN status = 'Completed' THEN reward_points_referrer ELSE 0 END) as points_earned
       FROM referrals 
       WHERE referrer_id = $1`,
      [customerId]
    );

    const stats = statsQuery.rows[0];

    return res.json({
      referralCode,
      totalReferrals: parseInt(stats.total_referrals || 0),
      completedReferrals: parseInt(stats.completed_referrals || 0),
      pendingReferrals: parseInt(stats.pending_referrals || 0),
      pointsEarned: parseInt(stats.points_earned || 0)
    });
  } catch (err) {
    console.error('Get referral stats error:', err);
    return res.status(500).json({ message: 'Server error retrieving referral stats.', error: err.message });
  }
});

// GET /api/referrals/list - List of people referred by current user
router.get('/list', verifyToken, async (req, res) => {
  try {
    const customerRes = await db.query('SELECT id FROM customers WHERE user_id = $1', [req.user.id]);
    if (customerRes.rows.length === 0) {
      return res.status(404).json({ message: 'Customer profile not found.' });
    }
    const customerId = customerRes.rows[0].id;

    // List referred users (referees)
    const listQuery = await db.query(
      `SELECT r.id, r.status, r.created_at as referral_date, 
              r.reward_points_referrer, r.reward_points_referee,
              u.name as referee_name, u.email as referee_email, c.tier as referee_tier
       FROM referrals r
       JOIN customers c ON r.referee_id = c.id
       JOIN users u ON c.user_id = u.id
       WHERE r.referrer_id = $1
       ORDER BY r.created_at DESC`,
      [customerId]
    );

    return res.json(listQuery.rows);
  } catch (err) {
    console.error('Get referrals list error:', err);
    return res.status(500).json({ message: 'Server error retrieving referrals list.', error: err.message });
  }
});

// GET /api/referrals/history - Full referral reward audit history for current user
router.get('/history', verifyToken, async (req, res) => {
  try {
    const customerRes = await db.query('SELECT id FROM customers WHERE user_id = $1', [req.user.id]);
    if (customerRes.rows.length === 0) {
      return res.status(404).json({ message: 'Customer profile not found.' });
    }
    const customerId = customerRes.rows[0].id;

    // Points earned as referrer (from completed referrals)
    const referrerHistory = await db.query(
      `SELECT 
        'Referral Reward' as event_type,
        'Earned' as direction,
        r.reward_points_referrer as points,
        u.name as other_party_name,
        u.email as other_party_email,
        r.status,
        r.created_at as event_date
       FROM referrals r
       JOIN customers c ON r.referee_id = c.id
       JOIN users u ON c.user_id = u.id
       WHERE r.referrer_id = $1 AND r.status = 'Completed'
       ORDER BY r.created_at DESC`,
      [customerId]
    );

    // Points earned as referee (signup bonus)
    const refereeHistory = await db.query(
      `SELECT 
        'Signup Bonus' as event_type,
        'Earned' as direction,
        r.reward_points_referee as points,
        u.name as other_party_name,
        u.email as other_party_email,
        r.status,
        r.created_at as event_date
       FROM referrals r
       JOIN customers c ON r.referrer_id = c.id
       JOIN users u ON c.user_id = u.id
       WHERE r.referee_id = $1
       ORDER BY r.created_at DESC`,
      [customerId]
    );

    const combined = [
      ...referrerHistory.rows.map(r => ({ ...r, points: parseInt(r.points) })),
      ...refereeHistory.rows.map(r => ({ ...r, points: parseInt(r.points) }))
    ].sort((a, b) => new Date(b.event_date) - new Date(a.event_date));

    return res.json(combined);
  } catch (err) {
    console.error('Get referral history error:', err);
    return res.status(500).json({ message: 'Server error retrieving referral history.', error: err.message });
  }
});

// GET /api/referrals/admin/list - Admin: all referrals system-wide
router.get('/admin/list', verifyAdmin, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT 
        r.id,
        r.code_used,
        r.status,
        r.reward_points_referrer,
        r.reward_points_referee,
        r.created_at,
        u_referrer.name as referrer_name,
        u_referrer.email as referrer_email,
        u_referee.name as referee_name,
        u_referee.email as referee_email,
        c_referee.tier as referee_tier
       FROM referrals r
       JOIN customers c_referrer ON r.referrer_id = c_referrer.id
       JOIN users u_referrer ON c_referrer.user_id = u_referrer.id
       JOIN customers c_referee ON r.referee_id = c_referee.id
       JOIN users u_referee ON c_referee.user_id = u_referee.id
       ORDER BY r.created_at DESC`
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('Admin get referrals error:', err);
    return res.status(500).json({ message: 'Server error retrieving referrals.', error: err.message });
  }
});

module.exports = router;
