const BASE_URL = 'http://localhost:5000/api';
// We need a token. I'll try to find an admin user and use their ID if possible,
// but testing the endpoint without token should at least give 401.

async function test() {
  try {
    const res = await fetch(`${BASE_URL}/admin/users/123/points`, { method: 'DELETE' });
    const data = await res.json();
    console.log('Response:', data);
  } catch (e) {
    console.error('Fetch Error:', e.message);
  }
}

test();
