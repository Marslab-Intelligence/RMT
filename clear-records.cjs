const Database = require('better-sqlite3');
const db = new Database('./data/renewals.db');

try {
  // Turn off foreign keys temporarily if needed, though deleting should just cascade or we can just delete from dependents first.
  db.exec('DELETE FROM email_logs;');
  db.exec('DELETE FROM renewal_history;');
  db.exec('DELETE FROM renewals;');
  // Optional: Reset auto-increment
  db.exec("DELETE FROM sqlite_sequence WHERE name IN ('email_logs', 'renewal_history', 'renewals');");
  
  console.log('Successfully removed all renewal records.');
} catch (err) {
  console.log('Error removing records:', err.message);
}
db.close();
