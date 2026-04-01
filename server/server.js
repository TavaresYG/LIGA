const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { pool, initDb } = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

initDb();

// --- Middlewares ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token não fornecido' });
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token inválido ou expirado' });
    req.user = user;
    next();
  });
};

const requireAdmin = async (req, res, next) => {
  try {
    const result = await pool.query('SELECT role FROM user_roles WHERE user_id = $1', [req.user.id]);
    if (result.rows.length === 0 || result.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Acesso restrito a administradores' });
    }
    next();
  } catch (err) {
    res.status(500).json({ error: 'Erro ao verificar permissão' });
  }
};

// ===================== AUTH ROUTES =====================

app.post('/api/auth/signup', async (req, res) => {
  const { name, username, email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (name, username, email, password_hash) VALUES ($1, $2, $3, $4) RETURNING id, name, username, email',
      [name, username, email, hashedPassword]
    );
    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET);
    res.status(201).json({ user, token });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Usuário ou e-mail já cadastrado' });
    res.status(500).json({ error: 'Erro no servidor: ' + err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { identifier, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1 OR username = $1', [identifier]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Usuário não encontrado' });
    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) return res.status(401).json({ error: 'Senha incorreta' });
    const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET);
    delete user.password_hash;
    res.json({ user, token });
  } catch (err) {
    res.status(500).json({ error: 'Erro no servidor: ' + err.message });
  }
});

// Get current user role
app.get('/api/me/role', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT role FROM user_roles WHERE user_id = $1', [req.user.id]);
    res.json({ role: result.rows.length > 0 ? result.rows[0].role : 'member' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar role' });
  }
});

// Get all users (admin use)
app.get('/api/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, username, email FROM users ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar usuários' });
  }
});

// ===================== DOCUMENTS ROUTES =====================

app.get('/api/documents', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM documents WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar documentos' });
  }
});

app.post('/api/documents', authenticateToken, async (req, res) => {
  const { type, clientName, date, implantador, data } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO documents (user_id, type, client_name, date, implantador, data) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [req.user.id, type || 'pre-kickoff', clientName, date, implantador, data]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao salvar documento: ' + err.message });
  }
});

app.put('/api/documents/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { clientName, date, implantador, data } = req.body;
  try {
    const result = await pool.query(
      'UPDATE documents SET client_name = $1, date = $2, implantador = $3, data = $4 WHERE id = $5 AND user_id = $6 RETURNING *',
      [clientName, date, implantador, data, id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Documento não encontrado ou sem permissão' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar documento' });
  }
});

app.delete('/api/documents/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM documents WHERE id = $1 AND user_id = $2 RETURNING id', [id, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Documento não encontrado ou sem permissão' });
    res.json({ message: 'Documento deletado com sucesso', id });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao deletar documento' });
  }
});

// ===================== RANKING ROUTES =====================

// GET /api/ranking?period=geral|semanal|mensal|custom&from=YYYY-MM-DD&to=YYYY-MM-DD
app.get('/api/ranking', authenticateToken, async (req, res) => {
  const { period, from, to } = req.query;

  let dateFilter = '';
  const now = new Date();

  if (period === 'semanal') {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1);
    weekStart.setHours(0, 0, 0, 0);
    dateFilter = `AND tc.created_at >= '${weekStart.toISOString()}'`;
  } else if (period === 'mensal') {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    dateFilter = `AND tc.created_at >= '${monthStart.toISOString()}'`;
  } else if (period === 'custom' && from && to) {
    dateFilter = `AND tc.created_at BETWEEN '${from}' AND '${to} 23:59:59'`;
  }

  try {
    const rankingQuery = `
      SELECT
        u.id,
        u.name,
        u.username,
        COALESCE(SUM(CASE WHEN tc.status = 'approved' ${dateFilter} THEN tc.points_awarded ELSE 0 END), 0) AS task_points,
        COALESCE(SUM(CASE WHEN b.created_at IS NOT NULL ${dateFilter.replace('tc.created_at', 'b.created_at')} THEN b.points ELSE 0 END), 0) AS bonus_points,
        COALESCE((SELECT SUM(points_spent) FROM redemptions r WHERE r.user_id = u.id AND r.status != 'cancelled'), 0) AS total_redeemed
      FROM users u
      LEFT JOIN task_completions tc ON tc.user_id = u.id
      LEFT JOIN bonuses b ON b.user_id = u.id
      GROUP BY u.id, u.name, u.username
      ORDER BY (task_points + bonus_points) DESC
    `;

    const result = await pool.query(rankingQuery);

    const ranked = result.rows.map((row, index) => ({
      position: index + 1,
      id: row.id,
      name: row.name,
      username: row.username,
      taskPoints: parseInt(row.task_points),
      bonusPoints: parseInt(row.bonus_points),
      totalRedeemed: parseInt(row.total_redeemed),
      balance: parseInt(row.task_points) + parseInt(row.bonus_points) - parseInt(row.total_redeemed),
    }));

    res.json(ranked);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar ranking: ' + err.message });
  }
});

