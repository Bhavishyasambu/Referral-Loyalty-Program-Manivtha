const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

let dbClient = null;
let dbType = 'sqlite'; // Default fallback

// Parse environment variables (Support DATABASE_URL for cloud hosting like Render/Neon)
const pgConfig = process.env.DATABASE_URL 
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }, // Required for cloud databases
      connectionTimeoutMillis: 5000
    }
  : {
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'travel_loyalty',
      password: process.env.DB_PASSWORD || 'postgres',
      port: parseInt(process.env.DB_PORT || '5432'),
      ssl: process.env.DB_HOST && process.env.DB_HOST !== 'localhost' ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 5000 // Short timeout for fallback detection
    };

// SQLite file path
const sqliteDbPath = path.join(__dirname, 'travel_loyalty.db');

async function initializeDatabase() {
  const forceSqlite = process.env.DB_TYPE === 'sqlite';

  if (!forceSqlite) {
    try {
      console.log('Attempting to connect to PostgreSQL...');
      const pool = new Pool(pgConfig);
      // Test the connection
      await pool.query('SELECT NOW()');
      dbClient = pool;
      dbType = 'postgres';
      console.log('✅ Connected to PostgreSQL database successfully.');
      
      // Initialize Postgres tables if not present
      await createPostgresTables();
      return;
    } catch (err) {
      console.warn('⚠️ PostgreSQL connection failed. Falling back to SQLite.');
      console.warn('Reason:', err.message);
    }
  } else {
    console.log('ℹ️ DB_TYPE is set to sqlite. Skipping PostgreSQL attempt.');
  }

  // Fallback to SQLite
  try {
    console.log(`Initializing SQLite database at: ${sqliteDbPath}`);
    const db = new sqlite3.Database(sqliteDbPath);
    
    // Wrap SQLite in an object that mimics query pool
    dbClient = {
      query: (text, params = []) => {
        // Convert Postgres $1, $2 parameters to SQLite ? parameters only if params are provided
        const sqliteText = params && params.length > 0 ? text.replace(/\$\d+/g, '?') : text;
        return new Promise((resolve, reject) => {
          // Determine if it's a SELECT query or modifying query
          const isSelect = sqliteText.trim().match(/^(select|show|pragma)/i);
          if (isSelect) {
            db.all(sqliteText, params, (err, rows) => {
              if (err) return reject(err);
              resolve({ rows });
            });
          } else {
            db.run(sqliteText, params, function(err) {
              if (err) return reject(err);
              // Return rows as an empty array or simulate result
              resolve({ 
                rows: [], 
                rowCount: this.changes,
                insertId: this.lastID
              });
            });
          }
        });
      },
      close: () => new Promise((resolve, reject) => {
        db.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      })
    };
    dbType = 'sqlite';
    console.log('✅ SQLite database initialized successfully.');

    // Initialize SQLite tables if not present
    await createSqliteTables();
  } catch (err) {
    console.error('❌ Failed to initialize SQLite fallback:', err);
    process.exit(1);
  }
}

// Helper to query DB
async function query(text, params) {
  if (!dbClient) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return dbClient.query(text, params);
}

function getDbType() {
  return dbType;
}

// PostgreSQL Table Creation
async function createPostgresTables() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const seedPath = path.join(__dirname, 'seed.sql');

  try {
    // Check if tables already exist by checking "users" table
    const checkTable = await dbClient.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);

    if (!checkTable.rows[0].exists) {
      console.log('Creating PostgreSQL tables...');
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await dbClient.query(schemaSql);
      console.log('✅ PostgreSQL tables created.');

      // Check if campaigns are empty to seed
      const campaignsCount = await dbClient.query('SELECT COUNT(*) FROM campaigns');
      if (parseInt(campaignsCount.rows[0].count) === 0) {
        console.log('Seeding PostgreSQL database...');
        const seedSql = fs.readFileSync(seedPath, 'utf8');
        await dbClient.query(seedSql);
        
        // Seed default Admin
        const adminPasswordHash = await bcrypt.hash('admin123', 10);
        await dbClient.query(
          `INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4)`,
          ['admin@travelcompany.com', adminPasswordHash, 'Administrator', 'admin']
        );
        console.log('✅ PostgreSQL database seeded successfully.');
      }
    } else {
      console.log('PostgreSQL tables already exist. Skipping creation.');
    }

    // Always ensure booking_notes exists since it was added later
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS booking_notes (
        id SERIAL PRIMARY KEY,
        booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
        author_name VARCHAR(255) NOT NULL,
        note_text TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch (err) {
    console.error('Error initializing PostgreSQL tables:', err);
  }
}

