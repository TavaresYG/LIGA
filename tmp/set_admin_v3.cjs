const path = require('path');
const serverDir = 'c:/Users/liga/Desktop/Python/liga-web/server';
const pgPath = path.join(serverDir, 'node_modules', 'pg');
const dotenvPath = path.join(serverDir, 'node_modules', 'dotenv');

const { Pool } = require(pgPath);
require(dotenvPath).config({ path: path.join(serverDir, '.env') });

const { initDb } = require(path.join(serverDir, 'db.js'));

const setAdmin = async () => {
  try {
    // 1. Ensure tables exist
    console.log('⏳ Inicializando banco de dados...');
    await initDb();

    // 2. Set admin
    const username = 'Yuri.Tavares';
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    const userRes = await pool.query('SELECT id, name FROM users WHERE username = $1', [username]);

    if (userRes.rows.length === 0) {
      console.log(`❌ Usuário "${username}" não encontrado no banco de dados. Certifique-se de que o usuário já criou uma conta no sistema.`);
      process.exit(1);
    }

    const userId = userRes.rows[0].id;
    const userName = userRes.rows[0].name;

    await pool.query(`
      INSERT INTO user_roles (user_id, role)
      VALUES ($1, 'admin')
      ON CONFLICT (user_id) DO UPDATE SET role = 'admin'
    `, [userId]);

    console.log(`✅ Sucesso! O usuário "${userName}" (@${username}) agora é ADMINISTRADOR.`);
    await pool.end();
  } catch (err) {
    console.error('❌ Erro:', err.message);
  }
};

setAdmin();