// Weekly TOP 1
app.get('/api/ranking/top-weekly', authenticateToken, async (req, res) => {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay() + 1);
  weekStart.setHours(0, 0, 0, 0);

  try {
    const result = await pool.query(`
      SELECT u.id, u.name, u.username,
        COALESCE(SUM(tc.points_awarded), 0) AS points
      FROM users u
      LEFT JOIN task_completions tc ON tc.user_id = u.id AND tc.status = 'approved' AND tc.created_at >= $1
      LEFT JOIN bonuses b ON b.user_id = u.id AND b.created_at >= $1
      GROUP BY u.id, u.name, u.username
      ORDER BY points DESC LIMIT 1
    `, [weekStart.toISOString()]);
    res.json(result.rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar top semanal' });
  }
});

// Monthly TOP 1
app.get('/api/ranking/top-monthly', authenticateToken, async (req, res) => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  try {
    const result = await pool.query(`
      SELECT u.id, u.name, u.username,
        COALESCE(SUM(tc.points_awarded), 0) + COALESCE((SELECT SUM(b.points) FROM bonuses b WHERE b.user_id = u.id AND b.created_at >= $1), 0) AS points
      FROM users u
      LEFT JOIN task_completions tc ON tc.user_id = u.id AND tc.status = 'approved' AND tc.created_at >= $1
      GROUP BY u.id, u.name, u.username
      ORDER BY points DESC LIMIT 1
    `, [monthStart.toISOString()]);
    res.json(result.rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar top mensal' });
  }
});

// ===================== VALIDATION RULES =====================

app.get('/api/validation-rules', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM validation_rules ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar regras' });
  }
});

app.post('/api/validation-rules', authenticateToken, requireAdmin, async (req, res) => {
  const { name } = req.body;
  try {
    const result = await pool.query('INSERT INTO validation_rules (name) VALUES ($1) RETURNING *', [name]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Regra já existe' });
    res.status(500).json({ error: 'Erro ao criar regra' });
  }
});

// ===================== TASK TYPES =====================

app.get('/api/task-types', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT tt.*, vr.name AS validation_rule_name
      FROM task_types tt
      LEFT JOIN validation_rules vr ON vr.id = tt.validation_rule_id
      WHERE tt.active = TRUE ORDER BY tt.name
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar tarefas' });
  }
});

app.post('/api/task-types', authenticateToken, requireAdmin, async (req, res) => {
  const { name, points, tipo, validationRuleId } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO task_types (name, points, tipo, validation_rule_id, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, points, tipo || 'Individual', validationRuleId || null, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar tarefa: ' + err.message });
  }
});

