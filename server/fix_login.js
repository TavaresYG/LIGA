const { pool } = require('./db');
const bcrypt = require('bcryptjs');

async function fix() {
  try {
    const hash = await bcrypt.hash('liga123', 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE username = $2', [hash, 'yuri.tavares']);
    console.log('✅ Senha de "yuri.tavares" atualizada para: liga123');
    
    // Verificando se o usuário existe e as credenciais batem
    const res = await pool.query('SELECT * FROM users WHERE username = $1', ['yuri.tavares']);
    if (res.rows.length > 0) {
      console.log('✅ Usuário encontrado no banco.');
      const match = await bcrypt.compare('liga123', res.rows[0].password_hash);
      console.log('✅ Teste de hash interno:', match ? 'SUCESSO' : 'FALHA');
    }
  } catch (err) {
    console.error('❌ Erro:', err);
  } finally {
    await pool.end();
  }
}

fix();
