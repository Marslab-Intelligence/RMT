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

// Automatically set search_path to marslab_schema for all connections
pool.on('connect', (client) => {
  client.query('SET search_path TO marslab_schema, public;')
    .catch(err => console.error('Error setting search_path on client connection:', err));
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
        role VARCHAR(50) NOT NULL CHECK(role IN ('sales', 'admin')),
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
        day_0_sent VARCHAR(10) DEFAULT 'No' CHECK(day_0_sent IN ('Yes', 'No')),
        sales_15_sent VARCHAR(10) DEFAULT 'No' CHECK(sales_15_sent IN ('Yes', 'No')),
        sales_5_sent VARCHAR(10) DEFAULT 'No' CHECK(sales_5_sent IN ('Yes', 'No')),
        sales_3_sent VARCHAR(10) DEFAULT 'No' CHECK(sales_3_sent IN ('Yes', 'No')),
        renewal_confirmation VARCHAR(50) DEFAULT 'pending',
        edit_status VARCHAR(50) DEFAULT NULL,
        edit_reason TEXT DEFAULT NULL,
        expiry_reason TEXT DEFAULT NULL,
        invoice_status VARCHAR(20) DEFAULT 'Not' CHECK(invoice_status IN ('Sent', 'Not')),
        invoice_number VARCHAR(100) DEFAULT NULL,
        invoice_value NUMERIC(15,2) DEFAULT NULL,
        invoice_sent_date DATE DEFAULT NULL,
        plan_period VARCHAR(50) DEFAULT 'yearly_plan' CHECK(plan_period IN ('monthly_plan', 'quarterly_plan', 'halfly_plan', 'yearly_plan')),
        plan_duration INTEGER DEFAULT 1,
        product VARCHAR(255) DEFAULT '',
        description TEXT DEFAULT '',
        quantity INTEGER DEFAULT 1,
        purchase_cost NUMERIC(15,2) DEFAULT 0,
        total_purchase_cost NUMERIC(15,2) DEFAULT 0,
        sales_cost NUMERIC(15,2) DEFAULT 0,
        total_sales_cost NUMERIC(15,2) DEFAULT 0,
        profit NUMERIC(15,2) DEFAULT 0,
        vendor VARCHAR(255) DEFAULT '',
        entity VARCHAR(255) DEFAULT '',
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
        recipient_type VARCHAR(50) NOT NULL CHECK(recipient_type IN ('client', 'sales', 'admin')),
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

      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash VARCHAR(512) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        revoked INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS trash_renewals (
        id SERIAL PRIMARY KEY,
        original_id INTEGER NOT NULL,
        unique_id VARCHAR(255),
        client_name VARCHAR(255),
        service VARCHAR(255),
        renewal_date DATE,
        value NUMERIC,
        owner VARCHAR(255),
        client_email VARCHAR(255),
        sales_email VARCHAR(255),
        status VARCHAR(255),
        locked INTEGER DEFAULT 0,
        follow_up_status VARCHAR(255),
        follow_up_remarks TEXT,
        day_30_sent VARCHAR(50),
        day_20_sent VARCHAR(50),
        day_15_sent VARCHAR(50),
        day_10_sent VARCHAR(50),
        day_5_sent VARCHAR(50),
        day_3_sent VARCHAR(50),
        day_0_sent VARCHAR(50) DEFAULT 'No',
        sales_15_sent VARCHAR(50),
        sales_5_sent VARCHAR(50),
        created_by INTEGER,
        created_at TIMESTAMP,
        updated_at TIMESTAMP,
        edit_status VARCHAR(255),
        edit_reason TEXT,
        expiry_reason TEXT,
        sales_3_sent VARCHAR(50),
        renewal_confirmation VARCHAR(50),
        contact_number VARCHAR(50),
        reference_id VARCHAR(255),
        invoice_status VARCHAR(20) DEFAULT 'Not',
        invoice_number VARCHAR(100) DEFAULT NULL,
        invoice_value NUMERIC(15,2) DEFAULT NULL,
        invoice_sent_date DATE DEFAULT NULL,
        plan_period VARCHAR(50) DEFAULT 'yearly_plan',
        plan_duration INTEGER DEFAULT 1,
        deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure all required columns exist in the renewals table (in case it was created previously)
    await pool.query(`
      ALTER TABLE renewals ADD COLUMN IF NOT EXISTS renewal_confirmation VARCHAR(50) DEFAULT 'pending';
      ALTER TABLE renewals ADD COLUMN IF NOT EXISTS edit_status VARCHAR(50) DEFAULT NULL;
      ALTER TABLE renewals ADD COLUMN IF NOT EXISTS edit_reason TEXT DEFAULT NULL;
      ALTER TABLE renewals ADD COLUMN IF NOT EXISTS expiry_reason TEXT DEFAULT NULL;
      ALTER TABLE renewals ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
      ALTER TABLE renewals ADD COLUMN IF NOT EXISTS invoice_status VARCHAR(20) DEFAULT 'Not';
      ALTER TABLE renewals ADD COLUMN IF NOT EXISTS plan_period VARCHAR(50) DEFAULT 'yearly_plan';
      ALTER TABLE renewals ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(100) DEFAULT NULL;
      ALTER TABLE renewals ADD COLUMN IF NOT EXISTS invoice_value NUMERIC(15,2) DEFAULT NULL;
      ALTER TABLE renewals ADD COLUMN IF NOT EXISTS invoice_sent_date DATE DEFAULT NULL;
      ALTER TABLE renewals ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'No';
      ALTER TABLE renewals ADD COLUMN IF NOT EXISTS payment_amount NUMERIC(15,2) DEFAULT NULL;
      ALTER TABLE renewals ADD COLUMN IF NOT EXISTS payment_received_date DATE DEFAULT NULL;
      ALTER TABLE renewals ADD COLUMN IF NOT EXISTS client_latitude NUMERIC(10, 8);
      ALTER TABLE renewals ADD COLUMN IF NOT EXISTS client_longitude NUMERIC(11, 8);
      ALTER TABLE renewals ADD COLUMN IF NOT EXISTS day_0_sent VARCHAR(10) DEFAULT 'No' CHECK(day_0_sent IN ('Yes', 'No'));
      ALTER TABLE renewals ADD COLUMN IF NOT EXISTS sales_3_sent VARCHAR(10) DEFAULT 'No' CHECK(sales_3_sent IN ('Yes', 'No'));
      ALTER TABLE renewals ADD COLUMN IF NOT EXISTS plan_duration INTEGER DEFAULT 1;
      
      ALTER TABLE renewals ADD COLUMN IF NOT EXISTS product VARCHAR(255) DEFAULT '';
      ALTER TABLE renewals ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
      ALTER TABLE renewals ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;
      ALTER TABLE renewals ADD COLUMN IF NOT EXISTS purchase_cost NUMERIC(15,2) DEFAULT 0;
      ALTER TABLE renewals ADD COLUMN IF NOT EXISTS total_purchase_cost NUMERIC(15,2) DEFAULT 0;
      ALTER TABLE renewals ADD COLUMN IF NOT EXISTS sales_cost NUMERIC(15,2) DEFAULT 0;
      ALTER TABLE renewals ADD COLUMN IF NOT EXISTS total_sales_cost NUMERIC(15,2) DEFAULT 0;
      ALTER TABLE renewals ADD COLUMN IF NOT EXISTS profit NUMERIC(15,2) DEFAULT 0;
      ALTER TABLE renewals ADD COLUMN IF NOT EXISTS vendor VARCHAR(255) DEFAULT '';
      ALTER TABLE renewals ADD COLUMN IF NOT EXISTS entity VARCHAR(255) DEFAULT '';
      ALTER TABLE renewals ADD COLUMN IF NOT EXISTS invoice_type VARCHAR(50) DEFAULT 'Invoice';

      ALTER TABLE renewals DROP CONSTRAINT IF EXISTS renewals_renewal_confirmation_check;
      ALTER TABLE trash_renewals DROP CONSTRAINT IF EXISTS trash_renewals_renewal_confirmation_check;

      UPDATE renewals SET renewal_confirmation = 'quote_sent' WHERE renewal_confirmation = 'quotation_confirmation';
      UPDATE renewals SET renewal_confirmation = 'reminder_sent' WHERE renewal_confirmation = 'awaiting_with_vendor';
      UPDATE renewals SET renewal_confirmation = 'cancelled' WHERE renewal_confirmation = 'service_discontinued';

      ALTER TABLE trash_renewals ADD COLUMN IF NOT EXISTS invoice_status VARCHAR(20) DEFAULT 'Not';
      ALTER TABLE trash_renewals ADD COLUMN IF NOT EXISTS plan_period VARCHAR(50) DEFAULT 'yearly_plan';
      ALTER TABLE trash_renewals ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(100) DEFAULT NULL;
      ALTER TABLE trash_renewals ADD COLUMN IF NOT EXISTS invoice_value NUMERIC(15,2) DEFAULT NULL;
      ALTER TABLE trash_renewals ADD COLUMN IF NOT EXISTS invoice_sent_date DATE DEFAULT NULL;
      ALTER TABLE trash_renewals ADD COLUMN IF NOT EXISTS expiry_reason TEXT DEFAULT NULL;
      ALTER TABLE trash_renewals ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'No';
      ALTER TABLE trash_renewals ADD COLUMN IF NOT EXISTS payment_amount NUMERIC(15,2) DEFAULT NULL;
      ALTER TABLE trash_renewals ADD COLUMN IF NOT EXISTS payment_received_date DATE DEFAULT NULL;
      ALTER TABLE trash_renewals ADD COLUMN IF NOT EXISTS client_latitude NUMERIC(10, 8);
      ALTER TABLE trash_renewals ADD COLUMN IF NOT EXISTS client_longitude NUMERIC(11, 8);
      ALTER TABLE trash_renewals ADD COLUMN IF NOT EXISTS day_0_sent VARCHAR(50) DEFAULT 'No';
      ALTER TABLE trash_renewals ADD COLUMN IF NOT EXISTS plan_duration INTEGER DEFAULT 1;
      
      ALTER TABLE trash_renewals ADD COLUMN IF NOT EXISTS product VARCHAR(255) DEFAULT '';
      ALTER TABLE trash_renewals ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
      ALTER TABLE trash_renewals ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;
      ALTER TABLE trash_renewals ADD COLUMN IF NOT EXISTS purchase_cost NUMERIC(15,2) DEFAULT 0;
      ALTER TABLE trash_renewals ADD COLUMN IF NOT EXISTS total_purchase_cost NUMERIC(15,2) DEFAULT 0;
      ALTER TABLE trash_renewals ADD COLUMN IF NOT EXISTS sales_cost NUMERIC(15,2) DEFAULT 0;
      ALTER TABLE trash_renewals ADD COLUMN IF NOT EXISTS total_sales_cost NUMERIC(15,2) DEFAULT 0;
      ALTER TABLE trash_renewals ADD COLUMN IF NOT EXISTS profit NUMERIC(15,2) DEFAULT 0;
      ALTER TABLE trash_renewals ADD COLUMN IF NOT EXISTS vendor VARCHAR(255) DEFAULT '';
      ALTER TABLE trash_renewals ADD COLUMN IF NOT EXISTS entity VARCHAR(255) DEFAULT '';
      ALTER TABLE trash_renewals ADD COLUMN IF NOT EXISTS quotation_number VARCHAR(255) DEFAULT '';
      ALTER TABLE trash_renewals ADD COLUMN IF NOT EXISTS invoice_type VARCHAR(50) DEFAULT 'Invoice';
    `);

    // Create GPS tracking tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS visits (
        id SERIAL PRIMARY KEY,
        renewal_id INTEGER NOT NULL REFERENCES renewals(id) ON DELETE CASCADE,
        cst_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'checked_in', 'completed', 'cancelled')),
        start_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        arrival_time TIMESTAMP,
        check_in_time TIMESTAMP,
        check_out_time TIMESTAMP,
        start_latitude NUMERIC(10, 8) NOT NULL,
        start_longitude NUMERIC(11, 8) NOT NULL,
        client_reached BOOLEAN DEFAULT FALSE,
        arrival_latitude NUMERIC(10, 8),
        arrival_longitude NUMERIC(11, 8),
        arrival_distance_meters NUMERIC(10, 2),
        notes TEXT,
        photo_data TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS visit_locations (
        id SERIAL PRIMARY KEY,
        visit_id INTEGER NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
        latitude NUMERIC(10, 8) NOT NULL,
        longitude NUMERIC(11, 8) NOT NULL,
        accuracy NUMERIC(6, 2),
        captured_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_visits_cst_status ON visits(cst_id, status);
      CREATE INDEX IF NOT EXISTS idx_visits_renewal ON visits(renewal_id);
      CREATE INDEX IF NOT EXISTS idx_visit_locations_visit ON visit_locations(visit_id, captured_at DESC);
    `);

    // Update existing renewals with dummy coordinates if not set (around Chennai/Bangalore)
    await pool.query(`
      UPDATE renewals
      SET client_latitude = 12.9716, client_longitude = 77.5946
      WHERE client_latitude IS NULL OR client_longitude IS NULL;
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

      UPDATE renewals
      SET renewal_confirmation = 'renewed'
      WHERE renewal_date IS NOT NULL 
        AND (renewal_date - CURRENT_DATE) > 30
        AND renewal_confirmation != 'renewed';

      UPDATE renewals
      SET renewal_confirmation = 'pending'
      WHERE renewal_date IS NOT NULL 
        AND (renewal_date - CURRENT_DATE) < 30
        AND renewal_confirmation = 'renewed';
    `);

    // Add is_active column if it doesn't exist (migration)
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
    `);

    // Migrate existing finance users and constraints
    await pool.query(`
      UPDATE users SET role = 'sales' WHERE role = 'finance';
      ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
      ALTER TABLE users ADD CONSTRAINT users_role_check CHECK(role IN ('sales', 'admin'));

      UPDATE email_logs SET recipient_type = 'sales' WHERE recipient_type = 'finance';
      ALTER TABLE email_logs DROP CONSTRAINT IF EXISTS email_logs_recipient_type_check;
      ALTER TABLE email_logs ADD CONSTRAINT email_logs_recipient_type_check CHECK(recipient_type IN ('client', 'sales', 'admin'));

      UPDATE notifications SET role = 'sales' WHERE role = 'finance';
    `);

    // Create automation settings & log tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS automation_settings (
        key VARCHAR(255) PRIMARY KEY,
        value VARCHAR(255) NOT NULL,
        updated_by INTEGER REFERENCES users(id),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS automation_logs (
        id SERIAL PRIMARY KEY,
        action VARCHAR(50) NOT NULL,
        note TEXT,
        performed_by INTEGER REFERENCES users(id),
        performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS product_pricing (
        id SERIAL PRIMARY KEY,
        vendor VARCHAR(255) NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        service_category VARCHAR(255) DEFAULT 'Software & Services',
        list_price NUMERIC(15,2) DEFAULT 0,
        erp_price NUMERIC(15,2) DEFAULT 0,
        sales_cost NUMERIC(15,2) DEFAULT 0,
        coupon_discount_percent NUMERIC(5,2) DEFAULT 0,
        description TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      INSERT INTO automation_settings (key, value)
      VALUES ('email_automation', 'start')
      ON CONFLICT (key) DO NOTHING;
    `);

    // Seed product pricing catalog directly from client renewal records if empty or sync missing entries
    await pool.query(`
      INSERT INTO product_pricing (vendor, product_name, service_category, list_price, erp_price, sales_cost, coupon_discount_percent, description)
      SELECT 
        r.vendor,
        r.product AS product_name,
        COALESCE(NULLIF(r.service, ''), 'Software & Services') AS service_category,
        ROUND(COALESCE(NULLIF(AVG(r.sales_cost), 0), NULLIF(AVG(r.value), 0), 1000) * 1.15, 2) AS list_price,
        0.00 AS erp_price,
        ROUND(COALESCE(NULLIF(AVG(r.purchase_cost), 0), NULLIF(AVG(r.sales_cost), 0), 0), 2) AS sales_cost,
        10.00 AS coupon_discount_percent,
        CONCAT('Synced from client renewals (Service Plan: ', COALESCE(r.service, 'General'), ')') AS description
      FROM renewals r
      WHERE r.vendor IS NOT NULL AND r.vendor != '' AND r.product IS NOT NULL AND r.product != ''
        AND NOT EXISTS (
          SELECT 1 FROM product_pricing p 
          WHERE LOWER(p.vendor) = LOWER(r.vendor) AND LOWER(p.product_name) = LOWER(r.product)
        )
      GROUP BY r.vendor, r.product, r.service;

      UPDATE product_pricing
      SET erp_price = 0.00;

      UPDATE product_pricing p
      SET sales_cost = sub.avg_cost
      FROM (
        SELECT 
          LOWER(r.vendor) AS vendor_clean, 
          LOWER(r.product) AS product_clean, 
          ROUND(COALESCE(NULLIF(AVG(r.purchase_cost), 0), NULLIF(AVG(r.sales_cost), 0), 0), 2) AS avg_cost
        FROM renewals r
        WHERE r.vendor IS NOT NULL AND r.vendor != '' 
          AND r.product IS NOT NULL AND r.product != '' 
          AND (r.purchase_cost > 0 OR r.sales_cost > 0)
        GROUP BY LOWER(r.vendor), LOWER(r.product)
      ) sub
      WHERE LOWER(p.vendor) = sub.vendor_clean 
        AND LOWER(p.product_name) = sub.product_clean
        AND (p.sales_cost IS NULL OR p.sales_cost = 0);
    `);
    console.log('✅ Product Pricing Catalog synced with default ERP price = 0.00.');

    // Synchronize PostgreSQL ID sequences to prevent duplicate key constraint violations
    await pool.query(`
      SELECT setval(pg_get_serial_sequence('product_pricing', 'id'), COALESCE((SELECT MAX(id) FROM product_pricing), 0) + 1, false);
      SELECT setval(pg_get_serial_sequence('automation_logs', 'id'), COALESCE((SELECT MAX(id) FROM automation_logs), 0) + 1, false);
      SELECT setval(pg_get_serial_sequence('notifications', 'id'), COALESCE((SELECT MAX(id) FROM notifications), 0) + 1, false);
      SELECT setval(pg_get_serial_sequence('email_logs', 'id'), COALESCE((SELECT MAX(id) FROM email_logs), 0) + 1, false);
      SELECT setval(pg_get_serial_sequence('renewals', 'id'), COALESCE((SELECT MAX(id) FROM renewals), 0) + 1, false);
      SELECT setval(pg_get_serial_sequence('users', 'id'), COALESCE((SELECT MAX(id) FROM users), 0) + 1, false);
    `);

    // Fix email_logs recipient_type constraint to include 'admin' and 'finance'
    await pool.query(`
      ALTER TABLE email_logs DROP CONSTRAINT IF EXISTS email_logs_recipient_type_check;
      ALTER TABLE email_logs ADD CONSTRAINT email_logs_recipient_type_check
        CHECK(recipient_type IN ('client', 'sales', 'admin', 'finance'));
    `);

    // Preserve email logs even if a client renewal is deleted from system
    await pool.query(`
      ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS client_name VARCHAR(255);
      ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS service VARCHAR(255);
      
      ALTER TABLE email_logs DROP CONSTRAINT IF EXISTS email_logs_renewal_id_fkey;
      ALTER TABLE email_logs ADD CONSTRAINT email_logs_renewal_id_fkey 
        FOREIGN KEY (renewal_id) REFERENCES renewals(id) ON DELETE SET NULL;

      UPDATE email_logs el
      SET client_name = r.client_name,
          service = r.service
      FROM renewals r
      WHERE el.renewal_id = r.id AND (el.client_name IS NULL OR el.service IS NULL);
    `);

    // Create trigger to automatically reset sent flags on date changes (Insert or Update)
    await pool.query(`
      CREATE OR REPLACE FUNCTION recalc_renewal_sent_flags()
      RETURNS TRIGGER AS $$
      BEGIN
        IF TG_OP = 'INSERT' OR NEW.renewal_date IS DISTINCT FROM OLD.renewal_date THEN
          IF NEW.renewal_date IS NOT NULL THEN
            NEW.day_30_sent   = 'No';
            NEW.day_20_sent   = 'No';
            NEW.day_15_sent   = 'No';
            NEW.day_10_sent   = 'No';
            NEW.day_5_sent    = 'No';
            NEW.day_3_sent    = 'No';
            NEW.day_0_sent    = 'No';
            NEW.sales_15_sent = 'No';
            NEW.sales_5_sent  = 'No';
            NEW.sales_3_sent  = 'No';
          END IF;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trigger_recalc_renewal_sent_flags ON renewals;
      CREATE TRIGGER trigger_recalc_renewal_sent_flags
      BEFORE INSERT OR UPDATE ON renewals
      FOR EACH ROW
      EXECUTE FUNCTION recalc_renewal_sent_flags();
    `);

    // Reset sent flags on startup for active/pending renewals that need email evaluation
    await pool.query(`
      UPDATE renewals SET
        day_30_sent   = 'No',
        day_20_sent   = 'No',
        day_15_sent   = 'No',
        day_10_sent   = 'No',
        day_5_sent    = 'No',
        day_3_sent    = 'No',
        day_0_sent    = 'No',
        sales_15_sent = 'No',
        sales_5_sent  = 'No',
        sales_3_sent  = 'No'
      WHERE renewal_date IS NOT NULL AND status IN ('Active', 'Pending Renewal');
    `);

    // No auto-seeding. All users are created manually via User Management.
    // Users removed from the application are permanently deleted from the database.

    console.log('PostgreSQL database tables initialized');

    // Create DB-level triggers to auto-sync visits and locations from client_tracking_schema to marslab_schema
    await pool.query(`
      CREATE OR REPLACE FUNCTION client_tracking_schema.sync_visit_to_rms_trigger_fn()
      RETURNS TRIGGER AS $$
      DECLARE
          target_renewal_id INTEGER;
          target_cst_id INTEGER;
      BEGIN
          -- 1. Find corresponding rms_renewal_id
          SELECT rms_renewal_id INTO target_renewal_id 
          FROM client_tracking_schema.renewals 
          WHERE id = NEW.renewal_id;

          -- 2. Find corresponding rms_user_id
          SELECT rms_user_id INTO target_cst_id 
          FROM client_tracking_schema.users 
          WHERE id = NEW.cst_id;

          -- 3. If target_renewal_id or target_cst_id are NULL, try fallback matching
          IF target_renewal_id IS NULL THEN
              SELECT id INTO target_renewal_id 
              FROM marslab_schema.renewals 
              WHERE unique_id = (SELECT unique_id FROM client_tracking_schema.renewals WHERE id = NEW.renewal_id);
          END IF;

          IF target_cst_id IS NULL THEN
              SELECT id INTO target_cst_id 
              FROM marslab_schema.users 
              WHERE email = (SELECT email FROM client_tracking_schema.users WHERE id = NEW.cst_id);
          END IF;

          -- 4. If we still don't have IDs, we cannot sync
          IF target_renewal_id IS NULL OR target_cst_id IS NULL THEN
              RAISE WARNING 'Cannot sync visit %: target_renewal_id=%, target_cst_id=%', NEW.id, target_renewal_id, target_cst_id;
              RETURN NEW;
          END IF;

          -- 5. Insert or Update marslab_schema.visits
          INSERT INTO marslab_schema.visits (
              id, renewal_id, cst_id, status, start_time, arrival_time, check_in_time,
              check_out_time, start_latitude, start_longitude, client_reached,
              arrival_latitude, arrival_longitude, arrival_distance_meters, notes,
              photo_data, created_at, updated_at,
              distance_km, signature_data, checklist_data, voice_note_data,
              location_override, location_override_reason
          ) VALUES (
              NEW.id, target_renewal_id, target_cst_id, NEW.status, NEW.start_time, NEW.arrival_time, NEW.check_in_time,
              NEW.check_out_time, NEW.start_latitude, NEW.start_longitude, NEW.client_reached,
              NEW.arrival_latitude, NEW.arrival_longitude, NEW.arrival_distance_meters, NEW.notes,
              NEW.photo_data, NEW.created_at, NEW.updated_at,
              NEW.distance_km, NEW.signature_data, NEW.checklist_data, NEW.voice_note_data,
              NEW.location_override, NEW.location_override_reason
          )
          ON CONFLICT (id) DO UPDATE SET
              renewal_id = EXCLUDED.renewal_id,
              cst_id = EXCLUDED.cst_id,
              status = EXCLUDED.status,
              arrival_time = EXCLUDED.arrival_time,
              check_in_time = EXCLUDED.check_in_time,
              check_out_time = EXCLUDED.check_out_time,
              client_reached = EXCLUDED.client_reached,
              arrival_latitude = EXCLUDED.arrival_latitude,
              arrival_longitude = EXCLUDED.arrival_longitude,
              arrival_distance_meters = EXCLUDED.arrival_distance_meters,
              notes = EXCLUDED.notes,
              photo_data = EXCLUDED.photo_data,
              distance_km = EXCLUDED.distance_km,
              signature_data = EXCLUDED.signature_data,
              checklist_data = EXCLUDED.checklist_data,
              voice_note_data = EXCLUDED.voice_note_data,
              location_override = EXCLUDED.location_override,
              location_override_reason = EXCLUDED.location_override_reason,
              updated_at = EXCLUDED.updated_at;

          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      CREATE OR REPLACE FUNCTION client_tracking_schema.sync_visit_delete_to_rms_trigger_fn()
      RETURNS TRIGGER AS $$
      BEGIN
          DELETE FROM marslab_schema.visits WHERE id = OLD.id;
          RETURN OLD;
      END;
      $$ LANGUAGE plpgsql;

      CREATE OR REPLACE FUNCTION client_tracking_schema.sync_location_to_rms_trigger_fn()
      RETURNS TRIGGER AS $$
      BEGIN
          INSERT INTO marslab_schema.visit_locations (
              id, visit_id, latitude, longitude, accuracy, captured_at
          ) VALUES (
              NEW.id, NEW.visit_id, NEW.latitude, NEW.longitude, NEW.accuracy, NEW.captured_at
          )
          ON CONFLICT (id) DO UPDATE SET
              visit_id = EXCLUDED.visit_id,
              latitude = EXCLUDED.latitude,
              longitude = EXCLUDED.longitude,
              accuracy = EXCLUDED.accuracy,
              captured_at = EXCLUDED.captured_at;

          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      CREATE OR REPLACE FUNCTION client_tracking_schema.sync_location_delete_to_rms_trigger_fn()
      RETURNS TRIGGER AS $$
      BEGIN
          DELETE FROM marslab_schema.visit_locations WHERE id = OLD.id;
          RETURN OLD;
      END;
      $$ LANGUAGE plpgsql;

      -- Bind triggers
      DROP TRIGGER IF EXISTS trg_sync_visit_to_rms ON client_tracking_schema.visits;
      CREATE TRIGGER trg_sync_visit_to_rms
      AFTER INSERT OR UPDATE ON client_tracking_schema.visits
      FOR EACH ROW EXECUTE FUNCTION client_tracking_schema.sync_visit_to_rms_trigger_fn();

      DROP TRIGGER IF EXISTS trg_sync_visit_delete_to_rms ON client_tracking_schema.visits;
      CREATE TRIGGER trg_sync_visit_delete_to_rms
      AFTER DELETE ON client_tracking_schema.visits
      FOR EACH ROW EXECUTE FUNCTION client_tracking_schema.sync_visit_delete_to_rms_trigger_fn();

      DROP TRIGGER IF EXISTS trg_sync_location_to_rms ON client_tracking_schema.visit_locations;
      CREATE TRIGGER trg_sync_location_to_rms
      AFTER INSERT OR UPDATE ON client_tracking_schema.visit_locations
      FOR EACH ROW EXECUTE FUNCTION client_tracking_schema.sync_location_to_rms_trigger_fn();

      DROP TRIGGER IF EXISTS trg_sync_location_delete_to_rms ON client_tracking_schema.visit_locations;
      CREATE TRIGGER trg_sync_location_delete_to_rms
      AFTER DELETE ON client_tracking_schema.visit_locations
      FOR EACH ROW EXECUTE FUNCTION client_tracking_schema.sync_location_delete_to_rms_trigger_fn();
    `);
    console.log('✅ CTS-to-RMS Database Triggers configured successfully');
  } catch (err) {
    console.error('Error initializing database:', err);
  }
};

export default pool;
