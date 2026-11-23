const express = require('express');
const mysql = require('mysql2/promise');
require('dotenv').config();

const app = express();
app.use(express.json({ limit: '1mb' }));

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'app',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'ma',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

app.get('/', (_req, res) => {
  res.json({ name: 'ma webserver', status: 'running' });
});

app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    console.error('Database health check failed:', error.message);
    res.status(503).json({ status: 'error', database: 'unavailable' });
  }
});

app.get('/api/items', async (_req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT id, name, created_at FROM items ORDER BY id');
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

app.get('/api/items/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid item id' });
    const [rows] = await pool.execute('SELECT id, name, created_at FROM items WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ error: 'Item not found' });
    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
});

app.post('/api/items', async (req, res, next) => {
  try {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    if (!name || name.length > 255) return res.status(400).json({ error: 'Name must be 1–255 characters' });
    const [result] = await pool.execute('INSERT INTO items (name) VALUES (?)', [name]);
    const [rows] = await pool.execute('SELECT id, name, created_at FROM items WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (error) {
    next(error);
  }
});

app.put('/api/items/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid item id' });
    if (!name || name.length > 255) return res.status(400).json({ error: 'Name must be 1–255 characters' });
    const [result] = await pool.execute('UPDATE items SET name = ? WHERE id = ?', [name, id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Item not found' });
    const [rows] = await pool.execute('SELECT id, name, created_at FROM items WHERE id = ?', [id]);
    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
});

app.delete('/api/items/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid item id' });
    const [result] = await pool.execute('DELETE FROM items WHERE id = ?', [id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Item not found' });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'Internal server error' });
});

async function start() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS items (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const port = Number(process.env.PORT || 3000);
  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`Web server listening on port ${port}`);
  });

  const shutdown = () => {
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

start().catch((error) => {
  console.error('Failed to start web server:', error.message);
  process.exit(1);
});
