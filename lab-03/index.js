const express = require('express');
const fs = require('fs');
const path = require('path');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');

const app = express();
app.use(express.json());

const databasePath = path.join(__dirname, 'bookstore.db');
let db;

const sendError = (response, status, message) => response.status(status).json({ message });
const isPositiveId = (value) => /^\d+$/.test(value) && Number(value) > 0;

app.get('/', (_request, response) => {
  response.type('text/plain').send('Book Management API Lab 3');
});

// GET /books supports partial title search, safe sorting, price range and pagination.
app.get('/books', async (request, response) => {
  try {
    const {
      search_q: searchQuery = '',
      order_by: orderBy = 'id',
      order = 'ASC',
      limit: limitText = '10',
      offset: offsetText = '0',
      min_price: minPriceText,
      max_price: maxPriceText,
    } = request.query;

    const allowedSortColumns = new Set(['id', 'title', 'author', 'price', 'pages']);
    if (!allowedSortColumns.has(orderBy)) return sendError(response, 400, 'order_by must be one of: id, title, author, price, pages.');
    const normalizedOrder = String(order).toUpperCase();
    if (!['ASC', 'DESC'].includes(normalizedOrder)) return sendError(response, 400, 'order must be ASC or DESC.');

    const limit = Number(limitText);
    const offset = Number(offsetText);
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) return sendError(response, 400, 'limit must be an integer from 1 to 100.');
    if (!Number.isInteger(offset) || offset < 0) return sendError(response, 400, 'offset must be a non-negative integer.');

    const values = [];
    const conditions = [];
    if (String(searchQuery).trim()) {
      conditions.push('title LIKE ?');
      values.push(`%${String(searchQuery).trim()}%`);
    }
    if (minPriceText !== undefined) {
      const minPrice = Number(minPriceText);
      if (!Number.isFinite(minPrice) || minPrice < 0) return sendError(response, 400, 'min_price must be a non-negative number.');
      conditions.push('price >= ?');
      values.push(minPrice);
    }
    if (maxPriceText !== undefined) {
      const maxPrice = Number(maxPriceText);
      if (!Number.isFinite(maxPrice) || maxPrice < 0) return sendError(response, 400, 'max_price must be a non-negative number.');
      conditions.push('price <= ?');
      values.push(maxPrice);
    }
    if (minPriceText !== undefined && maxPriceText !== undefined && Number(minPriceText) > Number(maxPriceText)) {
      return sendError(response, 400, 'min_price cannot be greater than max_price.');
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    // Column and direction are allow-listed above; all user values stay parameterized.
    const query = `SELECT id, title, author, price, pages FROM book ${whereClause} ORDER BY ${orderBy} ${normalizedOrder} LIMIT ? OFFSET ?`;
    const books = await db.all(query, [...values, limit, offset]);
    return response.status(200).json(books);
  } catch (error) {
    console.error('GET /books failed:', error.message);
    return sendError(response, 500, 'Unable to retrieve books.');
  }
});

app.get('/books/:id', async (request, response) => {
  try {
    const { id } = request.params;
    if (!isPositiveId(id)) return sendError(response, 400, 'id must be a positive integer.');
    const book = await db.get('SELECT id, title, author, price, pages FROM book WHERE id = ?', [id]);
    if (!book) return sendError(response, 404, 'Book not found.');
    return response.status(200).json(book);
  } catch (error) {
    console.error('GET /books/:id failed:', error.message);
    return sendError(response, 500, 'Unable to retrieve the book.');
  }
});

