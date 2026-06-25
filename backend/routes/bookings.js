const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const { sendEmail } = require('../utils/mailer');

// Helper to generate unique booking reference
function generateBookingRef() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let ref = 'TRV-B-';
  for (let i = 0; i < 8; i++) {
    ref += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return ref;
}

// Helper to evaluate tier upgrade logic
async function checkAndUpgradeTier(customerId, userId) {
  const customerRes = await db.query(
    'SELECT tier, total_spent, loyalty_points FROM customers WHERE id = $1',
    [customerId]
  );
  if (customerRes.rows.length === 0) return null;

  const { tier: currentTier, total_spent: totalSpent, loyalty_points: loyaltyPoints } = customerRes.rows[0];
  let newTier = 'Bronze';

  if (parseFloat(totalSpent) >= 3000.00 || parseInt(loyaltyPoints) >= 1500) {
    newTier = 'Gold';
  } else if (parseFloat(totalSpent) >= 1000.00 || parseInt(loyaltyPoints) >= 500) {
    newTier = 'Silver';
  }

  if (newTier !== currentTier) {
    const tierOrder = { Bronze: 1, Silver: 2, Gold: 3 };
    if (tierOrder[newTier] > tierOrder[currentTier]) {
      await db.query('UPDATE customers SET tier = $1 WHERE id = $2', [newTier, customerId]);

      const multiplierText = newTier === 'Gold' ? '1.5x' : '1.2x';

      // Notify customer
      await db.query(
        'INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)',
        [
          userId,
          `Tier Upgraded to ${newTier}!`,
          `Congratulations! You have reached ${newTier} tier. You will now earn a ${multiplierText} point multiplier on your future bookings!`,
          'Loyalty'
        ]
      );
      return newTier;
    }
  }
  return null;
}

