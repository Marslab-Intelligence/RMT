-- ============================================================
-- RMT (Renewal Management System) - Full Database Schema
-- Schema: marslab_schema
-- Database: marslab_db | User: marslab_user
-- Run this on a fresh PostgreSQL instance to set up all tables
-- ============================================================

-- 0. Setup
CREATE SCHEMA IF NOT EXISTS marslab_schema;
SET search_path TO marslab_schema, public;

-- ============================================================
-- TABLE: users
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id              SERIAL PRIMARY KEY,
  username        VARCHAR(255) UNIQUE NOT NULL,
  email           VARCHAR(255) UNIQUE NOT NULL,
  password        VARCHAR(255) NOT NULL,
  full_name       VARCHAR(255) NOT NULL,
  role            VARCHAR(50)  NOT NULL CHECK (role IN ('finance', 'sales', 'admin')),
  avatar_color    VARCHAR(50)  DEFAULT '#6366f1',
  otp_code        VARCHAR(6),
  otp_expires_at  TIMESTAMP,
  is_active       BOOLEAN      DEFAULT TRUE,
  created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLE: renewals
-- ============================================================
CREATE TABLE IF NOT EXISTS renewals (
  id                    SERIAL PRIMARY KEY,
  unique_id             VARCHAR(255) UNIQUE NOT NULL,
  client_name           VARCHAR(255) NOT NULL,
  service               VARCHAR(255) NOT NULL,
  renewal_date          DATE,
  value                 NUMERIC      NOT NULL DEFAULT 0,
  owner                 VARCHAR(255) NOT NULL,
  client_email          VARCHAR(255) NOT NULL,
  sales_email           VARCHAR(255),
  contact_number        VARCHAR(50)  DEFAULT '',
  reference_id          VARCHAR(100) DEFAULT '',
  status                VARCHAR(50)  NOT NULL DEFAULT 'Active'
                          CHECK (status IN ('Active', 'Pending Renewal', 'Renewed', 'Expired', '-')),
  locked                INTEGER      DEFAULT 1,
  follow_up_status      VARCHAR(255) DEFAULT '',
  follow_up_remarks     TEXT         DEFAULT '',

  -- Email alert flags
  day_30_sent           VARCHAR(10)  DEFAULT 'No'  CHECK (day_30_sent   IN ('Yes','No')),
  day_20_sent           VARCHAR(10)  DEFAULT 'No'  CHECK (day_20_sent   IN ('Yes','No')),
  day_15_sent           VARCHAR(10)  DEFAULT 'No'  CHECK (day_15_sent   IN ('Yes','No')),
  day_10_sent           VARCHAR(10)  DEFAULT 'No'  CHECK (day_10_sent   IN ('Yes','No')),
  day_5_sent            VARCHAR(10)  DEFAULT 'No'  CHECK (day_5_sent    IN ('Yes','No')),
  day_3_sent            VARCHAR(10)  DEFAULT 'No'  CHECK (day_3_sent    IN ('Yes','No')),
  day_0_sent            VARCHAR(10)  DEFAULT 'No'  CHECK (day_0_sent    IN ('Yes','No')),
  sales_15_sent         VARCHAR(10)  DEFAULT 'No'  CHECK (sales_15_sent IN ('Yes','No')),
  sales_5_sent          VARCHAR(10)  DEFAULT 'No'  CHECK (sales_5_sent  IN ('Yes','No')),
  sales_3_sent          VARCHAR(10)  DEFAULT 'No'  CHECK (sales_3_sent   IN ('Yes','No')),

  -- Renewal workflow
  renewal_confirmation  VARCHAR(50)  DEFAULT 'pending',
  edit_status           VARCHAR(50)  DEFAULT NULL,
  edit_reason           TEXT         DEFAULT NULL,
  expiry_reason         TEXT         DEFAULT NULL,
  is_deleted            BOOLEAN      DEFAULT FALSE,

  -- Invoice
  invoice_status        VARCHAR(20)  DEFAULT 'Not' CHECK (invoice_status IN ('Sent','Not')),
  invoice_number        VARCHAR(100) DEFAULT NULL,
  invoice_value         NUMERIC(15,2) DEFAULT NULL,
  invoice_sent_date     DATE         DEFAULT NULL,

  -- Payment
  payment_status        VARCHAR(20)  DEFAULT 'No',
  payment_amount        NUMERIC(15,2) DEFAULT NULL,
  payment_received_date DATE         DEFAULT NULL,

  -- Plan / contract
  plan_period           VARCHAR(50)  DEFAULT 'yearly_plan'
                          CHECK (plan_period IN ('monthly_plan','quarterly_plan','halfly_plan','yearly_plan')),
  plan_duration         INTEGER      DEFAULT 1,

  -- Product details
  product               VARCHAR(255) DEFAULT '',
  description           TEXT         DEFAULT '',
  quantity              INTEGER      DEFAULT 1,
  purchase_cost         NUMERIC(15,2) DEFAULT 0,
  total_purchase_cost   NUMERIC(15,2) DEFAULT 0,
  sales_cost            NUMERIC(15,2) DEFAULT 0,
  total_sales_cost      NUMERIC(15,2) DEFAULT 0,
  profit                NUMERIC(15,2) DEFAULT 0,
  vendor                VARCHAR(255) DEFAULT '',
  entity                VARCHAR(255) DEFAULT '',

  -- GPS
  client_latitude       NUMERIC(10,8),
  client_longitude      NUMERIC(11,8),

  created_by            INTEGER      REFERENCES users(id),
  created_at            TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLE: renewal_history
-- ============================================================
CREATE TABLE IF NOT EXISTS renewal_history (
  id             SERIAL PRIMARY KEY,
  renewal_id     INTEGER   NOT NULL REFERENCES renewals(id) ON DELETE CASCADE,
  action         VARCHAR(255) NOT NULL,
  previous_data  TEXT,
  new_data       TEXT,
  performed_by   INTEGER   REFERENCES users(id),
  performed_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLE: activity_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS activity_logs (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER   REFERENCES users(id),
  action       VARCHAR(255) NOT NULL,
  entity_type  VARCHAR(255),
  entity_id    VARCHAR(255),
  details      TEXT,
  ip_address   VARCHAR(255),
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLE: email_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS email_logs (
  id              SERIAL PRIMARY KEY,
  renewal_id      INTEGER   REFERENCES renewals(id) ON DELETE CASCADE,
  recipient_email VARCHAR(255) NOT NULL,
  recipient_type  VARCHAR(50)  NOT NULL CHECK (recipient_type IN ('client','sales','admin','finance')),
  email_type      VARCHAR(255) NOT NULL,
  subject         VARCHAR(255) NOT NULL,
  status          VARCHAR(50)  DEFAULT 'sent' CHECK (status IN ('sent','failed','queued')),
  error_message   TEXT,
  sent_at         TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLE: notifications
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER   REFERENCES users(id),
  role       VARCHAR(50),
  title      VARCHAR(255) NOT NULL,
  message    TEXT         NOT NULL,
  type       VARCHAR(50)  DEFAULT 'info' CHECK (type IN ('info','warning','success','error')),
  read       INTEGER      DEFAULT 0,
  link       VARCHAR(255),
  created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLE: refresh_tokens
-- ============================================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  VARCHAR(512) UNIQUE NOT NULL,
  expires_at  TIMESTAMP    NOT NULL,
  revoked     INTEGER      DEFAULT 0,
  created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLE: trash_renewals
-- ============================================================
CREATE TABLE IF NOT EXISTS trash_renewals (
  id                    SERIAL PRIMARY KEY,
  original_id           INTEGER      NOT NULL,
  unique_id             VARCHAR(255),
  client_name           VARCHAR(255),
  service               VARCHAR(255),
  renewal_date          DATE,
  value                 NUMERIC,
  owner                 VARCHAR(255),
  client_email          VARCHAR(255),
  sales_email           VARCHAR(255),
  contact_number        VARCHAR(50),
  reference_id          VARCHAR(255),
  status                VARCHAR(255),
  locked                INTEGER      DEFAULT 0,
  follow_up_status      VARCHAR(255),
  follow_up_remarks     TEXT,
  day_30_sent           VARCHAR(50),
  day_20_sent           VARCHAR(50),
  day_15_sent           VARCHAR(50),
  day_10_sent           VARCHAR(50),
  day_5_sent            VARCHAR(50),
  day_3_sent            VARCHAR(50),
  day_0_sent            VARCHAR(50)  DEFAULT 'No',
  sales_15_sent         VARCHAR(50),
  sales_5_sent          VARCHAR(50),
  sales_3_sent          VARCHAR(50),
  renewal_confirmation  VARCHAR(50),
  edit_status           VARCHAR(255),
  edit_reason           TEXT,
  expiry_reason         TEXT,
  invoice_status        VARCHAR(20)  DEFAULT 'Not',
  invoice_number        VARCHAR(100) DEFAULT NULL,
  invoice_value         NUMERIC(15,2) DEFAULT NULL,
  invoice_sent_date     DATE         DEFAULT NULL,
  payment_status        VARCHAR(20)  DEFAULT 'No',
  payment_amount        NUMERIC(15,2) DEFAULT NULL,
  payment_received_date DATE         DEFAULT NULL,
  plan_period           VARCHAR(50)  DEFAULT 'yearly_plan',
  plan_duration         INTEGER      DEFAULT 1,
  product               VARCHAR(255) DEFAULT '',
  description           TEXT         DEFAULT '',
  quantity              INTEGER      DEFAULT 1,
  purchase_cost         NUMERIC(15,2) DEFAULT 0,
  total_purchase_cost   NUMERIC(15,2) DEFAULT 0,
  sales_cost            NUMERIC(15,2) DEFAULT 0,
  total_sales_cost      NUMERIC(15,2) DEFAULT 0,
  profit                NUMERIC(15,2) DEFAULT 0,
  vendor                VARCHAR(255) DEFAULT '',
  entity                VARCHAR(255) DEFAULT '',
  client_latitude       NUMERIC(10,8),
  client_longitude      NUMERIC(11,8),
  created_by            INTEGER,
  created_at            TIMESTAMP,
  updated_at            TIMESTAMP,
  deleted_at            TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLE: visits  (GPS field visits)
-- ============================================================
CREATE TABLE IF NOT EXISTS visits (
  id                       SERIAL PRIMARY KEY,
  renewal_id               INTEGER      NOT NULL REFERENCES renewals(id) ON DELETE CASCADE,
  cst_id                   INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status                   VARCHAR(50)  NOT NULL DEFAULT 'active'
                             CHECK (status IN ('active','checked_in','completed','cancelled')),
  start_time               TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  arrival_time             TIMESTAMP,
  check_in_time            TIMESTAMP,
  check_out_time           TIMESTAMP,
  start_latitude           NUMERIC(10,8) NOT NULL,
  start_longitude          NUMERIC(11,8) NOT NULL,
  client_reached           BOOLEAN      DEFAULT FALSE,
  arrival_latitude         NUMERIC(10,8),
  arrival_longitude        NUMERIC(11,8),
  arrival_distance_meters  NUMERIC(10,2),
  notes                    TEXT,
  photo_data               TEXT,
  created_at               TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at               TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLE: visit_locations  (GPS breadcrumb trail)
-- ============================================================
CREATE TABLE IF NOT EXISTS visit_locations (
  id          SERIAL PRIMARY KEY,
  visit_id    INTEGER       NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  latitude    NUMERIC(10,8) NOT NULL,
  longitude   NUMERIC(11,8) NOT NULL,
  accuracy    NUMERIC(6,2),
  captured_at TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLE: automation_settings
-- ============================================================
CREATE TABLE IF NOT EXISTS automation_settings (
  key        VARCHAR(255) PRIMARY KEY,
  value      VARCHAR(255) NOT NULL,
  updated_by INTEGER      REFERENCES users(id),
  updated_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLE: automation_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS automation_logs (
  id           SERIAL PRIMARY KEY,
  action       VARCHAR(50) NOT NULL,
  note         TEXT,
  performed_by INTEGER     REFERENCES users(id),
  performed_at TIMESTAMP   DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_visits_cst_status     ON visits(cst_id, status);
CREATE INDEX IF NOT EXISTS idx_visits_renewal        ON visits(renewal_id);
CREATE INDEX IF NOT EXISTS idx_visit_locations_visit ON visit_locations(visit_id, captured_at DESC);

-- ============================================================
-- TRIGGER: auto-recalculate email-sent flags on date change
-- ============================================================
CREATE OR REPLACE FUNCTION recalc_renewal_sent_flags()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.renewal_date IS DISTINCT FROM OLD.renewal_date THEN
    IF NEW.renewal_date IS NOT NULL THEN
      NEW.day_30_sent   = CASE WHEN (NEW.renewal_date - CURRENT_DATE) >= 30 THEN 'No' ELSE 'Yes' END;
      NEW.day_20_sent   = CASE WHEN (NEW.renewal_date - CURRENT_DATE) >= 20 THEN 'No' ELSE 'Yes' END;
      NEW.day_15_sent   = CASE WHEN (NEW.renewal_date - CURRENT_DATE) >= 15 THEN 'No' ELSE 'Yes' END;
      NEW.day_10_sent   = CASE WHEN (NEW.renewal_date - CURRENT_DATE) >= 10 THEN 'No' ELSE 'Yes' END;
      NEW.day_5_sent    = CASE WHEN (NEW.renewal_date - CURRENT_DATE) >= 5  THEN 'No' ELSE 'Yes' END;
      NEW.day_3_sent    = CASE WHEN (NEW.renewal_date - CURRENT_DATE) >= 3  THEN 'No' ELSE 'Yes' END;
      NEW.day_0_sent    = CASE WHEN (NEW.renewal_date - CURRENT_DATE) >= 0  THEN 'No' ELSE 'Yes' END;
      NEW.sales_15_sent = CASE WHEN (NEW.renewal_date - CURRENT_DATE) >= 15 THEN 'No' ELSE 'Yes' END;
      NEW.sales_5_sent  = CASE WHEN (NEW.renewal_date - CURRENT_DATE) >= 5  THEN 'No' ELSE 'Yes' END;
      NEW.sales_3_sent  = CASE WHEN (NEW.renewal_date - CURRENT_DATE) >= 3  THEN 'No' ELSE 'Yes' END;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_recalc_renewal_sent_flags ON renewals;
CREATE TRIGGER trigger_recalc_renewal_sent_flags
BEFORE INSERT OR UPDATE ON renewals
FOR EACH ROW EXECUTE FUNCTION recalc_renewal_sent_flags();

-- ============================================================
-- DEFAULT DATA
-- ============================================================
INSERT INTO automation_settings (key, value)
VALUES ('email_automation', 'start')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- IF UPDATING AN EXISTING DATABASE (run this block separately)
-- These are safe ALTER TABLE ... ADD COLUMN IF NOT EXISTS commands
-- ============================================================

-- ALTER TABLE renewals ADD COLUMN IF NOT EXISTS renewal_confirmation VARCHAR(50) DEFAULT 'pending';
-- ALTER TABLE renewals ADD COLUMN IF NOT EXISTS edit_status VARCHAR(50) DEFAULT NULL;
-- ALTER TABLE renewals ADD COLUMN IF NOT EXISTS edit_reason TEXT DEFAULT NULL;
-- ALTER TABLE renewals ADD COLUMN IF NOT EXISTS expiry_reason TEXT DEFAULT NULL;
-- ALTER TABLE renewals ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
-- ALTER TABLE renewals ADD COLUMN IF NOT EXISTS invoice_status VARCHAR(20) DEFAULT 'Not';
-- ALTER TABLE renewals ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(100) DEFAULT NULL;
-- ALTER TABLE renewals ADD COLUMN IF NOT EXISTS invoice_value NUMERIC(15,2) DEFAULT NULL;
-- ALTER TABLE renewals ADD COLUMN IF NOT EXISTS invoice_sent_date DATE DEFAULT NULL;
-- ALTER TABLE renewals ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'No';
-- ALTER TABLE renewals ADD COLUMN IF NOT EXISTS payment_amount NUMERIC(15,2) DEFAULT NULL;
-- ALTER TABLE renewals ADD COLUMN IF NOT EXISTS payment_received_date DATE DEFAULT NULL;
-- ALTER TABLE renewals ADD COLUMN IF NOT EXISTS client_latitude NUMERIC(10,8);
-- ALTER TABLE renewals ADD COLUMN IF NOT EXISTS client_longitude NUMERIC(11,8);
-- ALTER TABLE renewals ADD COLUMN IF NOT EXISTS day_0_sent VARCHAR(10) DEFAULT 'No';
-- ALTER TABLE renewals ADD COLUMN IF NOT EXISTS sales_3_sent VARCHAR(10) DEFAULT 'No' CHECK (sales_3_sent IN ('Yes','No'));
-- ALTER TABLE renewals ADD COLUMN IF NOT EXISTS plan_period VARCHAR(50) DEFAULT 'yearly_plan';
-- ALTER TABLE renewals ADD COLUMN IF NOT EXISTS plan_duration INTEGER DEFAULT 1;
-- ALTER TABLE renewals ADD COLUMN IF NOT EXISTS product VARCHAR(255) DEFAULT '';
-- ALTER TABLE renewals ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
-- ALTER TABLE renewals ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;
-- ALTER TABLE renewals ADD COLUMN IF NOT EXISTS purchase_cost NUMERIC(15,2) DEFAULT 0;
-- ALTER TABLE renewals ADD COLUMN IF NOT EXISTS total_purchase_cost NUMERIC(15,2) DEFAULT 0;
-- ALTER TABLE renewals ADD COLUMN IF NOT EXISTS sales_cost NUMERIC(15,2) DEFAULT 0;
-- ALTER TABLE renewals ADD COLUMN IF NOT EXISTS total_sales_cost NUMERIC(15,2) DEFAULT 0;
-- ALTER TABLE renewals ADD COLUMN IF NOT EXISTS profit NUMERIC(15,2) DEFAULT 0;
-- ALTER TABLE renewals ADD COLUMN IF NOT EXISTS vendor VARCHAR(255) DEFAULT '';
-- ALTER TABLE renewals ADD COLUMN IF NOT EXISTS entity VARCHAR(255) DEFAULT '';
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
-- ALTER TABLE email_logs DROP CONSTRAINT IF EXISTS email_logs_recipient_type_check;
-- ALTER TABLE email_logs ADD CONSTRAINT email_logs_recipient_type_check CHECK(recipient_type IN ('client','sales','admin','finance'));