app.put('/api/task-types/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, points, tipo, validationRuleId, active } = req.body;
  try {
    const result = await pool.query(
      'UPDATE task_types SET name=$1, points=$2, tipo=$3, validation_rule_id=$4, active=$5 WHERE id=$6 RETURNING *',
      [name, points, tipo, validationRuleId || null, active, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar tarefa' });
  }
});

// ===================== TASK COMPLETIONS =====================

// Admin registers a task completion for a member
app.post('/api/task-completions', authenticateToken, requireAdmin, async (req, res) => {
  const { userId, taskTypeId, notes } = req.body;
  try {
    const taskResult = await pool.query('SELECT points FROM task_types WHERE id = $1', [taskTypeId]);
    if (taskResult.rows.length === 0) return res.status(404).json({ error: 'Tarefa não encontrada' });
    const points = taskResult.rows[0].points;
    const result = await pool.query(
      'INSERT INTO task_completions (user_id, task_type_id, points_awarded, status, notes) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [userId, taskTypeId, points, 'pending', notes || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao registrar tarefa: ' + err.message });
  }
});

// Get pending task completions (admin)
app.get('/api/task-completions/pending', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT tc.*, u.name AS user_name, tt.name AS task_name
      FROM task_completions tc
      JOIN users u ON u.id = tc.user_id
      LEFT JOIN task_types tt ON tt.id = tc.task_type_id
      WHERE tc.status = 'pending' ORDER BY tc.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar pendências' });
  }
});

app.put('/api/task-completions/:id/approve', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      "UPDATE task_completions SET status='approved', approved_by=$1, approved_at=NOW() WHERE id=$2 RETURNING *",
      [req.user.id, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao aprovar tarefa' });
  }
});

app.put('/api/task-completions/:id/reject', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      "UPDATE task_completions SET status='rejected', approved_by=$1, approved_at=NOW() WHERE id=$2 RETURNING *",
      [req.user.id, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao rejeitar tarefa' });
  }
});

// ===================== BONUSES =====================

app.post('/api/bonuses', authenticateToken, requireAdmin, async (req, res) => {
  const { userId, points, reason } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO bonuses (user_id, points, reason, awarded_by) VALUES ($1, $2, $3, $4) RETURNING *',
      [userId, points, reason, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar bônus' });
  }
});

// ===================== STORE CATEGORIES =====================

app.get('/api/store/categories', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM store_categories ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar categorias' });
  }
});

app.post('/api/store/categories', authenticateToken, requireAdmin, async (req, res) => {
  const { name } = req.body;
  try {
    const result = await pool.query('INSERT INTO store_categories (name) VALUES ($1) RETURNING *', [name]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Categoria já existe' });
    res.status(500).json({ error: 'Erro ao criar categoria' });
  }
});

// ===================== STORE ITEMS =====================

app.get('/api/store/items', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT si.*, sc.name AS category_name
      FROM store_items si
      LEFT JOIN store_categories sc ON sc.id = si.category_id
      WHERE si.active = TRUE ORDER BY si.cost_points ASC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar itens' });
  }
});

app.post('/api/store/items', authenticateToken, requireAdmin, async (req, res) => {
  const { name, costPoints, stock, categoryId, notes, imageUrl } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO store_items (name, cost_points, stock, category_id, notes, image_url, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [name, costPoints, stock, categoryId || null, notes, imageUrl || null, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar item: ' + err.message });
  }
});

app.put('/api/store/items/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, costPoints, stock, categoryId, notes, imageUrl, active } = req.body;
  try {
    const result = await pool.query(
      'UPDATE store_items SET name=$1,cost_points=$2,stock=$3,category_id=$4,notes=$5,image_url=$6,active=$7 WHERE id=$8 RETURNING *',
      [name, costPoints, stock, categoryId || null, notes, imageUrl || null, active, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar item' });
  }
});

// ===================== REDEMPTIONS =====================

app.post('/api/redemptions', authenticateToken, async (req, res) => {
  const { itemId } = req.body;
  try {
    // Check item stock and cost
    const itemResult = await pool.query('SELECT * FROM store_items WHERE id = $1 AND active = TRUE', [itemId]);
    if (itemResult.rows.length === 0) return res.status(404).json({ error: 'Item não encontrado' });
    const item = itemResult.rows[0];
    if (item.stock <= 0) return res.status(400).json({ error: 'Item sem estoque' });

    // Check user balance
    const balanceResult = await pool.query(`
      SELECT
        COALESCE(SUM(CASE WHEN tc.status = 'approved' THEN tc.points_awarded ELSE 0 END), 0) +
        COALESCE((SELECT SUM(b.points) FROM bonuses b WHERE b.user_id = $1), 0) -
        COALESCE((SELECT SUM(r.points_spent) FROM redemptions r WHERE r.user_id = $1 AND r.status != 'cancelled'), 0) AS balance
      FROM users u
      LEFT JOIN task_completions tc ON tc.user_id = u.id
      WHERE u.id = $1
    `, [req.user.id]);

    const balance = parseInt(balanceResult.rows[0]?.balance || 0);
    if (balance < item.cost_points) return res.status(400).json({ error: `Saldo insuficiente. Você tem ${balance} pts e o item custa ${item.cost_points} pts.` });

    // Decrement stock and create redemption
    await pool.query('UPDATE store_items SET stock = stock - 1 WHERE id = $1', [itemId]);
    const result = await pool.query(
      'INSERT INTO redemptions (user_id, item_id, item_name, points_spent) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.user.id, itemId, item.name, item.cost_points]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao solicitar resgate: ' + err.message });
  }
});

app.get('/api/redemptions/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM redemptions WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar resgates' });
  }
});