// SQLite Table Creation (with syntax modifications)
async function createSqliteTables() {
  try {
    // Enable foreign keys
    await dbClient.query('PRAGMA foreign_keys = ON;');

    // Create tables sequentially
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT DEFAULT 'customer',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        phone TEXT,
        referral_code TEXT UNIQUE NOT NULL,
        referred_by_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
        tier TEXT DEFAULT 'Bronze',
        loyalty_points INTEGER DEFAULT 0,
        total_spent REAL DEFAULT 0.00,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS campaigns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        code TEXT UNIQUE NOT NULL,
        description TEXT,
        points_multiplier REAL DEFAULT 1.0,
        discount_percent REAL DEFAULT 0.0,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
        booking_ref TEXT UNIQUE NOT NULL,
        tour_name TEXT NOT NULL,
        amount REAL NOT NULL,
        pickup_location TEXT NOT NULL,
        drop_location TEXT NOT NULL,
        vehicle_type TEXT NOT NULL,
        driver_name TEXT NOT NULL,
        trip_date TEXT NOT NULL,
        points_earned INTEGER DEFAULT 0,
        status TEXT DEFAULT 'Confirmed',
        campaign_id INTEGER REFERENCES campaigns(id) ON DELETE SET NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS booking_notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
        author_name TEXT NOT NULL,
        note_text TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS referrals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        referrer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
        referee_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
        code_used TEXT NOT NULL,
        status TEXT DEFAULT 'Pending',
        reward_points_referrer INTEGER DEFAULT 250,
        reward_points_referee INTEGER DEFAULT 100,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS rewards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        points_cost INTEGER NOT NULL,
        discount_value REAL NOT NULL,
        reward_type TEXT DEFAULT 'Voucher',
        is_active INTEGER DEFAULT 1
      );
    `);

    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS redemptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
        reward_id INTEGER REFERENCES rewards(id) ON DELETE CASCADE,
        points_spent INTEGER NOT NULL,
        code_generated TEXT UNIQUE NOT NULL,
        status TEXT DEFAULT 'Active',
        redeemed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT DEFAULT 'System',
        is_read INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ SQLite tables check/creation complete.');

    // Seed data check
    const campaignsCount = await dbClient.query('SELECT COUNT(*) as count FROM campaigns');
    if (campaignsCount.rows[0].count === 0) {
      console.log('Seeding SQLite database...');
      
      // Campaigns
      await dbClient.query(`
        INSERT INTO campaigns (name, code, description, points_multiplier, discount_percent, start_date, end_date, is_active)
        VALUES 
        ('Summer Double Points', 'SUMMER2X', 'Earn double points on all bookings made during June and July!', 2.0, 0.0, '2026-06-01', '2026-07-31', 1),
        ('Monsoon Escape Discount', 'RAINY10', 'Get 10% off and 1.5x points on hill station trips.', 1.5, 10.0, '2026-06-01', '2026-08-31', 1),
        ('Year End Special', 'WINTER15', '1.2x points and 15% discount on international tours.', 1.2, 15.0, '2026-11-01', '2026-12-31', 1);
      `);

      // Rewards
      await dbClient.query(`
        INSERT INTO rewards (name, description, points_cost, discount_value, reward_type, is_active)
        VALUES
        ('₹15 Off Ride', 'Get ₹15 off on your next city tour or airport pickup booking.', 150, 15.0, 'Voucher', 1),
        ('₹40 Travel Voucher', 'Redeem ₹40 discount on any outstation tour booking.', 300, 40.0, 'Voucher', 1),
        ('₹100 Luxury Getaway Coupon', 'Get a massive ₹100 off on premium luxury packages.', 600, 100.0, 'Voucher', 1),
        ('Free Sedan Upgrade', 'Upgrade your vehicle from Hatchback to Sedan for free (valued at ₹25).', 200, 25.0, 'FreeUpgrade', 1);
      `);

      // Default Admin Account
      const adminPasswordHash = await bcrypt.hash('admin123', 10);
      await dbClient.query(
        'INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4)',
        ['admin@travelcompany.com', adminPasswordHash, 'Administrator', 'admin']
      );

      console.log('✅ SQLite database seeded successfully.');
    }
  } catch (err) {
    console.error('Error initializing SQLite tables/seeds:', err);
  }
}

module.exports = {
  initializeDatabase,
  query,
  getDbType
};
