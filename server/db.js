const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Desabilita verificação de certificado TLS globalmente (necessário para Supabase na Hostinger)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const dbUrl = process.env.DATABASE_URL || '';

const pool = new Pool({
  connectionString: dbUrl,
  ssl: dbUrl.includes('localhost') || dbUrl.length === 0 ? false : { rejectUnauthorized: false }
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

    // 10. Clients Registry
    await pool.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL UNIQUE,
        owner VARCHAR(255),
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 11. Projects Panel — active projects monitor
    await pool.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        asana_gid VARCHAR(255) UNIQUE,
        priority VARCHAR(50) DEFAULT 'Média',
        name VARCHAR(255) NOT NULL UNIQUE,
        client_name VARCHAR(255),
        progress INT DEFAULT 0,
        status VARCHAR(100) DEFAULT 'Em andamento',
        is_live BOOLEAN DEFAULT FALSE,
        solution_hired VARCHAR(255),
        analyst VARCHAR(255),
        whatsapp_group TEXT,
        monthly_fee NUMERIC(10, 2) DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Migração: Adicionar asana_gid se não existir (para bancos legados)
    try {
      await pool.query('ALTER TABLE projects ADD COLUMN IF NOT EXISTS asana_gid VARCHAR(255) UNIQUE');
      await pool.query('ALTER TABLE projects ADD CONSTRAINT projects_name_unique UNIQUE (name)');
    } catch (e) {
      // Ignora se a constraint já existir
    }

    // 12. Shared Checklists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS checklists (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        text TEXT NOT NULL,
        completed BOOLEAN DEFAULT FALSE,
        category VARCHAR(50) DEFAULT 'Geral',
        assigned_to UUID REFERENCES users(id) ON DELETE CASCADE,
        assigned_name VARCHAR(255),
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        due_date DATE,
        portfolio_name VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Migração: Checklist Due Date e Portfolio + FORÇAR Multi-user support
    try {
      await pool.query('ALTER TABLE checklists ADD COLUMN IF NOT EXISTS due_date DATE');
      await pool.query('ALTER TABLE checklists ADD COLUMN IF NOT EXISTS portfolio_name VARCHAR(255)');
      
      // 1. Descobrir e remover TODAS as constraints que apontam para assigned_to
      await pool.query(`
        DO $$ 
        DECLARE 
          r RECORD;
        BEGIN
          FOR r IN (SELECT constraint_name FROM information_schema.key_column_usage 
                    WHERE table_name = 'checklists' AND column_name = 'assigned_to') 
          LOOP
            EXECUTE 'ALTER TABLE checklists DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name) || ' CASCADE';
          END LOOP;
        END $$;
      `);

      // 2. Tentar converter o tipo de forma definitiva
      await pool.query('ALTER TABLE checklists ALTER COLUMN assigned_to TYPE VARCHAR(1000) USING assigned_to::VARCHAR');
      console.log('✅ Coluna assigned_to convertida para VARCHAR com sucesso.');
    } catch (e) {
      console.log('Aviso na migração crítica de checklist:', e.message);
    }

    // 13. Implantadores
    await pool.query(`
      CREATE TABLE IF NOT EXISTS implantadores (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 14. Custom Roles — funções customizadas de acesso
    await pool.query(`
      CREATE TABLE IF NOT EXISTS custom_roles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 15. Role Permissions — permissões por função customizada
    await pool.query(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        role_id UUID REFERENCES custom_roles(id) ON DELETE CASCADE,
        view_name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(role_id, view_name)
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
