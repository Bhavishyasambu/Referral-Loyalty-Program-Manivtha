-- Database Schema for Travel Referral & Loyalty Program
-- Suitable for PostgreSQL

-- Drop tables if they exist (for reset purposes)
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS redemptions CASCADE;
DROP TABLE IF EXISTS rewards CASCADE;
DROP TABLE IF EXISTS referrals CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS campaigns CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1. Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'customer', -- 'customer' or 'admin'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Customers Table (Extends User with loyalty details)
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    phone VARCHAR(50),
    referral_code VARCHAR(50) UNIQUE NOT NULL,
    referred_by_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    tier VARCHAR(50) DEFAULT 'Bronze', -- 'Bronze', 'Silver', 'Gold'
    loyalty_points INTEGER DEFAULT 0,
    total_spent DECIMAL(12, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Campaigns Table (Marketing Promos & Multipliers)
CREATE TABLE campaigns (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    points_multiplier DECIMAL(5, 2) DEFAULT 1.0, -- e.g. 2.00 for double points
    discount_percent DECIMAL(5, 2) DEFAULT 0.0,  -- e.g. 10.00 for 10% off
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Bookings Table (Travel specific details included)
CREATE TABLE bookings (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    booking_ref VARCHAR(100) UNIQUE NOT NULL,
    tour_name VARCHAR(255) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    pickup_location VARCHAR(255) NOT NULL,
    drop_location VARCHAR(255) NOT NULL,
    vehicle_type VARCHAR(100) NOT NULL,
    driver_name VARCHAR(100) NOT NULL,
    trip_date DATE NOT NULL,
    points_earned INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'Confirmed', -- 'Pending', 'Confirmed', 'Completed', 'Cancelled'
    campaign_id INTEGER REFERENCES campaigns(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Referrals Table (Tracks who referred whom and status)
CREATE TABLE referrals (
    id SERIAL PRIMARY KEY,
    referrer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    referee_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    code_used VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending', -- 'Pending' (registered but no booking), 'Completed' (made first booking)
    reward_points_referrer INTEGER DEFAULT 250, -- Points awarded to referrer when referee books
    reward_points_referee INTEGER DEFAULT 100,  -- Points awarded to referee on signup
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Rewards Table (Redeemable loyalty vouchers)
CREATE TABLE rewards (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    points_cost INTEGER NOT NULL,
    discount_value DECIMAL(10, 2) NOT NULL, -- Dollar value of discount, e.g. 50.00 for $50 off
    reward_type VARCHAR(50) DEFAULT 'Voucher', -- 'Voucher', 'Cashback', 'FreeUpgrade'
    is_active BOOLEAN DEFAULT TRUE
);

-- 7. Redemptions Table (Vouchers redeemed by customers)
CREATE TABLE redemptions (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    reward_id INTEGER REFERENCES rewards(id) ON DELETE CASCADE,
    points_spent INTEGER NOT NULL,
    code_generated VARCHAR(50) UNIQUE NOT NULL, -- e.g. LOY-RED-XXXXXX
    status VARCHAR(50) DEFAULT 'Active', -- 'Active', 'Redeemed', 'Expired'
    redeemed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Notifications Table
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'System', -- 'Loyalty', 'Referral', 'Booking', 'System'
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
