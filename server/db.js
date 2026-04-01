const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const initDb = async () => {
  try {
    // Original Tables
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

    // --- Gamification Tables ---

    // 1. User Roles (admin / member) — set manually in DB
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_roles (
        user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL DEFAULT 'member'
      );
    `);

    // 2. Validation Rules — customizable list for task validation
    await pool.query(`
      CREATE TABLE IF NOT EXISTS validation_rules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Task Types — catalog of tasks with points
    await pool.query(`
      CREATE TABLE IF NOT EXISTS task_types (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        points INT NOT NULL DEFAULT 0,
        tipo VARCHAR(50) NOT NULL DEFAULT 'Individual',
        validation_rule_id UUID REFERENCES validation_rules(id) ON DELETE SET NULL,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Task Completions — records of tasks done (pending approval)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS task_completions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        task_type_id UUID REFERENCES task_types(id) ON DELETE SET NULL,
        points_awarded INT NOT NULL DEFAULT 0,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        notes TEXT,
        approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
        approved_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5. Bonuses — team bonus points awarded by admins
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bonuses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        points INT NOT NULL DEFAULT 0,
        reason TEXT,
        awarded_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 6. Store Categories (Faixas) — customizable
    await pool.query(`
      CREATE TABLE IF NOT EXISTS store_categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 7. Store Items — items available for redemption
    await pool.query(`
      CREATE TABLE IF NOT EXISTS store_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        cost_points INT NOT NULL DEFAULT 0,
        stock INT NOT NULL DEFAULT 0,
        category_id UUID REFERENCES store_categories(id) ON DELETE SET NULL,
        notes TEXT,
        image_url TEXT,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 8. Redemptions — user redemption requests
    await pool.query(`
      CREATE TABLE IF NOT EXISTS redemptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        item_id UUID REFERENCES store_items(id) ON DELETE SET NULL,
        item_name TEXT NOT NULL,
        points_spent INT NOT NULL DEFAULT 0,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        fulfilled_by UUID REFERENCES users(id) ON DELETE SET NULL,
        fulfilled_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 9. Featured Prize — monthly prize highlight
    await pool.query(`
      CREATE TABLE IF NOT EXISTS featured_prize (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        month VARCHAR(7) NOT NULL UNIQUE,
        title TEXT NOT NULL,
        description TEXT,
        image_url TEXT,
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ Banco de dados inicializado com sucesso (tabelas de gamificação incluídas).');
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
