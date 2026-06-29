async function test() {
  try {
    const loginRes = await fetch('http://127.0.0.1:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@travelcompany.com', password: 'admin123' })
    });
    const loginData = await loginRes.json();
    
    if (!loginData.token) {
      console.log('Login failed', loginData);
      return;
    }

    const res = await fetch('http://127.0.0.1:5000/api/campaigns', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${loginData.token}`
      },
      body: JSON.stringify({
        name: "Summer Dammaka",
        code: "SUMMER26XX",
        description: "Earn points",
        points_multiplier: 1.2,
        discount_percent: 5,
        start_date: "2026-06-30",
        end_date: "2026-07-10"
      })
    });
    
    const text = await res.text();
    console.log('Response:', res.status, text);
  } catch (err) {
    console.error("Fetch error:", err);
  }
}

test();
