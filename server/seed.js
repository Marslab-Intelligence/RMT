import bcrypt from 'bcryptjs';
import db, { initDb } from './db.js';

async function seed() {
  await initDb();
  
  try {
    const { rows } = await db.query('SELECT COUNT(*) as count FROM users');
    const count = parseInt(rows[0].count, 10);
    
    if (count === 0) {
      console.log('Seeding initial users...');
      const salt = await bcrypt.genSalt(10);
      const financePassword = await bcrypt.hash('finance123', salt);
      const salesPassword = await bcrypt.hash('sales123', salt);
      const adminPassword = await bcrypt.hash('admin123', salt);

      const users = [
        ['ranjithkumar.v@marslab.work', 'ranjithkumar.v@marslab.work', salesPassword, 'Ranjith Kumar', 'sales', '#3b82f6'],
        ['sakthivel.k@marslab.work', 'sakthivel.k@marslab.work', salesPassword, 'Sakthivel K', 'sales', '#10b981'],
        ['sameerulrahman.f@marslab.work', 'sameerulrahman.f@marslab.work', adminPassword, 'Sameerul Rahman', 'admin', '#f59e0b']
      ];

      for (const user of users) {
        await db.query(`
          INSERT INTO users (username, email, password, full_name, role, avatar_color)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, user);
      }

      console.log('Users seeded successfully!');
      console.log('Login credentials:');
      console.log('- Sales: ranjithkumar.v@marslab.work / sales123');
      console.log('- Sales: sakthivel.k@marslab.work / sales123');
      console.log('- Admin: sameerulrahman.f@marslab.work / admin123');
    } else {
      console.log('Database already seeded.');
    }
  } catch (err) {
    console.error('Seed error:', err);
  } finally {
    process.exit();
  }
}

seed();
