const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  try {
    await pool.query('ALTER TABLE task_completions ADD COLUMN IF NOT EXISTS attachments JSONB;');
    console.log('✅ Column attachments added to task_completions');
  } catch (err) {
    console.error('❌ Error adding column:', err.message);
  } finally {
    await pool.end();
  }
}

run();
