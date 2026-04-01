const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { pool, initDb } = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());

// Initialize Database
initDb();

// --- Auth Middleware ---
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

// --- Routes ---

// 1. Signup
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
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Usuário ou e-mail já cadastrado' });
    }
    res.status(500).json({ error: 'Erro no servidor: ' + err.message });
  }
});

// 2. Login
app.post('/api/auth/login', async (req, res) => {
  const { identifier, password } = req.body; // identifier can be email or username

  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1 OR username = $1',
      [identifier]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }

    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Senha incorreta' });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET);
    
    // Remove sensitive info
    delete user.password_hash;
    res.json({ user, token });
  } catch (err) {
    res.status(500).json({ error: 'Erro no servidor: ' + err.message });
  }
});

// 3. Get User Documents
app.get('/api/documents', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM documents WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar documentos' });
  }
});

// 4. Save/Create Document
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

// 5. Update Document
app.put('/api/documents/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { clientName, date, implantador, data } = req.body;

  try {
    const result = await pool.query(
      'UPDATE documents SET client_name = $1, date = $2, implantador = $3, data = $4 WHERE id = $5 AND user_id = $6 RETURNING *',
      [clientName, date, implantador, data, id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Documento não encontrado ou sem permissão' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar documento' });
  }
});

// 6. Delete Document
app.delete('/api/documents/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM documents WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Documento não encontrado ou sem permissão' });
    }

    res.json({ message: 'Documento deletado com sucesso', id });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao deletar documento' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
