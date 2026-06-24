const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyAdmin } = require('../middleware/auth');

// GET /api/analytics/dashboard - Admin dashboard statistics and chart data
router.get('/dashboard', verifyAdmin, async (req, res) => {
  try {
    const isPg = db.getDbType() === 'postgres';

    // -------------------------------------------------------
    // 1. Core KPI Metrics
    // -------------------------------------------------------
    const customersCount = await db.query('SELECT COUNT(*) as count FROM customers');
    const bookingsCount  = await db.query("SELECT COUNT(*) as count FROM bookings WHERE status != 'Cancelled'");
    const totalRevenue   = await db.query("SELECT COALESCE(SUM(amount), 0) as total FROM bookings WHERE status != 'Cancelled'");
    const referralsTotal = await db.query('SELECT COUNT(*) as count FROM referrals');
    const referralsDone  = await db.query("SELECT COUNT(*) as count FROM referrals WHERE status = 'Completed'");
    const referralsPending = await db.query("SELECT COUNT(*) as count FROM referrals WHERE status = 'Pending'");
    const rewardsRedeemed = await db.query('SELECT COUNT(*) as count FROM redemptions');

    // Total loyalty points issued = current balances + all redeemed
    const pointsQuery = await db.query(`
      SELECT 
        (SELECT COALESCE(SUM(loyalty_points), 0) FROM customers) + 
        (SELECT COALESCE(SUM(points_spent), 0) FROM redemptions) as total_issued
    `);

    // -------------------------------------------------------
    // 2. Referral Stats
    // -------------------------------------------------------
    const referralPointsRes = await db.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN status = 'Completed' THEN reward_points_referrer ELSE 0 END), 0) as referrer_total,
        COALESCE(SUM(reward_points_referee), 0) as referee_total
      FROM referrals
    `);

    // -------------------------------------------------------
    // 3. Loyalty Stats by Tier
    // -------------------------------------------------------
    const tierStatsRes = await db.query(`
      SELECT tier, COUNT(*) as count, 
             COALESCE(SUM(loyalty_points), 0) as total_points,
             COALESCE(SUM(total_spent), 0) as total_spent
      FROM customers GROUP BY tier
    `);

    const totalRedeemed = await db.query(
      'SELECT COALESCE(SUM(points_spent), 0) as total FROM redemptions'
    );
    const totalCurrentPoints = await db.query(
      'SELECT COALESCE(SUM(loyalty_points), 0) as total FROM customers'
    );

    // -------------------------------------------------------
    // 4. Reward Stats
    // -------------------------------------------------------
    const topRewardsRes = await db.query(`
      SELECT r.name, r.reward_type, COUNT(rd.id) as redemption_count, 
             COALESCE(SUM(rd.points_spent), 0) as total_points_spent
      FROM redemptions rd
      JOIN rewards r ON rd.reward_id = r.id
      GROUP BY r.id, r.name, r.reward_type
      ORDER BY redemption_count DESC
      LIMIT 5
    `);

    const activeVouchersRes = await db.query("SELECT COUNT(*) as count FROM redemptions WHERE status = 'Active'");
    const usedVouchersRes   = await db.query("SELECT COUNT(*) as count FROM redemptions WHERE status = 'Redeemed'");

    // -------------------------------------------------------
    // 5. Campaign Stats
    // -------------------------------------------------------
    const campaignStatsRes = await db.query(`
      SELECT c.id, c.name, c.code, c.discount_percent, c.points_multiplier, c.is_active,
             COUNT(b.id) as booking_count,
             COALESCE(SUM(b.amount), 0) as total_revenue,
             COALESCE(SUM(b.points_earned), 0) as total_points_awarded
      FROM campaigns c
      LEFT JOIN bookings b ON b.campaign_id = c.id AND b.status != 'Cancelled'
      GROUP BY c.id, c.name, c.code, c.discount_percent, c.points_multiplier, c.is_active
      ORDER BY booking_count DESC
    `);

    // -------------------------------------------------------
    // 6. Chart Data
    // -------------------------------------------------------
    const growthQueryText = isPg
      ? `SELECT to_char(created_at, 'YYYY-MM-DD') as date, COUNT(*) as count FROM users WHERE role = 'customer' GROUP BY date ORDER BY date ASC LIMIT 30`
      : `SELECT date(created_at) as date, COUNT(*) as count FROM users WHERE role = 'customer' GROUP BY date ORDER BY date ASC LIMIT 30`;

    const bookingsQueryText = isPg
      ? `SELECT to_char(created_at, 'YYYY-MM-DD') as date, COUNT(*) as count, SUM(amount) as revenue FROM bookings WHERE status != 'Cancelled' GROUP BY date ORDER BY date ASC LIMIT 30`
      : `SELECT date(created_at) as date, COUNT(*) as count, SUM(amount) as revenue FROM bookings WHERE status != 'Cancelled' GROUP BY date ORDER BY date ASC LIMIT 30`;

    const growthRes   = await db.query(growthQueryText);
    const bookingsRes = await db.query(bookingsQueryText);

    // Tier distribution (for pie chart)
    const tierRes = await db.query(`SELECT tier as name, COUNT(*) as value FROM customers GROUP BY tier`);

    // Vehicle distribution (for bar chart)
    const vehicleRes = await db.query(`SELECT vehicle_type as name, COUNT(*) as value FROM bookings WHERE status != 'Cancelled' GROUP BY vehicle_type`);

    // -------------------------------------------------------
    // 7. Assemble Response
    // -------------------------------------------------------
    return res.json({
      metrics: {
        totalCustomers: parseInt(customersCount.rows[0].count || 0),
        totalBookings: parseInt(bookingsCount.rows[0].count || 0),
        totalRevenue: parseFloat(totalRevenue.rows[0].total || 0).toFixed(2),
        activeReferrals: parseInt(referralsPending.rows[0].count || 0),
        pointsIssued: parseInt(pointsQuery.rows[0].total_issued || 0),
        rewardsRedeemed: parseInt(rewardsRedeemed.rows[0].count || 0)
      },
      referralStats: {
        totalReferrals: parseInt(referralsTotal.rows[0].count || 0),
        completedReferrals: parseInt(referralsDone.rows[0].count || 0),
        pendingReferrals: parseInt(referralsPending.rows[0].count || 0),
        pointsFromReferrals: parseInt(referralPointsRes.rows[0].referrer_total || 0) +
                              parseInt(referralPointsRes.rows[0].referee_total || 0),
        pointsToReferrers: parseInt(referralPointsRes.rows[0].referrer_total || 0),
        pointsToReferees: parseInt(referralPointsRes.rows[0].referee_total || 0)
      },
      loyaltyStats: {
        totalPointsIssued: parseInt(pointsQuery.rows[0].total_issued || 0),
        totalPointsRedeemed: parseInt(totalRedeemed.rows[0].total || 0),
        totalPointsCurrent: parseInt(totalCurrentPoints.rows[0].total || 0),
        byTier: tierStatsRes.rows.map(row => ({
          tier: row.tier,
          customerCount: parseInt(row.count),
          totalPoints: parseInt(row.total_points),
          totalSpent: parseFloat(row.total_spent)
        }))
      },
      rewardStats: {
        totalRedemptions: parseInt(rewardsRedeemed.rows[0].count || 0),
        activeVouchers: parseInt(activeVouchersRes.rows[0].count || 0),
        usedVouchers: parseInt(usedVouchersRes.rows[0].count || 0),
        topRewards: topRewardsRes.rows.map(row => ({
          name: row.name,
          type: row.reward_type,
          redemptionCount: parseInt(row.redemption_count),
          totalPointsSpent: parseInt(row.total_points_spent)
        }))
      },
      campaignStats: campaignStatsRes.rows.map(row => ({
        id: row.id,
        name: row.name,
        code: row.code,
        discountPercent: parseFloat(row.discount_percent),
        pointsMultiplier: parseFloat(row.points_multiplier),
        isActive: !!(row.is_active === 1 || row.is_active === true),
        bookingCount: parseInt(row.booking_count),
        totalRevenue: parseFloat(row.total_revenue || 0),
        totalPointsAwarded: parseInt(row.total_points_awarded)
      })),
      charts: {
        customerGrowth: growthRes.rows.map(row => ({
          date: row.date,
          registrations: parseInt(row.count)
        })),
        bookingRevenue: bookingsRes.rows.map(row => ({
          date: row.date,
          bookings: parseInt(row.count),
          revenue: parseFloat(row.revenue || 0)
        })),
        tierDistribution: tierRes.rows.map(row => ({
          name: row.name,
          value: parseInt(row.value)
        })),
        vehicleDistribution: vehicleRes.rows.map(row => ({
          name: row.name,
          value: parseInt(row.value)
        }))
      }
    });

  } catch (err) {
    console.error('Get analytics error:', err);
    return res.status(500).json({ message: 'Server error retrieving analytics dashboard.', error: err.message });
  }
});

module.exports = router;
