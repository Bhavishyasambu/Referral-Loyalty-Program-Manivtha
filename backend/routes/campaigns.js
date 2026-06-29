const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

// GET /api/campaigns - Get campaigns (Admins get all, customers only active ones)
router.get('/', verifyToken, async (req, res) => {
  try {
    let queryText;
    if (req.user.role === 'admin') {
      queryText = 'SELECT * FROM campaigns ORDER BY created_at DESC';
    } else {
      // Use ISO string to guarantee YYYY-MM-DD format regardless of server locale/OS
      const today = new Date().toISOString().split('T')[0];
      queryText = `SELECT * FROM campaigns WHERE (is_active = 1 OR is_active = TRUE) AND start_date <= '${today}' AND end_date >= '${today}' ORDER BY end_date ASC`;
    }
    const campaigns = await db.query(queryText);
    return res.json(campaigns.rows);
  } catch (err) {
    console.error('Get campaigns error:', err);
    return res.status(500).json({ message: 'Server error retrieving campaigns.', error: err.message });
  }
});

// POST /api/campaigns - Create a new campaign (Admin only)
router.post('/', verifyAdmin, async (req, res) => {
  const { name, code, description, points_multiplier, discount_percent, start_date, end_date } = req.body;

  if (!name || !code || !points_multiplier || !start_date || !end_date) {
    return res.status(400).json({ message: 'Missing required fields: name, code, points_multiplier, start_date, end_date.' });
  }

  // Validate dates
  const startDateObj = new Date(start_date);
  const endDateObj = new Date(end_date);
  if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
    return res.status(400).json({ message: 'Invalid start_date or end_date format.' });
  }
  if (endDateObj <= startDateObj) {
    return res.status(400).json({ message: 'End date must be after start date.' });
  }

  const normalizedCode = code.trim().toUpperCase();
  const parsedMultiplier = parseFloat(points_multiplier);
  const parsedDiscount = parseFloat(discount_percent || 0);

  if (isNaN(parsedMultiplier) || parsedMultiplier <= 0) {
    return res.status(400).json({ message: 'points_multiplier must be a positive number.' });
  }
  if (isNaN(parsedDiscount) || parsedDiscount < 0 || parsedDiscount > 100) {
    return res.status(400).json({ message: 'discount_percent must be between 0 and 100.' });
  }

  try {
    // Check code uniqueness
    const codeExists = await db.query('SELECT id FROM campaigns WHERE code = $1', [normalizedCode]);
    if (codeExists.rows.length > 0) {
      return res.status(400).json({ message: `Campaign with code "${normalizedCode}" already exists.` });
    }

    await db.query(
      `INSERT INTO campaigns (name, code, description, points_multiplier, discount_percent, start_date, end_date, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 1)`,
      [name.trim(), normalizedCode, description || '', parsedMultiplier, parsedDiscount, start_date, end_date]
    );

    // Notify all customers about new campaign
    const usersQuery = await db.query("SELECT id FROM users WHERE role = 'customer'");
    for (const u of usersQuery.rows) {
      await db.query(
        'INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)',
        [
          u.id,
          `New Campaign: ${name.trim()}!`,
          `Use code ${normalizedCode} to unlock rewards${parsedDiscount > 0 ? ` (${parsedDiscount}% off)` : ''}${parsedMultiplier > 1 ? ` & ${parsedMultiplier}x points` : ''}! Valid from ${start_date} to ${end_date}.`,
          'System'
        ]
      );
    }

    return res.status(201).json({ message: 'Campaign created successfully!' });
  } catch (err) {
    console.error('Create campaign error:', err);
    return res.status(500).json({ message: `Backend 500 Error: ${err.message}`, error: err.message });
  }
});