app.get('/api/redemptions/all', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.*, u.name AS user_name FROM redemptions r
      JOIN users u ON u.id = r.user_id ORDER BY r.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar resgates' });
  }
});

app.put('/api/redemptions/:id/fulfill', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      "UPDATE redemptions SET status='fulfilled', fulfilled_by=$1, fulfilled_at=NOW() WHERE id=$2 RETURNING *",
      [req.user.id, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao confirmar entrega' });
  }
});

// ===================== FEATURED PRIZE =====================

app.get('/api/featured-prize', authenticateToken, async (req, res) => {
  try {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const result = await pool.query('SELECT * FROM featured_prize WHERE month = $1', [month]);
    res.json(result.rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar prêmio' });
  }
});

app.post('/api/featured-prize', authenticateToken, requireAdmin, async (req, res) => {
  const { month, title, description, imageUrl } = req.body;
  try {
    const result = await pool.query(`
      INSERT INTO featured_prize (month, title, description, image_url, created_by)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (month) DO UPDATE SET title=$2, description=$3, image_url=$4
      RETURNING *
    `, [month, title, description, imageUrl || null, req.user.id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao salvar prêmio: ' + err.message });
  }
});

// ===================== POINTS STATEMENT =====================

// GET /api/me/statement — unified point history for the logged-in user
app.get('/api/me/statement', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Approved task completions (earn points)
    const tasks = await pool.query(`
      SELECT
        tc.id,
        'task' AS type,
        tt.name AS description,
        tc.points_awarded AS points,
        tc.approved_at AS date,
        tc.notes
      FROM task_completions tc
      LEFT JOIN task_types tt ON tt.id = tc.task_type_id
      WHERE tc.user_id = $1 AND tc.status = 'approved'
    `, [userId]);

    // Bonuses (earn points)
    const bonuses = await pool.query(`
      SELECT
        b.id,
        'bonus' AS type,
        COALESCE('Bônus: ' || b.reason, 'Bônus de Equipe') AS description,
        b.points AS points,
        b.created_at AS date,
        b.reason AS notes
      FROM bonuses b
      WHERE b.user_id = $1
    `, [userId]);

    // Redemptions (spend points)
    const redemptions = await pool.query(`
      SELECT
        r.id,
        'redemption' AS type,
        'Resgate: ' || r.item_name AS description,
        -r.points_spent AS points,
        r.created_at AS date,
        r.status AS notes
      FROM redemptions r
      WHERE r.user_id = $1 AND r.status != 'cancelled'
    `, [userId]);

    // Merge and sort by date descending
    const all = [
      ...tasks.rows,
      ...bonuses.rows,
      ...redemptions.rows,
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    res.json(all);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar extrato: ' + err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});

