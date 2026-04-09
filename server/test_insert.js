const { pool } = require('./db');

async function testInsert() {
  const name = "TestClient-" + Date.now();
  const owner = "Yuri";
  const description = "Test Desc";
  
  try {
    console.log('Testing UPDATE...');
    let result = await pool.query(
      'UPDATE clients SET owner = $1, description = $2 WHERE name = $3 RETURNING *',
      [owner, description, name]
    );
    console.log('UPDATE ROWS:', result.rows.length);

    if (result.rows.length === 0) {
      console.log('Testing INSERT...');
      result = await pool.query(
        'INSERT INTO clients (name, owner, description) VALUES ($1, $2, $3) RETURNING *',
        [name, owner, description]
      );
      console.log('INSERT SUCCESS:', result.rows);
    }
    process.exit(0);
  } catch(e) {
    console.error('ERROR OCCURRED:', e.message);
    process.exit(1);
  }
}

testInsert();
