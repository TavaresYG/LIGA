async function login(identifier, password) {
  try {
    console.log(`Trying to log in as ${identifier}...`);
    const res = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password })
    });
    
    const text = await res.text();
    console.log(`Response Status: ${res.status}`);
    console.log(`Response Body: ${text}`);
  } catch(e) {
    console.error('Fetch error:', e);
  }
}

login('yuri.tavares', 'admin123').then(() => login('yuri.tavares', 'Yuri@5865'));
