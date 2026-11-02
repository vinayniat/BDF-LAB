
const express = require('express');
const path = require('path');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, 'bookstore.db');
let db = null;

// Initialize Database connection and start server
const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    const PORT = process.env.PORT || 3000;

    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}/`);
    });

  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

// Home Route: Display Welcome Message
app.get('/', (request, response) => {
  response.send('Welcome to the Book Management API lab2');
});

// Route 1: GET /books/ - Get all books
app.get('/books/', async (request, response) => {
  try {
    const getBooksQuery = `
      SELECT
        *
      FROM
        book
      ORDER BY
        id;
    `;

    const booksList = await db.all(getBooksQuery);
    response.send(booksList);

  } catch (error) {
    response.status(500).send({ error: error.message });
  }
});

// Route 2: GET /books/:bookId/ - Get a single book by ID
app.get('/books/:bookId/', async (request, response) => {
  try {
    const { bookId } = request.params;

    const getBookQuery = `
      SELECT
        *
      FROM
        book
      WHERE
        id = ?;
    `;

    const book = await db.get(getBookQuery, [bookId]);

    if (!book) {
      response.status(404).send({ error: 'Book not found' });
    } else {
      response.send(book);
    }

  } catch (error) {
    response.status(500).send({ error: error.message });
  }
});

// Route 3: POST /books/ - Add a new book
app.post('/books/', async (request, response) => {
  try {
    const { title, author, price, pages } = request.body;

    const addBookQuery = `
      INSERT INTO
        book (title, author, price, pages)
      VALUES
        (?, ?, ?, ?);
    `;

    const dbResponse = await db.run(addBookQuery, [
      title,
      author,
      price,
      pages
    ]);

    const bookId = dbResponse.lastID;

    response.send({
      bookId: bookId,
      message: 'Book Added Successfully'
    });

  } catch (error) {
    response.status(500).send({ error: error.message });
  }
});

// Route 4: PUT /books/:bookId/ - Update an existing book
app.put('/books/:bookId/', async (request, response) => {
  try {
    const { bookId } = request.params;
    const { title, author, price, pages } = request.body;

    const updateBookQuery = `
      UPDATE
        book
      SET
        title = ?,
        author = ?,
        price = ?,
        pages = ?
      WHERE
        id = ?;
    `;

    await db.run(updateBookQuery, [
      title,
      author,
      price,
      pages,
      bookId
    ]);

    response.send('Book Updated Successfully');

  } catch (error) {
    response.status(500).send({ error: error.message });
  }
});

// Route 5: DELETE /books/:bookId/ - Delete a book
app.delete('/books/:bookId/', async (request, response) => {
  try {
    const { bookId } = request.params;

    const deleteBookQuery = `
      DELETE FROM
        book
      WHERE
        id = ?;
    `;

    await db.run(deleteBookQuery, [bookId]);

    response.send('Book Deleted Successfully');

  } catch (error) {
    response.status(500).send({ error: error.message });
  }
});

module.exports = app;