app.post('/books', async (request, response) => {
  const { title, author, price, pages = 1 } = request.body || {};
  if (typeof title !== 'string' || !title.trim()) return sendError(response, 400, 'title is required and must be a non-empty string.');
  if (typeof author !== 'string' || !author.trim()) return sendError(response, 400, 'author is required and must be a non-empty string.');
  if (price === undefined || price === null || price === '' || !Number.isFinite(Number(price)) || Number(price) < 0) {
    return sendError(response, 400, 'price is required and must be a non-negative number.');
  }
  if (!Number.isInteger(Number(pages)) || Number(pages) < 1) return sendError(response, 400, 'pages must be a positive integer.');

  try {
    const result = await db.run(
      'INSERT INTO book (title, author, price, pages) VALUES (?, ?, ?, ?)',
      [title.trim(), author.trim(), Number(price), Number(pages)],
    );
    return response.status(201).json({ message: 'Book created successfully.', id: result.lastID });
  } catch (error) {
    console.error('POST /books failed:', error.message);
    return sendError(response, 500, 'Unable to create the book.');
  }
});

app.put('/books/:id', async (request, response) => {
  const { id } = request.params;
  if (!isPositiveId(id)) return sendError(response, 400, 'id must be a positive integer.');
  const { title, author, price, pages } = request.body || {};
  if (typeof title !== 'string' || !title.trim()) return sendError(response, 400, 'title is required and must be a non-empty string.');
  if (typeof author !== 'string' || !author.trim()) return sendError(response, 400, 'author is required and must be a non-empty string.');
  if (price === undefined || price === null || price === '' || !Number.isFinite(Number(price)) || Number(price) < 0) {
    return sendError(response, 400, 'price is required and must be a non-negative number.');
  }
  if (pages !== undefined && (!Number.isInteger(Number(pages)) || Number(pages) < 1)) return sendError(response, 400, 'pages must be a positive integer.');

  try {
    const existing = await db.get('SELECT id FROM book WHERE id = ?', [id]);
    if (!existing) return sendError(response, 404, 'Book not found.');
    await db.run(
      'UPDATE book SET title = ?, author = ?, price = ?, pages = ? WHERE id = ?',
      [title.trim(), author.trim(), Number(price), pages === undefined ? 1 : Number(pages), id],
    );
    return response.status(200).json({ message: 'Book updated successfully.' });
  } catch (error) {
    console.error('PUT /books/:id failed:', error.message);
    return sendError(response, 500, 'Unable to update the book.');
  }
});

app.delete('/books/:id', async (request, response) => {
  const { id } = request.params;
  if (!isPositiveId(id)) return sendError(response, 400, 'id must be a positive integer.');
  try {
    const result = await db.run('DELETE FROM book WHERE id = ?', [id]);
    if (result.changes === 0) return sendError(response, 404, 'Book not found.');
    return response.status(200).json({ message: 'Book deleted successfully.' });
  } catch (error) {
    console.error('DELETE /books/:id failed:', error.message);
    return sendError(response, 500, 'Unable to delete the book.');
  }
});

// Express 5 forwards rejected async handlers; keep parser and unexpected errors JSON-shaped.
app.use((error, _request, response, _next) => {
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return sendError(response, 400, 'Request body must contain valid JSON.');
  }
  console.error('Unhandled API error:', error.message);
  return sendError(response, 500, 'Internal server error.');
});

async function initializeDBAndServer() {
  try {
    db = await open({ filename: databasePath, driver: sqlite3.Database });
    const table = await db.get("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?", ['book']);
    const row = table ? await db.get('SELECT COUNT(*) AS count FROM book') : null;
    if (!table || row.count === 0) {
      await db.exec(fs.readFileSync(path.join(__dirname, 'initDB.sql'), 'utf8'));
      console.log('Initialized the sample book catalog.');
    }
    const port = Number(process.env.PORT) || 3000;
    const server = app.listen(port, () => console.log(`Server running at http://localhost:${port}/`));
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') console.error(`Port ${port} is already in use. Set PORT to another available port.`);
      else console.error('Server failed to start:', error.message);
      process.exitCode = 1;
    });
  } catch (error) {
    console.error('Database connection failed:', error.message);
    process.exitCode = 1;
  }
}

if (require.main === module) initializeDBAndServer();
module.exports = app;
