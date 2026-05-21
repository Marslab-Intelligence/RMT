const Database = require('better-sqlite3');
const db = new Database('./data/renewals.db');

try {
  db.exec('PRAGMA foreign_keys=OFF;');
  db.exec('PRAGMA legacy_alter_table=ON;');
  
  // Create new table
  db.exec(`
    CREATE TABLE users_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('finance', 'sales', 'admin')),
      avatar_color TEXT DEFAULT '#6366f1',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  
  // Copy data
  db.exec('INSERT INTO users_new SELECT * FROM users;');
  
  // Drop old table
  db.exec('DROP TABLE users;');
  
  // Rename new table to original name
  db.exec('ALTER TABLE users_new RENAME TO users;');
  
  db.exec('PRAGMA foreign_keys=ON;');
  db.exec('PRAGMA legacy_alter_table=OFF;');
  
  console.log('Successfully updated users table schema.');
} catch (err) {
  console.log('Error updating schema:', err.message);
}
db.close();
