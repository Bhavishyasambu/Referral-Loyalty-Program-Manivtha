-- Seed Data for Travel Referral & Loyalty Program

-- Seed Campaigns
INSERT INTO campaigns (name, code, description, points_multiplier, discount_percent, start_date, end_date, is_active)
VALUES 
('Summer Double Points', 'SUMMER2X', 'Earn double points on all bookings made during June and July!', 2.00, 0.00, '2026-06-01', '2026-07-31', TRUE),
('Monsoon Escape Discount', 'RAINY10', 'Get 10% off and 1.5x points on hill station trips.', 1.50, 10.00, '2026-06-01', '2026-08-31', TRUE),
('Year End Special', 'WINTER15', '1.2x points and 15% discount on international tours.', 1.20, 15.00, '2026-11-01', '2026-12-31', TRUE);

-- Seed Rewards
INSERT INTO rewards (name, description, points_cost, discount_value, reward_type, is_active)
VALUES
('₹15 Off Ride', 'Get ₹15 off on your next city tour or airport pickup booking.', 150, 15.00, 'Voucher', TRUE),
('₹40 Travel Voucher', 'Redeem ₹40 discount on any outstation tour booking.', 300, 40.00, 'Voucher', TRUE),
('₹100 Luxury Getaway Coupon', 'Get a massive ₹100 off on premium luxury packages.', 600, 100.00, 'Voucher', TRUE),
('Free Sedan Upgrade', 'Upgrade your vehicle from Hatchback to Sedan for free (valued at ₹25).', 200, 25.00, 'FreeUpgrade', TRUE);
