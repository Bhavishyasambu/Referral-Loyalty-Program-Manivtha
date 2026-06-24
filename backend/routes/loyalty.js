const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

// Tier thresholds
const TIER_THRESHOLDS = {
  Bronze: { next: 'Silver', spentNeeded: 1000, pointsNeeded: 500, multiplier: '1.0x' },
  Silver: { next: 'Gold', spentNeeded: 3000, pointsNeeded: 1500, multiplier: '1.2x' },
  Gold:   { next: null, spentNeeded: 0, pointsNeeded: 0, multiplier: '1.5x' }
};

// GET /api/loyalty/dashboard - Loyalty details & transaction logs
router.get('/dashboard', verifyToken, async (req, res) => {
  try {
    // 1. Get customer details
    const customerRes = await db.query(
      `SELECT c.id, c.tier, c.loyalty_points, c.total_spent 
       FROM customers c 
       WHERE c.user_id = $1`,
      [req.user.id]
    );

    if (customerRes.rows.length === 0) {
      return res.status(404).json({ message: 'Customer profile not found.' });
    }
    const customer = customerRes.rows[0];

    // Calculate progress
    const currentTierDetails = TIER_THRESHOLDS[customer.tier] || TIER_THRESHOLDS.Bronze;
    let progressPercent = 100;

    if (customer.tier === 'Bronze') {
      const spentProg = (customer.total_spent / 1000) * 100;
      const pointsProg = (customer.loyalty_points / 500) * 100;
      progressPercent = Math.min(100, Math.max(spentProg, pointsProg));
    } else if (customer.tier === 'Silver') {
      const spentProg = ((customer.total_spent - 1000) / 2000) * 100;
      const pointsProg = ((customer.loyalty_points - 500) / 1000) * 100;
      progressPercent = Math.min(100, Math.max(spentProg, pointsProg));
    }

    // 2. Compile points history (Bookings + Redemptions + Referrals)
    const bookingsPoints = await db.query(
      `SELECT 'Booking' as type, tour_name as description, points_earned as points, created_at as date
       FROM bookings 
       WHERE customer_id = $1 AND points_earned > 0 AND status != 'Cancelled'`,
      [customer.id]
    );

    const redemptionsPoints = await db.query(
      `SELECT 'Redemption' as type, r.name as description, -rd.points_spent as points, rd.redeemed_at as date
       FROM redemptions rd
       JOIN rewards r ON rd.reward_id = r.id
       WHERE rd.customer_id = $1`,
      [customer.id]
    );

    // Referral bonus points (received as referee)
    const refereePoints = await db.query(
      `SELECT 'Referral Signup' as type, 'Signed up using referral code' as description, r.reward_points_referee as points, r.created_at as date
       FROM referrals r
       WHERE r.referee_id = $1`,
      [customer.id]
    );

    // Referral reward points (received as referrer after referee's first booking)
    const referrerPoints = await db.query(
      `SELECT 'Referral Success' as type, u.name as description, r.reward_points_referrer as points, r.created_at as date
       FROM referrals r
       JOIN customers c ON r.referee_id = c.id
       JOIN users u ON c.user_id = u.id
       WHERE r.referrer_id = $1 AND r.status = 'Completed'`,
      [customer.id]
    );

    // Combine all history logs
    const history = [
      ...bookingsPoints.rows.map(row => ({ ...row, points: parseInt(row.points) })),
      ...redemptionsPoints.rows.map(row => ({ ...row, points: parseInt(row.points) })),
      ...refereePoints.rows.map(row => ({ ...row, points: parseInt(row.points) })),
      ...referrerPoints.rows.map(row => ({ ...row, points: parseInt(row.points), description: `Referral booking completed by ${row.description}` }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    // 3. Compute breakdown by source
    const breakdown = {
      fromBookings: bookingsPoints.rows.reduce((sum, r) => sum + parseInt(r.points), 0),
      fromReferrals: refereePoints.rows.reduce((sum, r) => sum + parseInt(r.points), 0) +
                     referrerPoints.rows.reduce((sum, r) => sum + parseInt(r.points), 0),
      redeemed: redemptionsPoints.rows.reduce((sum, r) => sum + Math.abs(parseInt(r.points)), 0)
    };

    return res.json({
      summary: {
        tier: customer.tier,
        loyaltyPoints: customer.loyalty_points,
        totalSpent: parseFloat(customer.total_spent || 0),
        progressPercent: Math.round(progressPercent * 10) / 10,
        tierConfig: currentTierDetails
      },
      breakdown,
      history
    });
  } catch (err) {
    console.error('Get loyalty dashboard error:', err);
    return res.status(500).json({ message: 'Server error retrieving loyalty dashboard.', error: err.message });
  }
});

// GET /api/loyalty/stats - Admin: system-wide loyalty statistics
router.get('/stats', verifyAdmin, async (req, res) => {
  try {
    // Total points ever issued to customers (current balance + all redeemed)
    const totalIssuedRes = await db.query(`
      SELECT 
        (SELECT COALESCE(SUM(loyalty_points), 0) FROM customers) + 
        (SELECT COALESCE(SUM(points_spent), 0) FROM redemptions) as total_issued
    `);

    // Total points redeemed
    const totalRedeemedRes = await db.query(
      'SELECT COALESCE(SUM(points_spent), 0) as total_redeemed FROM redemptions'
    );

    // Points currently held by customers
    const totalCurrentRes = await db.query(
      'SELECT COALESCE(SUM(loyalty_points), 0) as total_current FROM customers'
    );

    // Points by tier
    const tierPointsRes = await db.query(
      `SELECT tier, COUNT(*) as customer_count, 
              COALESCE(SUM(loyalty_points), 0) as total_points,
              COALESCE(AVG(loyalty_points), 0) as avg_points,
              COALESCE(SUM(total_spent), 0) as total_spent
       FROM customers
       GROUP BY tier`
    );

    // Points from bookings (all time)
    const bookingPointsRes = await db.query(
      `SELECT COALESCE(SUM(points_earned), 0) as total FROM bookings WHERE status != 'Cancelled'`
    );

    // Points from referrals (all time)
    const referralPointsRes = await db.query(
      `SELECT 
        COALESCE(SUM(CASE WHEN status = 'Completed' THEN reward_points_referrer ELSE 0 END), 0) as referrer_points,
        COALESCE(SUM(reward_points_referee), 0) as referee_points
       FROM referrals`
    );

    return res.json({
      totalIssued: parseInt(totalIssuedRes.rows[0].total_issued || 0),
      totalRedeemed: parseInt(totalRedeemedRes.rows[0].total_redeemed || 0),
      totalCurrent: parseInt(totalCurrentRes.rows[0].total_current || 0),
      fromBookings: parseInt(bookingPointsRes.rows[0].total || 0),
      fromReferrals: parseInt(referralPointsRes.rows[0].referrer_points || 0) +
                     parseInt(referralPointsRes.rows[0].referee_points || 0),
      byTier: tierPointsRes.rows.map(row => ({
        tier: row.tier,
        customerCount: parseInt(row.customer_count),
        totalPoints: parseInt(row.total_points),
        avgPoints: Math.round(parseFloat(row.avg_points)),
        totalSpent: parseFloat(row.total_spent)
      }))
    });
  } catch (err) {
    console.error('Get loyalty stats error:', err);
    return res.status(500).json({ message: 'Server error retrieving loyalty stats.', error: err.message });
  }
});

// POST /api/loyalty/recalculate-tiers - Admin: re-evaluate and fix tiers for all customers
router.post('/recalculate-tiers', verifyAdmin, async (req, res) => {
  try {
    const customersRes = await db.query(
      'SELECT id, user_id, tier, total_spent, loyalty_points FROM customers'
    );

    let upgraded = 0;
    let downgraded = 0;

    for (const customer of customersRes.rows) {
      let correctTier = 'Bronze';
      if (customer.total_spent >= 3000 || customer.loyalty_points >= 1500) {
        correctTier = 'Gold';
      } else if (customer.total_spent >= 1000 || customer.loyalty_points >= 500) {
        correctTier = 'Silver';
      }

      if (correctTier !== customer.tier) {
        await db.query('UPDATE customers SET tier = $1 WHERE id = $2', [correctTier, customer.id]);

        const tierOrder = { Bronze: 1, Silver: 2, Gold: 3 };
        const isUpgrade = tierOrder[correctTier] > tierOrder[customer.tier];

        if (isUpgrade) {
          upgraded++;
          await db.query(
            'INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)',
            [
              customer.user_id,
              `Tier Upgraded to ${correctTier}!`,
              `Your loyalty tier has been recalculated and upgraded to ${correctTier}.`,
              'Loyalty'
            ]
          );
        } else {
          downgraded++;
        }
      }
    }

    return res.json({
      message: `Tier recalculation complete. ${upgraded} upgraded, ${downgraded} adjusted.`,
      totalProcessed: customersRes.rows.length,
      upgraded,
      downgraded
    });
  } catch (err) {
    console.error('Tier recalculate error:', err);
    return res.status(500).json({ message: 'Server error recalculating tiers.', error: err.message });
  }
});

module.exports = router;