// PUT /api/campaigns/:id - Full campaign update (Admin only)
router.put('/:id', verifyAdmin, async (req, res) => {
  const campaignId = req.params.id;
  const { name, code, description, points_multiplier, discount_percent, start_date, end_date, is_active } = req.body;

  try {
    const existing = await db.query('SELECT * FROM campaigns WHERE id = $1', [campaignId]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Campaign not found.' });
    }
    const campaign = existing.rows[0];

    // Determine updated values (fall back to existing if not provided)
    const updatedName = name !== undefined ? name.trim() : campaign.name;
    const updatedDesc = description !== undefined ? description : campaign.description;
    const updatedMultiplier = points_multiplier !== undefined ? parseFloat(points_multiplier) : parseFloat(campaign.points_multiplier);
    const updatedDiscount = discount_percent !== undefined ? parseFloat(discount_percent) : parseFloat(campaign.discount_percent);
    const updatedStart = start_date !== undefined ? start_date : campaign.start_date;
    const updatedEnd = end_date !== undefined ? end_date : campaign.end_date;
    const updatedActive = is_active !== undefined ? (is_active ? 1 : 0) : (campaign.is_active ? 1 : 0);

    // Handle code update with uniqueness check
    let updatedCode = campaign.code;
    if (code !== undefined && code.trim().toUpperCase() !== campaign.code) {
      const normalizedCode = code.trim().toUpperCase();
      const codeExists = await db.query('SELECT id FROM campaigns WHERE code = $1 AND id != $2', [normalizedCode, campaignId]);
      if (codeExists.rows.length > 0) {
        return res.status(400).json({ message: `Campaign code "${normalizedCode}" is already in use by another campaign.` });
      }
      updatedCode = normalizedCode;
    }

    // Validate dates if both provided
    if (start_date || end_date) {
      const sDate = new Date(updatedStart);
      const eDate = new Date(updatedEnd);
      if (eDate <= sDate) {
        return res.status(400).json({ message: 'End date must be after start date.' });
      }
    }

    await db.query(
      `UPDATE campaigns 
       SET name = $1, code = $2, description = $3, points_multiplier = $4, discount_percent = $5, start_date = $6, end_date = $7, is_active = $8
       WHERE id = $9`,
      [updatedName, updatedCode, updatedDesc, updatedMultiplier, updatedDiscount, updatedStart, updatedEnd, updatedActive, campaignId]
    );

    return res.json({ message: 'Campaign updated successfully!' });
  } catch (err) {
    console.error('Update campaign error:', err);
    return res.status(500).json({ message: 'Server error updating campaign.', error: err.message });
  }
});

// DELETE /api/campaigns/:id - Soft-delete (deactivate) campaign (Admin only)
router.delete('/:id', verifyAdmin, async (req, res) => {
  const campaignId = req.params.id;
  try {
    const existing = await db.query('SELECT id, name FROM campaigns WHERE id = $1', [campaignId]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Campaign not found.' });
    }

    await db.query('UPDATE campaigns SET is_active = 0 WHERE id = $1', [campaignId]);
    return res.json({ message: `Campaign "${existing.rows[0].name}" has been deactivated.` });
  } catch (err) {
    console.error('Delete campaign error:', err);
    return res.status(500).json({ message: 'Server error deactivating campaign.', error: err.message });
  }
});

// GET /api/campaigns/:id/analytics - Campaign-specific performance metrics (Admin only)
router.get('/:id/analytics', verifyAdmin, async (req, res) => {
  const campaignId = req.params.id;
  try {
    const campaignRes = await db.query('SELECT * FROM campaigns WHERE id = $1', [campaignId]);
    if (campaignRes.rows.length === 0) {
      return res.status(404).json({ message: 'Campaign not found.' });
    }
    const campaign = campaignRes.rows[0];

    // Bookings using this campaign
    const bookingsRes = await db.query(
      `SELECT COUNT(*) as booking_count, 
              COALESCE(SUM(amount), 0) as total_revenue,
              COALESCE(SUM(points_earned), 0) as total_points_awarded
       FROM bookings
       WHERE campaign_id = $1 AND status != 'Cancelled'`,
      [campaignId]
    );
    const bookingStats = bookingsRes.rows[0];

    // Calculate discount given (original amount - final amount for that campaign's discount%)
    const discountPercent = parseFloat(campaign.discount_percent || 0);
    const totalRevenue = parseFloat(bookingStats.total_revenue);
    // discount_given = final_amount / (1 - discount%) * discount%  
    const discountGiven = discountPercent > 0
      ? (totalRevenue / (1 - discountPercent / 100)) * (discountPercent / 100)
      : 0;

    // Timeline of bookings using this campaign
    const isPg = db.getDbType() === 'postgres';
    const timelineQuery = isPg
      ? `SELECT to_char(trip_date, 'YYYY-MM-DD') as date, COUNT(*) as count, SUM(amount) as revenue FROM bookings WHERE campaign_id = $1 AND status != 'Cancelled' GROUP BY date ORDER BY date ASC`
      : `SELECT date(trip_date) as date, COUNT(*) as count, SUM(amount) as revenue FROM bookings WHERE campaign_id = $1 AND status != 'Cancelled' GROUP BY date ORDER BY date ASC`;

    const timelineRes = await db.query(timelineQuery, [campaignId]);

    return res.json({
      campaign,
      stats: {
        bookingCount: parseInt(bookingStats.booking_count),
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        totalPointsAwarded: parseInt(bookingStats.total_points_awarded),
        estimatedDiscountGiven: parseFloat(discountGiven.toFixed(2))
      },
      timeline: timelineRes.rows.map(row => ({
        date: row.date,
        bookings: parseInt(row.count),
        revenue: parseFloat(row.revenue || 0)
      }))
    });
  } catch (err) {
    console.error('Campaign analytics error:', err);
    return res.status(500).json({ message: 'Server error retrieving campaign analytics.', error: err.message });
  }
});

module.exports = router;
