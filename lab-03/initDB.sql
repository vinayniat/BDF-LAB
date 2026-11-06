DROP TABLE IF EXISTS book;

CREATE TABLE book (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  price REAL NOT NULL CHECK (price >= 0),
  pages INTEGER NOT NULL DEFAULT 1 CHECK (pages > 0)
);

INSERT INTO book (title, author, price, pages) VALUES
('The Great Gatsby', 'F. Scott Fitzgerald', 450, 180),
('To Kill a Mockingbird', 'Harper Lee', 520, 281),
('1984', 'George Orwell', 399, 328),
('Pride and Prejudice', 'Jane Austen', 350, 279),
('The Catcher in the Rye', 'J.D. Salinger', 420, 214),
('The Hobbit', 'J.R.R. Tolkien', 699, 310),
('Fahrenheit 451', 'Ray Bradbury', 480, 249),
('Brave New World', 'Aldous Huxley', 410, 268),
('The Alchemist', 'Paulo Coelho', 300, 208),
('Crime and Punishment', 'Fyodor Dostoevsky', 550, 671);
