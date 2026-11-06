const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');

const databasePath = path.join(__dirname, 'bookstore.db');
const schemaPath = path.join(__dirname, 'initDB.sql');
const db = new sqlite3.Database(databasePath);

// Use the matching sqlite3 import, read the local schema, and await completion.
db.exec(fs.readFileSync(schemaPath, 'utf8'), (error) => {
  if (error) {
    console.error('Database initialization failed:', error.message);
    process.exitCode = 1;
  } else {
    console.log(`Database initialized at ${databasePath}`);
  }
  db.close();
});
