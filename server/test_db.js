const { Pool } = require('pg');

const connectionString = 'postgresql://postgres:kFVcLuBa1Vk6pfhY@db.fmpjttxhawqhgtpvoijx.supabase.co:5432/postgres';

const pool = new Pool({
  connectionString,
  connectionTimeoutMillis: 5000,
});

console.log('🔄 Iniciando teste de conexão local...');

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Erro de conexão:', err.message);
  } else {
    console.log('✅ Conexão estabelecida com sucesso!');
    console.log('⏰ Horário do database:', res.rows[0].now);
  }
  pool.end();
  process.exit();
});
