require('dotenv').config();

// Force IPv4 for DNS resolution globally (must be before any other imports)
const dns = require('dns');
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware (helpful for debugging)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Import route files
const authRoutes = require('./routes/auth');
const bookingsRoutes = require('./routes/bookings');
const referralsRoutes = require('./routes/referrals');
const loyaltyRoutes = require('./routes/loyalty');
const rewardsRoutes = require('./routes/rewards');
const campaignsRoutes = require('./routes/campaigns');
const customersRoutes = require('./routes/customers');
const analyticsRoutes = require('./routes/analytics');
const workflowRoutes = require('./routes/workflow');
const messagingRoutes = require('./routes/messaging');
const exportRoutes = require('./routes/export');

// Register routes
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/referrals', referralsRoutes);
app.use('/api/loyalty', loyaltyRoutes);
app.use('/api/rewards', rewardsRoutes);
app.use('/api/campaigns', campaignsRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/workflow', workflowRoutes);
app.use('/api/messaging', messagingRoutes);
app.use('/api/export', exportRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'UP',
    database: db.getDbType(),
    timestamp: new Date().toISOString()
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    message: 'An internal server error occurred.',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// Initialize database and start the server
async function startServer() {
  await db.initializeDatabase();
  
  app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`🔗 Health check available at http://localhost:${PORT}/api/health`);
  });
}

startServer();
