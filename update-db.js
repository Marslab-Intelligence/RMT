import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'server', 'data', 'renewals.db');

const db = new Database(dbPath);

try {
  db.exec('ALTER TABLE renewals ADD COLUMN edit_status TEXT DEFAULT NULL;');
  db.exec('ALTER TABLE renewals ADD COLUMN edit_reason TEXT DEFAULT NULL;');
  console.log('Successfully updated database schema.');
} catch (err) {
  console.log('Error or columns already exist:', err.message);
}
db.close();
