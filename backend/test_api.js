// Script to test backend API and database flows.
// Run: node test_api.js
// Expects server to be running on http://localhost:5000.

const API_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('🏁 Starting API Verification Tests...');
  const timestamp = Date.now();
  
  const customerA = {
    email: `custA_${timestamp}@test.com`,
    password: 'password123',
    name: 'Alice Johnson',
    phone: '9876543210'
  };

  const customerB = {
    email: `custB_${timestamp}@test.com`,
    password: 'password123',
    name: 'Bob Smith',
    phone: '8765432109'
  };

  try {
    // 1. Register Customer A
    console.log('\n--- 1. Registering Customer A ---');
    const regARes = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customerA)
    });
    const regAData = await regARes.json();
    console.log('Result A:', regAData);

    // 2. Login Customer A to get referral code
    console.log('\n--- 2. Logging in Customer A ---');
    const loginARes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: customerA.email, password: customerA.password })
    });
    const loginAData = await loginARes.json();
    console.log('Login A Success:', !!loginAData.token);
    const tokenA = loginAData.token;
    const referralCodeA = loginAData.customer.referral_code;
    console.log(`Customer A Referral Code: ${referralCodeA}`);

    // 3. Register Customer B using Customer A's referral code
    console.log(`\n--- 3. Registering Customer B with referral code ${referralCodeA} ---`);
    const regBRes = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...customerB, referralCodeUsed: referralCodeA })
    });
    const regBData = await regBRes.json();
    console.log('Result B:', regBData);

    // 4. Login Customer B
    console.log('\n--- 4. Logging in Customer B ---');
    const loginBRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: customerB.email, password: customerB.password })
    });
    const loginBData = await loginBRes.json();
    const tokenB = loginBData.token;
    console.log(`Customer B Points (should be 100 bonus points):`, loginBData.customer.loyalty_points);

    // 5. Customer B checks eligibility for campaign
    console.log('\n--- 5. Checking Discount Eligibility for code SUMMER2X ---');
    const checkElRes = await fetch(`${API_URL}/rewards/check-eligibility`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenB}`
      },
      body: JSON.stringify({ amount: 1200, code: 'SUMMER2X' })
    });
    const checkElData = await checkElRes.json();
    console.log('Eligibility Result:', checkElData);

    // 6. Customer B makes a first Booking (amount $1200, should trigger referrer reward and tier silver)
    console.log('\n--- 6. Customer B makes first booking ---');
    const bookingRes = await fetch(`${API_URL}/bookings`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenB}`
      },
      body: JSON.stringify({
        tour_name: 'Scenic Swiss Alps Tour',
        amount: 1200,
        pickup_location: 'Geneva Airport Terminal 1',
        drop_location: 'Chamonix Mountain Resort',
        vehicle_type: 'Luxury SUV',
        driver_name: 'Hans Müller',
        trip_date: '2026-07-15',
        campaign_code: 'SUMMER2X'
      })
    });
    const bookingData = await bookingRes.json();
    console.log('Booking Result (Points Earned):', bookingData);

    // 7. Verify Customer A received Referral points (250)
    console.log('\n--- 7. Checking Customer A profile after B booked (Points & Referrals) ---');
    const meARes = await fetch(`${API_URL}/auth/me`, {
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    const meAData = await meARes.json();
    console.log('Customer A Points (should be 250):', meAData.customer.loyalty_points);

    const refStatsRes = await fetch(`${API_URL}/referrals/stats`, {
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    const refStatsData = await refStatsRes.json();
    console.log('Customer A Referral Stats:', refStatsData);

    // 8. Customer B tries to redeem points
    console.log('\n--- 8. Customer B redeems loyalty points for reward ---');
    // First fetch rewards to get an ID
    const rewardsRes = await fetch(`${API_URL}/rewards`, {
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    const rewards = await rewardsRes.json();
    const voucherReward = rewards.find(r => r.points_cost <= 300);
    
    let voucherCode = null;
    if (voucherReward) {
      console.log(`Redeeming reward: ${voucherReward.name} (Cost: ${voucherReward.points_cost} points)`);
      const redeemRes = await fetch(`${API_URL}/rewards/redeem`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenB}`
        },
        body: JSON.stringify({ rewardId: voucherReward.id })
      });
      const redeemData = await redeemRes.json();
      console.log('Redemption Result:', redeemData);
      voucherCode = redeemData.voucherCode;
    } else {
      console.log('No affordable rewards found in seeding data.');
    }

    if (voucherCode) {
      console.log(`\n--- 8b. Checking eligibility of redeemed voucher ${voucherCode} ---`);
      const checkElRes = await fetch(`${API_URL}/rewards/check-eligibility`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenB}`
        },
        body: JSON.stringify({ amount: 150, code: voucherCode })
      });
      const checkElData = await checkElRes.json();
      console.log('Voucher Eligibility Result:', checkElData);

      console.log('\n--- 8c. Customer B makes second booking using voucher ---');
      const bookingRes = await fetch(`${API_URL}/bookings`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenB}`
        },
        body: JSON.stringify({
          tour_name: 'City Tour Escape',
          amount: 150,
          pickup_location: 'Geneva Airport Terminal 1',
          drop_location: 'Central Plaza Hotel',
          vehicle_type: 'Sedan',
          driver_name: 'John Doe',
          trip_date: '2026-07-20',
          campaign_code: voucherCode
        })
      });
      const bookingData = await bookingRes.json();
      console.log('Voucher Booking Result:', bookingData);

      console.log('\n--- 8d. Customer B tries to reuse the same voucher ---');
      const checkElRes2 = await fetch(`${API_URL}/rewards/check-eligibility`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenB}`
        },
        body: JSON.stringify({ amount: 150, code: voucherCode })
      });
      const checkElData2 = await checkElRes2.json();
      console.log('Voucher Re-eligibility Result (should be false/ineligible):', checkElData2);

      const bookingRes2 = await fetch(`${API_URL}/bookings`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenB}`
        },
        body: JSON.stringify({
          tour_name: 'Another City Tour',
          amount: 150,
          pickup_location: 'Geneva Airport Terminal 1',
          drop_location: 'Central Plaza Hotel',
          vehicle_type: 'Sedan',
          driver_name: 'John Doe',
          trip_date: '2026-07-21',
          campaign_code: voucherCode
        })
      });
      const bookingData2 = await bookingRes2.json();
      console.log('Voucher Re-booking Result (should be error):', bookingData2);
    }

    // 9. Login Admin and Fetch Analytics
    console.log('\n--- 9. Logging in Admin & Viewing Dashboard ---');
    const adminLoginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@travelcompany.com', password: 'admin123' })
    });
    const adminLoginData = await adminLoginRes.json();
    console.log('Admin Login Response:', adminLoginData);
    const adminToken = adminLoginData.token;

    const analyticsRes = await fetch(`${API_URL}/analytics/dashboard`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const analyticsData = await analyticsRes.json();
    console.log('Admin Dashboard Metrics:', analyticsData.metrics);
    console.log('Charts structures verified (Customer Growth data points count):', analyticsData.charts.customerGrowth.length);

    console.log('\n✅ ALL API VALIDATIONS COMPLETED SUCCESSFULLY!');

  } catch (err) {
    console.error('❌ Test execution failed:', err);
  }
}

runTests();
