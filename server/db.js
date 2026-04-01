const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const initDb = async () => {
  try {
    // Create Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create Documents table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL DEFAULT 'pre-kickoff',
        client_name VARCHAR(255) NOT NULL,
        date TEXT NOT NULL,
        implantador VARCHAR(255),
        data JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ Banco de dados inicializado com sucesso.');
  } catch (err) {
    console.error('❌ Erro ao inicializar o banco de dados:', err.message);
    if (err.code === '3D000') {
      console.error('⚠️ ATENÇÃO: A base de dados "' + process.env.DATABASE_URL.split('/').pop() + '" não existe. Por favor, crie-a no PostgreSQL antes de continuar.');
    }
  }
};

module.exports = {
  pool,
  initDb
};
