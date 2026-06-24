const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

// GET /api/customers/notifications - Fetch notifications for logged-in user
router.get('/notifications', verifyToken, async (req, res) => {
  try {
    const notifications = await db.query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );
    return res.json(notifications.rows);
  } catch (err) {
    console.error('Get notifications error:', err);
    return res.status(500).json({ message: 'Server error retrieving notifications.', error: err.message });
  }
});

// POST /api/customers/notifications/read - Mark all notifications as read
router.post('/notifications/read', verifyToken, async (req, res) => {
  try {
    await db.query('UPDATE notifications SET is_read = 1 WHERE user_id = $1', [req.user.id]);
    return res.json({ message: 'All notifications marked as read.' });
  } catch (err) {
    console.error('Mark read error:', err);
    return res.status(500).json({ message: 'Server error updating notifications.', error: err.message });
  }
});

// GET /api/customers - Admin: Get all customer records
router.get('/', verifyAdmin, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT c.id, c.phone, c.referral_code, c.referred_by_id, c.tier, c.loyalty_points, c.total_spent, c.created_at,
              u.name, u.email, u.role,
              ref.referral_code as referrer_code
       FROM customers c
       JOIN users u ON c.user_id = u.id
       LEFT JOIN customers ref ON c.referred_by_id = ref.id
       ORDER BY c.created_at DESC`
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('Get customers error:', err);
    return res.status(500).json({ message: 'Server error retrieving customer directory.', error: err.message });
  }
});

// PUT /api/customers/:id - Admin: Edit customer points/tier manually
router.put('/:id', verifyAdmin, async (req, res) => {
  const customerId = req.params.id;
  const { loyalty_points, tier, phone } = req.body;

  if (loyalty_points === undefined || !tier) {
    return res.status(400).json({ message: 'Points and tier are required.' });
  }

  try {
    // Get customer user_id for notifications
    const custRes = await db.query('SELECT user_id, loyalty_points, tier FROM customers WHERE id = $1', [customerId]);
    if (custRes.rows.length === 0) {
      return res.status(404).json({ message: 'Customer not found.' });
    }
    const customer = custRes.rows[0];

    // Update
    await db.query(
      'UPDATE customers SET loyalty_points = $1, tier = $2, phone = $3 WHERE id = $4',
      [parseInt(loyalty_points), tier, phone || '', customerId]
    );

    // Notify user if tier or points changed
    if (customer.tier !== tier) {
      await db.query(
        'INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)',
        [customer.user_id, 'Tier Adjusted by Admin', `Your loyalty tier has been manually updated to ${tier}.`, 'Loyalty']
      );
    }
    if (parseInt(customer.loyalty_points) !== parseInt(loyalty_points)) {
      await db.query(
        'INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)',
        [customer.user_id, 'Loyalty Points Adjusted', `Your points balance was updated to ${loyalty_points} by an administrator.`, 'Loyalty']
      );
    }

    return res.json({ message: 'Customer profile updated successfully!' });
  } catch (err) {
    console.error('Update customer error:', err);
    return res.status(500).json({ message: 'Server error updating customer profile.', error: err.message });
  }
});

module.exports = router;
