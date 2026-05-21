import pg from 'pg';
import bcrypt from 'bcryptjs';
const { Pool } = pg;

const pool = new Pool({
  user: process.env.PGUSER || 'marslab_user',
  host: process.env.PGHOST || 'localhost',
  database: process.env.PGDATABASE || 'marslab_db',
  password: process.env.PGPASSWORD || 'marslab123',
  port: process.env.PGPORT ? parseInt(process.env.PGPORT) : 5432,
});

export const initDb = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL CHECK(role IN ('finance', 'sales', 'admin')),
        avatar_color VARCHAR(50) DEFAULT '#6366f1',
        otp_code VARCHAR(6),
        otp_expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS renewals (
        id SERIAL PRIMARY KEY,
        unique_id VARCHAR(255) UNIQUE NOT NULL,
        client_name VARCHAR(255) NOT NULL,
        service VARCHAR(255) NOT NULL,
        renewal_date DATE,
        value NUMERIC NOT NULL DEFAULT 0,
        owner VARCHAR(255) NOT NULL,
        client_email VARCHAR(255) NOT NULL,
        sales_email VARCHAR(255),
        contact_number VARCHAR(50) DEFAULT '',
        reference_id VARCHAR(100) DEFAULT '',
        status VARCHAR(50) NOT NULL DEFAULT 'Active' CHECK(status IN ('Active', 'Pending Renewal', 'Renewed', 'Expired', '-')),
        locked INTEGER DEFAULT 1,
        follow_up_status VARCHAR(255) DEFAULT '',
        follow_up_remarks TEXT DEFAULT '',
        day_30_sent VARCHAR(10) DEFAULT 'No' CHECK(day_30_sent IN ('Yes', 'No')),
        day_20_sent VARCHAR(10) DEFAULT 'No' CHECK(day_20_sent IN ('Yes', 'No')),
        day_15_sent VARCHAR(10) DEFAULT 'No' CHECK(day_15_sent IN ('Yes', 'No')),
        day_10_sent VARCHAR(10) DEFAULT 'No' CHECK(day_10_sent IN ('Yes', 'No')),
        day_5_sent VARCHAR(10) DEFAULT 'No' CHECK(day_5_sent IN ('Yes', 'No')),
        day_3_sent VARCHAR(10) DEFAULT 'No' CHECK(day_3_sent IN ('Yes', 'No')),
        sales_15_sent VARCHAR(10) DEFAULT 'No' CHECK(sales_15_sent IN ('Yes', 'No')),
        sales_5_sent VARCHAR(10) DEFAULT 'No' CHECK(sales_5_sent IN ('Yes', 'No')),
        renewal_confirmation VARCHAR(50) DEFAULT 'pending',
        edit_status VARCHAR(50) DEFAULT NULL,
        edit_reason TEXT DEFAULT NULL,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS renewal_history (
        id SERIAL PRIMARY KEY,
        renewal_id INTEGER NOT NULL REFERENCES renewals(id) ON DELETE CASCADE,
        action VARCHAR(255) NOT NULL,
        previous_data TEXT,
        new_data TEXT,
        performed_by INTEGER REFERENCES users(id),
        performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS activity_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        action VARCHAR(255) NOT NULL,
        entity_type VARCHAR(255),
        entity_id VARCHAR(255),
        details TEXT,
        ip_address VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS email_logs (
        id SERIAL PRIMARY KEY,
        renewal_id INTEGER REFERENCES renewals(id) ON DELETE CASCADE,
        recipient_email VARCHAR(255) NOT NULL,
        recipient_type VARCHAR(50) NOT NULL CHECK(recipient_type IN ('client', 'sales')),
        email_type VARCHAR(255) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'sent' CHECK(status IN ('sent', 'failed', 'queued')),
        error_message TEXT,
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        role VARCHAR(50),
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'info' CHECK(type IN ('info', 'warning', 'success', 'error')),
        read INTEGER DEFAULT 0,
        link VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure all required columns exist in the renewals table (in case it was created previously)
    await pool.query(`
      ALTER TABLE renewals ADD COLUMN IF NOT EXISTS renewal_confirmation VARCHAR(50) DEFAULT 'pending';
      ALTER TABLE renewals ADD COLUMN IF NOT EXISTS edit_status VARCHAR(50) DEFAULT NULL;
      ALTER TABLE renewals ADD COLUMN IF NOT EXISTS edit_reason TEXT DEFAULT NULL;
    `);

    // Auto-update statuses based on renewal dates on startup
    await pool.query(`
      UPDATE renewals 
      SET status = CASE 
        WHEN renewal_date - CURRENT_DATE < 0 THEN 'Expired'::varchar
        WHEN renewal_date - CURRENT_DATE <= 30 THEN 'Pending Renewal'::varchar
        ELSE 'Active'::varchar
      END
      WHERE status IN ('Active', 'Pending Renewal', 'Expired');
    `);

    // Auto-seed the three required SSO users if they don't exist
    const defaultPasswordHash = await bcrypt.hash('sso_only_user_password_random_123', 10);
    const requiredUsers = [
      {
        email: 'sameerulrahman.f@marslab.work',
        username: 'sameerulrahman.f@marslab.work',
        full_name: 'Sameerul Rahman',
        role: 'admin',
        avatar_color: '#f59e0b'
      },
      {
        email: 'sakthivel.k@marslab.work',
        username: 'sakthivel.k@marslab.work',
        full_name: 'Sakthivel K',
        role: 'sales',
        avatar_color: '#10b981'
      },
      {
        email: 'ranjithkumar.v@marslab.work',
        username: 'ranjithkumar.v@marslab.work',
        full_name: 'Ranjith Kumar',
        role: 'finance',
        avatar_color: '#3b82f6'
      }
    ];

    for (const u of requiredUsers) {
      const { rows: existing } = await pool.query('SELECT * FROM users WHERE email = $1', [u.email]);
      if (existing.length === 0) {
        await pool.query(`
          INSERT INTO users (username, email, password, full_name, role, avatar_color)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [u.username, u.email, defaultPasswordHash, u.full_name, u.role, u.avatar_color]);
        console.log(`👤 Auto-seeded user: ${u.email} (${u.role})`);
      }
    }

    console.log('PostgreSQL database tables initialized');
  } catch (err) {
    console.error('Error initializing database:', err);
  }
};

export default pool;