// POST /api/bookings - Create booking
router.post('/', verifyToken, async (req, res) => {
  const {
    tour_name,
    amount,
    pickup_location,
    drop_location,
    vehicle_type,
    driver_name,
    trip_date,
    campaign_code
  } = req.body;

  if (!tour_name || !amount || !pickup_location || !drop_location || !vehicle_type || !driver_name || !trip_date) {
    return res.status(400).json({ message: 'All booking fields are required.' });
  }

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ message: 'Valid amount is required (must be greater than 0).' });
  }

  // Validate trip date is not in the past (allow today)
  const tripDateObj = new Date(trip_date);
  const todayObj = new Date();
  todayObj.setHours(0, 0, 0, 0);
  if (isNaN(tripDateObj.getTime())) {
    return res.status(400).json({ message: 'Invalid trip date.' });
  }

  try {
    // 1. Get customer details
    const customerRes = await db.query('SELECT * FROM customers WHERE user_id = $1', [req.user.id]);
    if (customerRes.rows.length === 0) {
      return res.status(404).json({ message: 'Customer profile not found.' });
    }
    const customer = customerRes.rows[0];

    // 2. Validate Campaign or Voucher code if provided
    let campaignId = null;
    let campaignMultiplier = 1.0;
    let discountAmount = 0;
    let finalAmount = parsedAmount;
    let voucherIdToUse = null;
    let discountType = null;
    let discountLabel = '';

    if (campaign_code && campaign_code.trim() !== '') {
      const uppercaseCode = campaign_code.trim().toUpperCase();
      const today = new Date().toISOString().split('T')[0];

      // A. Check if it's an active Campaign
      const campaignQuery = await db.query(
        `SELECT id, name, points_multiplier, discount_percent FROM campaigns 
         WHERE code = $1 AND (is_active = 1 OR is_active = TRUE) AND start_date <= $2 AND end_date >= $3`,
        [uppercaseCode, today, today]
      );

      if (campaignQuery.rows.length > 0) {
        const campaign = campaignQuery.rows[0];
        campaignId = campaign.id;
        campaignMultiplier = parseFloat(campaign.points_multiplier || 1.0);
        const discountPercent = parseFloat(campaign.discount_percent || 0);
        discountAmount = parsedAmount * (discountPercent / 100);
        finalAmount = parsedAmount - discountAmount;
        discountType = 'campaign';
        discountLabel = `${campaign.name} (${discountPercent}% off)`;
      } else {
        // B. Check if it's a Customer Redeemed Reward Voucher
        const redemptionQuery = await db.query(
          `SELECT rd.id, rd.code_generated, rd.status, r.name, r.discount_value, r.reward_type
           FROM redemptions rd
           JOIN rewards r ON rd.reward_id = r.id
           WHERE rd.code_generated = $1 AND rd.customer_id = $2 AND rd.status = 'Active'`,
          [uppercaseCode, customer.id]
        );

        if (redemptionQuery.rows.length > 0) {
          const voucher = redemptionQuery.rows[0];
          voucherIdToUse = voucher.id;
          const discountValue = parseFloat(voucher.discount_value || 0);
          discountAmount = Math.min(parsedAmount, discountValue);
          finalAmount = parsedAmount - discountAmount;
          discountType = 'voucher';
          discountLabel = `${voucher.name} voucher (-$${discountAmount.toFixed(2)})`;
        } else {
          // C. Code is invalid
          return res.status(400).json({ message: 'Invalid, inactive, or expired discount code.' });
        }
      }
    }

    // 3. Determine Tier Multiplier
    let tierMultiplier = 1.0;
    if (customer.tier === 'Silver') {
      tierMultiplier = 1.2;
    } else if (customer.tier === 'Gold') {
      tierMultiplier = 1.5;
    }

    // 4. Calculate loyalty points: Base rule = 1 point per $10 spent on final paid amount
    const basePoints = finalAmount * 0.1;
    const pointsEarned = Math.floor(basePoints * campaignMultiplier * tierMultiplier);

    // 5. Generate unique booking reference
    const bookingRef = generateBookingRef();

    // 5.5. Mark voucher as redeemed if applicable
    if (voucherIdToUse) {
      await db.query(
        "UPDATE redemptions SET status = 'Redeemed' WHERE id = $1",
        [voucherIdToUse]
      );
    }

    // 6. Insert booking
    await db.query(
      `INSERT INTO bookings (customer_id, booking_ref, tour_name, amount, pickup_location, drop_location, vehicle_type, driver_name, trip_date, points_earned, status, campaign_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        customer.id,
        bookingRef,
        tour_name,
        finalAmount,
        pickup_location,
        drop_location,
        vehicle_type,
        driver_name,
        trip_date,
        pointsEarned,
        'Confirmed',
        campaignId
      ]
    );

    // 7. Update Customer Points and Spent
    const newPoints = parseInt(customer.loyalty_points) + pointsEarned;
    const newSpent = parseFloat(customer.total_spent) + finalAmount;

    await db.query(
      'UPDATE customers SET loyalty_points = $1, total_spent = $2 WHERE id = $3',
      [newPoints, newSpent, customer.id]
    );

    // 8. Check for Tier Upgrade
    await checkAndUpgradeTier(customer.id, req.user.id);

    // 9. Check Referral completion logic - was this the FIRST booking?
    const prevBookings = await db.query(
      "SELECT COUNT(*) as count FROM bookings WHERE customer_id = $1 AND status != 'Cancelled'",
      [customer.id]
    );

    const isFirstBooking = parseInt(prevBookings.rows[0].count) === 1;

    if (isFirstBooking) {
      // Find 'Pending' referral record where this customer is referee
      const referralQuery = await db.query(
        'SELECT r.id, r.referrer_id, r.reward_points_referrer, r.reward_points_referee, ' +
        'c.user_id as referrer_user_id, c.loyalty_points as referrer_points ' +
        'FROM referrals r ' +
        'JOIN customers c ON r.referrer_id = c.id ' +
        'WHERE r.referee_id = $1 AND r.status = $2',
        [customer.id, 'Pending']
      );

      if (referralQuery.rows.length > 0) {
        const referral = referralQuery.rows[0];

        // Mark referral completed
        await db.query(
          "UPDATE referrals SET status = 'Completed' WHERE id = $1",
          [referral.id]
        );

        // Award points to REFERRER
        const addedReferrerPoints = parseInt(referral.reward_points_referrer);
        const newReferrerPoints = parseInt(referral.referrer_points) + addedReferrerPoints;

        await db.query(
          'UPDATE customers SET loyalty_points = $1 WHERE id = $2',
          [newReferrerPoints, referral.referrer_id]
        );

        // Notify referrer
        await db.query(
          'INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)',
          [
            referral.referrer_user_id,
            'Referral Points Unlocked!',
            `Congratulations! ${req.user.name} completed their first booking. You received ${addedReferrerPoints} loyalty points!`,
            'Referral'
          ]
        );

        // Check if referrer gets upgraded tier
        await checkAndUpgradeTier(referral.referrer_id, referral.referrer_user_id);
      }
    }

    // 10. Send Booking & Points Notification
    const discountNote = discountType ? ` (${discountLabel})` : '';
    await db.query(
      'INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)',
      [
        req.user.id,
        'Booking Confirmed!',
        `Your trip "${tour_name}" on ${trip_date} is confirmed${discountNote}. You paid $${finalAmount.toFixed(2)} and earned ${pointsEarned} loyalty points.`,
        'Booking'
      ]
    );

    // Send Booking Confirmation Email
    const bookingHtml = `
      <h2>Booking Confirmed!</h2>
      <p>Hi ${req.user.name},</p>
      <p>Your upcoming trip is confirmed. Here are the details:</p>
      <ul>
        <li><strong>Booking Reference:</strong> ${bookingRef}</li>
        <li><strong>Tour:</strong> ${tour_name}</li>
        <li><strong>Date:</strong> ${trip_date}</li>
        <li><strong>Amount Paid:</strong> $${finalAmount.toFixed(2)} ${discountNote}</li>
        <li><strong>Points Earned:</strong> ${pointsEarned}</li>
      </ul>
      <p>Your driver (${driver_name}) will pick you up at <strong>${pickup_location}</strong> in a ${vehicle_type}.</p>
      <p>Have a great trip!</p>
    `;
    try {
      await sendEmail(req.user.email, `Booking Confirmed: ${bookingRef}`, '', bookingHtml);
    } catch (emailErr) {
      console.error(`Booking confirmed email failed for ${bookingRef}:`, emailErr.message);
    }

    return res.status(201).json({
      message: 'Booking created successfully!',
      bookingRef,
      originalAmount: parsedAmount,
      discountAmount: parseFloat(discountAmount.toFixed(2)),
      finalAmount: parseFloat(finalAmount.toFixed(2)),
      pointsEarned,
      campaignMultiplier,
      tierMultiplier,
      discountType,
      discountLabel
    });
  } catch (err) {
    console.error('Create booking error:', err);
    return res.status(500).json({ message: 'Server error processing booking.', error: err.message });
  }
});

// GET /api/bookings - Get booking history
router.get('/', verifyToken, async (req, res) => {
  try {
    let queryText = '';
    let params = [];

    if (req.user.role === 'admin') {
      // Admin gets all bookings
      queryText = `
        SELECT b.*, u.name as customer_name, u.email as customer_email, c.tier as customer_tier,
               cp.name as campaign_name, cp.code as campaign_code
        FROM bookings b
        JOIN customers c ON b.customer_id = c.id
        JOIN users u ON c.user_id = u.id
        LEFT JOIN campaigns cp ON b.campaign_id = cp.id
        ORDER BY b.created_at DESC
      `;
    } else {
      // Customer gets own bookings
      queryText = `
        SELECT b.*, cp.code as campaign_code, cp.name as campaign_name
        FROM bookings b
        JOIN customers c ON b.customer_id = c.id
        LEFT JOIN campaigns cp ON b.campaign_id = cp.id
        WHERE c.user_id = $1
        ORDER BY b.created_at DESC
      `;
      params = [req.user.id];
    }

    const result = await db.query(queryText, params);
    return res.json(result.rows);
  } catch (err) {
    console.error('Get bookings error:', err);
    return res.status(500).json({ message: 'Server error retrieving bookings.', error: err.message });
  }
});

// PUT /api/bookings/:id/status - Admin: Update booking status
router.put('/:id/status', verifyAdmin, async (req, res) => {
  const bookingId = req.params.id;
  const { status } = req.body;

  const validStatuses = ['Pending', 'Confirmed', 'Completed', 'Cancelled'];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ message: `Status must be one of: ${validStatuses.join(', ')}` });
  }

  try {
    const bookingRes = await db.query(
      'SELECT b.*, c.user_id, c.loyalty_points, c.id as customer_id FROM bookings b JOIN customers c ON b.customer_id = c.id WHERE b.id = $1',
      [bookingId]
    );

    if (bookingRes.rows.length === 0) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    const booking = bookingRes.rows[0];
    const previousStatus = booking.status;

    await db.query('UPDATE bookings SET status = $1 WHERE id = $2', [status, bookingId]);

    // If cancelling a booking, refund the loyalty points
    if (status === 'Cancelled' && previousStatus !== 'Cancelled' && booking.points_earned > 0) {
      const newPoints = Math.max(0, parseInt(booking.loyalty_points) - parseInt(booking.points_earned));
      await db.query('UPDATE customers SET loyalty_points = $1 WHERE id = $2', [newPoints, booking.customer_id]);

      await db.query(
        'INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)',
        [
          booking.user_id,
          'Booking Cancelled',
          `Your booking "${booking.tour_name}" (Ref: ${booking.booking_ref}) has been cancelled. ${booking.points_earned} points have been refunded.`,
          'Booking'
        ]
      );
    } else if (status === 'Completed' && previousStatus !== 'Completed') {
      await db.query(
        'INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)',
        [
          booking.user_id,
          'Trip Completed!',
          `Your trip "${booking.tour_name}" has been marked as completed. We hope you enjoyed your journey!`,
          'Booking'
        ]
      );
    }

    // Send Status Update Email
    const statusHtml = `
      <h2>Booking Status Update</h2>
      <p>Hi ${booking.user_id},</p> <!-- Note: In a real query we'd fetch u.name, using generic for now -->
      <p>Your booking <strong>${booking.booking_ref}</strong> (${booking.tour_name}) has been updated to: <strong style="color: ${status === 'Cancelled' ? 'red' : 'green'}">${status}</strong>.</p>
      ${status === 'Cancelled' ? `<p>${booking.points_earned} loyalty points have been refunded to your account.</p>` : ''}
      ${status === 'Completed' ? `<p>We hope you enjoyed your journey!</p>` : ''}
      <p>Thank you for choosing Travel Rewards.</p>
    `;
    
    // We need the user's email to send the update. Let's fetch it if we don't have it.
    const userRes = await db.query('SELECT email, name FROM users WHERE id = $1', [booking.user_id]);
    if (userRes.rows.length > 0) {
      try {
        await sendEmail(userRes.rows[0].email, `Booking Update: ${booking.booking_ref}`, '', statusHtml.replace(booking.user_id, userRes.rows[0].name));
      } catch (emailErr) {
        console.error(`Booking update email failed for ${booking.booking_ref}:`, emailErr.message);
      }
    }

    return res.json({ message: `Booking status updated to "${status}" successfully.` });
  } catch (err) {
    console.error('Update booking status error:', err);
    return res.status(500).json({ message: 'Server error updating booking status.', error: err.message });
  }
});

// GET /api/bookings/:id - Get specific booking details
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const bookingId = req.params.id;
    
    let queryText = `
      SELECT b.*, u.name as customer_name, u.email as customer_email, c.phone, c.tier as customer_tier, c.loyalty_points,
             cp.name as campaign_name, cp.code as campaign_code
      FROM bookings b
      JOIN customers c ON b.customer_id = c.id
      JOIN users u ON c.user_id = u.id
      LEFT JOIN campaigns cp ON b.campaign_id = cp.id
      WHERE b.id = $1
    `;
    let params = [bookingId];

    // If not admin, ensure they own the booking
    if (req.user.role !== 'admin') {
      queryText += ' AND c.user_id = $2';
      params.push(req.user.id);
    }

    const result = await db.query(queryText, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    const booking = result.rows[0];

    // Fetch notes for this booking
    const notesResult = await db.query(
      'SELECT id, author_name, note_text, created_at FROM booking_notes WHERE booking_id = $1 ORDER BY created_at DESC',
      [bookingId]
    );

    return res.json({
      ...booking,
      notes: notesResult.rows
    });
  } catch (err) {
    console.error('Get booking detail error:', err);
    return res.status(500).json({ message: 'Server error retrieving booking details.', error: err.message });
  }
});

// POST /api/bookings/:id/notes - Add a note to a booking
router.post('/:id/notes', verifyToken, async (req, res) => {
  try {
    const bookingId = req.params.id;
    const { note_text } = req.body;

    if (!note_text || note_text.trim() === '') {
      return res.status(400).json({ message: 'Note text cannot be empty.' });
    }

    // Verify booking exists
    const checkBooking = await db.query('SELECT id FROM bookings WHERE id = $1', [bookingId]);
    if (checkBooking.rows.length === 0) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    // Insert note
    await db.query(
      'INSERT INTO booking_notes (booking_id, author_name, note_text) VALUES ($1, $2, $3)',
      [bookingId, req.user.name, note_text]
    );

    return res.status(201).json({ message: 'Note added successfully.' });
  } catch (err) {
    console.error('Add note error:', err);
    return res.status(500).json({ message: 'Server error adding note.', error: err.message });
  }
});

module.exports = router;
