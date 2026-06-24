const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

// Helper to generate voucher code with collision prevention
async function generateUniqueVoucherCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let attempts = 0;
  while (attempts < 10) {
    let code = 'LOY-RED-';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // Check uniqueness
    const existing = await db.query('SELECT id FROM redemptions WHERE code_generated = $1', [code]);
    if (existing.rows.length === 0) {
      return code;
    }
    attempts++;
  }
  throw new Error('Failed to generate unique voucher code after 10 attempts.');
}

// GET /api/rewards - Get active rewards list (customers see active only)
router.get('/', verifyToken, async (req, res) => {
  try {
    const rewardsQuery = await db.query(
      'SELECT * FROM rewards WHERE (is_active = 1 OR is_active = TRUE) ORDER BY points_cost ASC'
    );
    return res.json(rewardsQuery.rows);
  } catch (err) {
    console.error('Get rewards error:', err);
    return res.status(500).json({ message: 'Server error retrieving rewards.', error: err.message });
  }
});

// POST /api/rewards/redeem - Redeem points for a reward
router.post('/redeem', verifyToken, async (req, res) => {
  const { rewardId } = req.body;

  if (!rewardId) {
    return res.status(400).json({ message: 'Reward ID is required.' });
  }

  try {
    // 1. Get customer
    const customerRes = await db.query('SELECT id, loyalty_points, tier FROM customers WHERE user_id = $1', [req.user.id]);
    if (customerRes.rows.length === 0) {
      return res.status(404).json({ message: 'Customer profile not found.' });
    }
    const customer = customerRes.rows[0];

    // 2. Get reward details (handle both SQLite int and PG boolean)
    const rewardRes = await db.query(
      'SELECT * FROM rewards WHERE id = $1 AND (is_active = 1 OR is_active = TRUE)',
      [rewardId]
    );
    if (rewardRes.rows.length === 0) {
      return res.status(404).json({ message: 'Active reward not found.' });
    }
    const reward = rewardRes.rows[0];

    // 3. Verify sufficient points
    if (parseInt(customer.loyalty_points) < parseInt(reward.points_cost)) {
      return res.status(400).json({
        message: `Insufficient loyalty points. You need ${reward.points_cost} points but have ${customer.loyalty_points}.`,
        currentPoints: customer.loyalty_points,
        required: reward.points_cost,
        shortfall: reward.points_cost - customer.loyalty_points
      });
    }

    // 4. Generate unique coupon code
    const voucherCode = await generateUniqueVoucherCode();

    // 5. Deduct points and insert redemption
    const newPoints = parseInt(customer.loyalty_points) - parseInt(reward.points_cost);
    await db.query('UPDATE customers SET loyalty_points = $1 WHERE id = $2', [newPoints, customer.id]);

    await db.query(
      `INSERT INTO redemptions (customer_id, reward_id, points_spent, code_generated, status)
       VALUES ($1, $2, $3, $4, $5)`,
      [customer.id, reward.id, reward.points_cost, voucherCode, 'Active']
    );

    // 6. Notify user
    await db.query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES ($1, $2, $3, $4)`,
      [
        req.user.id,
        'Reward Redeemed!',
        `Successfully redeemed "${reward.name}" for ${reward.points_cost} points. Your voucher code is ${voucherCode}. Use it at checkout for $${parseFloat(reward.discount_value).toFixed(2)} off!`,
        'Loyalty'
      ]
    );

    return res.json({
      message: 'Reward redeemed successfully!',
      voucherCode,
      rewardName: reward.name,
      discountValue: parseFloat(reward.discount_value),
      pointsSpent: parseInt(reward.points_cost),
      remainingPoints: newPoints
    });
  } catch (err) {
    console.error('Redeem reward error:', err);
    return res.status(500).json({ message: 'Server error processing redemption.', error: err.message });
  }
});

// GET /api/rewards/my-redemptions - Customer's own redemptions
router.get('/my-redemptions', verifyToken, async (req, res) => {
  try {
    const customerRes = await db.query('SELECT id FROM customers WHERE user_id = $1', [req.user.id]);
    if (customerRes.rows.length === 0) {
      return res.status(404).json({ message: 'Customer profile not found.' });
    }
    const customerId = customerRes.rows[0].id;

    const redemptionsQuery = await db.query(
      `SELECT rd.*, r.name as reward_name, r.description as reward_description, 
              r.discount_value, r.reward_type
       FROM redemptions rd
       JOIN rewards r ON rd.reward_id = r.id
       WHERE rd.customer_id = $1
       ORDER BY rd.redeemed_at DESC`,
      [customerId]
    );

    return res.json(redemptionsQuery.rows);
  } catch (err) {
    console.error('Get redemptions error:', err);
    return res.status(500).json({ message: 'Server error retrieving your redemptions.', error: err.message });
  }
});

// POST /api/rewards/check-eligibility - Verify discount eligibility for codes/campaigns
router.post('/check-eligibility', verifyToken, async (req, res) => {
  const { amount, code } = req.body;

  if (!amount || !code) {
    return res.status(400).json({ message: 'Amount and code are required.' });
  }

  const numericAmount = parseFloat(amount);
  if (isNaN(numericAmount) || numericAmount <= 0) {
    return res.status(400).json({ message: 'Invalid amount. Must be a positive number.' });
  }

  try {
    const uppercaseCode = code.trim().toUpperCase();
    const today = new Date().toLocaleDateString('en-CA');

    // 1. Check if it's a Campaign Discount
    const campaignQuery = await db.query(
      `SELECT * FROM campaigns 
       WHERE code = $1 AND (is_active = 1 OR is_active = TRUE) AND start_date <= $2 AND end_date >= $3`,
      [uppercaseCode, today, today]
    );

    if (campaignQuery.rows.length > 0) {
      const campaign = campaignQuery.rows[0];
      const discountPercent = parseFloat(campaign.discount_percent || 0);
      const discountAmount = numericAmount * (discountPercent / 100);
      const finalAmount = numericAmount - discountAmount;

      return res.json({
        type: 'campaign',
        code: campaign.code,
        name: campaign.name,
        description: campaign.description,
        isEligible: true,
        discountPercent,
        discountAmount: parseFloat(discountAmount.toFixed(2)),
        finalAmount: parseFloat(finalAmount.toFixed(2)),
        pointsMultiplier: parseFloat(campaign.points_multiplier || 1.0),
        message: discountPercent > 0
          ? `Campaign applied: ${campaign.name} (${discountPercent}% off & ${campaign.points_multiplier}x points!)`
          : `Campaign applied: ${campaign.name} (${campaign.points_multiplier}x bonus points!)`
      });
    }

    // 2. Check if it's a Customer Redeemed Reward Voucher
    const customerRes = await db.query('SELECT id FROM customers WHERE user_id = $1', [req.user.id]);
    if (customerRes.rows.length > 0) {
      const customerId = customerRes.rows[0].id;

      const redemptionQuery = await db.query(
        `SELECT rd.id, rd.code_generated, rd.status, r.name, r.discount_value, r.reward_type
         FROM redemptions rd
         JOIN rewards r ON rd.reward_id = r.id
         WHERE rd.code_generated = $1 AND rd.customer_id = $2 AND rd.status = 'Active'`,
        [uppercaseCode, customerId]
      );

      if (redemptionQuery.rows.length > 0) {
        const voucher = redemptionQuery.rows[0];
        const discountValue = parseFloat(voucher.discount_value || 0);
        const discountAmount = Math.min(numericAmount, discountValue);
        const finalAmount = numericAmount - discountAmount;

        return res.json({
          type: 'voucher',
          code: voucher.code_generated,
          name: voucher.name,
          isEligible: true,
          discountPercent: 0,
          discountAmount: parseFloat(discountAmount.toFixed(2)),
          finalAmount: parseFloat(finalAmount.toFixed(2)),
          pointsMultiplier: 1.0,
          message: `Voucher applied: ${voucher.name} ($${discountAmount.toFixed(2)} off!)`
        });
      }
    }

    // 3. No campaign or voucher matched
    return res.json({
      isEligible: false,
      message: 'Invalid, inactive, or expired discount code. Please check and try again.'
    });

  } catch (err) {
    console.error('Discount checker error:', err);
    return res.status(500).json({ message: 'Server error checking eligibility.', error: err.message });
  }
});

// ============================================================
// ADMIN REWARD MANAGEMENT ENDPOINTS
// ============================================================

// GET /api/rewards/admin/all - Admin: get all rewards including inactive
router.get('/admin/all', verifyAdmin, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM rewards ORDER BY points_cost ASC');
    return res.json(result.rows);
  } catch (err) {
    console.error('Admin get rewards error:', err);
    return res.status(500).json({ message: 'Server error retrieving rewards.', error: err.message });
  }
});

// POST /api/rewards/admin/create - Admin: create a new reward
router.post('/admin/create', verifyAdmin, async (req, res) => {
  const { name, description, points_cost, discount_value, reward_type } = req.body;

  if (!name || !points_cost || discount_value === undefined) {
    return res.status(400).json({ message: 'Name, points_cost, and discount_value are required.' });
  }

  const parsedCost = parseInt(points_cost);
  const parsedDiscount = parseFloat(discount_value);

  if (isNaN(parsedCost) || parsedCost <= 0) {
    return res.status(400).json({ message: 'points_cost must be a positive integer.' });
  }
  if (isNaN(parsedDiscount) || parsedDiscount <= 0) {
    return res.status(400).json({ message: 'discount_value must be a positive number.' });
  }

  const validTypes = ['Voucher', 'Cashback', 'FreeUpgrade'];
  const type = validTypes.includes(reward_type) ? reward_type : 'Voucher';

  try {
    await db.query(
      `INSERT INTO rewards (name, description, points_cost, discount_value, reward_type, is_active)
       VALUES ($1, $2, $3, $4, $5, 1)`,
      [name.trim(), description || '', parsedCost, parsedDiscount, type]
    );
    return res.status(201).json({ message: 'Reward created successfully!' });
  } catch (err) {
    console.error('Admin create reward error:', err);
    return res.status(500).json({ message: 'Server error creating reward.', error: err.message });
  }
});

// PUT /api/rewards/admin/:id - Admin: update a reward
router.put('/admin/:id', verifyAdmin, async (req, res) => {
  const rewardId = req.params.id;
  const { name, description, points_cost, discount_value, reward_type, is_active } = req.body;

  try {
    const existing = await db.query('SELECT * FROM rewards WHERE id = $1', [rewardId]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Reward not found.' });
    }
    const reward = existing.rows[0];

    const updatedName = name !== undefined ? name.trim() : reward.name;
    const updatedDesc = description !== undefined ? description : reward.description;
    const updatedCost = points_cost !== undefined ? parseInt(points_cost) : reward.points_cost;
    const updatedDiscount = discount_value !== undefined ? parseFloat(discount_value) : reward.discount_value;
    const updatedType = reward_type !== undefined ? reward_type : reward.reward_type;
    const updatedActive = is_active !== undefined ? (is_active ? 1 : 0) : (reward.is_active ? 1 : 0);

    await db.query(
      `UPDATE rewards SET name = $1, description = $2, points_cost = $3, discount_value = $4, reward_type = $5, is_active = $6
       WHERE id = $7`,
      [updatedName, updatedDesc, updatedCost, updatedDiscount, updatedType, updatedActive, rewardId]
    );
    return res.json({ message: 'Reward updated successfully!' });
  } catch (err) {
    console.error('Admin update reward error:', err);
    return res.status(500).json({ message: 'Server error updating reward.', error: err.message });
  }
});

// GET /api/rewards/admin/redemptions - Admin: all redemptions system-wide
router.get('/admin/redemptions', verifyAdmin, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT rd.*, r.name as reward_name, r.discount_value, r.reward_type,
              u.name as customer_name, u.email as customer_email
       FROM redemptions rd
       JOIN rewards r ON rd.reward_id = r.id
       JOIN customers c ON rd.customer_id = c.id
       JOIN users u ON c.user_id = u.id
       ORDER BY rd.redeemed_at DESC`
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('Admin get redemptions error:', err);
    return res.status(500).json({ message: 'Server error retrieving redemptions.', error: err.message });
  }
});

module.exports = router;
