--
-- PostgreSQL database dump
--

\restrict ewrzR3dc4vbH9sqwwqfOZQzqIPjCEDHVDsaVahzDde011Bdj2XfYZGZjqqhIjEZ

-- Dumped from database version 16.14 (Ubuntu 16.14-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.14 (Ubuntu 16.14-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: marslab_schema; Type: SCHEMA; Schema: -; Owner: marslab_user
--

CREATE SCHEMA marslab_schema;


ALTER SCHEMA marslab_schema OWNER TO marslab_user;

--
-- Name: recalc_renewal_sent_flags(); Type: FUNCTION; Schema: marslab_schema; Owner: marslab_user
--

CREATE FUNCTION marslab_schema.recalc_renewal_sent_flags() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
      $$;


ALTER FUNCTION marslab_schema.recalc_renewal_sent_flags() OWNER TO marslab_user;

--
-- Name: set_updated_at(); Type: FUNCTION; Schema: marslab_schema; Owner: marslab_user
--

CREATE FUNCTION marslab_schema.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION marslab_schema.set_updated_at() OWNER TO marslab_user;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: activity_logs; Type: TABLE; Schema: marslab_schema; Owner: marslab_user
--

CREATE TABLE marslab_schema.activity_logs (
    id integer NOT NULL,
    user_id integer,
    action character varying(255) NOT NULL,
    entity_type character varying(255),
    entity_id character varying(255),
    details text,
    ip_address character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE marslab_schema.activity_logs OWNER TO marslab_user;

--
-- Name: activity_logs_id_seq; Type: SEQUENCE; Schema: marslab_schema; Owner: marslab_user
--

CREATE SEQUENCE marslab_schema.activity_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE marslab_schema.activity_logs_id_seq OWNER TO marslab_user;

--
-- Name: activity_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: marslab_schema; Owner: marslab_user
--

ALTER SEQUENCE marslab_schema.activity_logs_id_seq OWNED BY marslab_schema.activity_logs.id;


--
-- Name: audit_logs; Type: TABLE; Schema: marslab_schema; Owner: marslab_user
--

CREATE TABLE marslab_schema.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid,
    action text NOT NULL,
    changed_fields jsonb,
    actor text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT audit_logs_action_check CHECK ((action = ANY (ARRAY['CREATE'::text, 'UPDATE'::text, 'DELETE'::text, 'VIEW'::text])))
);


ALTER TABLE marslab_schema.audit_logs OWNER TO marslab_user;

--
-- Name: TABLE audit_logs; Type: COMMENT; Schema: marslab_schema; Owner: marslab_user
--

COMMENT ON TABLE marslab_schema.audit_logs IS 'Immutable audit trail for every client record mutation and view.';


--
-- Name: COLUMN audit_logs.action; Type: COMMENT; Schema: marslab_schema; Owner: marslab_user
--

COMMENT ON COLUMN marslab_schema.audit_logs.action IS 'One of: CREATE, UPDATE, DELETE, VIEW.';


--
-- Name: COLUMN audit_logs.changed_fields; Type: COMMENT; Schema: marslab_schema; Owner: marslab_user
--

COMMENT ON COLUMN marslab_schema.audit_logs.changed_fields IS 'JSON diff: {field: {old, new}} for mutations.';


--
-- Name: COLUMN audit_logs.actor; Type: COMMENT; Schema: marslab_schema; Owner: marslab_user
--

COMMENT ON COLUMN marslab_schema.audit_logs.actor IS 'User email / system identifier performing the action.';


--
-- Name: automation_logs; Type: TABLE; Schema: marslab_schema; Owner: marslab_user
--

CREATE TABLE marslab_schema.automation_logs (
    id integer NOT NULL,
    action character varying(50) NOT NULL,
    note text,
    performed_by integer,
    performed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE marslab_schema.automation_logs OWNER TO marslab_user;

--
-- Name: automation_logs_id_seq; Type: SEQUENCE; Schema: marslab_schema; Owner: marslab_user
--

CREATE SEQUENCE marslab_schema.automation_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE marslab_schema.automation_logs_id_seq OWNER TO marslab_user;

--
-- Name: automation_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: marslab_schema; Owner: marslab_user
--

ALTER SEQUENCE marslab_schema.automation_logs_id_seq OWNED BY marslab_schema.automation_logs.id;


--
-- Name: automation_settings; Type: TABLE; Schema: marslab_schema; Owner: marslab_user
--

CREATE TABLE marslab_schema.automation_settings (
    key character varying(255) NOT NULL,
    value character varying(255) NOT NULL,
    updated_by integer,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE marslab_schema.automation_settings OWNER TO marslab_user;

--
-- Name: clients; Type: TABLE; Schema: marslab_schema; Owner: marslab_user
--

CREATE TABLE marslab_schema.clients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_name text NOT NULL,
    service text NOT NULL,
    contract_value numeric(14,2) DEFAULT 0 NOT NULL,
    email_primary text NOT NULL,
    email_secondary text,
    contact_person text NOT NULL,
    contact_number text NOT NULL,
    address text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    aws_account_name text,
    aws_account_id text,
    aws_account_creation_date text,
    billing_company_name text,
    billing_address text,
    billing_gst_number text,
    billing_contact_primary text,
    billing_contact_secondary text,
    accounts_spoc text,
    sales_spoc text,
    contract_order_ref text,
    expected_monthly_billing text,
    billing_amount_type text,
    managed_support_type text,
    managed_support_frequency text,
    billing_terms text,
    credit_note_details text,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone,
    deleted_by text,
    delete_reason text,
    delete_reason_category text
);


ALTER TABLE marslab_schema.clients OWNER TO marslab_user;

--
-- Name: TABLE clients; Type: COMMENT; Schema: marslab_schema; Owner: marslab_user
--

COMMENT ON TABLE marslab_schema.clients IS 'Single source of truth for all Marslab client records.';


--
-- Name: COLUMN clients.id; Type: COMMENT; Schema: marslab_schema; Owner: marslab_user
--

COMMENT ON COLUMN marslab_schema.clients.id IS 'UUID primary key, auto-generated.';


--
-- Name: COLUMN clients.client_name; Type: COMMENT; Schema: marslab_schema; Owner: marslab_user
--

COMMENT ON COLUMN marslab_schema.clients.client_name IS 'Full legal name of the client organisation.';


--
-- Name: COLUMN clients.service; Type: COMMENT; Schema: marslab_schema; Owner: marslab_user
--

COMMENT ON COLUMN marslab_schema.clients.service IS 'Primary service bucket: e.g. Training, Consulting, SaaS.';


--
-- Name: COLUMN clients.contract_value; Type: COMMENT; Schema: marslab_schema; Owner: marslab_user
--

COMMENT ON COLUMN marslab_schema.clients.contract_value IS 'Total contract value in base currency (INR).';


--
-- Name: COLUMN clients.email_primary; Type: COMMENT; Schema: marslab_schema; Owner: marslab_user
--

COMMENT ON COLUMN marslab_schema.clients.email_primary IS 'Primary billing / contact email.';


--
-- Name: COLUMN clients.email_secondary; Type: COMMENT; Schema: marslab_schema; Owner: marslab_user
--

COMMENT ON COLUMN marslab_schema.clients.email_secondary IS 'Optional secondary email.';


--
-- Name: COLUMN clients.contact_person; Type: COMMENT; Schema: marslab_schema; Owner: marslab_user
--

COMMENT ON COLUMN marslab_schema.clients.contact_person IS 'Main point of contact name.';


--
-- Name: COLUMN clients.contact_number; Type: COMMENT; Schema: marslab_schema; Owner: marslab_user
--

COMMENT ON COLUMN marslab_schema.clients.contact_number IS 'Phone number with country code.';


--
-- Name: COLUMN clients.address; Type: COMMENT; Schema: marslab_schema; Owner: marslab_user
--

COMMENT ON COLUMN marslab_schema.clients.address IS 'Optional full postal address.';


--
-- Name: email_logs; Type: TABLE; Schema: marslab_schema; Owner: marslab_user
--

CREATE TABLE marslab_schema.email_logs (
    id integer NOT NULL,
    renewal_id integer,
    recipient_email character varying(255) NOT NULL,
    recipient_type character varying(50) NOT NULL,
    email_type character varying(255) NOT NULL,
    subject character varying(255) NOT NULL,
    status character varying(50) DEFAULT 'sent'::character varying,
    error_message text,
    sent_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT email_logs_recipient_type_check CHECK (((recipient_type)::text = ANY ((ARRAY['client'::character varying, 'sales'::character varying, 'admin'::character varying, 'finance'::character varying])::text[]))),
    CONSTRAINT email_logs_status_check CHECK (((status)::text = ANY ((ARRAY['sent'::character varying, 'failed'::character varying, 'queued'::character varying])::text[])))
);


ALTER TABLE marslab_schema.email_logs OWNER TO marslab_user;

--
-- Name: email_logs_id_seq; Type: SEQUENCE; Schema: marslab_schema; Owner: marslab_user
--

CREATE SEQUENCE marslab_schema.email_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE marslab_schema.email_logs_id_seq OWNER TO marslab_user;

--
-- Name: email_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: marslab_schema; Owner: marslab_user
--

ALTER SEQUENCE marslab_schema.email_logs_id_seq OWNED BY marslab_schema.email_logs.id;


--
-- Name: notifications; Type: TABLE; Schema: marslab_schema; Owner: marslab_user
--

CREATE TABLE marslab_schema.notifications (
    id integer NOT NULL,
    user_id integer,
    role character varying(50),
    title character varying(255) NOT NULL,
    message text NOT NULL,
    type character varying(50) DEFAULT 'info'::character varying,
    read integer DEFAULT 0,
    link character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT notifications_type_check CHECK (((type)::text = ANY ((ARRAY['info'::character varying, 'warning'::character varying, 'success'::character varying, 'error'::character varying])::text[])))
);


ALTER TABLE marslab_schema.notifications OWNER TO marslab_user;

--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: marslab_schema; Owner: marslab_user
--

CREATE SEQUENCE marslab_schema.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE marslab_schema.notifications_id_seq OWNER TO marslab_user;

--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: marslab_schema; Owner: marslab_user
--

ALTER SEQUENCE marslab_schema.notifications_id_seq OWNED BY marslab_schema.notifications.id;


--
-- Name: refresh_tokens; Type: TABLE; Schema: marslab_schema; Owner: marslab_user
--

CREATE TABLE marslab_schema.refresh_tokens (
    id integer NOT NULL,
    user_id integer NOT NULL,
    token_hash character varying(512) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    revoked integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE marslab_schema.refresh_tokens OWNER TO marslab_user;

--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: marslab_schema; Owner: marslab_user
--

CREATE SEQUENCE marslab_schema.refresh_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE marslab_schema.refresh_tokens_id_seq OWNER TO marslab_user;

--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: marslab_schema; Owner: marslab_user
--

ALTER SEQUENCE marslab_schema.refresh_tokens_id_seq OWNED BY marslab_schema.refresh_tokens.id;


--
-- Name: renewal_history; Type: TABLE; Schema: marslab_schema; Owner: marslab_user
--

CREATE TABLE marslab_schema.renewal_history (
    id integer NOT NULL,
    renewal_id integer NOT NULL,
    action character varying(255) NOT NULL,
    previous_data text,
    new_data text,
    performed_by integer,
    performed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE marslab_schema.renewal_history OWNER TO marslab_user;

--
-- Name: renewal_history_id_seq; Type: SEQUENCE; Schema: marslab_schema; Owner: marslab_user
--

CREATE SEQUENCE marslab_schema.renewal_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE marslab_schema.renewal_history_id_seq OWNER TO marslab_user;

--
-- Name: renewal_history_id_seq; Type: SEQUENCE OWNED BY; Schema: marslab_schema; Owner: marslab_user
--

ALTER SEQUENCE marslab_schema.renewal_history_id_seq OWNED BY marslab_schema.renewal_history.id;


--
-- Name: renewals; Type: TABLE; Schema: marslab_schema; Owner: marslab_user
--

CREATE TABLE marslab_schema.renewals (
    id integer NOT NULL,
    unique_id character varying(255) NOT NULL,
    client_name character varying(255) NOT NULL,
    service character varying(255) NOT NULL,
    renewal_date date,
    value numeric DEFAULT 0 NOT NULL,
    owner character varying(255) NOT NULL,
    client_email character varying(255) NOT NULL,
    sales_email character varying(255),
    status character varying(50) DEFAULT 'Active'::character varying NOT NULL,
    locked integer DEFAULT 1,
    follow_up_status character varying(255) DEFAULT ''::character varying,
    follow_up_remarks text DEFAULT ''::text,
    day_30_sent character varying(10) DEFAULT 'No'::character varying,
    day_20_sent character varying(10) DEFAULT 'No'::character varying,
    day_15_sent character varying(10) DEFAULT 'No'::character varying,
    day_10_sent character varying(10) DEFAULT 'No'::character varying,
    day_5_sent character varying(10) DEFAULT 'No'::character varying,
    day_3_sent character varying(10) DEFAULT 'No'::character varying,
    sales_15_sent character varying(10) DEFAULT 'No'::character varying,
    sales_5_sent character varying(10) DEFAULT 'No'::character varying,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    edit_status character varying(50),
    edit_reason text,
    sales_3_sent character varying(10) DEFAULT 'No'::character varying,
    renewal_confirmation character varying(50) DEFAULT 'pending'::character varying,
    contact_number character varying(50) DEFAULT ''::character varying,
    reference_id character varying(100) DEFAULT ''::character varying,
    is_deleted boolean DEFAULT false,
    expiry_reason text,
    invoice_status character varying(20) DEFAULT 'Not'::character varying,
    plan_period character varying(50) DEFAULT 'yearly_plan'::character varying,
    invoice_number character varying(100) DEFAULT NULL::character varying,
    invoice_value numeric(15,2) DEFAULT NULL::numeric,
    invoice_sent_date date,
    payment_status character varying(20) DEFAULT 'No'::character varying,
    payment_amount numeric(15,2) DEFAULT NULL::numeric,
    payment_received_date date,
    client_latitude numeric(10,8),
    client_longitude numeric(11,8),
    day_0_sent character varying(10) DEFAULT 'No'::character varying,
    plan_duration integer DEFAULT 1,
    product character varying(255) DEFAULT ''::character varying,
    description text DEFAULT ''::text,
    quantity integer DEFAULT 1,
    purchase_cost numeric(15,2) DEFAULT 0,
    total_purchase_cost numeric(15,2) DEFAULT 0,
    sales_cost numeric(15,2) DEFAULT 0,
    total_sales_cost numeric(15,2) DEFAULT 0,
    profit numeric(15,2) DEFAULT 0,
    vendor character varying(255) DEFAULT ''::character varying,
    entity character varying(255) DEFAULT ''::character varying,
    CONSTRAINT renewals_day_0_sent_check CHECK (((day_0_sent)::text = ANY ((ARRAY['Yes'::character varying, 'No'::character varying])::text[]))),
    CONSTRAINT renewals_day_10_sent_check CHECK (((day_10_sent)::text = ANY ((ARRAY['Yes'::character varying, 'No'::character varying])::text[]))),
    CONSTRAINT renewals_day_15_sent_check CHECK (((day_15_sent)::text = ANY ((ARRAY['Yes'::character varying, 'No'::character varying])::text[]))),
    CONSTRAINT renewals_day_20_sent_check CHECK (((day_20_sent)::text = ANY ((ARRAY['Yes'::character varying, 'No'::character varying])::text[]))),
    CONSTRAINT renewals_day_30_sent_check CHECK (((day_30_sent)::text = ANY ((ARRAY['Yes'::character varying, 'No'::character varying])::text[]))),
    CONSTRAINT renewals_day_3_sent_check CHECK (((day_3_sent)::text = ANY ((ARRAY['Yes'::character varying, 'No'::character varying])::text[]))),
    CONSTRAINT renewals_day_5_sent_check CHECK (((day_5_sent)::text = ANY ((ARRAY['Yes'::character varying, 'No'::character varying])::text[]))),
    CONSTRAINT renewals_renewal_confirmation_check CHECK (((renewal_confirmation)::text = ANY ((ARRAY['pending'::character varying, 'quotation_confirmation'::character varying, 'awaiting_client_approval'::character varying, 'awaiting_with_vendor'::character varying, 'renewed'::character varying, 'service_discontinued'::character varying])::text[]))),
    CONSTRAINT renewals_sales_15_sent_check CHECK (((sales_15_sent)::text = ANY ((ARRAY['Yes'::character varying, 'No'::character varying])::text[]))),
    CONSTRAINT renewals_sales_3_sent_check CHECK (((sales_3_sent)::text = ANY ((ARRAY['Yes'::character varying, 'No'::character varying])::text[]))),
    CONSTRAINT renewals_sales_5_sent_check CHECK (((sales_5_sent)::text = ANY ((ARRAY['Yes'::character varying, 'No'::character varying])::text[]))),
    CONSTRAINT renewals_status_check CHECK (((status)::text = ANY ((ARRAY['Active'::character varying, 'Pending Renewal'::character varying, 'Renewed'::character varying, 'Expired'::character varying, '-'::character varying])::text[])))
);


ALTER TABLE marslab_schema.renewals OWNER TO marslab_user;

--
-- Name: renewals_id_seq; Type: SEQUENCE; Schema: marslab_schema; Owner: marslab_user
--

CREATE SEQUENCE marslab_schema.renewals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE marslab_schema.renewals_id_seq OWNER TO marslab_user;

--
-- Name: renewals_id_seq; Type: SEQUENCE OWNED BY; Schema: marslab_schema; Owner: marslab_user
--

ALTER SEQUENCE marslab_schema.renewals_id_seq OWNED BY marslab_schema.renewals.id;


--
-- Name: trash_renewals; Type: TABLE; Schema: marslab_schema; Owner: marslab_user
--

CREATE TABLE marslab_schema.trash_renewals (
    id integer NOT NULL,
    original_id integer NOT NULL,
    unique_id character varying(255),
    client_name character varying(255),
    service character varying(255),
    renewal_date date,
    value numeric,
    owner character varying(255),
    client_email character varying(255),
    sales_email character varying(255),
    status character varying(255),
    locked integer DEFAULT 0,
    follow_up_status character varying(255),
    follow_up_remarks text,
    day_30_sent character varying(50),
    day_20_sent character varying(50),
    day_15_sent character varying(50),
    day_10_sent character varying(50),
    day_5_sent character varying(50),
    day_3_sent character varying(50),
    sales_15_sent character varying(50),
    sales_5_sent character varying(50),
    created_by integer,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    edit_status character varying(255),
    edit_reason text,
    sales_3_sent character varying(50),
    renewal_confirmation character varying(50),
    contact_number character varying(50),
    reference_id character varying(255),
    deleted_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    invoice_status character varying(20) DEFAULT 'Not'::character varying,
    plan_period character varying(50) DEFAULT 'yearly_plan'::character varying,
    invoice_number character varying(100) DEFAULT NULL::character varying,
    invoice_value numeric(15,2) DEFAULT NULL::numeric,
    invoice_sent_date date,
    expiry_reason text,
    payment_status character varying(20) DEFAULT 'No'::character varying,
    payment_amount numeric(15,2) DEFAULT NULL::numeric,
    payment_received_date date,
    client_latitude numeric(10,8),
    client_longitude numeric(11,8),
    day_0_sent character varying(50) DEFAULT 'No'::character varying,
    plan_duration integer DEFAULT 1,
    product character varying(255) DEFAULT ''::character varying,
    description text DEFAULT ''::text,
    quantity integer DEFAULT 1,
    purchase_cost numeric(15,2) DEFAULT 0,
    total_purchase_cost numeric(15,2) DEFAULT 0,
    sales_cost numeric(15,2) DEFAULT 0,
    total_sales_cost numeric(15,2) DEFAULT 0,
    profit numeric(15,2) DEFAULT 0,
    vendor character varying(255) DEFAULT ''::character varying,
    entity character varying(255) DEFAULT ''::character varying
);


ALTER TABLE marslab_schema.trash_renewals OWNER TO marslab_user;

--
-- Name: trash_renewals_id_seq; Type: SEQUENCE; Schema: marslab_schema; Owner: marslab_user
--

CREATE SEQUENCE marslab_schema.trash_renewals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE marslab_schema.trash_renewals_id_seq OWNER TO marslab_user;

--
-- Name: trash_renewals_id_seq; Type: SEQUENCE OWNED BY; Schema: marslab_schema; Owner: marslab_user
--

ALTER SEQUENCE marslab_schema.trash_renewals_id_seq OWNED BY marslab_schema.trash_renewals.id;


--
-- Name: users; Type: TABLE; Schema: marslab_schema; Owner: marslab_user
--

CREATE TABLE marslab_schema.users (
    id integer NOT NULL,
    username character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    password character varying(255) NOT NULL,
    full_name character varying(255) NOT NULL,
    role character varying(50) NOT NULL,
    avatar_color character varying(50) DEFAULT '#6366f1'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    otp_code character varying(6),
    otp_expires_at timestamp without time zone,
    is_active boolean DEFAULT true,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['finance'::character varying, 'sales'::character varying, 'admin'::character varying])::text[])))
);


ALTER TABLE marslab_schema.users OWNER TO marslab_user;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: marslab_schema; Owner: marslab_user
--

CREATE SEQUENCE marslab_schema.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE marslab_schema.users_id_seq OWNER TO marslab_user;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: marslab_schema; Owner: marslab_user
--

ALTER SEQUENCE marslab_schema.users_id_seq OWNED BY marslab_schema.users.id;


--
-- Name: visit_locations; Type: TABLE; Schema: marslab_schema; Owner: marslab_user
--

CREATE TABLE marslab_schema.visit_locations (
    id integer NOT NULL,
    visit_id integer NOT NULL,
    latitude numeric(10,8) NOT NULL,
    longitude numeric(11,8) NOT NULL,
    accuracy numeric(6,2),
    captured_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE marslab_schema.visit_locations OWNER TO marslab_user;

--
-- Name: visit_locations_id_seq; Type: SEQUENCE; Schema: marslab_schema; Owner: marslab_user
--

CREATE SEQUENCE marslab_schema.visit_locations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE marslab_schema.visit_locations_id_seq OWNER TO marslab_user;

--
-- Name: visit_locations_id_seq; Type: SEQUENCE OWNED BY; Schema: marslab_schema; Owner: marslab_user
--

ALTER SEQUENCE marslab_schema.visit_locations_id_seq OWNED BY marslab_schema.visit_locations.id;


--
-- Name: visits; Type: TABLE; Schema: marslab_schema; Owner: marslab_user
--

CREATE TABLE marslab_schema.visits (
    id integer NOT NULL,
    renewal_id integer NOT NULL,
    cst_id integer,
    status character varying(50) DEFAULT 'active'::character varying NOT NULL,
    start_time timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    arrival_time timestamp without time zone,
    check_in_time timestamp without time zone,
    check_out_time timestamp without time zone,
    start_latitude numeric(10,8) NOT NULL,
    start_longitude numeric(11,8) NOT NULL,
    client_reached boolean DEFAULT false,
    arrival_latitude numeric(10,8),
    arrival_longitude numeric(11,8),
    arrival_distance_meters numeric(10,2),
    notes text,
    photo_data text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT visits_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'checked_in'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[])))
);


ALTER TABLE marslab_schema.visits OWNER TO marslab_user;

--
-- Name: visits_id_seq; Type: SEQUENCE; Schema: marslab_schema; Owner: marslab_user
--

CREATE SEQUENCE marslab_schema.visits_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE marslab_schema.visits_id_seq OWNER TO marslab_user;

--
-- Name: visits_id_seq; Type: SEQUENCE OWNED BY; Schema: marslab_schema; Owner: marslab_user
--

ALTER SEQUENCE marslab_schema.visits_id_seq OWNED BY marslab_schema.visits.id;


--
-- Name: activity_logs id; Type: DEFAULT; Schema: marslab_schema; Owner: marslab_user
--

ALTER TABLE ONLY marslab_schema.activity_logs ALTER COLUMN id SET DEFAULT nextval('marslab_schema.activity_logs_id_seq'::regclass);


--
-- Name: automation_logs id; Type: DEFAULT; Schema: marslab_schema; Owner: marslab_user
--

ALTER TABLE ONLY marslab_schema.automation_logs ALTER COLUMN id SET DEFAULT nextval('marslab_schema.automation_logs_id_seq'::regclass);


--
-- Name: email_logs id; Type: DEFAULT; Schema: marslab_schema; Owner: marslab_user
--

ALTER TABLE ONLY marslab_schema.email_logs ALTER COLUMN id SET DEFAULT nextval('marslab_schema.email_logs_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: marslab_schema; Owner: marslab_user
--

ALTER TABLE ONLY marslab_schema.notifications ALTER COLUMN id SET DEFAULT nextval('marslab_schema.notifications_id_seq'::regclass);


--
-- Name: refresh_tokens id; Type: DEFAULT; Schema: marslab_schema; Owner: marslab_user
--

ALTER TABLE ONLY marslab_schema.refresh_tokens ALTER COLUMN id SET DEFAULT nextval('marslab_schema.refresh_tokens_id_seq'::regclass);


--
-- Name: renewal_history id; Type: DEFAULT; Schema: marslab_schema; Owner: marslab_user
--

ALTER TABLE ONLY marslab_schema.renewal_history ALTER COLUMN id SET DEFAULT nextval('marslab_schema.renewal_history_id_seq'::regclass);


--
-- Name: renewals id; Type: DEFAULT; Schema: marslab_schema; Owner: marslab_user
--

ALTER TABLE ONLY marslab_schema.renewals ALTER COLUMN id SET DEFAULT nextval('marslab_schema.renewals_id_seq'::regclass);


--
-- Name: trash_renewals id; Type: DEFAULT; Schema: marslab_schema; Owner: marslab_user
--

ALTER TABLE ONLY marslab_schema.trash_renewals ALTER COLUMN id SET DEFAULT nextval('marslab_schema.trash_renewals_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: marslab_schema; Owner: marslab_user
--

ALTER TABLE ONLY marslab_schema.users ALTER COLUMN id SET DEFAULT nextval('marslab_schema.users_id_seq'::regclass);


--
-- Name: visit_locations id; Type: DEFAULT; Schema: marslab_schema; Owner: marslab_user
--

ALTER TABLE ONLY marslab_schema.visit_locations ALTER COLUMN id SET DEFAULT nextval('marslab_schema.visit_locations_id_seq'::regclass);


--
-- Name: visits id; Type: DEFAULT; Schema: marslab_schema; Owner: marslab_user
--

ALTER TABLE ONLY marslab_schema.visits ALTER COLUMN id SET DEFAULT nextval('marslab_schema.visits_id_seq'::regclass);


--
-- Data for Name: activity_logs; Type: TABLE DATA; Schema: marslab_schema; Owner: marslab_user
--

COPY marslab_schema.activity_logs (id, user_id, action, entity_type, entity_id, details, ip_address, created_at) FROM stdin;
1	3	login	user	\N	System Admin logged in.	\N	2026-05-19 11:08:18.661736
2	3	login	user	\N	System Admin logged in.	\N	2026-05-19 11:43:51.882617
3	3	login	user	\N	System Admin logged in.	\N	2026-05-19 11:44:47.765398
4	2	login	user	\N	Sales Rep logged in.	\N	2026-05-19 11:47:12.477508
5	1	login	user	\N	Finance Lead logged in.	\N	2026-05-19 11:47:32.198135
6	1	login	user	\N	Finance Lead logged in.	\N	2026-05-19 11:47:47.986044
7	3	login	user	\N	System Admin logged in.	\N	2026-05-19 11:59:25.126416
8	1	login	user	\N	Finance Lead logged in.	\N	2026-05-19 12:09:52.654107
9	3	login	user	\N	System Admin logged in via Zoho SSO.	\N	2026-05-19 12:40:17.22342
10	3	login	user	\N	System Admin logged in via Zoho SSO.	\N	2026-05-19 12:40:21.395329
11	3	login	user	\N	System Admin logged in via Zoho SSO.	\N	2026-05-19 12:40:25.526919
12	3	login	user	\N	System Admin logged in via Zoho SSO.	\N	2026-05-19 12:46:39.402047
13	3	login	user	\N	System Admin logged in via Zoho SSO.	\N	2026-05-19 12:46:42.20084
14	3	login	user	\N	System Admin logged in via Zoho SSO.	\N	2026-05-19 12:48:33.734194
15	3	login	user	\N	System Admin logged in via Zoho SSO.	\N	2026-05-19 12:48:34.177836
16	3	login	user	\N	System Admin logged in via Zoho SSO.	\N	2026-05-19 12:48:34.579315
17	3	login	user	\N	System Admin logged in via Zoho SSO.	\N	2026-05-19 12:48:35.020992
18	3	login	user	\N	System Admin logged in via Zoho SSO.	\N	2026-05-19 12:48:35.447274
19	3	login	user	\N	System Admin logged in via Zoho SSO.	\N	2026-05-19 12:58:11.669148
20	3	login	user	\N	System Admin logged in via Zoho SSO.	\N	2026-05-19 12:58:12.686638
21	3	login	user	\N	System Admin logged in via Zoho SSO.	\N	2026-05-19 12:58:16.462401
22	3	login	user	\N	System Admin logged in via Zoho SSO.	\N	2026-05-19 12:58:21.401526
23	3	login	user	\N	System Admin logged in via Zoho SSO.	\N	2026-05-19 13:01:14.06998
24	3	login	user	\N	System Admin logged in via Zoho SSO.	\N	2026-05-19 13:01:16.751762
25	3	login	user	\N	System Admin logged in via Zoho SSO.	\N	2026-05-19 13:01:21.391687
26	3	login	user	\N	System Admin logged in via Zoho SSO.	\N	2026-05-19 13:01:24.706388
27	3	login	user	\N	System Admin logged in via Zoho SSO.	\N	2026-05-19 13:01:31.123949
28	3	login	user	\N	System Admin logged in via Zoho SSO.	\N	2026-05-19 13:01:31.62292
29	3	login	user	\N	System Admin logged in via Zoho SSO.	\N	2026-05-19 13:02:05.683459
30	3	login	user	\N	System Admin logged in via Zoho SSO.	\N	2026-05-19 13:02:08.435547
31	3	login	user	\N	System Admin logged in via Zoho SSO.	\N	2026-05-19 13:03:22.965384
32	3	login	user	\N	System Admin logged in via Zoho SSO.	\N	2026-05-19 13:03:26.46247
33	3	login	user	\N	System Admin logged in via Zoho SSO.	\N	2026-05-19 14:13:57.280789
34	3	login	user	\N	System Admin logged in via Zoho SSO.	\N	2026-05-19 14:13:59.553267
35	3	login	user	\N	System Admin logged in via Zoho SSO.	\N	2026-05-19 14:15:10.319291
36	3	login	user	\N	System Admin logged in via Zoho SSO.	\N	2026-05-19 14:15:11.141522
37	3	login	user	\N	System Admin logged in via Zoho SSO.	\N	2026-05-19 14:15:20.15049
38	3	login	user	\N	System Admin logged in via Zoho SSO.	\N	2026-05-19 14:16:04.653175
39	3	login	user	\N	System Admin logged in via Zoho SSO.	\N	2026-05-19 14:16:06.563923
40	3	login	user	\N	System Admin logged in via Zoho SSO.	\N	2026-05-19 14:16:13.971578
41	3	login	user	\N	System Admin logged in via Zoho SSO.	\N	2026-05-19 14:21:16.185093
42	3	login	user	\N	System Admin logged in via Zoho SSO.	\N	2026-05-19 14:21:18.417166
43	3	login	user	\N	System Admin logged in via Zoho SSO.	\N	2026-05-19 14:25:46.458729
44	3	login	user	\N	System Admin logged in via Zoho SSO.	\N	2026-05-19 14:25:58.090759
45	3	login	user	\N	System Admin logged in via Zoho SSO.	\N	2026-05-19 14:27:55.614091
46	3	login	user	\N	System Admin logged in via Zoho SSO.	\N	2026-05-19 14:29:46.128235
54	2	login	user	\N	Sakthivel K logged in via Zoho SSO.	\N	2026-05-19 15:45:54.010605
56	1	login	user	\N	Finance Lead logged in via Zoho SSO.	\N	2026-05-19 16:13:09.00563
59	2	login	user	\N	Sakthivel K logged in via Zoho SSO.	\N	2026-05-19 17:51:51.228629
64	3	login	user	\N	System Admin logged in via Zoho SSO.	\N	2026-05-20 09:32:13.839891
51	3	create	renewal	RMT-02	Created renewal for sakthi  - ms365	\N	2026-05-19 14:58:17.561208
52	3	edit	renewal	RMT-02	Edited renewal details for sakthi . Reason: test	\N	2026-05-19 15:07:10.874626
55	2	edit	renewal	RMT-02	Edited renewal details for sakthi . Reason: test	\N	2026-05-19 15:47:08.522971
72	3	edit	renewal	RMT-02	Edited renewal details for sakthi . Reason: test	\N	2026-05-20 10:19:03.945994
57	1	create	renewal	RMT-03	Created renewal for ranjith - office 365	\N	2026-05-19 16:15:29.661846
58	3	edit	renewal	RMT-03	Edited renewal details for ranjith. Reason: test	\N	2026-05-19 16:16:01.030784
60	3	renewal_confirmation	renewal	RMT-03	Sales team marked ranjith (office 365) as "Renewed". 	\N	2026-05-19 18:02:49.021444
61	3	renewal_confirmation	renewal	RMT-03	Sales team marked ranjith (office 365) as "Closed". 	\N	2026-05-19 18:10:54.597007
62	2	edit	renewal	RMT-03	Edited renewal details for ranjith. Reason: test	\N	2026-05-19 18:14:38.949407
63	2	renewal_confirmation	renewal	RMT-03	Sales team marked ranjith (office 365) as "Renewed". 	\N	2026-05-19 18:15:00.17997
65	3	edit	renewal	RMT-03	Edited renewal details for ranjith. Reason: test	\N	2026-05-20 09:46:35.768734
47	3	create	renewal	RMT-01	Created renewal for test - test	\N	2026-05-19 14:31:57.336055
48	3	edit	renewal	RMT-01	Edited renewal details for test. Reason: change in date 	\N	2026-05-19 14:38:56.941487
49	3	edit	renewal	RMT-01	Edited renewal details for test. Reason: test	\N	2026-05-19 14:39:31.321817
50	3	edit	renewal	RMT-01	Edited renewal details for test. Reason: test	\N	2026-05-19 14:39:50.529119
53	3	edit	renewal	RMT-01	Edited renewal details for test. Reason: test	\N	2026-05-19 15:34:30.161056
75	3	renewal_confirmation	renewal	RMT-01	Sales team marked test (test) as "Renewed". 	\N	2026-05-20 11:05:49.620613
76	3	renewal_confirmation	renewal	RMT-01	Sales team marked test (test) as "Renewed". 	\N	2026-05-20 11:05:51.439263
86	3	renewal_confirmation	renewal	RMT-01	Admin marked test (test) as "Service Discontinued". 	\N	2026-05-20 12:25:11.312202
87	3	renewal_confirmation	renewal	RMT-01	Admin marked test (test) as "Renewed". 	\N	2026-05-20 12:25:38.921281
88	3	edit	renewal	RMT-01	Edited renewal details for test. Reason: test	\N	2026-05-20 12:26:04.676111
77	3	edit	renewal	RMT-02	Edited renewal details for sakthi . Reason: test	\N	2026-05-20 12:02:23.149395
78	3	edit	renewal	RMT-02	Edited renewal details for sakthi . Reason: test	\N	2026-05-20 12:03:04.170964
79	3	renewal_confirmation	renewal	RMT-02	Sales team marked sakthi  (ms365) as "Service Discontinued". 	\N	2026-05-20 12:07:00.711074
81	3	renewal_confirmation	renewal	RMT-02	Sales team marked sakthi  (ms365) as "Renewed". 	\N	2026-05-20 12:16:19.598337
82	3	renewal_confirmation	renewal	RMT-02	Sales team marked sakthi  (ms365) as "Renewed". 	\N	2026-05-20 12:16:20.706036
83	3	renewal_confirmation	renewal	RMT-02	Sales team marked sakthi  (ms365) as "Service Discontinued". 	\N	2026-05-20 12:16:27.480572
66	3	renewal_confirmation	renewal	RMT-03	Sales team marked ranjith (office 365) as "Quotation Confirmation". 	\N	2026-05-20 10:11:56.503101
67	3	renewal_confirmation	renewal	RMT-03	Sales team marked ranjith (office 365) as "Awaiting Client Approval". 	\N	2026-05-20 10:12:10.059422
68	3	renewal_confirmation	renewal	RMT-03	Sales team marked ranjith (office 365) as "Awaiting with Vendor". 	\N	2026-05-20 10:12:18.304464
69	3	renewal_confirmation	renewal	RMT-03	Sales team marked ranjith (office 365) as "Renewed". 	\N	2026-05-20 10:12:23.982206
70	3	renewal_confirmation	renewal	RMT-03	Sales team marked ranjith (office 365) as "Service Discontinued". 	\N	2026-05-20 10:12:29.492071
71	3	edit	renewal	RMT-03	Edited renewal details for ranjith. Reason: test	\N	2026-05-20 10:18:33.807628
73	3	renewal_confirmation	renewal	RMT-03	Sales team marked ranjith (office 365) as "Renewed". 	\N	2026-05-20 11:00:33.708645
74	3	renewal_confirmation	renewal	RMT-03	Sales team marked ranjith (office 365) as "Renewed". 	\N	2026-05-20 11:00:34.918714
80	3	renewal_confirmation	renewal	RMT-03	Sales team marked ranjith (office 365) as "Service Discontinued". 	\N	2026-05-20 12:15:57.793121
84	3	renewal_confirmation	renewal	RMT-03	Admin marked ranjith (office 365) as "Awaiting with Vendor". 	\N	2026-05-20 12:23:17.929476
85	3	edit	renewal	RMT-03	Edited renewal details for ranjith. Reason: test	\N	2026-05-20 12:23:43.17952
89	3	create	renewal	RMT-04	Created renewal for sameer  - 123	\N	2026-05-20 12:41:12.122138
90	2	login	user	\N	Sakthivel K logged in via Zoho SSO.	\N	2026-05-20 12:48:29.722958
91	1	login	user	\N	Finance Lead logged in via Zoho SSO.	\N	2026-05-20 12:51:08.161406
92	3	create	renewal	RMT-05	Created renewal via CSV import for ABC Technologies Pvt Ltd - Cloud Hosting Service	\N	2026-05-20 14:10:22.648149
93	3	create	renewal	RMT-06	Created renewal via CSV import for Global Media Solutions - Digital Marketing Subscription	\N	2026-05-20 14:10:22.648149
94	3	renewal_confirmation	renewal	RMT-05	Admin marked ABC Technologies Pvt Ltd (Cloud Hosting Service) as "Quotation Confirmation". 	\N	2026-05-20 14:21:16.607171
95	3	renewal_confirmation	renewal	RMT-03	Admin marked ranjith (office 365) as "Quotation Confirmation". 	\N	2026-05-20 14:23:18.553872
96	3	renewal_confirmation	renewal	RMT-03	Admin marked ranjith (office 365) as "Quotation Confirmation". 	\N	2026-05-20 14:24:00.28315
97	3	edit	renewal	RMT-03	Edited renewal details for ranjith. Reason: test	\N	2026-05-20 15:47:37.856307
98	3	renewal_confirmation	renewal	RMT-03	Admin marked ranjith (office 365) as "Quotation Confirmation". 	\N	2026-05-20 16:09:56.211078
99	3	delete	renewal	RMT-03	Deleted renewal: ranjith - office 365	\N	2026-05-20 16:29:28.116652
100	3	delete	renewal	RMT-05	Deleted renewal: ABC Technologies Pvt Ltd - Cloud Hosting Service	\N	2026-05-20 16:29:30.964726
101	3	delete	renewal	RMT-01	Deleted renewal: test - test	\N	2026-05-20 16:29:32.961153
102	3	delete	renewal	RMT-06	Deleted renewal: Global Media Solutions - Digital Marketing Subscription	\N	2026-05-20 16:29:35.432096
103	3	delete	renewal	RMT-04	Deleted renewal: sameer  - 123	\N	2026-05-20 16:29:37.278758
104	3	delete	renewal	RMT-02	Deleted renewal: sakthi  - ms365	\N	2026-05-20 16:29:39.832478
105	3	login	user	\N	System Admin logged in via Zoho SSO.	\N	2026-05-20 16:42:00.715475
106	3	login	user	\N	System Admin logged in via Zoho SSO.	\N	2026-05-20 16:46:31.999039
107	3	login	user	\N	System Admin logged in via Zoho SSO.	\N	2026-05-20 17:15:35.087867
108	3	create	renewal	RMT-01	Created renewal for test - office365	\N	2026-05-20 18:06:49.538663
109	3	renewal_confirmation	renewal	RMT-01	Admin marked test (office365) as "Renewed". 	\N	2026-05-20 18:10:53.813588
110	3	renewal_confirmation	renewal	RMT-01	Admin marked test (office365) as "Renewed". 	\N	2026-05-20 18:11:02.01341
111	3	renewal_confirmation	renewal	RMT-01	Admin marked test (office365) as "Renewed". 	\N	2026-05-20 18:11:19.802164
112	3	renewal_confirmation	renewal	RMT-01	Admin marked test (office365) as "Quotation Confirmation". 	\N	2026-05-20 18:18:30.85822
113	3	renewal_confirmation	renewal	RMT-01	Admin marked test (office365) as "Renewed". 	\N	2026-05-20 18:21:48.818772
114	3	create	renewal	RMT-02	Created renewal for sameer  - aws	\N	2026-05-20 18:30:34.172606
115	3	edit	renewal	RMT-02	Edited renewal details for sameer . Reason: test	\N	2026-05-20 18:31:40.784456
116	3	renewal_confirmation	renewal	RMT-02	Admin marked sameer  (aws) as "Quotation Confirmation". 	\N	2026-05-20 18:32:45.862403
117	3	renewal_confirmation	renewal	RMT-02	Admin marked sameer  (aws) as "Renewed". 	\N	2026-05-20 18:35:38.113495
118	3	delete	renewal	RMT-01	Deleted renewal: test - office365	\N	2026-05-20 18:36:48.689034
119	2	login	user	\N	Sakthivel K logged in via Zoho SSO.	\N	2026-05-20 18:39:10.625315
120	3	login	user	\N	System Admin logged in via Zoho SSO.	\N	2026-05-21 09:43:35.559211
121	3	edit	renewal	RMT-02	Edited renewal details for sameer . Reason: test	\N	2026-05-21 09:56:38.866955
122	3	edit	renewal	RMT-02	Edited renewal details for sameer . Reason: test2	\N	2026-05-21 09:58:23.144229
123	3	edit	renewal	RMT-02	Edited renewal details for sameer . Reason: test2	\N	2026-05-21 09:59:04.341792
124	3	edit	renewal	RMT-02	Edited renewal details for sameer . Reason: test3	\N	2026-05-21 10:00:31.166455
125	3	edit	renewal	RMT-02	Edited renewal details for sameer . Reason: test4	\N	2026-05-21 10:01:12.780662
126	3	edit	renewal	RMT-02	Edited renewal details for sameer . Reason: test5	\N	2026-05-21 10:02:01.765527
127	3	renewal_confirmation	renewal	RMT-02	Admin marked sameer  (aws) as "Quotation Confirmation". 	\N	2026-05-21 10:03:56.24512
128	3	renewal_confirmation	renewal	RMT-02	Admin marked sameer  (aws) as "Awaiting Client Approval". 	\N	2026-05-21 10:04:13.907424
129	3	renewal_confirmation	renewal	RMT-02	Admin marked sameer  (aws) as "Awaiting with Vendor". 	\N	2026-05-21 10:04:18.166871
130	3	renewal_confirmation	renewal	RMT-02	Admin marked sameer  (aws) as "Renewed". 	\N	2026-05-21 10:04:32.836375
131	3	renewal_confirmation	renewal	RMT-02	Admin marked sameer  (aws) as "Service Discontinued". 	\N	2026-05-21 10:04:40.079846
132	3	edit	renewal	RMT-02	Edited renewal details for sameer . Reason: test	\N	2026-05-21 10:12:42.243373
133	3	edit	renewal	RMT-02	Edited renewal details for sameer . Reason: test	\N	2026-05-21 10:13:24.324328
134	3	edit	renewal	RMT-02	Edited renewal details for sameer . Reason: ts	\N	2026-05-21 10:20:36.627132
135	3	edit	renewal	RMT-02	Edited renewal details for sameer . Reason: test	\N	2026-05-21 10:39:42.756686
136	3	edit	renewal	RMT-02	Edited renewal details for sameer . Reason: test	\N	2026-05-21 10:40:07.359646
137	3	edit	renewal	RMT-02	Edited renewal details for sameer . Reason: test	\N	2026-05-21 10:44:05.389889
138	3	edit	renewal	RMT-02	Edited renewal details for sameer . Reason: test	\N	2026-05-21 10:50:19.03005
139	3	login	user	\N	System Admin logged in via Zoho SSO.	\N	2026-06-23 11:59:47.69142
140	3	edit	renewal	RMT-02	Edited renewal details for sameer . Reason: asfas	\N	2026-06-23 12:00:23.073887
141	3	edit	renewal	RMT-02	Edited renewal details for sameer . Reason: FAS	\N	2026-06-23 12:03:56.588609
142	3	login	user	\N	System Admin logged in via Zoho SSO.	\N	2026-06-29 14:21:22.526166
143	3	edit	renewal	RMT-02	Edited renewal details for sameer . Reason: yfuu	\N	2026-06-29 14:22:50.915954
144	3	edit	renewal	RMT-02	Edited renewal details for sameer . Reason: dsdgsdg	\N	2026-06-29 14:37:36.839153
145	3	delete	user	\N	Admin deactivated user: ranjithkumar.v@marslab.work	\N	2026-06-29 14:57:44.935532
146	3	delete	user	\N	Admin permanently deleted user: ranjithkumar.v@marslab.work	\N	2026-06-29 14:57:47.044424
147	3	delete	user	\N	Admin deactivated user: sakthivel.k@marslab.work	\N	2026-06-29 14:57:52.687717
148	3	delete	user	\N	Admin permanently deleted user: sakthivel.k@marslab.work	\N	2026-06-29 14:57:54.409927
149	3	delete	user	\N	Admin deactivated user: sameerulrahman212002@gmail.com	\N	2026-06-29 14:57:59.855073
150	3	delete	user	\N	Admin permanently deleted user: sameerulrahman212002@gmail.com	\N	2026-06-29 14:58:04.303332
151	3	update	user	\N	Admin reactivated user: sakthivel.k@marslab.work	\N	2026-06-30 09:50:38.275676
152	2	login	user	\N	Sakthivel K logged in via Zoho SSO.	\N	2026-06-30 09:51:13.73096
153	2	edit	renewal	RMT-02	CST updated product cost fields for sameer 	\N	2026-06-30 10:16:04.710824
154	2	login	user	\N	Sakthivel K logged in via Zoho SSO.	\N	2026-06-30 10:41:51.303666
155	3	login	user	\N	System Admin logged in via Zoho SSO.	\N	2026-06-30 12:07:15.135301
156	3	delete_soft	renewal	RMT-02	Moved renewal to trash: sameer  - Amazon Web Services	\N	2026-06-30 15:41:45.324167
157	3	delete_soft	renewal	RMT-EXP-01	Moved renewal to trash: Expired Client Inc - Google Workspace	\N	2026-06-30 15:41:47.624412
158	3	restore	renewal	RMT-02	Restored renewal: sameer  - Amazon Web Services	\N	2026-06-30 15:54:28.154973
159	3	delete_soft	renewal	RMT-02	Moved renewal to trash: sameer  - Amazon Web Services	\N	2026-06-30 17:21:03.950796
160	3	create	renewal	RMT-01	Created renewal via CSV import for Proodle Hospitality Services - ADDS	\N	2026-06-30 18:03:18.758085
161	3	create	renewal	RMT-02	Created renewal via CSV import for GBSV & CO - Tally	\N	2026-06-30 18:03:18.758085
162	3	create	renewal	RMT-03	Created renewal via CSV import for Venkat & Co - Tally	\N	2026-06-30 18:03:18.758085
163	3	create	renewal	RMT-04	Created renewal via CSV import for Thanga Prathap - AWS	\N	2026-06-30 18:03:18.758085
164	3	create	renewal	RMT-05	Created renewal via CSV import for Bharatiya Janata Party - AWS	\N	2026-06-30 18:03:18.758085
165	3	create	renewal	RMT-06	Created renewal via CSV import for GB Power Projects Private Limited - AWS	\N	2026-06-30 18:03:18.758085
166	3	create	renewal	RMT-07	Created renewal via CSV import for Enmas Andritz Private Limited - AWS	\N	2026-06-30 18:03:18.758085
167	3	create	renewal	RMT-08	Created renewal via CSV import for Talodyn Networks Private Limited - Backup solution	\N	2026-06-30 18:03:18.758085
168	3	create	renewal	RMT-09	Created renewal via CSV import for Aadit Auto Company Pvt Ltd - Backup solution	\N	2026-06-30 18:03:18.758085
169	3	create	renewal	RMT-10	Created renewal via CSV import for Swelect Energy Systems Limited-U35 - Salem - Backup solution	\N	2026-06-30 18:03:18.758085
170	3	create	renewal	RMT-11	Created renewal via CSV import for Swelect Energy Systems Limited - Chennai - Backup solution	\N	2026-06-30 18:03:18.758085
171	3	create	renewal	RMT-12	Created renewal via CSV import for Swelect Energy Systems Limited-U35 Coimbatore - Backup solution	\N	2026-06-30 18:03:18.758085
172	3	create	renewal	RMT-13	Created renewal via CSV import for Professional Impex Pvt Ltd (Chennai) - Backup solution	\N	2026-06-30 18:03:18.758085
173	3	create	renewal	RMT-14	Created renewal via CSV import for Talodyn Networks Private Limited - Backup solution	\N	2026-06-30 18:03:18.758085
174	3	create	renewal	RMT-15	Created renewal via CSV import for Paloma Turning Co Pvt Ltd - Backup solution	\N	2026-06-30 18:03:18.758085
175	3	create	renewal	RMT-16	Created renewal via CSV import for Paloma Turning Co Pvt Ltd - Backup solution	\N	2026-06-30 18:03:18.758085
176	3	create	renewal	RMT-17	Created renewal via CSV import for Sreshta Sumanth Builders Private Limited - Backup solution	\N	2026-06-30 18:03:18.758085
177	3	create	renewal	RMT-18	Created renewal via CSV import for Sivaramakrishna Forgings Private Limited - Backup solution	\N	2026-06-30 18:03:18.758085
178	3	create	renewal	RMT-19	Created renewal via CSV import for S S GREEN ENVIRO METAL IMPEX - Domain	\N	2026-06-30 18:03:18.758085
179	3	create	renewal	RMT-20	Created renewal via CSV import for Pee & Dee Lands Holding Pvt Ltd - Domain	\N	2026-06-30 18:03:18.758085
180	3	create	renewal	RMT-21	Created renewal via CSV import for Sri Balaji Castings Pvt Ltd - Domain	\N	2026-06-30 18:03:18.758085
181	3	create	renewal	RMT-22	Created renewal via CSV import for Sri Balaji Engineers - Domain	\N	2026-06-30 18:03:18.758085
182	3	create	renewal	RMT-23	Created renewal via CSV import for Shanke Enterprise Private Limited - Domain	\N	2026-06-30 18:03:18.758085
183	3	create	renewal	RMT-24	Created renewal via CSV import for Sri Balaji Castings Pvt Ltd - Domain	\N	2026-06-30 18:03:18.758085
184	3	create	renewal	RMT-25	Created renewal via CSV import for J S Tours and Travels - Domain	\N	2026-06-30 18:03:18.758085
185	3	create	renewal	RMT-26	Created renewal via CSV import for J S Tours and Travels - Domain	\N	2026-06-30 18:03:18.758085
186	3	create	renewal	RMT-27	Created renewal via CSV import for NLS Associates - Domain	\N	2026-06-30 18:03:18.758085
187	3	create	renewal	RMT-28	Created renewal via CSV import for Solution Experts - Domain	\N	2026-06-30 18:03:18.758085
188	3	create	renewal	RMT-29	Created renewal via CSV import for Naahar Public School - Domain	\N	2026-06-30 18:03:18.758085
189	3	create	renewal	RMT-30	Created renewal via CSV import for Sri Balaji Castings Pvt Ltd - Domain	\N	2026-06-30 18:03:18.758085
190	3	create	renewal	RMT-31	Created renewal via CSV import for M R Greentech - Domain	\N	2026-06-30 18:03:18.758085
191	3	create	renewal	RMT-32	Created renewal via CSV import for INTEGRATED SERVICE POINT LIMITED - M365	\N	2026-06-30 18:03:18.758085
192	3	create	renewal	RMT-33	Created renewal via CSV import for AI Enterprise - M365	\N	2026-06-30 18:03:18.758085
193	3	create	renewal	RMT-34	Created renewal via CSV import for Talodyn Networks Private Limited - Firewall	\N	2026-06-30 18:03:18.758085
194	3	create	renewal	RMT-35	Created renewal via CSV import for Winsar Infosoft Private Limited - Firewall	\N	2026-06-30 18:03:18.758085
195	3	create	renewal	RMT-36	Created renewal via CSV import for NX Logistics India Pvt. Ltd(Gurugram) - Firewall	\N	2026-06-30 18:03:18.758085
196	3	create	renewal	RMT-37	Created renewal via CSV import for Sivaramakrishna Forgings Private Limited - Firewall	\N	2026-06-30 18:03:18.758085
197	3	create	renewal	RMT-38	Created renewal via CSV import for Sivaramakrishna Forgings Private Limited - Firewall	\N	2026-06-30 18:03:18.758085
198	3	create	renewal	RMT-39	Created renewal via CSV import for Sivaramakrishna Forgings Private Limited - Firewall	\N	2026-06-30 18:03:18.758085
199	3	create	renewal	RMT-40	Created renewal via CSV import for Talodyn Networks Private Limited - Firewall	\N	2026-06-30 18:03:18.758085
200	3	create	renewal	RMT-41	Created renewal via CSV import for Sri Balaji Castings Pvt Ltd - Firewall	\N	2026-06-30 18:03:18.758085
201	3	create	renewal	RMT-42	Created renewal via CSV import for Sri Balaji Castings Pvt Ltd - Firewall	\N	2026-06-30 18:03:18.758085
202	3	create	renewal	RMT-43	Created renewal via CSV import for Sri Balaji Castings Pvt Ltd - Firewall	\N	2026-06-30 18:03:18.758085
203	3	create	renewal	RMT-44	Created renewal via CSV import for Sri Balaji Castings Pvt Ltd - Firewall	\N	2026-06-30 18:03:18.758085
204	3	create	renewal	RMT-45	Created renewal via CSV import for Discover Tech - GWS	\N	2026-06-30 18:03:18.758085
205	3	create	renewal	RMT-46	Created renewal via CSV import for DS Square Technologies - GWS	\N	2026-06-30 18:03:18.758085
206	3	create	renewal	RMT-47	Created renewal via CSV import for S S GREEN ENVIRO METAL IMPEX - GWS	\N	2026-06-30 18:03:18.758085
207	3	create	renewal	RMT-48	Created renewal via CSV import for Olive Grapes - GWS	\N	2026-06-30 18:03:18.758085
208	3	create	renewal	RMT-49	Created renewal via CSV import for Vijay Logistics - GWS	\N	2026-06-30 18:03:18.758085
209	3	create	renewal	RMT-50	Created renewal via CSV import for Pee & Dee Lands Holding Pvt Ltd - GWS	\N	2026-06-30 18:03:18.758085
210	3	create	renewal	RMT-51	Created renewal via CSV import for Olive Grapes - GWS	\N	2026-06-30 18:03:18.758085
211	3	create	renewal	RMT-52	Created renewal via CSV import for Discover Tech - GWS	\N	2026-06-30 18:03:18.758085
212	3	create	renewal	RMT-53	Created renewal via CSV import for Interlace India Private Limited - GWS	\N	2026-06-30 18:03:18.758085
213	3	create	renewal	RMT-54	Created renewal via CSV import for Sri Balaji Castings Pvt Ltd - GWS	\N	2026-06-30 18:03:18.758085
214	3	create	renewal	RMT-55	Created renewal via CSV import for Sri Balaji Castings Pvt Ltd - GWS	\N	2026-06-30 18:03:18.758085
215	3	create	renewal	RMT-56	Created renewal via CSV import for Olive Grapes - GWS	\N	2026-06-30 18:03:18.758085
216	3	create	renewal	RMT-57	Created renewal via CSV import for DS Square Technologies - GWS	\N	2026-06-30 18:03:18.758085
217	3	create	renewal	RMT-58	Created renewal via CSV import for Avigna Retail Private Limited - GWS	\N	2026-06-30 18:03:18.758085
218	3	create	renewal	RMT-59	Created renewal via CSV import for Shriram Properties Limited - GWS	\N	2026-06-30 18:03:18.758085
219	3	create	renewal	RMT-60	Created renewal via CSV import for Olive Grapes - GWS	\N	2026-06-30 18:03:18.758085
220	3	create	renewal	RMT-61	Created renewal via CSV import for Olive Grapes - GWS	\N	2026-06-30 18:03:18.758085
221	3	create	renewal	RMT-62	Created renewal via CSV import for G S H A & Co - GWS	\N	2026-06-30 18:03:18.758085
222	3	create	renewal	RMT-63	Created renewal via CSV import for Vijaya Scientific Company - GWS	\N	2026-06-30 18:03:18.758085
223	3	create	renewal	RMT-64	Created renewal via CSV import for The HPPL - GWS	\N	2026-06-30 18:03:18.758085
224	3	create	renewal	RMT-65	Created renewal via CSV import for Vallhabha Milk Products Private Limited - GWS	\N	2026-06-30 18:03:18.758085
225	3	create	renewal	RMT-66	Created renewal via CSV import for Spinebiz Services Private Limited - GWS	\N	2026-06-30 18:03:18.758085
226	3	create	renewal	RMT-67	Created renewal via CSV import for Farmfolks Agro Pvt Ltd - GWS	\N	2026-06-30 18:03:18.758085
227	3	create	renewal	RMT-68	Created renewal via CSV import for Sri Balaji Engineers - GWS	\N	2026-06-30 18:03:18.758085
228	3	create	renewal	RMT-69	Created renewal via CSV import for Home Screen Entertainment FZE - GWS	\N	2026-06-30 18:03:18.758085
229	3	create	renewal	RMT-70	Created renewal via CSV import for Solution Experts - GWS	\N	2026-06-30 18:03:18.758085
230	3	create	renewal	RMT-71	Created renewal via CSV import for Olive Grapes - GWS	\N	2026-06-30 18:03:18.758085
231	3	create	renewal	RMT-72	Created renewal via CSV import for J S Tours and Travels - GWS	\N	2026-06-30 18:03:18.758085
232	3	create	renewal	RMT-73	Created renewal via CSV import for Jai Balaji Fabricators - GWS	\N	2026-06-30 18:03:18.758085
233	3	create	renewal	RMT-74	Created renewal via CSV import for DS Square Technologies - GWS	\N	2026-06-30 18:03:18.758085
234	3	create	renewal	RMT-75	Created renewal via CSV import for JMR Apparels - GWS	\N	2026-06-30 18:03:18.758085
235	3	create	renewal	RMT-76	Created renewal via CSV import for Home Screen Entertainment FZE - GWS	\N	2026-06-30 18:03:18.758085
236	3	create	renewal	RMT-77	Created renewal via CSV import for Surya Pelle Chemical & Mould Private Limited - GWS	\N	2026-06-30 18:03:18.758085
237	3	create	renewal	RMT-78	Created renewal via CSV import for SUN BLUES - GWS	\N	2026-06-30 18:03:18.758085
238	3	create	renewal	RMT-79	Created renewal via CSV import for Lawrencedale Agro Processing India Private Limited - GWS	\N	2026-06-30 18:03:18.758085
239	3	create	renewal	RMT-80	Created renewal via CSV import for Aggrow Farmers Development Organisation - GWS	\N	2026-06-30 18:03:18.758085
240	3	create	renewal	RMT-81	Created renewal via CSV import for SCM Cube Technologies Private LImited - GWS	\N	2026-06-30 18:03:18.758085
241	3	create	renewal	RMT-82	Created renewal via CSV import for M R Greentech - GWS	\N	2026-06-30 18:03:18.758085
242	3	create	renewal	RMT-83	Created renewal via CSV import for MPL Light Vehicles Private Ltd - GWS	\N	2026-06-30 18:03:18.758085
243	3	create	renewal	RMT-84	Created renewal via CSV import for Olive Grapes - GWS	\N	2026-06-30 18:03:18.758085
244	3	create	renewal	RMT-85	Created renewal via CSV import for GB Power Projects Private Limited - GWS	\N	2026-06-30 18:03:18.758085
245	3	create	renewal	RMT-86	Created renewal via CSV import for Enmas Andritz Private Limited - GWS	\N	2026-06-30 18:03:18.758085
246	3	create	renewal	RMT-87	Created renewal via CSV import for Aadiyar Infotech Private Limited - GWS	\N	2026-06-30 18:03:18.758085
247	3	create	renewal	RMT-88	Created renewal via CSV import for Interlace India Private Limited - GWS	\N	2026-06-30 18:03:18.758085
248	3	create	renewal	RMT-89	Created renewal via CSV import for Aadiyar Infotech Private Limited - GWS	\N	2026-06-30 18:03:18.758085
249	3	create	renewal	RMT-90	Created renewal via CSV import for Harshal Packaging - GWS	\N	2026-06-30 18:03:18.758085
250	3	create	renewal	RMT-91	Created renewal via CSV import for Sumanth and Company - GWS	\N	2026-06-30 18:03:18.758085
251	3	create	renewal	RMT-92	Created renewal via CSV import for Sterling Solid Tyres (P) Ltd - GWS	\N	2026-06-30 18:03:18.758085
252	3	create	renewal	RMT-93	Created renewal via CSV import for Fox Dean Estates Pvt Ltd - GWS	\N	2026-06-30 18:03:18.758085
253	3	create	renewal	RMT-94	Created renewal via CSV import for Jai Balaji Fabricators - GWS	\N	2026-06-30 18:03:18.758085
254	3	create	renewal	RMT-95	Created renewal via CSV import for Sri Balaji Castings Pvt Ltd - GWS	\N	2026-06-30 18:03:18.758085
255	3	create	renewal	RMT-96	Created renewal via CSV import for Sri Balaji Castings Pvt Ltd - GWS	\N	2026-06-30 18:03:18.758085
256	3	create	renewal	RMT-97	Created renewal via CSV import for The HPPL - GWS	\N	2026-06-30 18:03:18.758085
257	3	create	renewal	RMT-98	Created renewal via CSV import for Vallhabha Milk Products Private Limited - GWS	\N	2026-06-30 18:03:18.758085
258	3	create	renewal	RMT-99	Created renewal via CSV import for Home Screen Entertainment FZE - GWS	\N	2026-06-30 18:03:18.758085
259	3	create	renewal	RMT-100	Created renewal via CSV import for MPL Light Vehicles Private Ltd - GWS	\N	2026-06-30 18:03:18.758085
260	3	create	renewal	RMT-101	Created renewal via CSV import for Vallhabha Milk Products Private Limited - LSH	\N	2026-06-30 18:03:18.758085
261	3	create	renewal	RMT-102	Created renewal via CSV import for Dignity Innovations - M365	\N	2026-06-30 18:03:18.758085
262	3	create	renewal	RMT-103	Created renewal via CSV import for Mithtran Global Technology LLP - M365	\N	2026-06-30 18:03:18.758085
263	3	create	renewal	RMT-104	Created renewal via CSV import for Digital XC Inc - M365	\N	2026-06-30 18:03:18.758085
264	3	create	renewal	RMT-105	Created renewal via CSV import for Dr. JRKs Research and Pharmaceuticals Private Limited - M365	\N	2026-06-30 18:03:18.758085
265	3	create	renewal	RMT-106	Created renewal via CSV import for Brand Idea Consultancy Private Limited - M365	\N	2026-06-30 18:03:18.758085
266	3	create	renewal	RMT-107	Created renewal via CSV import for Brand Idea Consultancy Private Limited - M365	\N	2026-06-30 18:03:18.758085
267	3	create	renewal	RMT-108	Created renewal via CSV import for Sasva Luxury LLP - M365	\N	2026-06-30 18:03:18.758085
268	3	create	renewal	RMT-109	Created renewal via CSV import for Avigna Retail Private Limited - M365	\N	2026-06-30 18:03:18.758085
269	3	create	renewal	RMT-110	Created renewal via CSV import for THE IT MAN PRIVATE LIMITED - M365	\N	2026-06-30 18:03:18.758085
270	3	create	renewal	RMT-111	Created renewal via CSV import for Kerala Paper Products Limited - M365	\N	2026-06-30 18:03:18.758085
271	3	create	renewal	RMT-112	Created renewal via CSV import for Spinebiz Services Private Limited - M365	\N	2026-06-30 18:03:18.758085
272	3	create	renewal	RMT-113	Created renewal via CSV import for AGARAM TECHNOLOGIES - M365	\N	2026-06-30 18:03:18.758085
273	3	create	renewal	RMT-114	Created renewal via CSV import for DNO Technologies Private Limited - M365	\N	2026-06-30 18:03:18.758085
274	3	create	renewal	RMT-115	Created renewal via CSV import for S HARIHARAN & ASSOCIATES - M365	\N	2026-06-30 18:03:18.758085
275	3	create	renewal	RMT-116	Created renewal via CSV import for AONE Outsourcing Solutions Private Limited - Chennai - M365	\N	2026-06-30 18:03:18.758085
276	3	create	renewal	RMT-117	Created renewal via CSV import for Solution Experts - 3Echo Systems - M365	\N	2026-06-30 18:03:18.758085
277	3	create	renewal	RMT-118	Created renewal via CSV import for Translink Logistics Pvt Ltd (Chennai) - M365	\N	2026-06-30 18:03:18.758085
278	3	create	renewal	RMT-119	Created renewal via CSV import for CONNECTFIRST TECHNOLOGIES PRIVATE LIMITED - M365	\N	2026-06-30 18:03:18.758085
279	3	create	renewal	RMT-120	Created renewal via CSV import for Shanke Enterprise Private Limited - M365	\N	2026-06-30 18:03:18.758085
280	3	create	renewal	RMT-121	Created renewal via CSV import for Hangkraft - M365	\N	2026-06-30 18:03:18.758085
281	3	create	renewal	RMT-122	Created renewal via CSV import for Direction West Sourcing - M365	\N	2026-06-30 18:03:18.758085
282	3	create	renewal	RMT-123	Created renewal via CSV import for JMR Apparels - M365	\N	2026-06-30 18:03:18.758085
283	3	create	renewal	RMT-124	Created renewal via CSV import for JD Software Private Limited - M365	\N	2026-06-30 18:03:18.758085
284	3	create	renewal	RMT-125	Created renewal via CSV import for A Saffeway Systems and Equipments - M365	\N	2026-06-30 18:03:18.758085
285	3	create	renewal	RMT-126	Created renewal via CSV import for TJ Financial Consultancy & Investments Private Limited - M365	\N	2026-06-30 18:03:18.758085
286	3	create	renewal	RMT-127	Created renewal via CSV import for Synergent Tech Solutions Private Ltd - M365	\N	2026-06-30 18:03:18.758085
287	3	create	renewal	RMT-128	Created renewal via CSV import for Ziffity Solutions Private Limited - M365	\N	2026-06-30 18:03:18.758085
288	3	create	renewal	RMT-129	Created renewal via CSV import for Winsar Infosoft Private Limited - M365	\N	2026-06-30 18:03:18.758085
289	3	create	renewal	RMT-130	Created renewal via CSV import for Proodle Hospitality Services - M365	\N	2026-06-30 18:03:18.758085
290	3	create	renewal	RMT-131	Created renewal via CSV import for Glovis India Anantapur Pvt Ltd - M365	\N	2026-06-30 18:03:18.758085
291	3	create	renewal	RMT-132	Created renewal via CSV import for TJ Financial Consultancy & Investments Private Limited - M365	\N	2026-06-30 18:03:18.758085
292	3	create	renewal	RMT-133	Created renewal via CSV import for SIDCORPTECH - M365	\N	2026-06-30 18:03:18.758085
293	3	create	renewal	RMT-134	Created renewal via CSV import for Solution Experts - M365	\N	2026-06-30 18:03:18.758085
294	3	create	renewal	RMT-135	Created renewal via CSV import for Sri Balaji Castings Pvt Ltd - M365	\N	2026-06-30 18:03:18.758085
295	3	create	renewal	RMT-136	Created renewal via CSV import for VGN Stafford Flat Owners Welfare Association - M365	\N	2026-06-30 18:03:18.758085
296	3	create	renewal	RMT-137	Created renewal via CSV import for INTEGRATED SERVICE POINT LIMITED - M365	\N	2026-06-30 18:03:18.758085
297	3	create	renewal	RMT-138	Created renewal via CSV import for SCM Cube Technologies Private LImited - M365	\N	2026-06-30 18:03:18.758085
298	3	create	renewal	RMT-139	Created renewal via CSV import for NLS Associates - M365	\N	2026-06-30 18:03:18.758085
299	3	create	renewal	RMT-140	Created renewal via CSV import for FST Information Technology Private limites - M365	\N	2026-06-30 18:03:18.758085
300	3	create	renewal	RMT-141	Created renewal via CSV import for Witzone Technologies Pvt Ltd - M365	\N	2026-06-30 18:03:18.758085
301	3	create	renewal	RMT-142	Created renewal via CSV import for HEAT CONTROL TECHNOLOGIES - M365	\N	2026-06-30 18:03:18.758085
302	3	create	renewal	RMT-143	Created renewal via CSV import for Talodyn Networks Private Limited - M365	\N	2026-06-30 18:03:18.758085
303	3	create	renewal	RMT-144	Created renewal via CSV import for Talodyn Networks Private Limited - M365	\N	2026-06-30 18:03:18.758085
304	3	create	renewal	RMT-145	Created renewal via CSV import for Talodyn Networks Private Limited - M365	\N	2026-06-30 18:03:18.758085
305	3	create	renewal	RMT-146	Created renewal via CSV import for Talodyn Networks Private Limited - M365	\N	2026-06-30 18:03:18.758085
306	3	create	renewal	RMT-147	Created renewal via CSV import for Talodyn Networks Private Limited - M365	\N	2026-06-30 18:03:18.758085
307	3	create	renewal	RMT-148	Created renewal via CSV import for Translink Logistics Pvt Ltd (Chennai) - M365	\N	2026-06-30 18:03:18.758085
308	3	create	renewal	RMT-149	Created renewal via CSV import for Proodle Hospitality Services - M365	\N	2026-06-30 18:03:18.758085
309	3	create	renewal	RMT-150	Created renewal via CSV import for Talodyn Networks Private Limited - M365	\N	2026-06-30 18:03:18.758085
310	3	create	renewal	RMT-151	Created renewal via CSV import for Superops Technologies - M365	\N	2026-06-30 18:03:18.758085
311	3	create	renewal	RMT-152	Created renewal via CSV import for Ziffity Solutions Private Limited - M365	\N	2026-06-30 18:03:18.758085
312	3	create	renewal	RMT-153	Created renewal via CSV import for Talodyn Networks Private Limited - M365	\N	2026-06-30 18:03:18.758085
313	3	create	renewal	RMT-154	Created renewal via CSV import for Talodyn Networks Private Limited - M365	\N	2026-06-30 18:03:18.758085
314	3	create	renewal	RMT-155	Created renewal via CSV import for Imaginetech Digital Private Limited - M365	\N	2026-06-30 18:03:18.758085
315	3	create	renewal	RMT-156	Created renewal via CSV import for AGARAM TECHNOLOGIES - M365	\N	2026-06-30 18:03:18.758085
316	3	create	renewal	RMT-157	Created renewal via CSV import for DNO Technologies Private Limited - M365	\N	2026-06-30 18:03:18.758085
317	3	create	renewal	RMT-158	Created renewal via CSV import for Spinebiz Services Private Limited - M365	\N	2026-06-30 18:03:18.758085
318	3	create	renewal	RMT-159	Created renewal via CSV import for Translink Logistics Pvt Ltd (Chennai) - M365	\N	2026-06-30 18:03:18.758085
319	3	create	renewal	RMT-160	Created renewal via CSV import for Shanke Enterprise Private Limited - M365	\N	2026-06-30 18:03:18.758085
320	3	create	renewal	RMT-161	Created renewal via CSV import for Winsar Infosoft Private Limited - M365	\N	2026-06-30 18:03:18.758085
321	3	create	renewal	RMT-162	Created renewal via CSV import for Proodle Hospitality Services - M365	\N	2026-06-30 18:03:18.758085
322	3	create	renewal	RMT-163	Created renewal via CSV import for INTEGRATED SERVICE POINT LIMITED - M365	\N	2026-06-30 18:03:18.758085
323	3	create	renewal	RMT-164	Created renewal via CSV import for THE IT MAN PRIVATE LIMITED - M365	\N	2026-06-30 18:03:18.758085
324	3	create	renewal	RMT-165	Created renewal via CSV import for Talodyn Networks Private Limited - M365	\N	2026-06-30 18:03:18.758085
325	3	create	renewal	RMT-166	Created renewal via CSV import for Ziffity Solutions Private Limited - M365	\N	2026-06-30 18:03:18.758085
326	3	create	renewal	RMT-167	Created renewal via CSV import for Talodyn Networks Private Limited - M365	\N	2026-06-30 18:03:18.758085
327	3	create	renewal	RMT-168	Created renewal via CSV import for Sri Balaji Castings Pvt Ltd - MSP	\N	2026-06-30 18:03:18.758085
328	3	create	renewal	RMT-169	Created renewal via CSV import for Witzone Technologies Pvt Ltd - MSP	\N	2026-06-30 18:03:18.758085
329	3	create	renewal	RMT-170	Created renewal via CSV import for Proodle Hospitality Services - MSP	\N	2026-06-30 18:03:18.758085
330	3	create	renewal	RMT-171	Created renewal via CSV import for Aevitas IT Private Limited - MSP	\N	2026-06-30 18:03:18.758085
331	3	create	renewal	RMT-172	Created renewal via CSV import for Swelect Energy Systems Limited-U35 - Salem - MSP	\N	2026-06-30 18:03:18.758085
332	3	create	renewal	RMT-173	Created renewal via CSV import for Paloma Turning Co Pvt Ltd - MSP	\N	2026-06-30 18:03:18.758085
333	3	create	renewal	RMT-174	Created renewal via CSV import for Paloma Turning Co Pvt Ltd - MSP	\N	2026-06-30 18:03:18.758085
334	3	create	renewal	RMT-175	Created renewal via CSV import for Thanga Prathap - MSP	\N	2026-06-30 18:03:18.758085
335	3	create	renewal	RMT-176	Created renewal via CSV import for GT Jayanti Agrochem India Private Limited - MSP	\N	2026-06-30 18:03:18.758085
336	3	create	renewal	RMT-177	Created renewal via CSV import for Proodle Hospitality Services - MSP	\N	2026-06-30 18:03:18.758085
337	3	create	renewal	RMT-178	Created renewal via CSV import for Sri Balaji Castings - Ponneri - MSP	\N	2026-06-30 18:03:18.758085
338	3	create	renewal	RMT-179	Created renewal via CSV import for Sreshta Sumanth Builders Private Limited - MSP	\N	2026-06-30 18:03:18.758085
339	3	create	renewal	RMT-180	Created renewal via CSV import for AI Cars ( Unit of AI Enterprises ) - MSP	\N	2026-06-30 18:03:18.758085
340	3	create	renewal	RMT-181	Created renewal via CSV import for AI Enterprise - MSP	\N	2026-06-30 18:03:18.758085
341	3	create	renewal	RMT-182	Created renewal via CSV import for Sri Balaji Castings Pvt Ltd - MSP	\N	2026-06-30 18:03:18.758085
342	3	create	renewal	RMT-183	Created renewal via CSV import for Ravindra Stores - MSP	\N	2026-06-30 18:03:18.758085
343	3	create	renewal	RMT-184	Created renewal via CSV import for NX Logistics India Pvt. Ltd(Gurugram) - MSP	\N	2026-06-30 18:03:18.758085
344	3	create	renewal	RMT-185	Created renewal via CSV import for Talodyn Networks Private Limited - MSP	\N	2026-06-30 18:03:18.758085
345	3	create	renewal	RMT-186	Created renewal via CSV import for INTEGRATED SERVICE POINT LIMITED - MSP	\N	2026-06-30 18:03:18.758085
346	3	create	renewal	RMT-187	Created renewal via CSV import for Cherubim Security Force LLP(MAAYAA SECURITY FORCE LLP) - Tally	\N	2026-06-30 18:03:18.758085
347	3	create	renewal	RMT-188	Created renewal via CSV import for Time Rich Shipping Private Ltd - Tally	\N	2026-06-30 18:03:18.758085
348	3	create	renewal	RMT-189	Created renewal via CSV import for Swasthik Agencies - Tally	\N	2026-06-30 18:03:18.758085
349	3	create	renewal	RMT-190	Created renewal via CSV import for Aadiyar Infotech Private Limited - Plesk Web Admin Edition	\N	2026-06-30 18:03:18.758085
350	3	create	renewal	RMT-191	Created renewal via CSV import for Aadiyar Infotech Private Limited - Plesk Backup to Cloud Pro	\N	2026-06-30 18:03:18.758085
351	3	create	renewal	RMT-192	Created renewal via CSV import for Winsar Infosoft Private Limited - M365	\N	2026-06-30 18:03:18.758085
352	3	create	renewal	RMT-193	Created renewal via CSV import for Paloma Turning Co Pvt Ltd - M365	\N	2026-06-30 18:03:18.758085
353	3	create	renewal	RMT-194	Created renewal via CSV import for Winsar Infosoft Private Limited - Seqrite	\N	2026-06-30 18:03:18.758085
354	3	create	renewal	RMT-195	Created renewal via CSV import for Sindoori Management Solutions Pvt Ltd - Seqrite	\N	2026-06-30 18:03:18.758085
355	3	create	renewal	RMT-196	Created renewal via CSV import for Paloma Turning Co Pvt Ltd - Seqrite	\N	2026-06-30 18:03:18.758085
356	3	create	renewal	RMT-197	Created renewal via CSV import for Sivaramakrishna Forgings Private Limited - Seqrite	\N	2026-06-30 18:03:18.758085
357	3	create	renewal	RMT-198	Created renewal via CSV import for 5GX Global Fintech Seqrite+DLP - Seqrite	\N	2026-06-30 18:03:18.758085
358	3	create	renewal	RMT-199	Created renewal via CSV import for AONE Outsourcing Solutions Private Limited - Chennai - Seqrite	\N	2026-06-30 18:03:18.758085
359	3	create	renewal	RMT-200	Created renewal via CSV import for Sreshta Sumanth Builders Private Limited - Seqrite	\N	2026-06-30 18:03:18.758085
360	3	create	renewal	RMT-201	Created renewal via CSV import for Aadiyar Infotech Private Limited - Seqrite	\N	2026-06-30 18:03:18.758085
474	3	create	renewal	RMT-315	Created renewal via CSV import for AI Enterprise - Zoho	\N	2026-06-30 18:03:18.758085
361	3	create	renewal	RMT-202	Created renewal via CSV import for Witzone Technologies Pvt Ltd - Seqrite	\N	2026-06-30 18:03:18.758085
362	3	create	renewal	RMT-203	Created renewal via CSV import for SIDCORPTECH - Win India - Seqrite	\N	2026-06-30 18:03:18.758085
363	3	create	renewal	RMT-204	Created renewal via CSV import for Sri Balaji Castings Pvt Ltd - Seqrite	\N	2026-06-30 18:03:18.758085
364	3	create	renewal	RMT-205	Created renewal via CSV import for ALHIND TRAVEL PORTAL LLP - Seqrite	\N	2026-06-30 18:03:18.758085
365	3	create	renewal	RMT-206	Created renewal via CSV import for GT Jayanti Agrochem India Private Limited - Seqrite	\N	2026-06-30 18:03:18.758085
366	3	create	renewal	RMT-207	Created renewal via CSV import for Dhan Hind Utility Pvt Ltd - Seqrite	\N	2026-06-30 18:03:18.758085
367	3	create	renewal	RMT-208	Created renewal via CSV import for Ravindra Stores - SSL	\N	2026-06-30 18:03:18.758085
368	3	create	renewal	RMT-209	Created renewal via CSV import for SCM Cube Technologies Private LImited - SSL	\N	2026-06-30 18:03:18.758085
369	3	create	renewal	RMT-210	Created renewal via CSV import for SCM Cube Technologies Private LImited - SSL	\N	2026-06-30 18:03:18.758085
370	3	create	renewal	RMT-211	Created renewal via CSV import for Olive Grapes - SSL	\N	2026-06-30 18:03:18.758085
371	3	create	renewal	RMT-212	Created renewal via CSV import for Sri Balaji Castings Pvt Ltd - SSL	\N	2026-06-30 18:03:18.758085
372	3	create	renewal	RMT-213	Created renewal via CSV import for Cameo Corporate Services Limited - SSL	\N	2026-06-30 18:03:18.758085
373	3	create	renewal	RMT-214	Created renewal via CSV import for Aadiyar Infotech Private Limited - SSL	\N	2026-06-30 18:03:18.758085
374	3	create	renewal	RMT-215	Created renewal via CSV import for Winsar Infosoft Private Limited - SSL	\N	2026-06-30 18:03:18.758085
375	3	create	renewal	RMT-216	Created renewal via CSV import for Triway Forwarders Private Limited - SSL	\N	2026-06-30 18:03:18.758085
376	3	create	renewal	RMT-217	Created renewal via CSV import for Aadiyar Infotech Private Limited - SSL	\N	2026-06-30 18:03:18.758085
377	3	create	renewal	RMT-218	Created renewal via CSV import for Aadiyar Infotech Private Limited - SSL	\N	2026-06-30 18:03:18.758085
378	3	create	renewal	RMT-219	Created renewal via CSV import for Aadiyar Infotech Private Limited - SSL	\N	2026-06-30 18:03:18.758085
379	3	create	renewal	RMT-220	Created renewal via CSV import for LEITEN TECHNOLOGIES PRIVATE LIMITED - SSL	\N	2026-06-30 18:03:18.758085
380	3	create	renewal	RMT-221	Created renewal via CSV import for Aadiyar Infotech Private Limited - SSL	\N	2026-06-30 18:03:18.758085
381	3	create	renewal	RMT-222	Created renewal via CSV import for MindGenix Private Ltd - SSL	\N	2026-06-30 18:03:18.758085
382	3	create	renewal	RMT-223	Created renewal via CSV import for Nethradhama Hospitals Pvt Ltd - SSL	\N	2026-06-30 18:03:18.758085
383	3	create	renewal	RMT-224	Created renewal via CSV import for LEITEN TECHNOLOGIES PRIVATE LIMITED - SSL	\N	2026-06-30 18:03:18.758085
384	3	create	renewal	RMT-225	Created renewal via CSV import for LEITEN TECHNOLOGIES PRIVATE LIMITED - SSL	\N	2026-06-30 18:03:18.758085
385	3	create	renewal	RMT-226	Created renewal via CSV import for Tamilnadu Tourism Development Corporation - SSL	\N	2026-06-30 18:03:18.758085
386	3	create	renewal	RMT-227	Created renewal via CSV import for Shraddha Eye Care Trust - SSL	\N	2026-06-30 18:03:18.758085
387	3	create	renewal	RMT-228	Created renewal via CSV import for FORTRISE BUSINESS SOLUTIONS PRIVATE LIMITED - SSL	\N	2026-06-30 18:03:18.758085
388	3	create	renewal	RMT-229	Created renewal via CSV import for FORTRISE BUSINESS SOLUTIONS PRIVATE LIMITED - SSL	\N	2026-06-30 18:03:18.758085
389	3	create	renewal	RMT-230	Created renewal via CSV import for FORTRISE BUSINESS SOLUTIONS PRIVATE LIMITED - SSL	\N	2026-06-30 18:03:18.758085
390	3	create	renewal	RMT-231	Created renewal via CSV import for Proodle Hospitality Services - Backup solution	\N	2026-06-30 18:03:18.758085
391	3	create	renewal	RMT-232	Created renewal via CSV import for Sri Balaji Castings Pvt Ltd - Backup solution	\N	2026-06-30 18:03:18.758085
392	3	create	renewal	RMT-233	Created renewal via CSV import for The HPPL - Digital Signature	\N	2026-06-30 18:03:18.758085
393	3	create	renewal	RMT-234	Created renewal via CSV import for Yennes Infotec (P) Limited - Tally	\N	2026-06-30 18:03:18.758085
394	3	create	renewal	RMT-235	Created renewal via CSV import for Auto Impex - Tally	\N	2026-06-30 18:03:18.758085
395	3	create	renewal	RMT-236	Created renewal via CSV import for Mahavir Automobiles - Tally	\N	2026-06-30 18:03:18.758085
396	3	create	renewal	RMT-237	Created renewal via CSV import for Kothari Brothers Tech Pvt Ltd - Tally	\N	2026-06-30 18:03:18.758085
397	3	create	renewal	RMT-238	Created renewal via CSV import for Mahavir Motors - Tally	\N	2026-06-30 18:03:18.758085
398	3	create	renewal	RMT-239	Created renewal via CSV import for Mahavir Distributor - Tally	\N	2026-06-30 18:03:18.758085
399	3	create	renewal	RMT-240	Created renewal via CSV import for Sree Vardhaman Autoparts - Tally	\N	2026-06-30 18:03:18.758085
400	3	create	renewal	RMT-241	Created renewal via CSV import for Saa Healthcare Pvt Ltd - Tally	\N	2026-06-30 18:03:18.758085
401	3	create	renewal	RMT-242	Created renewal via CSV import for T A M and Associates LLP - Tally	\N	2026-06-30 18:03:18.758085
402	3	create	renewal	RMT-243	Created renewal via CSV import for Vijaya Scientific Company - Tally	\N	2026-06-30 18:03:18.758085
403	3	create	renewal	RMT-244	Created renewal via CSV import for JMR Apparels - Tally	\N	2026-06-30 18:03:18.758085
404	3	create	renewal	RMT-245	Created renewal via CSV import for GT Jayanti Agrochem India Private Limited - Tally	\N	2026-06-30 18:03:18.758085
405	3	create	renewal	RMT-246	Created renewal via CSV import for Zest Intertrade LLP - Tally	\N	2026-06-30 18:03:18.758085
406	3	create	renewal	RMT-247	Created renewal via CSV import for Radhe Shyam Agro Overseas - Tally	\N	2026-06-30 18:03:18.758085
407	3	create	renewal	RMT-248	Created renewal via CSV import for Unique Natural Products Pvt Ltd - Tally	\N	2026-06-30 18:03:18.758085
408	3	create	renewal	RMT-249	Created renewal via CSV import for Agro Spice India Pvt Ltd - Tally	\N	2026-06-30 18:03:18.758085
409	3	create	renewal	RMT-250	Created renewal via CSV import for PG Impex - Tally	\N	2026-06-30 18:03:18.758085
410	3	create	renewal	RMT-251	Created renewal via CSV import for Spellbee International Pvt Ltd - Tally	\N	2026-06-30 18:03:18.758085
411	3	create	renewal	RMT-252	Created renewal via CSV import for Merusri Developers - Tally	\N	2026-06-30 18:03:18.758085
412	3	create	renewal	RMT-253	Created renewal via CSV import for SITWANTO DEVI MAHILA KALYAN SANSTHAN - Tally	\N	2026-06-30 18:03:18.758085
413	3	create	renewal	RMT-254	Created renewal via CSV import for Blix Toys - Tally	\N	2026-06-30 18:03:18.758085
414	3	create	renewal	RMT-255	Created renewal via CSV import for GT Jayanti Agrochem India Private Limited - Tally	\N	2026-06-30 18:03:18.758085
415	3	create	renewal	RMT-256	Created renewal via CSV import for Schangalaya Motors - Tally	\N	2026-06-30 18:03:18.758085
416	3	create	renewal	RMT-257	Created renewal via CSV import for Aadit Auto Company Pvt Ltd - Tally	\N	2026-06-30 18:03:18.758085
417	3	create	renewal	RMT-258	Created renewal via CSV import for JMR Apparels - Tally	\N	2026-06-30 18:03:18.758085
418	3	create	renewal	RMT-259	Created renewal via CSV import for Good to Go Foodworks Private Limited - Tally	\N	2026-06-30 18:03:18.758085
419	3	create	renewal	RMT-260	Created renewal via CSV import for Kun Capital Automotive Pvt Ltd - Tally	\N	2026-06-30 18:03:18.758085
420	3	create	renewal	RMT-261	Created renewal via CSV import for Vijaya Scientific Company - Tally	\N	2026-06-30 18:03:18.758085
421	3	create	renewal	RMT-262	Created renewal via CSV import for Glovis India Anantapur Pvt Ltd - Tally	\N	2026-06-30 18:03:18.758085
422	3	create	renewal	RMT-263	Created renewal via CSV import for Intek Engineers - Ref Ramesh Consulatant - Tally	\N	2026-06-30 18:03:18.758085
423	3	create	renewal	RMT-264	Created renewal via CSV import for Professional Impex Pvt Ltd (Chennai) - Tally	\N	2026-06-30 18:03:18.758085
424	3	create	renewal	RMT-265	Created renewal via CSV import for Ritz Trade Links Private Limited - Tally	\N	2026-06-30 18:03:18.758085
425	3	create	renewal	RMT-266	Created renewal via CSV import for Professional Impex Pvt Ltd (Delhi) - Tally	\N	2026-06-30 18:03:18.758085
426	3	create	renewal	RMT-267	Created renewal via CSV import for The HPPL - Tally	\N	2026-06-30 18:03:18.758085
427	3	create	renewal	RMT-268	Created renewal via CSV import for PG Impex - Tally	\N	2026-06-30 18:03:18.758085
428	3	create	renewal	RMT-269	Created renewal via CSV import for Pongalur Pioneer Textiles Private Limited - Tally	\N	2026-06-30 18:03:18.758085
429	3	create	renewal	RMT-270	Created renewal via CSV import for K2 Cranes & Components Pvt Ltd - Tally	\N	2026-06-30 18:03:18.758085
430	3	create	renewal	RMT-271	Created renewal via CSV import for Kun Motor Cycles Pvt Ltd - Tally	\N	2026-06-30 18:03:18.758085
431	3	create	renewal	RMT-272	Created renewal via CSV import for Schakralaya Motors Unit of GRK Theatres Pvt Ltd - Tally	\N	2026-06-30 18:03:18.758085
432	3	create	renewal	RMT-273	Created renewal via CSV import for Supreme Plastic Traders - Tally	\N	2026-06-30 18:03:18.758085
433	3	create	renewal	RMT-274	Created renewal via CSV import for Discover Tech - Tooltech - Tally	\N	2026-06-30 18:03:18.758085
434	3	create	renewal	RMT-275	Created renewal via CSV import for Goodluck Plastic Trading Company - Tally	\N	2026-06-30 18:03:18.758085
435	3	create	renewal	RMT-276	Created renewal via CSV import for Rahul Associates - Tally	\N	2026-06-30 18:03:18.758085
436	3	create	renewal	RMT-277	Created renewal via CSV import for Spellbee International Pvt Ltd - Tally	\N	2026-06-30 18:03:18.758085
437	3	create	renewal	RMT-278	Created renewal via CSV import for Reeshav Automobiles Private Ltd - Tally	\N	2026-06-30 18:03:18.758085
438	3	create	renewal	RMT-279	Created renewal via CSV import for Vijaya Scientific Company - Tally	\N	2026-06-30 18:03:18.758085
439	3	create	renewal	RMT-280	Created renewal via CSV import for Talodyn Networks Private Limited - Tally	\N	2026-06-30 18:03:18.758085
440	3	create	renewal	RMT-281	Created renewal via CSV import for OMR Mall Developers Pvt Ltd - Tally	\N	2026-06-30 18:03:18.758085
441	3	create	renewal	RMT-282	Created renewal via CSV import for Lawrencedale Agro Processing India Private Limited - Tally	\N	2026-06-30 18:03:18.758085
442	3	create	renewal	RMT-283	Created renewal via CSV import for MPL Light Vehicles Private Ltd - Tally	\N	2026-06-30 18:03:18.758085
443	3	create	renewal	RMT-284	Created renewal via CSV import for VPN Agencies - Tally	\N	2026-06-30 18:03:18.758085
444	3	create	renewal	RMT-285	Created renewal via CSV import for Kothari Brothers Tech Pvt Ltd - Tally	\N	2026-06-30 18:03:18.758085
445	3	create	renewal	RMT-286	Created renewal via CSV import for Intek Engineers - Ref Ramesh Consulatant - Tally	\N	2026-06-30 18:03:18.758085
446	3	create	renewal	RMT-287	Created renewal via CSV import for Tekfab Engineers - Tally	\N	2026-06-30 18:03:18.758085
447	3	create	renewal	RMT-288	Created renewal via CSV import for Tekfab Engineers - Tally	\N	2026-06-30 18:03:18.758085
448	3	create	renewal	RMT-289	Created renewal via CSV import for Proodle Hospitality Services - Tally	\N	2026-06-30 18:03:18.758085
449	3	create	renewal	RMT-290	Created renewal via CSV import for K2 Cranes & Components Pvt Ltd - Tally	\N	2026-06-30 18:03:18.758085
450	3	create	renewal	RMT-291	Created renewal via CSV import for GT Jayanti Agrochem India Private Limited - Tally	\N	2026-06-30 18:03:18.758085
451	3	create	renewal	RMT-292	Created renewal via CSV import for Zest Intertrade LLP - Tally	\N	2026-06-30 18:03:18.758085
452	3	create	renewal	RMT-293	Created renewal via CSV import for Agro Spice India Pvt Ltd - Tally	\N	2026-06-30 18:03:18.758085
453	3	create	renewal	RMT-294	Created renewal via CSV import for Radhe Shyam Agro Overseas - Tally	\N	2026-06-30 18:03:18.758085
454	3	create	renewal	RMT-295	Created renewal via CSV import for Professional Impex Pvt Ltd (Delhi) - Tally	\N	2026-06-30 18:03:18.758085
455	3	create	renewal	RMT-296	Created renewal via CSV import for MPL Light Vehicles Private Ltd - Tally	\N	2026-06-30 18:03:18.758085
456	3	create	renewal	RMT-297	Created renewal via CSV import for Good to Go Foodworks Private Limited - Tally	\N	2026-06-30 18:03:18.758085
457	3	create	renewal	RMT-298	Created renewal via CSV import for Reeshav Automobiles Private Ltd - Tally	\N	2026-06-30 18:03:18.758085
458	3	create	renewal	RMT-299	Created renewal via CSV import for Professional Impex Pvt Ltd (Chennai) - Tally	\N	2026-06-30 18:03:18.758085
459	3	create	renewal	RMT-300	Created renewal via CSV import for Lawrencedale Agro Processing India Private Limited - Tally	\N	2026-06-30 18:03:18.758085
460	3	create	renewal	RMT-301	Created renewal via CSV import for SITWANTO DEVI MAHILA KALYAN SANSTHAN - Tally	\N	2026-06-30 18:03:18.758085
461	3	create	renewal	RMT-302	Created renewal via CSV import for Vijaya Scientific Company - Tally	\N	2026-06-30 18:03:18.758085
462	3	create	renewal	RMT-303	Created renewal via CSV import for Dhan Hind Utility Pvt Ltd - IPsec VPN	\N	2026-06-30 18:03:18.758085
463	3	create	renewal	RMT-304	Created renewal via CSV import for SysArc Infomatix Private Limited - Zoho	\N	2026-06-30 18:03:18.758085
464	3	create	renewal	RMT-305	Created renewal via CSV import for Proodle Hospitality Services - Zoho	\N	2026-06-30 18:03:18.758085
465	3	create	renewal	RMT-306	Created renewal via CSV import for Talodyn Networks Private Limited - Zoho	\N	2026-06-30 18:03:18.758085
466	3	create	renewal	RMT-307	Created renewal via CSV import for AI Cars ( Unit of AI Enterprises ) - Zoho	\N	2026-06-30 18:03:18.758085
467	3	create	renewal	RMT-308	Created renewal via CSV import for AI Cars ( Unit of AI Enterprises ) - Zoho	\N	2026-06-30 18:03:18.758085
468	3	create	renewal	RMT-309	Created renewal via CSV import for Kothari Brothers Tech Pvt Ltd - Zoho	\N	2026-06-30 18:03:18.758085
469	3	create	renewal	RMT-310	Created renewal via CSV import for AI Enterprise - Zoho	\N	2026-06-30 18:03:18.758085
470	3	create	renewal	RMT-311	Created renewal via CSV import for Dhan Hind Utility Pvt Ltd - Zoho	\N	2026-06-30 18:03:18.758085
471	3	create	renewal	RMT-312	Created renewal via CSV import for DS Square Technologies - Zoho	\N	2026-06-30 18:03:18.758085
472	3	create	renewal	RMT-313	Created renewal via CSV import for Kothari Brothers Tech Pvt Ltd - Zoho	\N	2026-06-30 18:03:18.758085
473	3	create	renewal	RMT-314	Created renewal via CSV import for Kothari Brothers Tech Pvt Ltd - Zoho	\N	2026-06-30 18:03:18.758085
475	3	delete_soft	renewal	RMT-08	Moved renewal to trash: Talodyn Networks Private Limited - Backup solution	\N	2026-06-30 18:10:13.822129
476	3	delete_soft	renewal	RMT-116	Moved renewal to trash: AONE Outsourcing Solutions Private Limited - Chennai - M365	\N	2026-06-30 18:10:13.827438
477	3	delete_soft	renewal	RMT-305	Moved renewal to trash: Proodle Hospitality Services - Zoho	\N	2026-06-30 18:10:13.831397
478	3	delete_soft	renewal	RMT-01	Moved renewal to trash: Proodle Hospitality Services - ADDS	\N	2026-06-30 18:10:13.835468
479	3	delete_soft	renewal	RMT-306	Moved renewal to trash: Talodyn Networks Private Limited - Zoho	\N	2026-06-30 18:10:13.839617
480	3	delete_soft	renewal	RMT-144	Moved renewal to trash: Talodyn Networks Private Limited - M365	\N	2026-06-30 18:10:13.843878
481	3	delete_soft	renewal	RMT-171	Moved renewal to trash: Aevitas IT Private Limited - MSP	\N	2026-06-30 18:10:13.84786
482	3	delete_soft	renewal	RMT-170	Moved renewal to trash: Proodle Hospitality Services - MSP	\N	2026-06-30 18:10:13.851669
483	3	delete_soft	renewal	RMT-195	Moved renewal to trash: Sindoori Management Solutions Pvt Ltd - Seqrite	\N	2026-06-30 18:10:13.855606
484	3	delete_soft	renewal	RMT-20	Moved renewal to trash: Pee & Dee Lands Holding Pvt Ltd - Domain	\N	2026-06-30 18:10:13.859487
485	3	delete_soft	renewal	RMT-50	Moved renewal to trash: Pee & Dee Lands Holding Pvt Ltd - GWS	\N	2026-06-30 18:10:13.863732
486	3	delete_soft	renewal	RMT-51	Moved renewal to trash: Olive Grapes - GWS	\N	2026-06-30 18:10:13.868809
487	3	delete_soft	renewal	RMT-115	Moved renewal to trash: S HARIHARAN & ASSOCIATES - M365	\N	2026-06-30 18:10:13.874123
488	3	delete_soft	renewal	RMT-53	Moved renewal to trash: Interlace India Private Limited - GWS	\N	2026-06-30 18:10:13.87879
489	3	delete_soft	renewal	RMT-52	Moved renewal to trash: Discover Tech - GWS	\N	2026-06-30 18:10:13.883096
490	3	delete_soft	renewal	RMT-210	Moved renewal to trash: SCM Cube Technologies Private LImited - SSL	\N	2026-06-30 18:10:13.887593
491	3	delete_soft	renewal	RMT-95	Moved renewal to trash: Sri Balaji Castings Pvt Ltd - GWS	\N	2026-06-30 18:10:13.892393
492	3	delete_soft	renewal	RMT-96	Moved renewal to trash: Sri Balaji Castings Pvt Ltd - GWS	\N	2026-06-30 18:10:13.897118
493	3	delete_soft	renewal	RMT-55	Moved renewal to trash: Sri Balaji Castings Pvt Ltd - GWS	\N	2026-06-30 18:10:13.901698
494	3	delete_soft	renewal	RMT-54	Moved renewal to trash: Sri Balaji Castings Pvt Ltd - GWS	\N	2026-06-30 18:10:13.906433
495	3	delete_soft	renewal	RMT-56	Moved renewal to trash: Olive Grapes - GWS	\N	2026-06-30 18:10:13.911039
496	3	delete_soft	renewal	RMT-132	Moved renewal to trash: TJ Financial Consultancy & Investments Private Limited - M365	\N	2026-06-30 18:10:13.915612
497	3	delete_soft	renewal	RMT-85	Moved renewal to trash: GB Power Projects Private Limited - GWS	\N	2026-06-30 18:10:13.920382
498	3	delete_soft	renewal	RMT-86	Moved renewal to trash: Enmas Andritz Private Limited - GWS	\N	2026-06-30 18:10:13.924928
499	3	delete_soft	renewal	RMT-57	Moved renewal to trash: DS Square Technologies - GWS	\N	2026-06-30 18:10:13.929435
500	3	delete_soft	renewal	RMT-58	Moved renewal to trash: Avigna Retail Private Limited - GWS	\N	2026-06-30 18:10:19.09498
501	3	delete_soft	renewal	RMT-166	Moved renewal to trash: Ziffity Solutions Private Limited - M365	\N	2026-06-30 18:10:19.10452
502	3	delete_soft	renewal	RMT-59	Moved renewal to trash: Shriram Properties Limited - GWS	\N	2026-06-30 18:10:19.112951
503	3	delete_soft	renewal	RMT-172	Moved renewal to trash: Swelect Energy Systems Limited-U35 - Salem - MSP	\N	2026-06-30 18:10:19.120737
504	3	delete_soft	renewal	RMT-102	Moved renewal to trash: Dignity Innovations - M365	\N	2026-06-30 18:10:19.128681
505	3	delete_soft	renewal	RMT-271	Moved renewal to trash: Kun Motor Cycles Pvt Ltd - Tally	\N	2026-06-30 18:10:19.136529
506	3	delete_soft	renewal	RMT-282	Moved renewal to trash: Lawrencedale Agro Processing India Private Limited - Tally	\N	2026-06-30 18:10:19.142363
507	3	delete_soft	renewal	RMT-260	Moved renewal to trash: Kun Capital Automotive Pvt Ltd - Tally	\N	2026-06-30 18:10:19.149302
508	3	delete_soft	renewal	RMT-45	Moved renewal to trash: Discover Tech - GWS	\N	2026-06-30 18:10:19.156795
509	3	delete_soft	renewal	RMT-173	Moved renewal to trash: Paloma Turning Co Pvt Ltd - MSP	\N	2026-06-30 18:10:19.163605
510	3	delete_soft	renewal	RMT-257	Moved renewal to trash: Aadit Auto Company Pvt Ltd - Tally	\N	2026-06-30 18:10:19.171457
511	3	delete_soft	renewal	RMT-300	Moved renewal to trash: Lawrencedale Agro Processing India Private Limited - Tally	\N	2026-06-30 18:10:19.179008
512	3	delete_soft	renewal	RMT-256	Moved renewal to trash: Schangalaya Motors - Tally	\N	2026-06-30 18:10:19.184623
513	3	delete_soft	renewal	RMT-272	Moved renewal to trash: Schakralaya Motors Unit of GRK Theatres Pvt Ltd - Tally	\N	2026-06-30 18:10:19.19074
514	3	delete_soft	renewal	RMT-211	Moved renewal to trash: Olive Grapes - SSL	\N	2026-06-30 18:10:19.197349
515	3	delete_soft	renewal	RMT-117	Moved renewal to trash: Solution Experts - 3Echo Systems - M365	\N	2026-06-30 18:10:19.203324
516	3	delete_soft	renewal	RMT-61	Moved renewal to trash: Olive Grapes - GWS	\N	2026-06-30 18:10:19.211043
517	3	delete_soft	renewal	RMT-60	Moved renewal to trash: Olive Grapes - GWS	\N	2026-06-30 18:10:19.21821
518	3	delete_soft	renewal	RMT-212	Moved renewal to trash: Sri Balaji Castings Pvt Ltd - SSL	\N	2026-06-30 18:10:19.226234
519	3	delete_soft	renewal	RMT-159	Moved renewal to trash: Translink Logistics Pvt Ltd (Chennai) - M365	\N	2026-06-30 18:10:19.233817
520	3	delete_soft	renewal	RMT-118	Moved renewal to trash: Translink Logistics Pvt Ltd (Chennai) - M365	\N	2026-06-30 18:10:19.241471
521	3	delete_soft	renewal	RMT-62	Moved renewal to trash: G S H A & Co - GWS	\N	2026-06-30 18:10:19.249339
522	3	delete_soft	renewal	RMT-46	Moved renewal to trash: DS Square Technologies - GWS	\N	2026-06-30 18:10:19.256534
523	3	delete_soft	renewal	RMT-21	Moved renewal to trash: Sri Balaji Castings Pvt Ltd - Domain	\N	2026-06-30 18:10:19.264514
524	3	delete_soft	renewal	RMT-131	Moved renewal to trash: Glovis India Anantapur Pvt Ltd - M365	\N	2026-06-30 18:10:19.272261
525	3	delete_soft	renewal	RMT-254	Moved renewal to trash: Blix Toys - Tally	\N	2026-06-30 18:10:25.037703
526	3	delete_soft	renewal	RMT-292	Moved renewal to trash: Zest Intertrade LLP - Tally	\N	2026-06-30 18:10:25.04613
527	3	delete_soft	renewal	RMT-16	Moved renewal to trash: Paloma Turning Co Pvt Ltd - Backup solution	\N	2026-06-30 18:10:25.053375
528	3	delete_soft	renewal	RMT-293	Moved renewal to trash: Agro Spice India Pvt Ltd - Tally	\N	2026-06-30 18:10:25.060685
529	3	delete_soft	renewal	RMT-15	Moved renewal to trash: Paloma Turning Co Pvt Ltd - Backup solution	\N	2026-06-30 18:10:25.067808
530	3	delete_soft	renewal	RMT-291	Moved renewal to trash: GT Jayanti Agrochem India Private Limited - Tally	\N	2026-06-30 18:10:25.07529
531	3	delete_soft	renewal	RMT-255	Moved renewal to trash: GT Jayanti Agrochem India Private Limited - Tally	\N	2026-06-30 18:10:25.08236
532	3	delete_soft	renewal	RMT-294	Moved renewal to trash: Radhe Shyam Agro Overseas - Tally	\N	2026-06-30 18:10:25.090299
533	3	delete_soft	renewal	RMT-139	Moved renewal to trash: NLS Associates - M365	\N	2026-06-30 18:10:25.097898
534	3	delete_soft	renewal	RMT-10	Moved renewal to trash: Swelect Energy Systems Limited-U35 - Salem - Backup solution	\N	2026-06-30 18:10:25.105011
535	3	delete_soft	renewal	RMT-101	Moved renewal to trash: Vallhabha Milk Products Private Limited - LSH	\N	2026-06-30 18:10:25.112553
536	3	delete_soft	renewal	RMT-242	Moved renewal to trash: T A M and Associates LLP - Tally	\N	2026-06-30 18:10:25.11967
537	3	delete_soft	renewal	RMT-175	Moved renewal to trash: Thanga Prathap - MSP	\N	2026-06-30 18:10:25.126753
538	3	delete_soft	renewal	RMT-04	Moved renewal to trash: Thanga Prathap - AWS	\N	2026-06-30 18:10:25.134481
539	3	delete_soft	renewal	RMT-63	Moved renewal to trash: Vijaya Scientific Company - GWS	\N	2026-06-30 18:10:25.141742
540	3	delete_soft	renewal	RMT-196	Moved renewal to trash: Paloma Turning Co Pvt Ltd - Seqrite	\N	2026-06-30 18:10:25.149244
541	3	delete_soft	renewal	RMT-65	Moved renewal to trash: Vallhabha Milk Products Private Limited - GWS	\N	2026-06-30 18:10:25.157282
542	3	delete_soft	renewal	RMT-241	Moved renewal to trash: Saa Healthcare Pvt Ltd - Tally	\N	2026-06-30 18:10:25.1642
543	3	delete_soft	renewal	RMT-98	Moved renewal to trash: Vallhabha Milk Products Private Limited - GWS	\N	2026-06-30 18:10:25.171524
544	3	delete_soft	renewal	RMT-105	Moved renewal to trash: Dr. JRKs Research and Pharmaceuticals Private Limited - M365	\N	2026-06-30 18:10:25.17832
545	3	delete_soft	renewal	RMT-97	Moved renewal to trash: The HPPL - GWS	\N	2026-06-30 18:10:25.18551
546	3	delete_soft	renewal	RMT-64	Moved renewal to trash: The HPPL - GWS	\N	2026-06-30 18:10:25.193525
547	3	delete_soft	renewal	RMT-12	Moved renewal to trash: Swelect Energy Systems Limited-U35 Coimbatore - Backup solution	\N	2026-06-30 18:10:25.200364
548	3	delete_soft	renewal	RMT-309	Moved renewal to trash: Kothari Brothers Tech Pvt Ltd - Zoho	\N	2026-06-30 18:10:25.20733
549	3	delete_soft	renewal	RMT-313	Moved renewal to trash: Kothari Brothers Tech Pvt Ltd - Zoho	\N	2026-06-30 18:10:25.214365
550	3	delete_soft	renewal	RMT-314	Moved renewal to trash: Kothari Brothers Tech Pvt Ltd - Zoho	\N	2026-06-30 18:10:30.372823
551	3	delete_soft	renewal	RMT-66	Moved renewal to trash: Spinebiz Services Private Limited - GWS	\N	2026-06-30 18:10:30.380968
552	3	delete_soft	renewal	RMT-258	Moved renewal to trash: JMR Apparels - Tally	\N	2026-06-30 18:10:30.38834
553	3	delete_soft	renewal	RMT-259	Moved renewal to trash: Good to Go Foodworks Private Limited - Tally	\N	2026-06-30 18:10:30.3963
554	3	delete_soft	renewal	RMT-119	Moved renewal to trash: CONNECTFIRST TECHNOLOGIES PRIVATE LIMITED - M365	\N	2026-06-30 18:10:30.404805
555	3	delete_soft	renewal	RMT-22	Moved renewal to trash: Sri Balaji Engineers - Domain	\N	2026-06-30 18:10:30.41231
556	3	delete_soft	renewal	RMT-68	Moved renewal to trash: Sri Balaji Engineers - GWS	\N	2026-06-30 18:10:30.420495
557	3	delete_soft	renewal	RMT-67	Moved renewal to trash: Farmfolks Agro Pvt Ltd - GWS	\N	2026-06-30 18:10:30.427016
558	3	delete_soft	renewal	RMT-197	Moved renewal to trash: Sivaramakrishna Forgings Private Limited - Seqrite	\N	2026-06-30 18:10:30.433816
559	3	delete_soft	renewal	RMT-149	Moved renewal to trash: Proodle Hospitality Services - M365	\N	2026-06-30 18:10:30.441439
560	3	delete_soft	renewal	RMT-213	Moved renewal to trash: Cameo Corporate Services Limited - SSL	\N	2026-06-30 18:10:30.448238
561	3	delete_soft	renewal	RMT-69	Moved renewal to trash: Home Screen Entertainment FZE - GWS	\N	2026-06-30 18:10:30.454897
562	3	delete_soft	renewal	RMT-99	Moved renewal to trash: Home Screen Entertainment FZE - GWS	\N	2026-06-30 18:10:30.462516
563	3	delete_soft	renewal	RMT-214	Moved renewal to trash: Aadiyar Infotech Private Limited - SSL	\N	2026-06-30 18:10:30.469554
564	3	delete_soft	renewal	RMT-216	Moved renewal to trash: Triway Forwarders Private Limited - SSL	\N	2026-06-30 18:10:30.47722
565	3	delete_soft	renewal	RMT-23	Moved renewal to trash: Shanke Enterprise Private Limited - Domain	\N	2026-06-30 18:10:30.48484
566	3	delete_soft	renewal	RMT-120	Moved renewal to trash: Shanke Enterprise Private Limited - M365	\N	2026-06-30 18:10:30.492412
567	3	delete_soft	renewal	RMT-160	Moved renewal to trash: Shanke Enterprise Private Limited - M365	\N	2026-06-30 18:10:30.499614
568	3	delete_soft	renewal	RMT-215	Moved renewal to trash: Winsar Infosoft Private Limited - SSL	\N	2026-06-30 18:10:30.507363
569	3	delete_soft	renewal	RMT-121	Moved renewal to trash: Hangkraft - M365	\N	2026-06-30 18:10:30.515512
570	3	delete_soft	renewal	RMT-106	Moved renewal to trash: Brand Idea Consultancy Private Limited - M365	\N	2026-06-30 18:10:30.522237
571	3	delete_soft	renewal	RMT-107	Moved renewal to trash: Brand Idea Consultancy Private Limited - M365	\N	2026-06-30 18:10:30.529367
572	3	delete_soft	renewal	RMT-103	Moved renewal to trash: Mithtran Global Technology LLP - M365	\N	2026-06-30 18:10:30.53689
573	3	delete_soft	renewal	RMT-198	Moved renewal to trash: 5GX Global Fintech Seqrite+DLP - Seqrite	\N	2026-06-30 18:10:30.543401
574	3	delete_soft	renewal	RMT-262	Moved renewal to trash: Glovis India Anantapur Pvt Ltd - Tally	\N	2026-06-30 18:10:30.550067
675	3	delete_soft	renewal	RMT-142	Moved renewal to trash: HEAT CONTROL TECHNOLOGIES - M365	\N	2026-06-30 18:10:59.71589
676	3	delete_soft	renewal	RMT-36	Moved renewal to trash: NX Logistics India Pvt. Ltd(Gurugram) - Firewall	\N	2026-06-30 18:10:59.722463
677	3	delete_soft	renewal	RMT-184	Moved renewal to trash: NX Logistics India Pvt. Ltd(Gurugram) - MSP	\N	2026-06-30 18:10:59.728498
678	3	delete_soft	renewal	RMT-312	Moved renewal to trash: DS Square Technologies - Zoho	\N	2026-06-30 18:10:59.735148
679	3	delete_soft	renewal	RMT-82	Moved renewal to trash: M R Greentech - GWS	\N	2026-06-30 18:10:59.741601
680	3	delete_soft	renewal	RMT-128	Moved renewal to trash: Ziffity Solutions Private Limited - M365	\N	2026-06-30 18:10:59.748044
681	3	delete_soft	renewal	RMT-152	Moved renewal to trash: Ziffity Solutions Private Limited - M365	\N	2026-06-30 18:10:59.75404
682	3	delete_soft	renewal	RMT-222	Moved renewal to trash: MindGenix Private Ltd - SSL	\N	2026-06-30 18:10:59.760632
683	3	delete_soft	renewal	RMT-203	Moved renewal to trash: SIDCORPTECH - Win India - Seqrite	\N	2026-06-30 18:10:59.767362
684	3	delete_soft	renewal	RMT-32	Moved renewal to trash: INTEGRATED SERVICE POINT LIMITED - M365	\N	2026-06-30 18:10:59.774754
685	3	delete_soft	renewal	RMT-136	Moved renewal to trash: VGN Stafford Flat Owners Welfare Association - M365	\N	2026-06-30 18:10:59.781305
686	3	delete_soft	renewal	RMT-165	Moved renewal to trash: Talodyn Networks Private Limited - M365	\N	2026-06-30 18:10:59.787624
687	3	delete_soft	renewal	RMT-147	Moved renewal to trash: Talodyn Networks Private Limited - M365	\N	2026-06-30 18:10:59.79435
688	3	delete_soft	renewal	RMT-185	Moved renewal to trash: Talodyn Networks Private Limited - MSP	\N	2026-06-30 18:10:59.801297
689	3	delete_soft	renewal	RMT-150	Moved renewal to trash: Talodyn Networks Private Limited - M365	\N	2026-06-30 18:10:59.808616
690	3	delete_soft	renewal	RMT-143	Moved renewal to trash: Talodyn Networks Private Limited - M365	\N	2026-06-30 18:10:59.815473
691	3	delete_soft	renewal	RMT-145	Moved renewal to trash: Talodyn Networks Private Limited - M365	\N	2026-06-30 18:10:59.822577
692	3	delete_soft	renewal	RMT-146	Moved renewal to trash: Talodyn Networks Private Limited - M365	\N	2026-06-30 18:10:59.829347
693	3	delete_soft	renewal	RMT-83	Moved renewal to trash: MPL Light Vehicles Private Ltd - GWS	\N	2026-06-30 18:10:59.836609
575	3	delete_soft	renewal	RMT-266	Moved renewal to trash: Professional Impex Pvt Ltd (Delhi) - Tally	\N	2026-06-30 18:10:36.146308
576	3	delete_soft	renewal	RMT-295	Moved renewal to trash: Professional Impex Pvt Ltd (Delhi) - Tally	\N	2026-06-30 18:10:36.151143
577	3	delete_soft	renewal	RMT-296	Moved renewal to trash: MPL Light Vehicles Private Ltd - Tally	\N	2026-06-30 18:10:36.156224
578	3	delete_soft	renewal	RMT-286	Moved renewal to trash: Intek Engineers - Ref Ramesh Consulatant - Tally	\N	2026-06-30 18:10:36.16091
579	3	delete_soft	renewal	RMT-263	Moved renewal to trash: Intek Engineers - Ref Ramesh Consulatant - Tally	\N	2026-06-30 18:10:36.165331
580	3	delete_soft	renewal	RMT-176	Moved renewal to trash: GT Jayanti Agrochem India Private Limited - MSP	\N	2026-06-30 18:10:36.170193
581	3	delete_soft	renewal	RMT-261	Moved renewal to trash: Vijaya Scientific Company - Tally	\N	2026-06-30 18:10:36.175186
582	3	delete_soft	renewal	RMT-24	Moved renewal to trash: Sri Balaji Castings Pvt Ltd - Domain	\N	2026-06-30 18:10:36.179802
583	3	delete_soft	renewal	RMT-140	Moved renewal to trash: FST Information Technology Private limites - M365	\N	2026-06-30 18:10:36.185532
584	3	delete_soft	renewal	RMT-199	Moved renewal to trash: AONE Outsourcing Solutions Private Limited - Chennai - Seqrite	\N	2026-06-30 18:10:36.191105
585	3	delete_soft	renewal	RMT-200	Moved renewal to trash: Sreshta Sumanth Builders Private Limited - Seqrite	\N	2026-06-30 18:10:36.196401
586	3	delete_soft	renewal	RMT-133	Moved renewal to trash: SIDCORPTECH - M365	\N	2026-06-30 18:10:36.201672
587	3	delete_soft	renewal	RMT-217	Moved renewal to trash: Aadiyar Infotech Private Limited - SSL	\N	2026-06-30 18:10:36.206544
588	3	delete_soft	renewal	RMT-122	Moved renewal to trash: Direction West Sourcing - M365	\N	2026-06-30 18:10:36.212065
589	3	delete_soft	renewal	RMT-70	Moved renewal to trash: Solution Experts - GWS	\N	2026-06-30 18:10:36.217596
590	3	delete_soft	renewal	RMT-218	Moved renewal to trash: Aadiyar Infotech Private Limited - SSL	\N	2026-06-30 18:10:36.22343
591	3	delete_soft	renewal	RMT-187	Moved renewal to trash: Cherubim Security Force LLP(MAAYAA SECURITY FORCE LLP) - Tally	\N	2026-06-30 18:10:36.229191
592	3	delete_soft	renewal	RMT-264	Moved renewal to trash: Professional Impex Pvt Ltd (Chennai) - Tally	\N	2026-06-30 18:10:36.23448
593	3	delete_soft	renewal	RMT-188	Moved renewal to trash: Time Rich Shipping Private Ltd - Tally	\N	2026-06-30 18:10:36.239997
594	3	delete_soft	renewal	RMT-297	Moved renewal to trash: Good to Go Foodworks Private Limited - Tally	\N	2026-06-30 18:10:36.245332
595	3	delete_soft	renewal	RMT-265	Moved renewal to trash: Ritz Trade Links Private Limited - Tally	\N	2026-06-30 18:10:36.249647
596	3	delete_soft	renewal	RMT-124	Moved renewal to trash: JD Software Private Limited - M365	\N	2026-06-30 18:10:36.255397
597	3	delete_soft	renewal	RMT-244	Moved renewal to trash: JMR Apparels - Tally	\N	2026-06-30 18:10:36.262024
598	3	delete_soft	renewal	RMT-123	Moved renewal to trash: JMR Apparels - M365	\N	2026-06-30 18:10:36.268319
599	3	delete_soft	renewal	RMT-243	Moved renewal to trash: Vijaya Scientific Company - Tally	\N	2026-06-30 18:10:36.274082
650	3	delete_soft	renewal	RMT-287	Moved renewal to trash: Tekfab Engineers - Tally	\N	2026-06-30 18:10:54.36973
651	3	delete_soft	renewal	RMT-07	Moved renewal to trash: Enmas Andritz Private Limited - AWS	\N	2026-06-30 18:10:54.375691
652	3	delete_soft	renewal	RMT-177	Moved renewal to trash: Proodle Hospitality Services - MSP	\N	2026-06-30 18:10:54.382223
653	3	delete_soft	renewal	RMT-231	Moved renewal to trash: Proodle Hospitality Services - Backup solution	\N	2026-06-30 18:10:54.388986
654	3	delete_soft	renewal	RMT-18	Moved renewal to trash: Sivaramakrishna Forgings Private Limited - Backup solution	\N	2026-06-30 18:10:54.395201
655	3	delete_soft	renewal	RMT-93	Moved renewal to trash: Fox Dean Estates Pvt Ltd - GWS	\N	2026-06-30 18:10:54.401215
656	3	delete_soft	renewal	RMT-77	Moved renewal to trash: Surya Pelle Chemical & Mould Private Limited - GWS	\N	2026-06-30 18:10:54.408359
657	3	delete_soft	renewal	RMT-78	Moved renewal to trash: SUN BLUES - GWS	\N	2026-06-30 18:10:54.414331
658	3	delete_soft	renewal	RMT-134	Moved renewal to trash: Solution Experts - M365	\N	2026-06-30 18:10:54.421177
659	3	delete_soft	renewal	RMT-202	Moved renewal to trash: Witzone Technologies Pvt Ltd - Seqrite	\N	2026-06-30 18:10:54.42865
660	3	delete_soft	renewal	RMT-183	Moved renewal to trash: Ravindra Stores - MSP	\N	2026-06-30 18:10:54.435512
661	3	delete_soft	renewal	RMT-127	Moved renewal to trash: Synergent Tech Solutions Private Ltd - M365	\N	2026-06-30 18:10:54.443078
662	3	delete_soft	renewal	RMT-108	Moved renewal to trash: Sasva Luxury LLP - M365	\N	2026-06-30 18:10:54.45004
663	3	delete_soft	renewal	RMT-179	Moved renewal to trash: Sreshta Sumanth Builders Private Limited - MSP	\N	2026-06-30 18:10:54.456477
664	3	delete_soft	renewal	RMT-17	Moved renewal to trash: Sreshta Sumanth Builders Private Limited - Backup solution	\N	2026-06-30 18:10:54.463826
665	3	delete_soft	renewal	RMT-129	Moved renewal to trash: Winsar Infosoft Private Limited - M365	\N	2026-06-30 18:10:54.47081
666	3	delete_soft	renewal	RMT-161	Moved renewal to trash: Winsar Infosoft Private Limited - M365	\N	2026-06-30 18:10:54.478093
667	3	delete_soft	renewal	RMT-104	Moved renewal to trash: Digital XC Inc - M365	\N	2026-06-30 18:10:54.485295
668	3	delete_soft	renewal	RMT-298	Moved renewal to trash: Reeshav Automobiles Private Ltd - Tally	\N	2026-06-30 18:10:54.492873
669	3	delete_soft	renewal	RMT-79	Moved renewal to trash: Lawrencedale Agro Processing India Private Limited - GWS	\N	2026-06-30 18:10:54.499869
670	3	delete_soft	renewal	RMT-80	Moved renewal to trash: Aggrow Farmers Development Organisation - GWS	\N	2026-06-30 18:10:54.506458
671	3	delete_soft	renewal	RMT-273	Moved renewal to trash: Supreme Plastic Traders - Tally	\N	2026-06-30 18:10:54.512991
672	3	delete_soft	renewal	RMT-274	Moved renewal to trash: Discover Tech - Tooltech - Tally	\N	2026-06-30 18:10:54.518907
673	3	delete_soft	renewal	RMT-81	Moved renewal to trash: SCM Cube Technologies Private LImited - GWS	\N	2026-06-30 18:10:54.524807
674	3	delete_soft	renewal	RMT-221	Moved renewal to trash: Aadiyar Infotech Private Limited - SSL	\N	2026-06-30 18:10:54.53109
750	3	delete_soft	renewal	RMT-311	Moved renewal to trash: Dhan Hind Utility Pvt Ltd - Zoho	\N	2026-06-30 18:11:12.307175
751	3	delete_soft	renewal	RMT-285	Moved renewal to trash: Kothari Brothers Tech Pvt Ltd - Tally	\N	2026-06-30 18:11:12.314197
752	3	delete_soft	renewal	RMT-76	Moved renewal to trash: Home Screen Entertainment FZE - GWS	\N	2026-06-30 18:11:12.320662
753	3	delete_soft	renewal	RMT-204	Moved renewal to trash: Sri Balaji Castings Pvt Ltd - Seqrite	\N	2026-06-30 18:11:12.327089
754	3	delete_soft	renewal	RMT-42	Moved renewal to trash: Sri Balaji Castings Pvt Ltd - Firewall	\N	2026-06-30 18:11:12.334123
755	3	delete_soft	renewal	RMT-41	Moved renewal to trash: Sri Balaji Castings Pvt Ltd - Firewall	\N	2026-06-30 18:11:12.340181
756	3	delete_soft	renewal	RMT-43	Moved renewal to trash: Sri Balaji Castings Pvt Ltd - Firewall	\N	2026-06-30 18:11:12.347274
757	3	delete_soft	renewal	RMT-44	Moved renewal to trash: Sri Balaji Castings Pvt Ltd - Firewall	\N	2026-06-30 18:11:12.354711
758	3	delete_soft	renewal	RMT-29	Moved renewal to trash: Naahar Public School - Domain	\N	2026-06-30 18:11:12.367491
600	3	delete_soft	renewal	RMT-26	Moved renewal to trash: J S Tours and Travels - Domain	\N	2026-06-30 18:10:45.362318
601	3	delete_soft	renewal	RMT-25	Moved renewal to trash: J S Tours and Travels - Domain	\N	2026-06-30 18:10:45.366246
602	3	delete_soft	renewal	RMT-219	Moved renewal to trash: Aadiyar Infotech Private Limited - SSL	\N	2026-06-30 18:10:45.369779
603	3	delete_soft	renewal	RMT-252	Moved renewal to trash: Merusri Developers - Tally	\N	2026-06-30 18:10:45.373406
604	3	delete_soft	renewal	RMT-71	Moved renewal to trash: Olive Grapes - GWS	\N	2026-06-30 18:10:45.377037
605	3	delete_soft	renewal	RMT-27	Moved renewal to trash: NLS Associates - Domain	\N	2026-06-30 18:10:45.380706
606	3	delete_soft	renewal	RMT-247	Moved renewal to trash: Radhe Shyam Agro Overseas - Tally	\N	2026-06-30 18:10:45.384243
607	3	delete_soft	renewal	RMT-72	Moved renewal to trash: J S Tours and Travels - GWS	\N	2026-06-30 18:10:45.388352
608	3	delete_soft	renewal	RMT-249	Moved renewal to trash: Agro Spice India Pvt Ltd - Tally	\N	2026-06-30 18:10:45.392226
609	3	delete_soft	renewal	RMT-246	Moved renewal to trash: Zest Intertrade LLP - Tally	\N	2026-06-30 18:10:45.396076
610	3	delete_soft	renewal	RMT-248	Moved renewal to trash: Unique Natural Products Pvt Ltd - Tally	\N	2026-06-30 18:10:45.3999
611	3	delete_soft	renewal	RMT-245	Moved renewal to trash: GT Jayanti Agrochem India Private Limited - Tally	\N	2026-06-30 18:10:45.403626
612	3	delete_soft	renewal	RMT-73	Moved renewal to trash: Jai Balaji Fabricators - GWS	\N	2026-06-30 18:10:45.407774
613	3	delete_soft	renewal	RMT-94	Moved renewal to trash: Jai Balaji Fabricators - GWS	\N	2026-06-30 18:10:45.411918
614	3	delete_soft	renewal	RMT-37	Moved renewal to trash: Sivaramakrishna Forgings Private Limited - Firewall	\N	2026-06-30 18:10:45.415645
615	3	delete_soft	renewal	RMT-38	Moved renewal to trash: Sivaramakrishna Forgings Private Limited - Firewall	\N	2026-06-30 18:10:45.419687
616	3	delete_soft	renewal	RMT-39	Moved renewal to trash: Sivaramakrishna Forgings Private Limited - Firewall	\N	2026-06-30 18:10:45.423959
617	3	delete_soft	renewal	RMT-205	Moved renewal to trash: ALHIND TRAVEL PORTAL LLP - Seqrite	\N	2026-06-30 18:10:45.428467
618	3	delete_soft	renewal	RMT-28	Moved renewal to trash: Solution Experts - Domain	\N	2026-06-30 18:10:45.432947
619	3	delete_soft	renewal	RMT-201	Moved renewal to trash: Aadiyar Infotech Private Limited - Seqrite	\N	2026-06-30 18:10:45.437387
620	3	delete_soft	renewal	RMT-34	Moved renewal to trash: Talodyn Networks Private Limited - Firewall	\N	2026-06-30 18:10:45.442281
621	3	delete_soft	renewal	RMT-164	Moved renewal to trash: THE IT MAN PRIVATE LIMITED - M365	\N	2026-06-30 18:10:45.446717
622	3	delete_soft	renewal	RMT-125	Moved renewal to trash: A Saffeway Systems and Equipments - M365	\N	2026-06-30 18:10:45.451157
623	3	delete_soft	renewal	RMT-74	Moved renewal to trash: DS Square Technologies - GWS	\N	2026-06-30 18:10:45.455253
624	3	delete_soft	renewal	RMT-75	Moved renewal to trash: JMR Apparels - GWS	\N	2026-06-30 18:10:45.459388
625	3	delete_soft	renewal	RMT-233	Moved renewal to trash: The HPPL - Digital Signature	\N	2026-06-30 18:10:49.144102
626	3	delete_soft	renewal	RMT-268	Moved renewal to trash: PG Impex - Tally	\N	2026-06-30 18:10:49.151124
627	3	delete_soft	renewal	RMT-267	Moved renewal to trash: The HPPL - Tally	\N	2026-06-30 18:10:49.157579
628	3	delete_soft	renewal	RMT-284	Moved renewal to trash: VPN Agencies - Tally	\N	2026-06-30 18:10:49.164245
629	3	delete_soft	renewal	RMT-02	Moved renewal to trash: GBSV & CO - Tally	\N	2026-06-30 18:10:49.170842
630	3	delete_soft	renewal	RMT-290	Moved renewal to trash: K2 Cranes & Components Pvt Ltd - Tally	\N	2026-06-30 18:10:49.177106
631	3	delete_soft	renewal	RMT-270	Moved renewal to trash: K2 Cranes & Components Pvt Ltd - Tally	\N	2026-06-30 18:10:49.183534
632	3	delete_soft	renewal	RMT-303	Moved renewal to trash: Dhan Hind Utility Pvt Ltd - IPsec VPN	\N	2026-06-30 18:10:49.190279
633	3	delete_soft	renewal	RMT-206	Moved renewal to trash: GT Jayanti Agrochem India Private Limited - Seqrite	\N	2026-06-30 18:10:49.196189
634	3	delete_soft	renewal	RMT-250	Moved renewal to trash: PG Impex - Tally	\N	2026-06-30 18:10:49.202952
635	3	delete_soft	renewal	RMT-310	Moved renewal to trash: AI Enterprise - Zoho	\N	2026-06-30 18:10:49.20922
636	3	delete_soft	renewal	RMT-181	Moved renewal to trash: AI Enterprise - MSP	\N	2026-06-30 18:10:49.215365
637	3	delete_soft	renewal	RMT-33	Moved renewal to trash: AI Enterprise - M365	\N	2026-06-30 18:10:49.221958
638	3	delete_soft	renewal	RMT-315	Moved renewal to trash: AI Enterprise - Zoho	\N	2026-06-30 18:10:49.22882
639	3	delete_soft	renewal	RMT-180	Moved renewal to trash: AI Cars ( Unit of AI Enterprises ) - MSP	\N	2026-06-30 18:10:49.235626
640	3	delete_soft	renewal	RMT-307	Moved renewal to trash: AI Cars ( Unit of AI Enterprises ) - Zoho	\N	2026-06-30 18:10:49.242402
641	3	delete_soft	renewal	RMT-308	Moved renewal to trash: AI Cars ( Unit of AI Enterprises ) - Zoho	\N	2026-06-30 18:10:49.249315
642	3	delete_soft	renewal	RMT-126	Moved renewal to trash: TJ Financial Consultancy & Investments Private Limited - M365	\N	2026-06-30 18:10:49.255683
643	3	delete_soft	renewal	RMT-03	Moved renewal to trash: Venkat & Co - Tally	\N	2026-06-30 18:10:49.262396
644	3	delete_soft	renewal	RMT-269	Moved renewal to trash: Pongalur Pioneer Textiles Private Limited - Tally	\N	2026-06-30 18:10:49.268755
645	3	delete_soft	renewal	RMT-288	Moved renewal to trash: Tekfab Engineers - Tally	\N	2026-06-30 18:10:49.275016
646	3	delete_soft	renewal	RMT-174	Moved renewal to trash: Paloma Turning Co Pvt Ltd - MSP	\N	2026-06-30 18:10:49.281499
647	3	delete_soft	renewal	RMT-05	Moved renewal to trash: Bharatiya Janata Party - AWS	\N	2026-06-30 18:10:49.288169
648	3	delete_soft	renewal	RMT-301	Moved renewal to trash: SITWANTO DEVI MAHILA KALYAN SANSTHAN - Tally	\N	2026-06-30 18:10:49.294205
649	3	delete_soft	renewal	RMT-06	Moved renewal to trash: GB Power Projects Private Limited - AWS	\N	2026-06-30 18:10:49.300532
700	3	delete_soft	renewal	RMT-113	Moved renewal to trash: AGARAM TECHNOLOGIES - M365	\N	2026-06-30 18:11:03.282748
701	3	delete_soft	renewal	RMT-156	Moved renewal to trash: AGARAM TECHNOLOGIES - M365	\N	2026-06-30 18:11:03.287827
702	3	delete_soft	renewal	RMT-151	Moved renewal to trash: Superops Technologies - M365	\N	2026-06-30 18:11:03.292763
703	3	delete_soft	renewal	RMT-208	Moved renewal to trash: Ravindra Stores - SSL	\N	2026-06-30 18:11:03.297782
704	3	delete_soft	renewal	RMT-49	Moved renewal to trash: Vijay Logistics - GWS	\N	2026-06-30 18:11:03.302009
705	3	delete_soft	renewal	RMT-194	Moved renewal to trash: Winsar Infosoft Private Limited - Seqrite	\N	2026-06-30 18:11:03.307012
706	3	delete_soft	renewal	RMT-240	Moved renewal to trash: Sree Vardhaman Autoparts - Tally	\N	2026-06-30 18:11:03.312257
707	3	delete_soft	renewal	RMT-238	Moved renewal to trash: Mahavir Motors - Tally	\N	2026-06-30 18:11:03.317492
708	3	delete_soft	renewal	RMT-239	Moved renewal to trash: Mahavir Distributor - Tally	\N	2026-06-30 18:11:03.322379
709	3	delete_soft	renewal	RMT-236	Moved renewal to trash: Mahavir Automobiles - Tally	\N	2026-06-30 18:11:03.327862
710	3	delete_soft	renewal	RMT-235	Moved renewal to trash: Auto Impex - Tally	\N	2026-06-30 18:11:03.333567
711	3	delete_soft	renewal	RMT-11	Moved renewal to trash: Swelect Energy Systems Limited - Chennai - Backup solution	\N	2026-06-30 18:11:03.339141
694	3	delete_soft	renewal	RMT-100	Moved renewal to trash: MPL Light Vehicles Private Ltd - GWS	\N	2026-06-30 18:10:59.843418
695	3	delete_soft	renewal	RMT-277	Moved renewal to trash: Spellbee International Pvt Ltd - Tally	\N	2026-06-30 18:10:59.850009
696	3	delete_soft	renewal	RMT-275	Moved renewal to trash: Goodluck Plastic Trading Company - Tally	\N	2026-06-30 18:10:59.857112
697	3	delete_soft	renewal	RMT-276	Moved renewal to trash: Rahul Associates - Tally	\N	2026-06-30 18:10:59.864628
698	3	delete_soft	renewal	RMT-237	Moved renewal to trash: Kothari Brothers Tech Pvt Ltd - Tally	\N	2026-06-30 18:10:59.871935
699	3	delete_soft	renewal	RMT-111	Moved renewal to trash: Kerala Paper Products Limited - M365	\N	2026-06-30 18:10:59.880579
775	3	delete_soft	renewal	RMT-19	Moved renewal to trash: S S GREEN ENVIRO METAL IMPEX - Domain	\N	2026-06-30 18:11:23.520993
776	3	delete_soft	renewal	RMT-47	Moved renewal to trash: S S GREEN ENVIRO METAL IMPEX - GWS	\N	2026-06-30 18:11:23.525442
777	3	delete_soft	renewal	RMT-48	Moved renewal to trash: Olive Grapes - GWS	\N	2026-06-30 18:11:23.529601
778	3	delete_soft	renewal	RMT-154	Moved renewal to trash: Talodyn Networks Private Limited - M365	\N	2026-06-30 18:11:23.533688
779	3	delete_soft	renewal	RMT-168	Moved renewal to trash: Sri Balaji Castings Pvt Ltd - MSP	\N	2026-06-30 18:11:23.537832
780	3	delete_soft	renewal	RMT-234	Moved renewal to trash: Yennes Infotec (P) Limited - Tally	\N	2026-06-30 18:11:23.542112
781	3	delete_soft	renewal	RMT-109	Moved renewal to trash: Avigna Retail Private Limited - M365	\N	2026-06-30 18:11:23.546214
782	3	delete_soft	renewal	RMT-169	Moved renewal to trash: Witzone Technologies Pvt Ltd - MSP	\N	2026-06-30 18:11:23.549934
783	3	delete_soft	renewal	RMT-304	Moved renewal to trash: SysArc Infomatix Private Limited - Zoho	\N	2026-06-30 18:11:23.554127
784	3	delete_soft	renewal	RMT-253	Moved renewal to trash: SITWANTO DEVI MAHILA KALYAN SANSTHAN - Tally	\N	2026-06-30 18:11:23.558168
785	3	delete_soft	renewal	RMT-155	Moved renewal to trash: Imaginetech Digital Private Limited - M365	\N	2026-06-30 18:11:23.561954
786	3	delete_soft	renewal	RMT-158	Moved renewal to trash: Spinebiz Services Private Limited - M365	\N	2026-06-30 18:11:23.565835
787	3	delete_soft	renewal	RMT-112	Moved renewal to trash: Spinebiz Services Private Limited - M365	\N	2026-06-30 18:11:23.569528
788	3	delete_soft	renewal	RMT-110	Moved renewal to trash: THE IT MAN PRIVATE LIMITED - M365	\N	2026-06-30 18:11:23.573279
789	3	delete_soft	renewal	RMT-167	Moved renewal to trash: Talodyn Networks Private Limited - M365	\N	2026-06-30 18:11:23.577515
712	3	delete_soft	renewal	RMT-209	Moved renewal to trash: SCM Cube Technologies Private LImited - SSL	\N	2026-06-30 18:11:03.344838
713	3	delete_soft	renewal	RMT-114	Moved renewal to trash: DNO Technologies Private Limited - M365	\N	2026-06-30 18:11:03.350677
714	3	delete_soft	renewal	RMT-157	Moved renewal to trash: DNO Technologies Private Limited - M365	\N	2026-06-30 18:11:03.35659
715	3	delete_soft	renewal	RMT-278	Moved renewal to trash: Reeshav Automobiles Private Ltd - Tally	\N	2026-06-30 18:11:03.361753
716	3	delete_soft	renewal	RMT-289	Moved renewal to trash: Proodle Hospitality Services - Tally	\N	2026-06-30 18:11:03.366136
717	3	delete_soft	renewal	RMT-279	Moved renewal to trash: Vijaya Scientific Company - Tally	\N	2026-06-30 18:11:03.370185
718	3	delete_soft	renewal	RMT-281	Moved renewal to trash: OMR Mall Developers Pvt Ltd - Tally	\N	2026-06-30 18:11:03.375505
719	3	delete_soft	renewal	RMT-280	Moved renewal to trash: Talodyn Networks Private Limited - Tally	\N	2026-06-30 18:11:03.380445
720	3	delete_soft	renewal	RMT-220	Moved renewal to trash: LEITEN TECHNOLOGIES PRIVATE LIMITED - SSL	\N	2026-06-30 18:11:03.385109
721	3	delete_soft	renewal	RMT-84	Moved renewal to trash: Olive Grapes - GWS	\N	2026-06-30 18:11:03.390282
722	3	delete_soft	renewal	RMT-130	Moved renewal to trash: Proodle Hospitality Services - M365	\N	2026-06-30 18:11:03.395335
723	3	delete_soft	renewal	RMT-162	Moved renewal to trash: Proodle Hospitality Services - M365	\N	2026-06-30 18:11:03.400404
724	3	delete_soft	renewal	RMT-192	Moved renewal to trash: Winsar Infosoft Private Limited - M365	\N	2026-06-30 18:11:03.405291
725	3	delete_soft	renewal	RMT-223	Moved renewal to trash: Nethradhama Hospitals Pvt Ltd - SSL	\N	2026-06-30 18:11:06.964214
726	3	delete_soft	renewal	RMT-88	Moved renewal to trash: Interlace India Private Limited - GWS	\N	2026-06-30 18:11:06.970232
727	3	delete_soft	renewal	RMT-225	Moved renewal to trash: LEITEN TECHNOLOGIES PRIVATE LIMITED - SSL	\N	2026-06-30 18:11:06.976649
728	3	delete_soft	renewal	RMT-224	Moved renewal to trash: LEITEN TECHNOLOGIES PRIVATE LIMITED - SSL	\N	2026-06-30 18:11:06.983725
729	3	delete_soft	renewal	RMT-193	Moved renewal to trash: Paloma Turning Co Pvt Ltd - M365	\N	2026-06-30 18:11:06.990438
730	3	delete_soft	renewal	RMT-138	Moved renewal to trash: SCM Cube Technologies Private LImited - M365	\N	2026-06-30 18:11:06.997068
731	3	delete_soft	renewal	RMT-31	Moved renewal to trash: M R Greentech - Domain	\N	2026-06-30 18:11:07.004237
732	3	delete_soft	renewal	RMT-92	Moved renewal to trash: Sterling Solid Tyres (P) Ltd - GWS	\N	2026-06-30 18:11:07.011602
733	3	delete_soft	renewal	RMT-141	Moved renewal to trash: Witzone Technologies Pvt Ltd - M365	\N	2026-06-30 18:11:07.018157
734	3	delete_soft	renewal	RMT-207	Moved renewal to trash: Dhan Hind Utility Pvt Ltd - Seqrite	\N	2026-06-30 18:11:07.026161
735	3	delete_soft	renewal	RMT-302	Moved renewal to trash: Vijaya Scientific Company - Tally	\N	2026-06-30 18:11:07.032679
736	3	delete_soft	renewal	RMT-189	Moved renewal to trash: Swasthik Agencies - Tally	\N	2026-06-30 18:11:07.039778
737	3	delete_soft	renewal	RMT-163	Moved renewal to trash: INTEGRATED SERVICE POINT LIMITED - M365	\N	2026-06-30 18:11:07.049049
738	3	delete_soft	renewal	RMT-137	Moved renewal to trash: INTEGRATED SERVICE POINT LIMITED - M365	\N	2026-06-30 18:11:07.05579
739	3	delete_soft	renewal	RMT-186	Moved renewal to trash: INTEGRATED SERVICE POINT LIMITED - MSP	\N	2026-06-30 18:11:07.062414
740	3	delete_soft	renewal	RMT-190	Moved renewal to trash: Aadiyar Infotech Private Limited - Plesk Web Admin Edition	\N	2026-06-30 18:11:07.069896
741	3	delete_soft	renewal	RMT-87	Moved renewal to trash: Aadiyar Infotech Private Limited - GWS	\N	2026-06-30 18:11:07.077093
742	3	delete_soft	renewal	RMT-89	Moved renewal to trash: Aadiyar Infotech Private Limited - GWS	\N	2026-06-30 18:11:07.083665
743	3	delete_soft	renewal	RMT-226	Moved renewal to trash: Tamilnadu Tourism Development Corporation - SSL	\N	2026-06-30 18:11:07.091092
744	3	delete_soft	renewal	RMT-90	Moved renewal to trash: Harshal Packaging - GWS	\N	2026-06-30 18:11:07.098542
745	3	delete_soft	renewal	RMT-251	Moved renewal to trash: Spellbee International Pvt Ltd - Tally	\N	2026-06-30 18:11:07.105947
746	3	delete_soft	renewal	RMT-191	Moved renewal to trash: Aadiyar Infotech Private Limited - Plesk Backup to Cloud Pro	\N	2026-06-30 18:11:07.11368
747	3	delete_soft	renewal	RMT-91	Moved renewal to trash: Sumanth and Company - GWS	\N	2026-06-30 18:11:07.121122
748	3	delete_soft	renewal	RMT-30	Moved renewal to trash: Sri Balaji Castings Pvt Ltd - Domain	\N	2026-06-30 18:11:07.129186
749	3	delete_soft	renewal	RMT-283	Moved renewal to trash: MPL Light Vehicles Private Ltd - Tally	\N	2026-06-30 18:11:07.13621
759	3	delete_soft	renewal	RMT-40	Moved renewal to trash: Talodyn Networks Private Limited - Firewall	\N	2026-06-30 18:11:12.374985
760	3	delete_soft	renewal	RMT-228	Moved renewal to trash: FORTRISE BUSINESS SOLUTIONS PRIVATE LIMITED - SSL	\N	2026-06-30 18:11:12.38297
761	3	delete_soft	renewal	RMT-229	Moved renewal to trash: FORTRISE BUSINESS SOLUTIONS PRIVATE LIMITED - SSL	\N	2026-06-30 18:11:12.390165
762	3	delete_soft	renewal	RMT-227	Moved renewal to trash: Shraddha Eye Care Trust - SSL	\N	2026-06-30 18:11:12.397367
763	3	delete_soft	renewal	RMT-230	Moved renewal to trash: FORTRISE BUSINESS SOLUTIONS PRIVATE LIMITED - SSL	\N	2026-06-30 18:11:12.404182
764	3	delete_soft	renewal	RMT-09	Moved renewal to trash: Aadit Auto Company Pvt Ltd - Backup solution	\N	2026-06-30 18:11:12.411092
765	3	delete_soft	renewal	RMT-135	Moved renewal to trash: Sri Balaji Castings Pvt Ltd - M365	\N	2026-06-30 18:11:12.418121
766	3	delete_soft	renewal	RMT-13	Moved renewal to trash: Professional Impex Pvt Ltd (Chennai) - Backup solution	\N	2026-06-30 18:11:12.424875
767	3	delete_soft	renewal	RMT-14	Moved renewal to trash: Talodyn Networks Private Limited - Backup solution	\N	2026-06-30 18:11:12.43077
768	3	delete_soft	renewal	RMT-178	Moved renewal to trash: Sri Balaji Castings - Ponneri - MSP	\N	2026-06-30 18:11:12.436632
769	3	delete_soft	renewal	RMT-35	Moved renewal to trash: Winsar Infosoft Private Limited - Firewall	\N	2026-06-30 18:11:12.444136
770	3	delete_soft	renewal	RMT-148	Moved renewal to trash: Translink Logistics Pvt Ltd (Chennai) - M365	\N	2026-06-30 18:11:12.450688
771	3	delete_soft	renewal	RMT-299	Moved renewal to trash: Professional Impex Pvt Ltd (Chennai) - Tally	\N	2026-06-30 18:11:12.456947
772	3	delete_soft	renewal	RMT-182	Moved renewal to trash: Sri Balaji Castings Pvt Ltd - MSP	\N	2026-06-30 18:11:12.464301
773	3	delete_soft	renewal	RMT-232	Moved renewal to trash: Sri Balaji Castings Pvt Ltd - Backup solution	\N	2026-06-30 18:11:12.470644
774	3	delete_soft	renewal	RMT-153	Moved renewal to trash: Talodyn Networks Private Limited - M365	\N	2026-06-30 18:11:12.477267
790	3	permanent_delete	renewal	RMT-EXP-01	Permanently deleted renewal (bulk): Expired Client Inc - Google Workspace	\N	2026-06-30 18:11:37.185818
791	3	permanent_delete	renewal	RMT-02	Permanently deleted renewal (bulk): sameer  - Amazon Web Services	\N	2026-06-30 18:11:37.185818
792	3	permanent_delete	renewal	RMT-08	Permanently deleted renewal (bulk): Talodyn Networks Private Limited - Backup solution	\N	2026-06-30 18:11:37.185818
793	3	permanent_delete	renewal	RMT-116	Permanently deleted renewal (bulk): AONE Outsourcing Solutions Private Limited - Chennai - M365	\N	2026-06-30 18:11:37.185818
794	3	permanent_delete	renewal	RMT-305	Permanently deleted renewal (bulk): Proodle Hospitality Services - Zoho	\N	2026-06-30 18:11:37.185818
795	3	permanent_delete	renewal	RMT-01	Permanently deleted renewal (bulk): Proodle Hospitality Services - ADDS	\N	2026-06-30 18:11:37.185818
796	3	permanent_delete	renewal	RMT-306	Permanently deleted renewal (bulk): Talodyn Networks Private Limited - Zoho	\N	2026-06-30 18:11:37.185818
797	3	permanent_delete	renewal	RMT-144	Permanently deleted renewal (bulk): Talodyn Networks Private Limited - M365	\N	2026-06-30 18:11:37.185818
798	3	permanent_delete	renewal	RMT-171	Permanently deleted renewal (bulk): Aevitas IT Private Limited - MSP	\N	2026-06-30 18:11:37.185818
799	3	permanent_delete	renewal	RMT-170	Permanently deleted renewal (bulk): Proodle Hospitality Services - MSP	\N	2026-06-30 18:11:37.185818
800	3	permanent_delete	renewal	RMT-195	Permanently deleted renewal (bulk): Sindoori Management Solutions Pvt Ltd - Seqrite	\N	2026-06-30 18:11:37.185818
801	3	permanent_delete	renewal	RMT-20	Permanently deleted renewal (bulk): Pee & Dee Lands Holding Pvt Ltd - Domain	\N	2026-06-30 18:11:37.185818
802	3	permanent_delete	renewal	RMT-50	Permanently deleted renewal (bulk): Pee & Dee Lands Holding Pvt Ltd - GWS	\N	2026-06-30 18:11:37.185818
803	3	permanent_delete	renewal	RMT-51	Permanently deleted renewal (bulk): Olive Grapes - GWS	\N	2026-06-30 18:11:37.185818
804	3	permanent_delete	renewal	RMT-115	Permanently deleted renewal (bulk): S HARIHARAN & ASSOCIATES - M365	\N	2026-06-30 18:11:37.185818
805	3	permanent_delete	renewal	RMT-53	Permanently deleted renewal (bulk): Interlace India Private Limited - GWS	\N	2026-06-30 18:11:37.185818
806	3	permanent_delete	renewal	RMT-52	Permanently deleted renewal (bulk): Discover Tech - GWS	\N	2026-06-30 18:11:37.185818
807	3	permanent_delete	renewal	RMT-210	Permanently deleted renewal (bulk): SCM Cube Technologies Private LImited - SSL	\N	2026-06-30 18:11:37.185818
808	3	permanent_delete	renewal	RMT-95	Permanently deleted renewal (bulk): Sri Balaji Castings Pvt Ltd - GWS	\N	2026-06-30 18:11:37.185818
809	3	permanent_delete	renewal	RMT-96	Permanently deleted renewal (bulk): Sri Balaji Castings Pvt Ltd - GWS	\N	2026-06-30 18:11:37.185818
810	3	permanent_delete	renewal	RMT-55	Permanently deleted renewal (bulk): Sri Balaji Castings Pvt Ltd - GWS	\N	2026-06-30 18:11:37.185818
811	3	permanent_delete	renewal	RMT-54	Permanently deleted renewal (bulk): Sri Balaji Castings Pvt Ltd - GWS	\N	2026-06-30 18:11:37.185818
812	3	permanent_delete	renewal	RMT-56	Permanently deleted renewal (bulk): Olive Grapes - GWS	\N	2026-06-30 18:11:37.185818
813	3	permanent_delete	renewal	RMT-132	Permanently deleted renewal (bulk): TJ Financial Consultancy & Investments Private Limited - M365	\N	2026-06-30 18:11:37.185818
814	3	permanent_delete	renewal	RMT-85	Permanently deleted renewal (bulk): GB Power Projects Private Limited - GWS	\N	2026-06-30 18:11:37.185818
815	3	permanent_delete	renewal	RMT-86	Permanently deleted renewal (bulk): Enmas Andritz Private Limited - GWS	\N	2026-06-30 18:11:37.185818
816	3	permanent_delete	renewal	RMT-57	Permanently deleted renewal (bulk): DS Square Technologies - GWS	\N	2026-06-30 18:11:37.185818
817	3	permanent_delete	renewal	RMT-58	Permanently deleted renewal (bulk): Avigna Retail Private Limited - GWS	\N	2026-06-30 18:11:37.185818
818	3	permanent_delete	renewal	RMT-166	Permanently deleted renewal (bulk): Ziffity Solutions Private Limited - M365	\N	2026-06-30 18:11:37.185818
819	3	permanent_delete	renewal	RMT-59	Permanently deleted renewal (bulk): Shriram Properties Limited - GWS	\N	2026-06-30 18:11:37.185818
820	3	permanent_delete	renewal	RMT-172	Permanently deleted renewal (bulk): Swelect Energy Systems Limited-U35 - Salem - MSP	\N	2026-06-30 18:11:37.185818
821	3	permanent_delete	renewal	RMT-102	Permanently deleted renewal (bulk): Dignity Innovations - M365	\N	2026-06-30 18:11:37.185818
822	3	permanent_delete	renewal	RMT-271	Permanently deleted renewal (bulk): Kun Motor Cycles Pvt Ltd - Tally	\N	2026-06-30 18:11:37.185818
823	3	permanent_delete	renewal	RMT-282	Permanently deleted renewal (bulk): Lawrencedale Agro Processing India Private Limited - Tally	\N	2026-06-30 18:11:37.185818
824	3	permanent_delete	renewal	RMT-260	Permanently deleted renewal (bulk): Kun Capital Automotive Pvt Ltd - Tally	\N	2026-06-30 18:11:37.185818
825	3	permanent_delete	renewal	RMT-45	Permanently deleted renewal (bulk): Discover Tech - GWS	\N	2026-06-30 18:11:37.185818
826	3	permanent_delete	renewal	RMT-173	Permanently deleted renewal (bulk): Paloma Turning Co Pvt Ltd - MSP	\N	2026-06-30 18:11:37.185818
827	3	permanent_delete	renewal	RMT-257	Permanently deleted renewal (bulk): Aadit Auto Company Pvt Ltd - Tally	\N	2026-06-30 18:11:37.185818
828	3	permanent_delete	renewal	RMT-300	Permanently deleted renewal (bulk): Lawrencedale Agro Processing India Private Limited - Tally	\N	2026-06-30 18:11:37.185818
829	3	permanent_delete	renewal	RMT-256	Permanently deleted renewal (bulk): Schangalaya Motors - Tally	\N	2026-06-30 18:11:37.185818
830	3	permanent_delete	renewal	RMT-272	Permanently deleted renewal (bulk): Schakralaya Motors Unit of GRK Theatres Pvt Ltd - Tally	\N	2026-06-30 18:11:37.185818
831	3	permanent_delete	renewal	RMT-211	Permanently deleted renewal (bulk): Olive Grapes - SSL	\N	2026-06-30 18:11:37.185818
832	3	permanent_delete	renewal	RMT-117	Permanently deleted renewal (bulk): Solution Experts - 3Echo Systems - M365	\N	2026-06-30 18:11:37.185818
833	3	permanent_delete	renewal	RMT-61	Permanently deleted renewal (bulk): Olive Grapes - GWS	\N	2026-06-30 18:11:37.185818
834	3	permanent_delete	renewal	RMT-60	Permanently deleted renewal (bulk): Olive Grapes - GWS	\N	2026-06-30 18:11:37.185818
835	3	permanent_delete	renewal	RMT-212	Permanently deleted renewal (bulk): Sri Balaji Castings Pvt Ltd - SSL	\N	2026-06-30 18:11:37.185818
836	3	permanent_delete	renewal	RMT-159	Permanently deleted renewal (bulk): Translink Logistics Pvt Ltd (Chennai) - M365	\N	2026-06-30 18:11:37.185818
837	3	permanent_delete	renewal	RMT-118	Permanently deleted renewal (bulk): Translink Logistics Pvt Ltd (Chennai) - M365	\N	2026-06-30 18:11:37.185818
838	3	permanent_delete	renewal	RMT-62	Permanently deleted renewal (bulk): G S H A & Co - GWS	\N	2026-06-30 18:11:37.185818
839	3	permanent_delete	renewal	RMT-46	Permanently deleted renewal (bulk): DS Square Technologies - GWS	\N	2026-06-30 18:11:37.185818
840	3	permanent_delete	renewal	RMT-21	Permanently deleted renewal (bulk): Sri Balaji Castings Pvt Ltd - Domain	\N	2026-06-30 18:11:37.185818
841	3	permanent_delete	renewal	RMT-131	Permanently deleted renewal (bulk): Glovis India Anantapur Pvt Ltd - M365	\N	2026-06-30 18:11:37.185818
842	3	permanent_delete	renewal	RMT-254	Permanently deleted renewal (bulk): Blix Toys - Tally	\N	2026-06-30 18:11:37.185818
843	3	permanent_delete	renewal	RMT-292	Permanently deleted renewal (bulk): Zest Intertrade LLP - Tally	\N	2026-06-30 18:11:37.185818
844	3	permanent_delete	renewal	RMT-16	Permanently deleted renewal (bulk): Paloma Turning Co Pvt Ltd - Backup solution	\N	2026-06-30 18:11:37.185818
845	3	permanent_delete	renewal	RMT-293	Permanently deleted renewal (bulk): Agro Spice India Pvt Ltd - Tally	\N	2026-06-30 18:11:37.185818
846	3	permanent_delete	renewal	RMT-15	Permanently deleted renewal (bulk): Paloma Turning Co Pvt Ltd - Backup solution	\N	2026-06-30 18:11:37.185818
847	3	permanent_delete	renewal	RMT-291	Permanently deleted renewal (bulk): GT Jayanti Agrochem India Private Limited - Tally	\N	2026-06-30 18:11:37.185818
848	3	permanent_delete	renewal	RMT-255	Permanently deleted renewal (bulk): GT Jayanti Agrochem India Private Limited - Tally	\N	2026-06-30 18:11:37.185818
849	3	permanent_delete	renewal	RMT-294	Permanently deleted renewal (bulk): Radhe Shyam Agro Overseas - Tally	\N	2026-06-30 18:11:37.185818
850	3	permanent_delete	renewal	RMT-139	Permanently deleted renewal (bulk): NLS Associates - M365	\N	2026-06-30 18:11:37.185818
851	3	permanent_delete	renewal	RMT-10	Permanently deleted renewal (bulk): Swelect Energy Systems Limited-U35 - Salem - Backup solution	\N	2026-06-30 18:11:37.185818
852	3	permanent_delete	renewal	RMT-101	Permanently deleted renewal (bulk): Vallhabha Milk Products Private Limited - LSH	\N	2026-06-30 18:11:37.185818
853	3	permanent_delete	renewal	RMT-242	Permanently deleted renewal (bulk): T A M and Associates LLP - Tally	\N	2026-06-30 18:11:37.185818
854	3	permanent_delete	renewal	RMT-175	Permanently deleted renewal (bulk): Thanga Prathap - MSP	\N	2026-06-30 18:11:37.185818
855	3	permanent_delete	renewal	RMT-04	Permanently deleted renewal (bulk): Thanga Prathap - AWS	\N	2026-06-30 18:11:37.185818
856	3	permanent_delete	renewal	RMT-63	Permanently deleted renewal (bulk): Vijaya Scientific Company - GWS	\N	2026-06-30 18:11:37.185818
857	3	permanent_delete	renewal	RMT-196	Permanently deleted renewal (bulk): Paloma Turning Co Pvt Ltd - Seqrite	\N	2026-06-30 18:11:37.185818
858	3	permanent_delete	renewal	RMT-65	Permanently deleted renewal (bulk): Vallhabha Milk Products Private Limited - GWS	\N	2026-06-30 18:11:37.185818
859	3	permanent_delete	renewal	RMT-241	Permanently deleted renewal (bulk): Saa Healthcare Pvt Ltd - Tally	\N	2026-06-30 18:11:37.185818
860	3	permanent_delete	renewal	RMT-98	Permanently deleted renewal (bulk): Vallhabha Milk Products Private Limited - GWS	\N	2026-06-30 18:11:37.185818
861	3	permanent_delete	renewal	RMT-105	Permanently deleted renewal (bulk): Dr. JRKs Research and Pharmaceuticals Private Limited - M365	\N	2026-06-30 18:11:37.185818
862	3	permanent_delete	renewal	RMT-97	Permanently deleted renewal (bulk): The HPPL - GWS	\N	2026-06-30 18:11:37.185818
863	3	permanent_delete	renewal	RMT-64	Permanently deleted renewal (bulk): The HPPL - GWS	\N	2026-06-30 18:11:37.185818
864	3	permanent_delete	renewal	RMT-12	Permanently deleted renewal (bulk): Swelect Energy Systems Limited-U35 Coimbatore - Backup solution	\N	2026-06-30 18:11:37.185818
865	3	permanent_delete	renewal	RMT-309	Permanently deleted renewal (bulk): Kothari Brothers Tech Pvt Ltd - Zoho	\N	2026-06-30 18:11:37.185818
866	3	permanent_delete	renewal	RMT-313	Permanently deleted renewal (bulk): Kothari Brothers Tech Pvt Ltd - Zoho	\N	2026-06-30 18:11:37.185818
867	3	permanent_delete	renewal	RMT-314	Permanently deleted renewal (bulk): Kothari Brothers Tech Pvt Ltd - Zoho	\N	2026-06-30 18:11:37.185818
868	3	permanent_delete	renewal	RMT-66	Permanently deleted renewal (bulk): Spinebiz Services Private Limited - GWS	\N	2026-06-30 18:11:37.185818
869	3	permanent_delete	renewal	RMT-258	Permanently deleted renewal (bulk): JMR Apparels - Tally	\N	2026-06-30 18:11:37.185818
870	3	permanent_delete	renewal	RMT-259	Permanently deleted renewal (bulk): Good to Go Foodworks Private Limited - Tally	\N	2026-06-30 18:11:37.185818
871	3	permanent_delete	renewal	RMT-119	Permanently deleted renewal (bulk): CONNECTFIRST TECHNOLOGIES PRIVATE LIMITED - M365	\N	2026-06-30 18:11:37.185818
872	3	permanent_delete	renewal	RMT-22	Permanently deleted renewal (bulk): Sri Balaji Engineers - Domain	\N	2026-06-30 18:11:37.185818
873	3	permanent_delete	renewal	RMT-68	Permanently deleted renewal (bulk): Sri Balaji Engineers - GWS	\N	2026-06-30 18:11:37.185818
874	3	permanent_delete	renewal	RMT-67	Permanently deleted renewal (bulk): Farmfolks Agro Pvt Ltd - GWS	\N	2026-06-30 18:11:37.185818
875	3	permanent_delete	renewal	RMT-197	Permanently deleted renewal (bulk): Sivaramakrishna Forgings Private Limited - Seqrite	\N	2026-06-30 18:11:37.185818
876	3	permanent_delete	renewal	RMT-149	Permanently deleted renewal (bulk): Proodle Hospitality Services - M365	\N	2026-06-30 18:11:37.185818
877	3	permanent_delete	renewal	RMT-213	Permanently deleted renewal (bulk): Cameo Corporate Services Limited - SSL	\N	2026-06-30 18:11:37.185818
878	3	permanent_delete	renewal	RMT-69	Permanently deleted renewal (bulk): Home Screen Entertainment FZE - GWS	\N	2026-06-30 18:11:37.185818
879	3	permanent_delete	renewal	RMT-99	Permanently deleted renewal (bulk): Home Screen Entertainment FZE - GWS	\N	2026-06-30 18:11:37.185818
880	3	permanent_delete	renewal	RMT-214	Permanently deleted renewal (bulk): Aadiyar Infotech Private Limited - SSL	\N	2026-06-30 18:11:37.185818
881	3	permanent_delete	renewal	RMT-216	Permanently deleted renewal (bulk): Triway Forwarders Private Limited - SSL	\N	2026-06-30 18:11:37.185818
882	3	permanent_delete	renewal	RMT-23	Permanently deleted renewal (bulk): Shanke Enterprise Private Limited - Domain	\N	2026-06-30 18:11:37.185818
883	3	permanent_delete	renewal	RMT-120	Permanently deleted renewal (bulk): Shanke Enterprise Private Limited - M365	\N	2026-06-30 18:11:37.185818
884	3	permanent_delete	renewal	RMT-160	Permanently deleted renewal (bulk): Shanke Enterprise Private Limited - M365	\N	2026-06-30 18:11:37.185818
885	3	permanent_delete	renewal	RMT-215	Permanently deleted renewal (bulk): Winsar Infosoft Private Limited - SSL	\N	2026-06-30 18:11:37.185818
886	3	permanent_delete	renewal	RMT-121	Permanently deleted renewal (bulk): Hangkraft - M365	\N	2026-06-30 18:11:37.185818
887	3	permanent_delete	renewal	RMT-106	Permanently deleted renewal (bulk): Brand Idea Consultancy Private Limited - M365	\N	2026-06-30 18:11:37.185818
888	3	permanent_delete	renewal	RMT-107	Permanently deleted renewal (bulk): Brand Idea Consultancy Private Limited - M365	\N	2026-06-30 18:11:37.185818
889	3	permanent_delete	renewal	RMT-103	Permanently deleted renewal (bulk): Mithtran Global Technology LLP - M365	\N	2026-06-30 18:11:37.185818
890	3	permanent_delete	renewal	RMT-198	Permanently deleted renewal (bulk): 5GX Global Fintech Seqrite+DLP - Seqrite	\N	2026-06-30 18:11:37.185818
891	3	permanent_delete	renewal	RMT-262	Permanently deleted renewal (bulk): Glovis India Anantapur Pvt Ltd - Tally	\N	2026-06-30 18:11:37.185818
892	3	permanent_delete	renewal	RMT-266	Permanently deleted renewal (bulk): Professional Impex Pvt Ltd (Delhi) - Tally	\N	2026-06-30 18:11:37.185818
893	3	permanent_delete	renewal	RMT-295	Permanently deleted renewal (bulk): Professional Impex Pvt Ltd (Delhi) - Tally	\N	2026-06-30 18:11:37.185818
894	3	permanent_delete	renewal	RMT-296	Permanently deleted renewal (bulk): MPL Light Vehicles Private Ltd - Tally	\N	2026-06-30 18:11:37.185818
895	3	permanent_delete	renewal	RMT-286	Permanently deleted renewal (bulk): Intek Engineers - Ref Ramesh Consulatant - Tally	\N	2026-06-30 18:11:37.185818
896	3	permanent_delete	renewal	RMT-263	Permanently deleted renewal (bulk): Intek Engineers - Ref Ramesh Consulatant - Tally	\N	2026-06-30 18:11:37.185818
897	3	permanent_delete	renewal	RMT-176	Permanently deleted renewal (bulk): GT Jayanti Agrochem India Private Limited - MSP	\N	2026-06-30 18:11:37.185818
898	3	permanent_delete	renewal	RMT-261	Permanently deleted renewal (bulk): Vijaya Scientific Company - Tally	\N	2026-06-30 18:11:37.185818
899	3	permanent_delete	renewal	RMT-24	Permanently deleted renewal (bulk): Sri Balaji Castings Pvt Ltd - Domain	\N	2026-06-30 18:11:37.185818
900	3	permanent_delete	renewal	RMT-140	Permanently deleted renewal (bulk): FST Information Technology Private limites - M365	\N	2026-06-30 18:11:37.185818
901	3	permanent_delete	renewal	RMT-199	Permanently deleted renewal (bulk): AONE Outsourcing Solutions Private Limited - Chennai - Seqrite	\N	2026-06-30 18:11:37.185818
902	3	permanent_delete	renewal	RMT-200	Permanently deleted renewal (bulk): Sreshta Sumanth Builders Private Limited - Seqrite	\N	2026-06-30 18:11:37.185818
903	3	permanent_delete	renewal	RMT-133	Permanently deleted renewal (bulk): SIDCORPTECH - M365	\N	2026-06-30 18:11:37.185818
904	3	permanent_delete	renewal	RMT-217	Permanently deleted renewal (bulk): Aadiyar Infotech Private Limited - SSL	\N	2026-06-30 18:11:37.185818
905	3	permanent_delete	renewal	RMT-122	Permanently deleted renewal (bulk): Direction West Sourcing - M365	\N	2026-06-30 18:11:37.185818
906	3	permanent_delete	renewal	RMT-70	Permanently deleted renewal (bulk): Solution Experts - GWS	\N	2026-06-30 18:11:37.185818
907	3	permanent_delete	renewal	RMT-218	Permanently deleted renewal (bulk): Aadiyar Infotech Private Limited - SSL	\N	2026-06-30 18:11:37.185818
908	3	permanent_delete	renewal	RMT-187	Permanently deleted renewal (bulk): Cherubim Security Force LLP(MAAYAA SECURITY FORCE LLP) - Tally	\N	2026-06-30 18:11:37.185818
909	3	permanent_delete	renewal	RMT-264	Permanently deleted renewal (bulk): Professional Impex Pvt Ltd (Chennai) - Tally	\N	2026-06-30 18:11:37.185818
910	3	permanent_delete	renewal	RMT-188	Permanently deleted renewal (bulk): Time Rich Shipping Private Ltd - Tally	\N	2026-06-30 18:11:37.185818
911	3	permanent_delete	renewal	RMT-297	Permanently deleted renewal (bulk): Good to Go Foodworks Private Limited - Tally	\N	2026-06-30 18:11:37.185818
912	3	permanent_delete	renewal	RMT-265	Permanently deleted renewal (bulk): Ritz Trade Links Private Limited - Tally	\N	2026-06-30 18:11:37.185818
913	3	permanent_delete	renewal	RMT-124	Permanently deleted renewal (bulk): JD Software Private Limited - M365	\N	2026-06-30 18:11:37.185818
914	3	permanent_delete	renewal	RMT-244	Permanently deleted renewal (bulk): JMR Apparels - Tally	\N	2026-06-30 18:11:37.185818
915	3	permanent_delete	renewal	RMT-123	Permanently deleted renewal (bulk): JMR Apparels - M365	\N	2026-06-30 18:11:37.185818
916	3	permanent_delete	renewal	RMT-243	Permanently deleted renewal (bulk): Vijaya Scientific Company - Tally	\N	2026-06-30 18:11:37.185818
917	3	permanent_delete	renewal	RMT-26	Permanently deleted renewal (bulk): J S Tours and Travels - Domain	\N	2026-06-30 18:11:37.185818
918	3	permanent_delete	renewal	RMT-25	Permanently deleted renewal (bulk): J S Tours and Travels - Domain	\N	2026-06-30 18:11:37.185818
919	3	permanent_delete	renewal	RMT-219	Permanently deleted renewal (bulk): Aadiyar Infotech Private Limited - SSL	\N	2026-06-30 18:11:37.185818
920	3	permanent_delete	renewal	RMT-252	Permanently deleted renewal (bulk): Merusri Developers - Tally	\N	2026-06-30 18:11:37.185818
921	3	permanent_delete	renewal	RMT-71	Permanently deleted renewal (bulk): Olive Grapes - GWS	\N	2026-06-30 18:11:37.185818
922	3	permanent_delete	renewal	RMT-27	Permanently deleted renewal (bulk): NLS Associates - Domain	\N	2026-06-30 18:11:37.185818
923	3	permanent_delete	renewal	RMT-247	Permanently deleted renewal (bulk): Radhe Shyam Agro Overseas - Tally	\N	2026-06-30 18:11:37.185818
924	3	permanent_delete	renewal	RMT-72	Permanently deleted renewal (bulk): J S Tours and Travels - GWS	\N	2026-06-30 18:11:37.185818
925	3	permanent_delete	renewal	RMT-249	Permanently deleted renewal (bulk): Agro Spice India Pvt Ltd - Tally	\N	2026-06-30 18:11:37.185818
926	3	permanent_delete	renewal	RMT-246	Permanently deleted renewal (bulk): Zest Intertrade LLP - Tally	\N	2026-06-30 18:11:37.185818
927	3	permanent_delete	renewal	RMT-248	Permanently deleted renewal (bulk): Unique Natural Products Pvt Ltd - Tally	\N	2026-06-30 18:11:37.185818
928	3	permanent_delete	renewal	RMT-245	Permanently deleted renewal (bulk): GT Jayanti Agrochem India Private Limited - Tally	\N	2026-06-30 18:11:37.185818
929	3	permanent_delete	renewal	RMT-73	Permanently deleted renewal (bulk): Jai Balaji Fabricators - GWS	\N	2026-06-30 18:11:37.185818
930	3	permanent_delete	renewal	RMT-94	Permanently deleted renewal (bulk): Jai Balaji Fabricators - GWS	\N	2026-06-30 18:11:37.185818
931	3	permanent_delete	renewal	RMT-37	Permanently deleted renewal (bulk): Sivaramakrishna Forgings Private Limited - Firewall	\N	2026-06-30 18:11:37.185818
932	3	permanent_delete	renewal	RMT-38	Permanently deleted renewal (bulk): Sivaramakrishna Forgings Private Limited - Firewall	\N	2026-06-30 18:11:37.185818
933	3	permanent_delete	renewal	RMT-39	Permanently deleted renewal (bulk): Sivaramakrishna Forgings Private Limited - Firewall	\N	2026-06-30 18:11:37.185818
934	3	permanent_delete	renewal	RMT-205	Permanently deleted renewal (bulk): ALHIND TRAVEL PORTAL LLP - Seqrite	\N	2026-06-30 18:11:37.185818
935	3	permanent_delete	renewal	RMT-28	Permanently deleted renewal (bulk): Solution Experts - Domain	\N	2026-06-30 18:11:37.185818
936	3	permanent_delete	renewal	RMT-201	Permanently deleted renewal (bulk): Aadiyar Infotech Private Limited - Seqrite	\N	2026-06-30 18:11:37.185818
937	3	permanent_delete	renewal	RMT-34	Permanently deleted renewal (bulk): Talodyn Networks Private Limited - Firewall	\N	2026-06-30 18:11:37.185818
938	3	permanent_delete	renewal	RMT-164	Permanently deleted renewal (bulk): THE IT MAN PRIVATE LIMITED - M365	\N	2026-06-30 18:11:37.185818
939	3	permanent_delete	renewal	RMT-125	Permanently deleted renewal (bulk): A Saffeway Systems and Equipments - M365	\N	2026-06-30 18:11:37.185818
940	3	permanent_delete	renewal	RMT-74	Permanently deleted renewal (bulk): DS Square Technologies - GWS	\N	2026-06-30 18:11:37.185818
941	3	permanent_delete	renewal	RMT-75	Permanently deleted renewal (bulk): JMR Apparels - GWS	\N	2026-06-30 18:11:37.185818
942	3	permanent_delete	renewal	RMT-233	Permanently deleted renewal (bulk): The HPPL - Digital Signature	\N	2026-06-30 18:11:37.185818
943	3	permanent_delete	renewal	RMT-268	Permanently deleted renewal (bulk): PG Impex - Tally	\N	2026-06-30 18:11:37.185818
944	3	permanent_delete	renewal	RMT-267	Permanently deleted renewal (bulk): The HPPL - Tally	\N	2026-06-30 18:11:37.185818
945	3	permanent_delete	renewal	RMT-284	Permanently deleted renewal (bulk): VPN Agencies - Tally	\N	2026-06-30 18:11:37.185818
946	3	permanent_delete	renewal	RMT-02	Permanently deleted renewal (bulk): GBSV & CO - Tally	\N	2026-06-30 18:11:37.185818
947	3	permanent_delete	renewal	RMT-290	Permanently deleted renewal (bulk): K2 Cranes & Components Pvt Ltd - Tally	\N	2026-06-30 18:11:37.185818
948	3	permanent_delete	renewal	RMT-270	Permanently deleted renewal (bulk): K2 Cranes & Components Pvt Ltd - Tally	\N	2026-06-30 18:11:37.185818
949	3	permanent_delete	renewal	RMT-303	Permanently deleted renewal (bulk): Dhan Hind Utility Pvt Ltd - IPsec VPN	\N	2026-06-30 18:11:37.185818
950	3	permanent_delete	renewal	RMT-206	Permanently deleted renewal (bulk): GT Jayanti Agrochem India Private Limited - Seqrite	\N	2026-06-30 18:11:37.185818
951	3	permanent_delete	renewal	RMT-250	Permanently deleted renewal (bulk): PG Impex - Tally	\N	2026-06-30 18:11:37.185818
952	3	permanent_delete	renewal	RMT-310	Permanently deleted renewal (bulk): AI Enterprise - Zoho	\N	2026-06-30 18:11:37.185818
953	3	permanent_delete	renewal	RMT-181	Permanently deleted renewal (bulk): AI Enterprise - MSP	\N	2026-06-30 18:11:37.185818
954	3	permanent_delete	renewal	RMT-33	Permanently deleted renewal (bulk): AI Enterprise - M365	\N	2026-06-30 18:11:37.185818
955	3	permanent_delete	renewal	RMT-315	Permanently deleted renewal (bulk): AI Enterprise - Zoho	\N	2026-06-30 18:11:37.185818
956	3	permanent_delete	renewal	RMT-180	Permanently deleted renewal (bulk): AI Cars ( Unit of AI Enterprises ) - MSP	\N	2026-06-30 18:11:37.185818
957	3	permanent_delete	renewal	RMT-307	Permanently deleted renewal (bulk): AI Cars ( Unit of AI Enterprises ) - Zoho	\N	2026-06-30 18:11:37.185818
958	3	permanent_delete	renewal	RMT-308	Permanently deleted renewal (bulk): AI Cars ( Unit of AI Enterprises ) - Zoho	\N	2026-06-30 18:11:37.185818
959	3	permanent_delete	renewal	RMT-126	Permanently deleted renewal (bulk): TJ Financial Consultancy & Investments Private Limited - M365	\N	2026-06-30 18:11:37.185818
960	3	permanent_delete	renewal	RMT-03	Permanently deleted renewal (bulk): Venkat & Co - Tally	\N	2026-06-30 18:11:37.185818
961	3	permanent_delete	renewal	RMT-269	Permanently deleted renewal (bulk): Pongalur Pioneer Textiles Private Limited - Tally	\N	2026-06-30 18:11:37.185818
962	3	permanent_delete	renewal	RMT-288	Permanently deleted renewal (bulk): Tekfab Engineers - Tally	\N	2026-06-30 18:11:37.185818
963	3	permanent_delete	renewal	RMT-174	Permanently deleted renewal (bulk): Paloma Turning Co Pvt Ltd - MSP	\N	2026-06-30 18:11:37.185818
964	3	permanent_delete	renewal	RMT-05	Permanently deleted renewal (bulk): Bharatiya Janata Party - AWS	\N	2026-06-30 18:11:37.185818
965	3	permanent_delete	renewal	RMT-301	Permanently deleted renewal (bulk): SITWANTO DEVI MAHILA KALYAN SANSTHAN - Tally	\N	2026-06-30 18:11:37.185818
966	3	permanent_delete	renewal	RMT-06	Permanently deleted renewal (bulk): GB Power Projects Private Limited - AWS	\N	2026-06-30 18:11:37.185818
967	3	permanent_delete	renewal	RMT-113	Permanently deleted renewal (bulk): AGARAM TECHNOLOGIES - M365	\N	2026-06-30 18:11:37.185818
968	3	permanent_delete	renewal	RMT-156	Permanently deleted renewal (bulk): AGARAM TECHNOLOGIES - M365	\N	2026-06-30 18:11:37.185818
969	3	permanent_delete	renewal	RMT-151	Permanently deleted renewal (bulk): Superops Technologies - M365	\N	2026-06-30 18:11:37.185818
970	3	permanent_delete	renewal	RMT-208	Permanently deleted renewal (bulk): Ravindra Stores - SSL	\N	2026-06-30 18:11:37.185818
971	3	permanent_delete	renewal	RMT-49	Permanently deleted renewal (bulk): Vijay Logistics - GWS	\N	2026-06-30 18:11:37.185818
972	3	permanent_delete	renewal	RMT-194	Permanently deleted renewal (bulk): Winsar Infosoft Private Limited - Seqrite	\N	2026-06-30 18:11:37.185818
973	3	permanent_delete	renewal	RMT-240	Permanently deleted renewal (bulk): Sree Vardhaman Autoparts - Tally	\N	2026-06-30 18:11:37.185818
974	3	permanent_delete	renewal	RMT-238	Permanently deleted renewal (bulk): Mahavir Motors - Tally	\N	2026-06-30 18:11:37.185818
975	3	permanent_delete	renewal	RMT-239	Permanently deleted renewal (bulk): Mahavir Distributor - Tally	\N	2026-06-30 18:11:37.185818
976	3	permanent_delete	renewal	RMT-236	Permanently deleted renewal (bulk): Mahavir Automobiles - Tally	\N	2026-06-30 18:11:37.185818
977	3	permanent_delete	renewal	RMT-235	Permanently deleted renewal (bulk): Auto Impex - Tally	\N	2026-06-30 18:11:37.185818
978	3	permanent_delete	renewal	RMT-11	Permanently deleted renewal (bulk): Swelect Energy Systems Limited - Chennai - Backup solution	\N	2026-06-30 18:11:37.185818
979	3	permanent_delete	renewal	RMT-209	Permanently deleted renewal (bulk): SCM Cube Technologies Private LImited - SSL	\N	2026-06-30 18:11:37.185818
980	3	permanent_delete	renewal	RMT-114	Permanently deleted renewal (bulk): DNO Technologies Private Limited - M365	\N	2026-06-30 18:11:37.185818
981	3	permanent_delete	renewal	RMT-157	Permanently deleted renewal (bulk): DNO Technologies Private Limited - M365	\N	2026-06-30 18:11:37.185818
982	3	permanent_delete	renewal	RMT-278	Permanently deleted renewal (bulk): Reeshav Automobiles Private Ltd - Tally	\N	2026-06-30 18:11:37.185818
983	3	permanent_delete	renewal	RMT-287	Permanently deleted renewal (bulk): Tekfab Engineers - Tally	\N	2026-06-30 18:11:37.185818
984	3	permanent_delete	renewal	RMT-07	Permanently deleted renewal (bulk): Enmas Andritz Private Limited - AWS	\N	2026-06-30 18:11:37.185818
985	3	permanent_delete	renewal	RMT-177	Permanently deleted renewal (bulk): Proodle Hospitality Services - MSP	\N	2026-06-30 18:11:37.185818
986	3	permanent_delete	renewal	RMT-231	Permanently deleted renewal (bulk): Proodle Hospitality Services - Backup solution	\N	2026-06-30 18:11:37.185818
987	3	permanent_delete	renewal	RMT-18	Permanently deleted renewal (bulk): Sivaramakrishna Forgings Private Limited - Backup solution	\N	2026-06-30 18:11:37.185818
988	3	permanent_delete	renewal	RMT-93	Permanently deleted renewal (bulk): Fox Dean Estates Pvt Ltd - GWS	\N	2026-06-30 18:11:37.185818
989	3	permanent_delete	renewal	RMT-77	Permanently deleted renewal (bulk): Surya Pelle Chemical & Mould Private Limited - GWS	\N	2026-06-30 18:11:37.185818
990	3	permanent_delete	renewal	RMT-78	Permanently deleted renewal (bulk): SUN BLUES - GWS	\N	2026-06-30 18:11:37.185818
991	3	permanent_delete	renewal	RMT-134	Permanently deleted renewal (bulk): Solution Experts - M365	\N	2026-06-30 18:11:37.185818
992	3	permanent_delete	renewal	RMT-202	Permanently deleted renewal (bulk): Witzone Technologies Pvt Ltd - Seqrite	\N	2026-06-30 18:11:37.185818
993	3	permanent_delete	renewal	RMT-183	Permanently deleted renewal (bulk): Ravindra Stores - MSP	\N	2026-06-30 18:11:37.185818
994	3	permanent_delete	renewal	RMT-127	Permanently deleted renewal (bulk): Synergent Tech Solutions Private Ltd - M365	\N	2026-06-30 18:11:37.185818
995	3	permanent_delete	renewal	RMT-108	Permanently deleted renewal (bulk): Sasva Luxury LLP - M365	\N	2026-06-30 18:11:37.185818
996	3	permanent_delete	renewal	RMT-179	Permanently deleted renewal (bulk): Sreshta Sumanth Builders Private Limited - MSP	\N	2026-06-30 18:11:37.185818
997	3	permanent_delete	renewal	RMT-17	Permanently deleted renewal (bulk): Sreshta Sumanth Builders Private Limited - Backup solution	\N	2026-06-30 18:11:37.185818
998	3	permanent_delete	renewal	RMT-129	Permanently deleted renewal (bulk): Winsar Infosoft Private Limited - M365	\N	2026-06-30 18:11:37.185818
999	3	permanent_delete	renewal	RMT-161	Permanently deleted renewal (bulk): Winsar Infosoft Private Limited - M365	\N	2026-06-30 18:11:37.185818
1000	3	permanent_delete	renewal	RMT-104	Permanently deleted renewal (bulk): Digital XC Inc - M365	\N	2026-06-30 18:11:37.185818
1001	3	permanent_delete	renewal	RMT-298	Permanently deleted renewal (bulk): Reeshav Automobiles Private Ltd - Tally	\N	2026-06-30 18:11:37.185818
1002	3	permanent_delete	renewal	RMT-79	Permanently deleted renewal (bulk): Lawrencedale Agro Processing India Private Limited - GWS	\N	2026-06-30 18:11:37.185818
1003	3	permanent_delete	renewal	RMT-80	Permanently deleted renewal (bulk): Aggrow Farmers Development Organisation - GWS	\N	2026-06-30 18:11:37.185818
1004	3	permanent_delete	renewal	RMT-273	Permanently deleted renewal (bulk): Supreme Plastic Traders - Tally	\N	2026-06-30 18:11:37.185818
1005	3	permanent_delete	renewal	RMT-274	Permanently deleted renewal (bulk): Discover Tech - Tooltech - Tally	\N	2026-06-30 18:11:37.185818
1006	3	permanent_delete	renewal	RMT-81	Permanently deleted renewal (bulk): SCM Cube Technologies Private LImited - GWS	\N	2026-06-30 18:11:37.185818
1007	3	permanent_delete	renewal	RMT-221	Permanently deleted renewal (bulk): Aadiyar Infotech Private Limited - SSL	\N	2026-06-30 18:11:37.185818
1008	3	permanent_delete	renewal	RMT-142	Permanently deleted renewal (bulk): HEAT CONTROL TECHNOLOGIES - M365	\N	2026-06-30 18:11:37.185818
1009	3	permanent_delete	renewal	RMT-36	Permanently deleted renewal (bulk): NX Logistics India Pvt. Ltd(Gurugram) - Firewall	\N	2026-06-30 18:11:37.185818
1010	3	permanent_delete	renewal	RMT-184	Permanently deleted renewal (bulk): NX Logistics India Pvt. Ltd(Gurugram) - MSP	\N	2026-06-30 18:11:37.185818
1011	3	permanent_delete	renewal	RMT-312	Permanently deleted renewal (bulk): DS Square Technologies - Zoho	\N	2026-06-30 18:11:37.185818
1012	3	permanent_delete	renewal	RMT-82	Permanently deleted renewal (bulk): M R Greentech - GWS	\N	2026-06-30 18:11:37.185818
1013	3	permanent_delete	renewal	RMT-128	Permanently deleted renewal (bulk): Ziffity Solutions Private Limited - M365	\N	2026-06-30 18:11:37.185818
1014	3	permanent_delete	renewal	RMT-152	Permanently deleted renewal (bulk): Ziffity Solutions Private Limited - M365	\N	2026-06-30 18:11:37.185818
1015	3	permanent_delete	renewal	RMT-222	Permanently deleted renewal (bulk): MindGenix Private Ltd - SSL	\N	2026-06-30 18:11:37.185818
1016	3	permanent_delete	renewal	RMT-203	Permanently deleted renewal (bulk): SIDCORPTECH - Win India - Seqrite	\N	2026-06-30 18:11:37.185818
1017	3	permanent_delete	renewal	RMT-32	Permanently deleted renewal (bulk): INTEGRATED SERVICE POINT LIMITED - M365	\N	2026-06-30 18:11:37.185818
1018	3	permanent_delete	renewal	RMT-136	Permanently deleted renewal (bulk): VGN Stafford Flat Owners Welfare Association - M365	\N	2026-06-30 18:11:37.185818
1019	3	permanent_delete	renewal	RMT-165	Permanently deleted renewal (bulk): Talodyn Networks Private Limited - M365	\N	2026-06-30 18:11:37.185818
1020	3	permanent_delete	renewal	RMT-147	Permanently deleted renewal (bulk): Talodyn Networks Private Limited - M365	\N	2026-06-30 18:11:37.185818
1021	3	permanent_delete	renewal	RMT-185	Permanently deleted renewal (bulk): Talodyn Networks Private Limited - MSP	\N	2026-06-30 18:11:37.185818
1022	3	permanent_delete	renewal	RMT-150	Permanently deleted renewal (bulk): Talodyn Networks Private Limited - M365	\N	2026-06-30 18:11:37.185818
1023	3	permanent_delete	renewal	RMT-143	Permanently deleted renewal (bulk): Talodyn Networks Private Limited - M365	\N	2026-06-30 18:11:37.185818
1024	3	permanent_delete	renewal	RMT-145	Permanently deleted renewal (bulk): Talodyn Networks Private Limited - M365	\N	2026-06-30 18:11:37.185818
1025	3	permanent_delete	renewal	RMT-146	Permanently deleted renewal (bulk): Talodyn Networks Private Limited - M365	\N	2026-06-30 18:11:37.185818
1026	3	permanent_delete	renewal	RMT-83	Permanently deleted renewal (bulk): MPL Light Vehicles Private Ltd - GWS	\N	2026-06-30 18:11:37.185818
1027	3	permanent_delete	renewal	RMT-100	Permanently deleted renewal (bulk): MPL Light Vehicles Private Ltd - GWS	\N	2026-06-30 18:11:37.185818
1028	3	permanent_delete	renewal	RMT-277	Permanently deleted renewal (bulk): Spellbee International Pvt Ltd - Tally	\N	2026-06-30 18:11:37.185818
1029	3	permanent_delete	renewal	RMT-275	Permanently deleted renewal (bulk): Goodluck Plastic Trading Company - Tally	\N	2026-06-30 18:11:37.185818
1030	3	permanent_delete	renewal	RMT-276	Permanently deleted renewal (bulk): Rahul Associates - Tally	\N	2026-06-30 18:11:37.185818
1031	3	permanent_delete	renewal	RMT-237	Permanently deleted renewal (bulk): Kothari Brothers Tech Pvt Ltd - Tally	\N	2026-06-30 18:11:37.185818
1032	3	permanent_delete	renewal	RMT-111	Permanently deleted renewal (bulk): Kerala Paper Products Limited - M365	\N	2026-06-30 18:11:37.185818
1033	3	permanent_delete	renewal	RMT-19	Permanently deleted renewal (bulk): S S GREEN ENVIRO METAL IMPEX - Domain	\N	2026-06-30 18:11:37.185818
1034	3	permanent_delete	renewal	RMT-47	Permanently deleted renewal (bulk): S S GREEN ENVIRO METAL IMPEX - GWS	\N	2026-06-30 18:11:37.185818
1035	3	permanent_delete	renewal	RMT-48	Permanently deleted renewal (bulk): Olive Grapes - GWS	\N	2026-06-30 18:11:37.185818
1036	3	permanent_delete	renewal	RMT-154	Permanently deleted renewal (bulk): Talodyn Networks Private Limited - M365	\N	2026-06-30 18:11:37.185818
1037	3	permanent_delete	renewal	RMT-168	Permanently deleted renewal (bulk): Sri Balaji Castings Pvt Ltd - MSP	\N	2026-06-30 18:11:37.185818
1038	3	permanent_delete	renewal	RMT-234	Permanently deleted renewal (bulk): Yennes Infotec (P) Limited - Tally	\N	2026-06-30 18:11:37.185818
1039	3	permanent_delete	renewal	RMT-289	Permanently deleted renewal (bulk): Proodle Hospitality Services - Tally	\N	2026-06-30 18:11:37.185818
1040	3	permanent_delete	renewal	RMT-279	Permanently deleted renewal (bulk): Vijaya Scientific Company - Tally	\N	2026-06-30 18:11:37.185818
1041	3	permanent_delete	renewal	RMT-281	Permanently deleted renewal (bulk): OMR Mall Developers Pvt Ltd - Tally	\N	2026-06-30 18:11:37.185818
1042	3	permanent_delete	renewal	RMT-280	Permanently deleted renewal (bulk): Talodyn Networks Private Limited - Tally	\N	2026-06-30 18:11:37.185818
1043	3	permanent_delete	renewal	RMT-220	Permanently deleted renewal (bulk): LEITEN TECHNOLOGIES PRIVATE LIMITED - SSL	\N	2026-06-30 18:11:37.185818
1044	3	permanent_delete	renewal	RMT-84	Permanently deleted renewal (bulk): Olive Grapes - GWS	\N	2026-06-30 18:11:37.185818
1045	3	permanent_delete	renewal	RMT-130	Permanently deleted renewal (bulk): Proodle Hospitality Services - M365	\N	2026-06-30 18:11:37.185818
1046	3	permanent_delete	renewal	RMT-162	Permanently deleted renewal (bulk): Proodle Hospitality Services - M365	\N	2026-06-30 18:11:37.185818
1047	3	permanent_delete	renewal	RMT-192	Permanently deleted renewal (bulk): Winsar Infosoft Private Limited - M365	\N	2026-06-30 18:11:37.185818
1048	3	permanent_delete	renewal	RMT-223	Permanently deleted renewal (bulk): Nethradhama Hospitals Pvt Ltd - SSL	\N	2026-06-30 18:11:37.185818
1049	3	permanent_delete	renewal	RMT-88	Permanently deleted renewal (bulk): Interlace India Private Limited - GWS	\N	2026-06-30 18:11:37.185818
1050	3	permanent_delete	renewal	RMT-225	Permanently deleted renewal (bulk): LEITEN TECHNOLOGIES PRIVATE LIMITED - SSL	\N	2026-06-30 18:11:37.185818
1051	3	permanent_delete	renewal	RMT-224	Permanently deleted renewal (bulk): LEITEN TECHNOLOGIES PRIVATE LIMITED - SSL	\N	2026-06-30 18:11:37.185818
1052	3	permanent_delete	renewal	RMT-193	Permanently deleted renewal (bulk): Paloma Turning Co Pvt Ltd - M365	\N	2026-06-30 18:11:37.185818
1053	3	permanent_delete	renewal	RMT-138	Permanently deleted renewal (bulk): SCM Cube Technologies Private LImited - M365	\N	2026-06-30 18:11:37.185818
1054	3	permanent_delete	renewal	RMT-31	Permanently deleted renewal (bulk): M R Greentech - Domain	\N	2026-06-30 18:11:37.185818
1055	3	permanent_delete	renewal	RMT-92	Permanently deleted renewal (bulk): Sterling Solid Tyres (P) Ltd - GWS	\N	2026-06-30 18:11:37.185818
1056	3	permanent_delete	renewal	RMT-141	Permanently deleted renewal (bulk): Witzone Technologies Pvt Ltd - M365	\N	2026-06-30 18:11:37.185818
1057	3	permanent_delete	renewal	RMT-207	Permanently deleted renewal (bulk): Dhan Hind Utility Pvt Ltd - Seqrite	\N	2026-06-30 18:11:37.185818
1058	3	permanent_delete	renewal	RMT-302	Permanently deleted renewal (bulk): Vijaya Scientific Company - Tally	\N	2026-06-30 18:11:37.185818
1059	3	permanent_delete	renewal	RMT-189	Permanently deleted renewal (bulk): Swasthik Agencies - Tally	\N	2026-06-30 18:11:37.185818
1060	3	permanent_delete	renewal	RMT-163	Permanently deleted renewal (bulk): INTEGRATED SERVICE POINT LIMITED - M365	\N	2026-06-30 18:11:37.185818
1061	3	permanent_delete	renewal	RMT-137	Permanently deleted renewal (bulk): INTEGRATED SERVICE POINT LIMITED - M365	\N	2026-06-30 18:11:37.185818
1062	3	permanent_delete	renewal	RMT-186	Permanently deleted renewal (bulk): INTEGRATED SERVICE POINT LIMITED - MSP	\N	2026-06-30 18:11:37.185818
1063	3	permanent_delete	renewal	RMT-190	Permanently deleted renewal (bulk): Aadiyar Infotech Private Limited - Plesk Web Admin Edition	\N	2026-06-30 18:11:37.185818
1064	3	permanent_delete	renewal	RMT-87	Permanently deleted renewal (bulk): Aadiyar Infotech Private Limited - GWS	\N	2026-06-30 18:11:37.185818
1065	3	permanent_delete	renewal	RMT-89	Permanently deleted renewal (bulk): Aadiyar Infotech Private Limited - GWS	\N	2026-06-30 18:11:37.185818
1066	3	permanent_delete	renewal	RMT-226	Permanently deleted renewal (bulk): Tamilnadu Tourism Development Corporation - SSL	\N	2026-06-30 18:11:37.185818
1067	3	permanent_delete	renewal	RMT-90	Permanently deleted renewal (bulk): Harshal Packaging - GWS	\N	2026-06-30 18:11:37.185818
1068	3	permanent_delete	renewal	RMT-251	Permanently deleted renewal (bulk): Spellbee International Pvt Ltd - Tally	\N	2026-06-30 18:11:37.185818
1069	3	permanent_delete	renewal	RMT-191	Permanently deleted renewal (bulk): Aadiyar Infotech Private Limited - Plesk Backup to Cloud Pro	\N	2026-06-30 18:11:37.185818
1070	3	permanent_delete	renewal	RMT-91	Permanently deleted renewal (bulk): Sumanth and Company - GWS	\N	2026-06-30 18:11:37.185818
1071	3	permanent_delete	renewal	RMT-30	Permanently deleted renewal (bulk): Sri Balaji Castings Pvt Ltd - Domain	\N	2026-06-30 18:11:37.185818
1072	3	permanent_delete	renewal	RMT-283	Permanently deleted renewal (bulk): MPL Light Vehicles Private Ltd - Tally	\N	2026-06-30 18:11:37.185818
1073	3	permanent_delete	renewal	RMT-311	Permanently deleted renewal (bulk): Dhan Hind Utility Pvt Ltd - Zoho	\N	2026-06-30 18:11:37.185818
1074	3	permanent_delete	renewal	RMT-285	Permanently deleted renewal (bulk): Kothari Brothers Tech Pvt Ltd - Tally	\N	2026-06-30 18:11:37.185818
1075	3	permanent_delete	renewal	RMT-76	Permanently deleted renewal (bulk): Home Screen Entertainment FZE - GWS	\N	2026-06-30 18:11:37.185818
1076	3	permanent_delete	renewal	RMT-204	Permanently deleted renewal (bulk): Sri Balaji Castings Pvt Ltd - Seqrite	\N	2026-06-30 18:11:37.185818
1077	3	permanent_delete	renewal	RMT-42	Permanently deleted renewal (bulk): Sri Balaji Castings Pvt Ltd - Firewall	\N	2026-06-30 18:11:37.185818
1078	3	permanent_delete	renewal	RMT-41	Permanently deleted renewal (bulk): Sri Balaji Castings Pvt Ltd - Firewall	\N	2026-06-30 18:11:37.185818
1079	3	permanent_delete	renewal	RMT-43	Permanently deleted renewal (bulk): Sri Balaji Castings Pvt Ltd - Firewall	\N	2026-06-30 18:11:37.185818
1080	3	permanent_delete	renewal	RMT-44	Permanently deleted renewal (bulk): Sri Balaji Castings Pvt Ltd - Firewall	\N	2026-06-30 18:11:37.185818
1081	3	permanent_delete	renewal	RMT-29	Permanently deleted renewal (bulk): Naahar Public School - Domain	\N	2026-06-30 18:11:37.185818
1082	3	permanent_delete	renewal	RMT-40	Permanently deleted renewal (bulk): Talodyn Networks Private Limited - Firewall	\N	2026-06-30 18:11:37.185818
1083	3	permanent_delete	renewal	RMT-228	Permanently deleted renewal (bulk): FORTRISE BUSINESS SOLUTIONS PRIVATE LIMITED - SSL	\N	2026-06-30 18:11:37.185818
1084	3	permanent_delete	renewal	RMT-229	Permanently deleted renewal (bulk): FORTRISE BUSINESS SOLUTIONS PRIVATE LIMITED - SSL	\N	2026-06-30 18:11:37.185818
1085	3	permanent_delete	renewal	RMT-227	Permanently deleted renewal (bulk): Shraddha Eye Care Trust - SSL	\N	2026-06-30 18:11:37.185818
1086	3	permanent_delete	renewal	RMT-230	Permanently deleted renewal (bulk): FORTRISE BUSINESS SOLUTIONS PRIVATE LIMITED - SSL	\N	2026-06-30 18:11:37.185818
1087	3	permanent_delete	renewal	RMT-09	Permanently deleted renewal (bulk): Aadit Auto Company Pvt Ltd - Backup solution	\N	2026-06-30 18:11:37.185818
1088	3	permanent_delete	renewal	RMT-135	Permanently deleted renewal (bulk): Sri Balaji Castings Pvt Ltd - M365	\N	2026-06-30 18:11:37.185818
1089	3	permanent_delete	renewal	RMT-13	Permanently deleted renewal (bulk): Professional Impex Pvt Ltd (Chennai) - Backup solution	\N	2026-06-30 18:11:37.185818
1090	3	permanent_delete	renewal	RMT-14	Permanently deleted renewal (bulk): Talodyn Networks Private Limited - Backup solution	\N	2026-06-30 18:11:37.185818
1091	3	permanent_delete	renewal	RMT-178	Permanently deleted renewal (bulk): Sri Balaji Castings - Ponneri - MSP	\N	2026-06-30 18:11:37.185818
1092	3	permanent_delete	renewal	RMT-35	Permanently deleted renewal (bulk): Winsar Infosoft Private Limited - Firewall	\N	2026-06-30 18:11:37.185818
1093	3	permanent_delete	renewal	RMT-148	Permanently deleted renewal (bulk): Translink Logistics Pvt Ltd (Chennai) - M365	\N	2026-06-30 18:11:37.185818
1094	3	permanent_delete	renewal	RMT-299	Permanently deleted renewal (bulk): Professional Impex Pvt Ltd (Chennai) - Tally	\N	2026-06-30 18:11:37.185818
1095	3	permanent_delete	renewal	RMT-182	Permanently deleted renewal (bulk): Sri Balaji Castings Pvt Ltd - MSP	\N	2026-06-30 18:11:37.185818
1096	3	permanent_delete	renewal	RMT-232	Permanently deleted renewal (bulk): Sri Balaji Castings Pvt Ltd - Backup solution	\N	2026-06-30 18:11:37.185818
1097	3	permanent_delete	renewal	RMT-153	Permanently deleted renewal (bulk): Talodyn Networks Private Limited - M365	\N	2026-06-30 18:11:37.185818
1098	3	permanent_delete	renewal	RMT-109	Permanently deleted renewal (bulk): Avigna Retail Private Limited - M365	\N	2026-06-30 18:11:37.185818
1099	3	permanent_delete	renewal	RMT-169	Permanently deleted renewal (bulk): Witzone Technologies Pvt Ltd - MSP	\N	2026-06-30 18:11:37.185818
1100	3	permanent_delete	renewal	RMT-304	Permanently deleted renewal (bulk): SysArc Infomatix Private Limited - Zoho	\N	2026-06-30 18:11:37.185818
1101	3	permanent_delete	renewal	RMT-253	Permanently deleted renewal (bulk): SITWANTO DEVI MAHILA KALYAN SANSTHAN - Tally	\N	2026-06-30 18:11:37.185818
1102	3	permanent_delete	renewal	RMT-155	Permanently deleted renewal (bulk): Imaginetech Digital Private Limited - M365	\N	2026-06-30 18:11:37.185818
1103	3	permanent_delete	renewal	RMT-158	Permanently deleted renewal (bulk): Spinebiz Services Private Limited - M365	\N	2026-06-30 18:11:37.185818
1104	3	permanent_delete	renewal	RMT-112	Permanently deleted renewal (bulk): Spinebiz Services Private Limited - M365	\N	2026-06-30 18:11:37.185818
1105	3	permanent_delete	renewal	RMT-110	Permanently deleted renewal (bulk): THE IT MAN PRIVATE LIMITED - M365	\N	2026-06-30 18:11:37.185818
1106	3	permanent_delete	renewal	RMT-167	Permanently deleted renewal (bulk): Talodyn Networks Private Limited - M365	\N	2026-06-30 18:11:37.185818
1107	3	delete	user	\N	Admin deactivated user: sameerulrahman212002@gmail.com	\N	2026-06-30 18:11:55.77917
1108	3	delete	user	\N	Admin permanently deleted user: sameerulrahman212002@gmail.com	\N	2026-06-30 18:11:58.866061
1109	3	delete	user	\N	Admin deactivated user: ranjithkumar.v@marslab.work	\N	2026-06-30 18:12:03.772999
1110	3	delete	user	\N	Admin permanently deleted user: ranjithkumar.v@marslab.work	\N	2026-06-30 18:12:06.344167
1111	3	create	renewal	RMT-01	Created renewal for testing - Amazon Web Services	\N	2026-07-01 09:52:25.157224
1112	3	delete	user	\N	Admin deactivated user: sameerulrahman212002@gmail.com	\N	2026-07-01 10:13:28.136248
1113	3	delete	user	\N	Admin deactivated user: ranjithkumar.v@marslab.work	\N	2026-07-01 10:13:41.007504
1114	3	delete	user	\N	Admin deactivated user: sameerulrahman212002@gmail.com	\N	2026-07-01 10:15:50.143127
1115	3	delete	user	\N	Admin deactivated user: ranjithkumar.v@marslab.work	\N	2026-07-01 10:18:22.580944
1116	3	edit	renewal	RMT-01	Edited renewal details for testing. Reason: fgdfg	\N	2026-07-01 10:26:46.858522
1117	3	edit	renewal	RMT-01	Edited renewal details for testing. Reason: fgsdg	\N	2026-07-01 10:29:42.877965
1118	3	edit	renewal	RMT-01	Edited renewal details for testing. Reason: testing	\N	2026-07-01 10:41:10.254516
1119	3	edit	renewal	RMT-01	Edited renewal details for testing. Reason: xgf	\N	2026-07-01 10:50:20.436077
1120	2	create	renewal	RMT-02	Created renewal for Cliq Test Client - Google Workspace	\N	2026-07-01 10:55:59.401492
1121	2	edit	renewal	RMT-02	Edited renewal details for Cliq Test Client. Reason: Transition to expired	\N	2026-07-01 10:56:00.493778
1122	3	delete_soft	renewal	RMT-02	Moved renewal to trash: Cliq Test Client - Google Workspace	\N	2026-07-01 10:56:58.587809
1123	3	delete_permanent	renewal	RMT-02	Permanently deleted renewal: Cliq Test Client - Google Workspace	\N	2026-07-01 10:57:04.472304
1124	2	create	renewal	RMT-02	Created renewal for Cliq Test Client - Google Workspace	\N	2026-07-01 10:57:07.800277
1125	2	edit	renewal	RMT-02	Edited renewal details for Cliq Test Client. Reason: Transition to expired	\N	2026-07-01 10:57:08.95181
1126	3	delete_soft	renewal	RMT-02	Moved renewal to trash: Cliq Test Client - Google Workspace	\N	2026-07-01 10:57:23.303657
1127	3	delete_permanent	renewal	RMT-02	Permanently deleted renewal: Cliq Test Client - Google Workspace	\N	2026-07-01 10:57:29.897596
1128	3	edit	renewal	RMT-01	Edited renewal details for testing. Reason: asdf	\N	2026-07-01 10:58:13.725798
1129	3	edit	renewal	RMT-01	Edited renewal details for testing. Reason: 35	\N	2026-07-01 10:58:46.965459
1130	2	create	renewal	RMT-02	Created renewal for Cliq Test Client - Google Workspace	\N	2026-07-01 11:02:12.282532
1131	2	edit	renewal	RMT-02	Edited renewal details for Cliq Test Client. Reason: Transition to expired	\N	2026-07-01 11:02:14.174533
1132	3	edit	renewal	RMT-01	Edited renewal details for testing. Reason: sdgs	\N	2026-07-01 11:06:30.115674
1133	3	edit	renewal	RMT-01	Edited renewal details for testing. Reason: test	\N	2026-07-01 11:06:54.188138
1134	3	delete_soft	renewal	RMT-01	Moved renewal to trash: testing - Amazon Web Services	\N	2026-07-01 11:13:58.498654
1135	3	delete_permanent	renewal	RMT-01	Permanently deleted renewal: testing - Amazon Web Services	\N	2026-07-01 11:14:08.154573
1136	3	create	renewal	RMT-01	Created renewal for testing - Amazon Web Services	\N	2026-07-01 11:15:04.373297
1137	3	delete_soft	renewal	RMT-01	Moved renewal to trash: testing - Amazon Web Services	\N	2026-07-01 11:19:54.706804
1138	3	delete_permanent	renewal	RMT-01	Permanently deleted renewal: testing - Amazon Web Services	\N	2026-07-01 11:20:05.171565
1139	3	create	renewal	RMT-01	Created renewal for test - Amazon Web Services	\N	2026-07-01 11:20:29.149726
1140	3	edit	renewal	RMT-01	Edited renewal details for test. Reason: 33645	\N	2026-07-01 11:23:42.995722
1141	3	edit	renewal	RMT-01	Edited renewal details for test. Reason: dgd	\N	2026-07-01 11:28:28.662886
1142	3	edit	renewal	RMT-01	Edited renewal details for test. Reason: sfdh	\N	2026-07-01 11:32:22.494414
1143	3	delete_soft	renewal	RMT-01	Moved renewal to trash: test - Amazon Web Services	\N	2026-07-01 11:42:19.443107
1144	3	create	renewal	RMT-01	Created renewal for dsg - Microsoft Azure	\N	2026-07-01 11:42:46.442287
1145	3	edit	renewal	RMT-01	Edited renewal details for dsg. Reason: dgh	\N	2026-07-01 11:47:45.629995
1146	3	delete_soft	renewal	RMT-01	Moved renewal to trash: dsg - Microsoft Azure	\N	2026-07-01 12:03:17.408356
1147	3	delete_permanent	renewal	RMT-01	Permanently deleted renewal: dsg - Microsoft Azure	\N	2026-07-01 12:03:28.464533
1148	3	delete_permanent	renewal	RMT-01	Permanently deleted renewal: test - Amazon Web Services	\N	2026-07-01 12:03:29.999416
1149	3	create	renewal	RMT-01	Created renewal for final testing  - Amazon Web Services	\N	2026-07-01 12:04:08.170758
1150	3	edit	renewal	RMT-01	Edited renewal details for final testing . Reason: 6434	\N	2026-07-01 12:41:15.409209
1151	3	delete_soft	renewal	RMT-01	Moved renewal to trash: final testing  - Amazon Web Services	\N	2026-07-01 12:46:13.643329
1152	3	delete_permanent	renewal	RMT-01	Permanently deleted renewal: final testing  - Amazon Web Services	\N	2026-07-01 12:46:26.814321
1153	3	create	renewal	RMT-01	Created renewal for Test Client - Amazon Web Services	\N	2026-07-01 14:56:57.35667
1154	3	create	renewal	RMT-02	Created renewal for Expired Test Client - Amazon Web Services	\N	2026-07-01 14:57:01.358659
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: marslab_schema; Owner: marslab_user
--

COPY marslab_schema.audit_logs (id, client_id, action, changed_fields, actor, created_at) FROM stdin;
509a5c72-6474-4a8a-a10a-ad8eb7afc05d	abf38946-ac9e-4f25-b93e-9e3def5314f8	CREATE	\N	admin@marslab.in	2026-06-03 16:05:05.523+05:30
72736ff7-f53d-46e6-90a6-4ab730386a11	abf38946-ac9e-4f25-b93e-9e3def5314f8	VIEW	\N	admin@marslab.in	2026-06-03 16:05:13.832+05:30
fb168238-a6c5-4374-9b98-c4890085bbe3	abf38946-ac9e-4f25-b93e-9e3def5314f8	VIEW	\N	admin@marslab.in	2026-06-04 09:33:17.536+05:30
30081c7a-42ae-4435-8cc9-340494c42940	abf38946-ac9e-4f25-b93e-9e3def5314f8	VIEW	\N	admin@marslab.in	2026-06-04 10:06:44.736+05:30
0b72e7aa-04a2-41f3-91fb-4f8541fc24e9	abf38946-ac9e-4f25-b93e-9e3def5314f8	VIEW	\N	admin@marslab.in	2026-06-04 10:37:15.525+05:30
ef0335cb-95f6-4ba3-a36e-3e8b1760ec10	abf38946-ac9e-4f25-b93e-9e3def5314f8	VIEW	\N	admin@marslab.in	2026-06-04 12:35:16.227+05:30
5eb11b04-23db-4ae2-8c88-8700d29a915f	abf38946-ac9e-4f25-b93e-9e3def5314f8	VIEW	\N	admin@marslab.in	2026-06-04 15:55:27.07+05:30
9f9b61d4-6183-4a57-8f92-3f5923508359	abf38946-ac9e-4f25-b93e-9e3def5314f8	VIEW	\N	admin@marslab.in	2026-06-04 18:15:23.203+05:30
17ad0adc-978f-4086-8214-8465d8647e13	abf38946-ac9e-4f25-b93e-9e3def5314f8	VIEW	\N	admin@marslab.in	2026-06-04 18:16:52.709+05:30
1f169b9b-dfec-4ccc-aa0c-38d222815777	6177a399-28e2-4ae2-bd6d-d6e8ec049d9d	CREATE	\N	admin@marslab.in	2026-06-04 18:34:56.14+05:30
\.


--
-- Data for Name: automation_logs; Type: TABLE DATA; Schema: marslab_schema; Owner: marslab_user
--

COPY marslab_schema.automation_logs (id, action, note, performed_by, performed_at) FROM stdin;
1	stop	testing 	3	2026-06-29 14:41:12.406392
2	stop	testing 	3	2026-06-30 15:42:01.706739
\.


--
-- Data for Name: automation_settings; Type: TABLE DATA; Schema: marslab_schema; Owner: marslab_user
--

COPY marslab_schema.automation_settings (key, value, updated_by, updated_at) FROM stdin;
email_automation	start	3	2026-06-30 15:42:01.703742
\.


--
-- Data for Name: clients; Type: TABLE DATA; Schema: marslab_schema; Owner: marslab_user
--

COPY marslab_schema.clients (id, client_name, service, contract_value, email_primary, email_secondary, contact_person, contact_number, address, created_at, updated_at, aws_account_name, aws_account_id, aws_account_creation_date, billing_company_name, billing_address, billing_gst_number, billing_contact_primary, billing_contact_secondary, accounts_spoc, sales_spoc, contract_order_ref, expected_monthly_billing, billing_amount_type, managed_support_type, managed_support_frequency, billing_terms, credit_note_details, is_deleted, deleted_at, deleted_by, delete_reason, delete_reason_category) FROM stdin;
abf38946-ac9e-4f25-b93e-9e3def5314f8	Globex Inc	AI Consulting	76476.00	sameerulrahman212002@gmail.com	sameerulrahman212002@gmail.com	Sameer Rahman	8765432109	hgdyjdjyh	2026-06-03 16:05:05.517+05:30	2026-06-03 16:05:05.517+05:30	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N
6177a399-28e2-4ae2-bd6d-d6e8ec049d9d	TechNova Solutions Pvt Ltd	Software Training	4800000.00	billing@technova.in	hr@technova.in	Priya Mehta	+91-9876543210	12 Cyber City, Gurugram, HR 122002	2026-06-04 18:34:56.128+05:30	2026-06-04 18:34:56.128+05:30	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N
\.


--
-- Data for Name: email_logs; Type: TABLE DATA; Schema: marslab_schema; Owner: marslab_user
--

COPY marslab_schema.email_logs (id, renewal_id, recipient_email, recipient_type, email_type, subject, status, error_message, sent_at) FROM stdin;
90	339	sameerulrahman.f@marslab.work	admin	renewal_expired	🚨 Renewal Expired – Expired Test Client (Amazon Web Services)	sent	\N	2026-07-01 14:57:01.355167
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: marslab_schema; Owner: marslab_user
--

COPY marslab_schema.notifications (id, user_id, role, title, message, type, read, link, created_at) FROM stdin;
1	\N	sales	New Renewal Added	New renewal created for test (test). Renewal date: 2026-06-20	info	0	\N	2026-05-19 14:31:57.339098
2	\N	finance	Email Sent	30-day reminder sent for test (test).	info	0	\N	2026-05-19 14:43:48.497901
3	\N	finance	Email Sent	30-day reminder sent for test (test).	info	0	\N	2026-05-19 14:55:03.525574
4	\N	sales	New Renewal Added	New renewal created for sakthi  (ms365). Renewal date: 2026-06-18	info	0	\N	2026-05-19 14:58:17.563489
5	\N	finance	Email Sent	30-day reminder sent for sakthi  (ms365).	info	0	\N	2026-05-19 15:03:44.801464
6	\N	finance	Email Sent	30-day reminder sent for test (test).	info	0	\N	2026-05-19 15:09:54.098953
7	\N	finance	Email Sent	30-day reminder sent for sakthi  (ms365).	info	0	\N	2026-05-19 15:09:57.011915
8	\N	finance	Email Sent	20-day reminder sent for sakthi  (ms365).	info	0	\N	2026-05-19 15:09:58.98479
9	\N	finance	Email Sent	15-day reminder sent for sakthi  (ms365).	info	0	\N	2026-05-19 15:10:00.641368
10	\N	sales	Follow-Up Required	Please meet sakthi  regarding ms365 renewal (15 days left).	warning	0	\N	2026-05-19 15:10:03.658783
11	\N	finance	Email Sent	30-day reminder sent for test (test).	info	0	\N	2026-05-19 15:22:51.156134
12	\N	finance	Email Sent	15-day reminder sent for sakthi  (ms365).	info	0	\N	2026-05-19 15:22:52.662362
13	\N	finance	Email Sent	15-day reminder sent for test (test).	info	0	\N	2026-05-19 15:36:38.819344
14	\N	admin	Edit Access Requested	Sales team requested edit access for sakthi 	info	0	\N	2026-05-19 15:46:22.899552
15	\N	sales	Edit Access Approved	Admin approved edit access for sakthi 	success	0	\N	2026-05-19 15:46:32.220978
16	\N	admin	Edit Access Requested	Sales team requested edit access for sakthi 	info	0	\N	2026-05-19 15:47:21.03463
17	\N	admin	Edit Access Requested	Sales team requested edit access for test	info	0	\N	2026-05-19 15:47:27.991201
18	\N	sales	Edit Access Approved	Admin approved edit access for sakthi 	success	0	\N	2026-05-19 15:47:41.100595
19	\N	sales	Edit Access Approved	Admin approved edit access for test	success	0	\N	2026-05-19 15:47:42.97081
20	\N	finance	Email Sent	3-day reminder sent for sakthi  (ms365).	info	0	\N	2026-05-19 15:51:50.23389
21	\N	finance	Email Sent	15-day reminder sent for test (test).	info	0	\N	2026-05-19 15:55:59.818095
22	\N	sales	Follow-Up Required	Please meet test regarding test renewal (15 days left).	warning	0	\N	2026-05-19 15:56:01.04469
23	\N	finance	Email Sent	3-day reminder sent for sakthi  (ms365).	info	0	\N	2026-05-19 15:56:01.965593
24	\N	sales	New Renewal Added	New renewal created for ranjith (office 365). Renewal date: 2026-05-21	info	0	\N	2026-05-19 16:15:29.665028
25	\N	finance	Email Sent	3-day reminder sent for ranjith (office 365).	info	0	\N	2026-05-19 16:16:04.056452
26	\N	sales	Follow-Up Required	Please meet test regarding test renewal (15 days left).	warning	0	\N	2026-05-19 16:19:40.594036
27	\N	sales	Follow-Up Required	Please meet sakthi  regarding ms365 renewal (3 days left).	warning	0	\N	2026-05-19 16:19:42.522543
28	\N	sales	Follow-Up Required	Please meet ranjith regarding office 365 renewal (3 days left).	warning	0	\N	2026-05-19 16:19:43.573254
29	\N	finance	Renewal Update	ranjith (office 365) has been marked as "Renewed" by sales team.	success	0	\N	2026-05-19 18:02:49.022935
30	\N	finance	Renewal Update	ranjith (office 365) has been marked as "Closed" by sales team.	error	0	\N	2026-05-19 18:10:54.59969
31	\N	admin	Edit Access Requested	Sales team requested edit access for ranjith	info	0	\N	2026-05-19 18:13:58.482579
32	\N	sales	Edit Access Approved	Admin approved edit access for ranjith	success	0	\N	2026-05-19 18:14:14.324573
33	\N	finance	Email Sent	10-day reminder sent for ranjith (office 365).	info	0	\N	2026-05-19 18:14:41.208715
34	\N	finance	Renewal Update	ranjith (office 365) has been marked as "Renewed" by sales team.	success	0	\N	2026-05-19 18:15:00.183117
35	\N	finance	Email Sent	3-day reminder sent for ranjith (office 365).	info	0	\N	2026-05-20 09:46:38.735166
36	\N	finance	Renewal Update	ranjith (office 365) has been marked as "Quotation Confirmation" by sales team.	warning	0	\N	2026-05-20 10:11:56.504904
37	\N	finance	Renewal Update	ranjith (office 365) has been marked as "Awaiting Client Approval" by sales team.	warning	0	\N	2026-05-20 10:12:10.060808
38	\N	finance	Renewal Update	ranjith (office 365) has been marked as "Awaiting with Vendor" by sales team.	warning	0	\N	2026-05-20 10:12:18.305771
39	\N	finance	Renewal Update	ranjith (office 365) has been marked as "Renewed" by sales team.	success	0	\N	2026-05-20 10:12:23.983352
40	\N	finance	Renewal Update	ranjith (office 365) has been marked as "Service Discontinued" by sales team.	error	0	\N	2026-05-20 10:12:29.493072
41	\N	finance	Renewal Update	ranjith (office 365) has been marked as "Renewed" by sales team.	success	0	\N	2026-05-20 11:00:33.710044
42	\N	finance	Renewal Update	ranjith (office 365) has been marked as "Renewed" by sales team.	success	0	\N	2026-05-20 11:00:34.92002
43	\N	finance	Renewal Update	test (test) has been marked as "Renewed" by sales team.	success	0	\N	2026-05-20 11:05:49.621774
44	\N	finance	Renewal Update	test (test) has been marked as "Renewed" by sales team.	success	0	\N	2026-05-20 11:05:51.440376
45	\N	finance	Email Sent	3-day reminder sent for sakthi  (ms365).	info	0	\N	2026-05-20 11:45:40.10245
46	\N	finance	Email Sent	10-day reminder sent for sakthi  (ms365).	info	0	\N	2026-05-20 12:03:07.684371
47	\N	finance	Renewal Update	sakthi  (ms365) has been marked as "Service Discontinued" by sales team.	error	0	\N	2026-05-20 12:07:00.71292
48	\N	finance	Renewal Update	ranjith (office 365) has been marked as "Service Discontinued" by sales team.	error	0	\N	2026-05-20 12:15:57.794241
49	\N	finance	Renewal Update	sakthi  (ms365) has been marked as "Renewed" by sales team.	success	0	\N	2026-05-20 12:16:19.599341
50	\N	finance	Renewal Update	sakthi  (ms365) has been marked as "Renewed" by sales team.	success	0	\N	2026-05-20 12:16:20.707208
51	\N	finance	Renewal Update	sakthi  (ms365) has been marked as "Service Discontinued" by sales team.	error	0	\N	2026-05-20 12:16:27.481741
52	\N	finance	Renewal Update	ranjith (office 365) has been marked as "Awaiting with Vendor" by admin.	warning	0	\N	2026-05-20 12:23:17.930658
53	\N	finance	Email Sent	10-day reminder sent for ranjith (office 365).	info	0	\N	2026-05-20 12:23:46.46299
54	\N	finance	Renewal Update	test (test) has been marked as "Service Discontinued" by admin.	error	0	\N	2026-05-20 12:25:11.313579
55	\N	finance	Renewal Update	test (test) has been marked as "Renewed" by admin.	success	0	\N	2026-05-20 12:25:38.923006
56	\N	sales	New Renewal Added	New renewal created for sameer  (123). Renewal date: 2026-10-26	info	0	\N	2026-05-20 12:41:12.125176
57	\N	finance	Renewal Update	ABC Technologies Pvt Ltd (Cloud Hosting Service) has been marked as "Quotation Confirmation" by admin.	warning	0	\N	2026-05-20 14:21:16.608822
58	\N	finance	Renewal Update	ranjith (office 365) has been marked as "Quotation Confirmation" by admin.	warning	0	\N	2026-05-20 14:23:18.555407
59	\N	finance	Renewal Update	ranjith (office 365) has been marked as "Quotation Confirmation" by admin.	warning	0	\N	2026-05-20 14:24:00.284306
60	\N	finance	Renewal Update	ranjith (office 365) has been marked as "Quotation Confirmation" by admin.	warning	0	\N	2026-05-20 16:09:56.212899
61	\N	sales	New Renewal Added	New renewal created for test (office365). Renewal date: 2026-05-23	info	0	\N	2026-05-20 18:06:49.540599
62	\N	finance	Email Sent	3-day reminder sent for test (office365).	info	0	\N	2026-05-20 18:09:05.621856
63	\N	sales	Follow-Up Required	Please meet test regarding office365 renewal (5 days left).	warning	0	\N	2026-05-20 18:09:06.62052
64	\N	finance	Renewal Update	test (office365) has been marked as "Renewed" by admin.	success	0	\N	2026-05-20 18:10:53.814626
65	\N	finance	Renewal Update	test (office365) has been marked as "Renewed" by admin.	success	0	\N	2026-05-20 18:11:02.014594
66	\N	finance	Renewal Update	test (office365) has been marked as "Renewed" by admin.	success	0	\N	2026-05-20 18:11:19.803409
67	\N	finance	Email Sent	5-day reminder sent for test (office365).	info	0	\N	2026-05-20 18:12:32.485128
68	\N	sales	Follow-Up Required	Please meet test regarding office365 renewal (5 days left).	warning	0	\N	2026-05-20 18:12:33.547495
69	\N	finance	Renewal Update	test (office365) has been marked as "Quotation Confirmation" by admin.	warning	0	\N	2026-05-20 18:18:30.860065
70	\N	finance	Renewal Update	test (office365) has been marked as "Renewed" by admin.	success	0	\N	2026-05-20 18:21:48.820204
71	\N	sales	New Renewal Added	New renewal created for sameer  (aws). Renewal date: 2026-09-01	info	0	\N	2026-05-20 18:30:34.175535
72	\N	finance	Email Sent	30-day reminder sent for sameer  (aws).	info	0	\N	2026-05-20 18:31:43.963587
73	\N	finance	Renewal Update	sameer  (aws) has been marked as "Quotation Confirmation" by admin.	warning	0	\N	2026-05-20 18:32:45.863835
74	\N	finance	Renewal Update	sameer  (aws) has been marked as "Renewed" by admin.	success	0	\N	2026-05-20 18:35:38.11485
75	\N	finance	Email Sent	30-day reminder sent for sameer  (aws).	info	0	\N	2026-05-21 09:56:42.077104
76	\N	finance	Email Sent	20-day reminder sent for sameer  (aws).	info	0	\N	2026-05-21 09:58:25.500372
77	\N	finance	Email Sent	15-day reminder sent for sameer  (aws).	info	0	\N	2026-05-21 09:59:06.562763
78	\N	sales	Follow-Up Required	Please meet sameer  regarding aws renewal (15 days left).	warning	0	\N	2026-05-21 09:59:07.694439
79	\N	finance	Email Sent	10-day reminder sent for sameer  (aws).	info	0	\N	2026-05-21 10:00:33.503326
80	\N	finance	Email Sent	5-day reminder sent for sameer  (aws).	info	0	\N	2026-05-21 10:01:15.236884
81	\N	sales	Follow-Up Required	Please meet sameer  regarding aws renewal (5 days left).	warning	0	\N	2026-05-21 10:01:17.39377
82	\N	finance	Email Sent	3-day reminder sent for sameer  (aws).	info	0	\N	2026-05-21 10:02:04.33474
83	\N	finance	Renewal Update	sameer  (aws) has been marked as "Quotation Confirmation" by admin.	warning	0	\N	2026-05-21 10:03:56.247306
84	\N	finance	Renewal Update	sameer  (aws) has been marked as "Awaiting Client Approval" by admin.	warning	0	\N	2026-05-21 10:04:13.908699
85	\N	finance	Renewal Update	sameer  (aws) has been marked as "Awaiting with Vendor" by admin.	warning	0	\N	2026-05-21 10:04:18.167826
86	\N	finance	Renewal Update	sameer  (aws) has been marked as "Renewed" by admin.	success	0	\N	2026-05-21 10:04:32.837534
87	\N	finance	Renewal Update	sameer  (aws) has been marked as "Service Discontinued" by admin.	error	0	\N	2026-05-21 10:04:40.080899
88	\N	finance	Email Sent	3-day reminder sent for sameer  (aws).	info	0	\N	2026-05-21 10:12:44.949169
89	\N	finance	Email Sent	5-day reminder sent for sameer  (aws).	info	0	\N	2026-05-21 10:13:26.353317
90	\N	sales	Follow-Up Required	Please meet sameer  regarding aws renewal (5 days left).	warning	0	\N	2026-05-21 10:13:27.761163
91	\N	finance	Email Sent	15-day reminder sent for sameer  (aws).	info	0	\N	2026-05-21 10:20:38.899428
92	\N	sales	Follow-Up Required	Please meet sameer  regarding aws renewal (15 days left).	warning	0	\N	2026-05-21 10:20:40.513313
93	\N	finance	Email Sent	5-day reminder sent for sameer  (aws).	info	0	\N	2026-05-21 10:40:10.148032
94	\N	sales	Follow-Up Required	Please meet sameer  regarding aws renewal (5 days left).	warning	0	\N	2026-05-21 10:40:11.4686
95	\N	finance	Email Sent	15-day reminder sent for sameer  (aws).	info	0	\N	2026-05-21 10:44:07.915788
96	\N	sales	Follow-Up Required	Please meet sameer  regarding aws renewal (15 days left).	warning	0	\N	2026-05-21 10:44:09.073519
97	\N	finance	Email Sent	15-day reminder sent for sameer  (aws).	info	0	\N	2026-05-21 10:50:22.397868
98	\N	sales	Follow-Up Required	Please meet sameer  regarding aws renewal (15 days left).	warning	0	\N	2026-05-21 10:50:23.790422
99	\N	admin	Renewal Details Updated	Renewal details updated for client "sameer " (aws) by admin team. Reason: asfas.	info	0	/renewals?search=RMT-02	2026-06-23 12:00:23.075439
100	\N	finance	Renewal Details Updated	Renewal details updated for client "sameer " (aws) by admin team. Reason: asfas.	info	0	/renewals?search=RMT-02	2026-06-23 12:00:23.078706
101	\N	finance	Email Sent	3-day reminder sent for sameer  (aws).	info	0	\N	2026-06-23 12:00:25.992112
102	\N	admin	Renewal Details Updated	Renewal details updated for client "sameer " (aws) by admin team. Reason: FAS.	info	0	/renewals?search=RMT-02	2026-06-23 12:03:56.589676
103	\N	finance	Renewal Details Updated	Renewal details updated for client "sameer " (aws) by admin team. Reason: FAS.	info	0	/renewals?search=RMT-02	2026-06-23 12:03:56.590515
104	\N	finance	Email Sent	5-day reminder sent for sameer  (aws).	info	0	\N	2026-06-23 12:04:00.808418
105	\N	sales	Follow-Up Required	Please meet sameer  regarding aws renewal (5 days left).	warning	0	\N	2026-06-23 12:04:03.146728
106	\N	admin	Renewal Details Updated	Renewal details updated for client "sameer " (aws) by admin team. Reason: yfuu.	info	0	/renewals?search=RMT-02	2026-06-29 14:22:50.917731
107	\N	finance	Renewal Details Updated	Renewal details updated for client "sameer " (aws) by admin team. Reason: yfuu.	info	0	/renewals?search=RMT-02	2026-06-29 14:22:50.921783
108	\N	finance	Email Sent	3-day reminder sent for sameer  (aws).	info	0	\N	2026-06-29 14:22:54.00715
109	\N	finance	Email Sent	3-day reminder sent for sameer  (aws).	info	0	\N	2026-06-29 14:28:12.532207
110	\N	finance	Email Sent	3-day reminder sent for sameer  (aws).	info	0	\N	2026-06-29 14:30:46.094252
111	\N	finance	Email Sent	3-day reminder sent for sameer  (aws).	info	0	\N	2026-06-29 14:36:01.441644
112	\N	admin	Renewal Details Updated	Renewal details updated for client "sameer " (Amazon Web Services) by admin team. Reason: dsdgsdg.	info	0	/renewals?search=RMT-02	2026-06-29 14:37:36.840683
113	\N	finance	Renewal Details Updated	Renewal details updated for client "sameer " (Amazon Web Services) by admin team. Reason: dsdgsdg.	info	0	/renewals?search=RMT-02	2026-06-29 14:37:36.841783
114	\N	finance	Email Sent	3-day reminder sent for sameer  (Amazon Web Services).	info	0	\N	2026-06-29 14:37:39.304826
115	\N	finance	Email Sent	3-day reminder sent for sameer  (Amazon Web Services).	info	0	\N	2026-06-29 14:40:58.689186
116	\N	\N	Email Automation Paused	Email automation has been stopped by admin System Admin. Reason: testing 	info	0	\N	2026-06-29 14:41:13.619226
117	\N	finance	Email Sent	3-day reminder sent for sameer  (Amazon Web Services).	info	0	\N	2026-06-29 14:50:33.831582
118	\N	finance	Email Sent	3-day reminder sent for sameer  (Amazon Web Services).	info	0	\N	2026-06-29 14:54:38.914271
119	\N	finance	Email Sent	3-day reminder sent for sameer  (Amazon Web Services).	info	0	\N	2026-06-29 15:42:08.957729
120	\N	finance	Email Sent	3-day reminder sent for sameer  (Amazon Web Services).	info	0	\N	2026-06-29 15:50:35.428256
121	\N	admin	Edit Access Requested	CST team requested edit access for sameer 	info	0	\N	2026-06-30 10:15:24.051274
122	\N	sales	Edit Access Approved	Admin approved edit access for sameer 	success	0	\N	2026-06-30 10:16:36.553165
123	\N	admin	Renewal Deleted	Renewal for client "sameer " (Amazon Web Services) has been moved to trash by admin.	warning	0	/trash	2026-06-30 15:41:45.325434
124	\N	finance	Renewal Deleted	Renewal for client "sameer " (Amazon Web Services) has been moved to trash by admin.	warning	0	/trash	2026-06-30 15:41:45.32645
125	\N	admin	Renewal Deleted	Renewal for client "Expired Client Inc" (Google Workspace) has been moved to trash by admin.	warning	0	/trash	2026-06-30 15:41:47.625392
126	\N	finance	Renewal Deleted	Renewal for client "Expired Client Inc" (Google Workspace) has been moved to trash by admin.	warning	0	/trash	2026-06-30 15:41:47.626368
127	\N	\N	Email Automation Paused	Email automation has been stopped by admin System Admin. Reason: testing 	info	0	\N	2026-06-30 15:42:03.831356
128	\N	admin	Renewal Deleted	Renewal for client "sameer " (Amazon Web Services) has been moved to trash by admin.	warning	0	/trash	2026-06-30 17:21:03.952078
129	\N	finance	Renewal Deleted	Renewal for client "sameer " (Amazon Web Services) has been moved to trash by admin.	warning	0	/trash	2026-06-30 17:21:03.953267
130	\N	sales	Renewal Expired - Reason Required	Aadit Auto Company Pvt Ltd's Backup solution renewal has expired. Please provide a reason for the expiry.	error	0	\N	2026-06-30 18:03:18.758085
131	\N	sales	Renewal Expired - Reason Required	Professional Impex Pvt Ltd (Chennai)'s Backup solution renewal has expired. Please provide a reason for the expiry.	error	0	\N	2026-06-30 18:03:18.758085
132	\N	sales	Renewal Expired - Reason Required	Talodyn Networks Private Limited's Backup solution renewal has expired. Please provide a reason for the expiry.	error	0	\N	2026-06-30 18:03:18.758085
133	\N	sales	Renewal Expired - Reason Required	S S GREEN ENVIRO METAL IMPEX's Domain renewal has expired. Please provide a reason for the expiry.	error	0	\N	2026-06-30 18:03:18.758085
134	\N	sales	Renewal Expired - Reason Required	Winsar Infosoft Private Limited's Firewall renewal has expired. Please provide a reason for the expiry.	error	0	\N	2026-06-30 18:03:18.758085
135	\N	sales	Renewal Expired - Reason Required	S S GREEN ENVIRO METAL IMPEX's GWS renewal has expired. Please provide a reason for the expiry.	error	0	\N	2026-06-30 18:03:18.758085
136	\N	sales	Renewal Expired - Reason Required	Olive Grapes's GWS renewal has expired. Please provide a reason for the expiry.	error	0	\N	2026-06-30 18:03:18.758085
137	\N	sales	Renewal Expired - Reason Required	Avigna Retail Private Limited's M365 renewal has expired. Please provide a reason for the expiry.	error	0	\N	2026-06-30 18:03:18.758085
138	\N	sales	Renewal Expired - Reason Required	THE IT MAN PRIVATE LIMITED's M365 renewal has expired. Please provide a reason for the expiry.	error	0	\N	2026-06-30 18:03:18.758085
139	\N	sales	Renewal Expired - Reason Required	Spinebiz Services Private Limited's M365 renewal has expired. Please provide a reason for the expiry.	error	0	\N	2026-06-30 18:03:18.758085
140	\N	sales	Renewal Expired - Reason Required	Sri Balaji Castings Pvt Ltd's M365 renewal has expired. Please provide a reason for the expiry.	error	0	\N	2026-06-30 18:03:18.758085
141	\N	sales	Renewal Expired - Reason Required	Translink Logistics Pvt Ltd (Chennai)'s M365 renewal has expired. Please provide a reason for the expiry.	error	0	\N	2026-06-30 18:03:18.758085
142	\N	sales	Renewal Expired - Reason Required	Talodyn Networks Private Limited's M365 renewal has expired. Please provide a reason for the expiry.	error	0	\N	2026-06-30 18:03:18.758085
143	\N	sales	Renewal Expired - Reason Required	Talodyn Networks Private Limited's M365 renewal has expired. Please provide a reason for the expiry.	error	0	\N	2026-06-30 18:03:18.758085
144	\N	sales	Renewal Expired - Reason Required	Imaginetech Digital Private Limited's M365 renewal has expired. Please provide a reason for the expiry.	error	0	\N	2026-06-30 18:03:18.758085
145	\N	sales	Renewal Expired - Reason Required	Spinebiz Services Private Limited's M365 renewal has expired. Please provide a reason for the expiry.	error	0	\N	2026-06-30 18:03:18.758085
146	\N	sales	Renewal Expired - Reason Required	Talodyn Networks Private Limited's M365 renewal has expired. Please provide a reason for the expiry.	error	0	\N	2026-06-30 18:03:18.758085
147	\N	sales	Renewal Expired - Reason Required	Sri Balaji Castings Pvt Ltd's MSP renewal has expired. Please provide a reason for the expiry.	error	0	\N	2026-06-30 18:03:18.758085
148	\N	sales	Renewal Expired - Reason Required	Witzone Technologies Pvt Ltd's MSP renewal has expired. Please provide a reason for the expiry.	error	0	\N	2026-06-30 18:03:18.758085
149	\N	sales	Renewal Expired - Reason Required	Sri Balaji Castings - Ponneri's MSP renewal has expired. Please provide a reason for the expiry.	error	0	\N	2026-06-30 18:03:18.758085
150	\N	sales	Renewal Expired - Reason Required	Sri Balaji Castings Pvt Ltd's MSP renewal has expired. Please provide a reason for the expiry.	error	0	\N	2026-06-30 18:03:18.758085
151	\N	sales	Renewal Expired - Reason Required	Sri Balaji Castings Pvt Ltd's Backup solution renewal has expired. Please provide a reason for the expiry.	error	0	\N	2026-06-30 18:03:18.758085
152	\N	sales	Renewal Expired - Reason Required	Yennes Infotec (P) Limited's Tally renewal has expired. Please provide a reason for the expiry.	error	0	\N	2026-06-30 18:03:18.758085
153	\N	sales	Renewal Expired - Reason Required	SITWANTO DEVI MAHILA KALYAN SANSTHAN's Tally renewal has expired. Please provide a reason for the expiry.	error	0	\N	2026-06-30 18:03:18.758085
154	\N	sales	Renewal Expired - Reason Required	Professional Impex Pvt Ltd (Chennai)'s Tally renewal has expired. Please provide a reason for the expiry.	error	0	\N	2026-06-30 18:03:18.758085
155	\N	sales	Renewal Expired - Reason Required	SysArc Infomatix Private Limited's Zoho renewal has expired. Please provide a reason for the expiry.	error	0	\N	2026-06-30 18:03:18.758085
156	\N	admin	Renewals Deleted	25 renewals have been moved to trash by admin.	warning	0	/trash	2026-06-30 18:10:13.93063
157	\N	finance	Renewals Deleted	25 renewals have been moved to trash by admin.	warning	0	/trash	2026-06-30 18:10:13.932057
158	\N	admin	Renewals Deleted	25 renewals have been moved to trash by admin.	warning	0	/trash	2026-06-30 18:10:19.274158
159	\N	finance	Renewals Deleted	25 renewals have been moved to trash by admin.	warning	0	/trash	2026-06-30 18:10:19.275885
160	\N	admin	Renewals Deleted	25 renewals have been moved to trash by admin.	warning	0	/trash	2026-06-30 18:10:25.216016
161	\N	finance	Renewals Deleted	25 renewals have been moved to trash by admin.	warning	0	/trash	2026-06-30 18:10:25.21824
162	\N	admin	Renewals Deleted	25 renewals have been moved to trash by admin.	warning	0	/trash	2026-06-30 18:10:30.551873
163	\N	finance	Renewals Deleted	25 renewals have been moved to trash by admin.	warning	0	/trash	2026-06-30 18:10:30.553627
172	\N	admin	Renewals Deleted	25 renewals have been moved to trash by admin.	warning	0	/trash	2026-06-30 18:10:59.882498
173	\N	finance	Renewals Deleted	25 renewals have been moved to trash by admin.	warning	0	/trash	2026-06-30 18:10:59.884443
180	\N	admin	Renewals Deleted	15 renewals have been moved to trash by admin.	warning	0	/trash	2026-06-30 18:11:23.578571
181	\N	finance	Renewals Deleted	15 renewals have been moved to trash by admin.	warning	0	/trash	2026-06-30 18:11:23.579467
164	\N	admin	Renewals Deleted	25 renewals have been moved to trash by admin.	warning	0	/trash	2026-06-30 18:10:36.275515
165	\N	finance	Renewals Deleted	25 renewals have been moved to trash by admin.	warning	0	/trash	2026-06-30 18:10:36.277094
170	\N	admin	Renewals Deleted	25 renewals have been moved to trash by admin.	warning	0	/trash	2026-06-30 18:10:54.532827
171	\N	finance	Renewals Deleted	25 renewals have been moved to trash by admin.	warning	0	/trash	2026-06-30 18:10:54.534444
178	\N	admin	Renewals Deleted	25 renewals have been moved to trash by admin.	warning	0	/trash	2026-06-30 18:11:12.479206
179	\N	finance	Renewals Deleted	25 renewals have been moved to trash by admin.	warning	0	/trash	2026-06-30 18:11:12.480802
166	\N	admin	Renewals Deleted	25 renewals have been moved to trash by admin.	warning	0	/trash	2026-06-30 18:10:45.460282
167	\N	finance	Renewals Deleted	25 renewals have been moved to trash by admin.	warning	0	/trash	2026-06-30 18:10:45.46151
168	\N	admin	Renewals Deleted	25 renewals have been moved to trash by admin.	warning	0	/trash	2026-06-30 18:10:49.302246
169	\N	finance	Renewals Deleted	25 renewals have been moved to trash by admin.	warning	0	/trash	2026-06-30 18:10:49.304166
174	\N	admin	Renewals Deleted	25 renewals have been moved to trash by admin.	warning	0	/trash	2026-06-30 18:11:03.406669
175	\N	finance	Renewals Deleted	25 renewals have been moved to trash by admin.	warning	0	/trash	2026-06-30 18:11:03.407934
176	\N	admin	Renewals Deleted	25 renewals have been moved to trash by admin.	warning	0	/trash	2026-06-30 18:11:07.137763
177	\N	finance	Renewals Deleted	25 renewals have been moved to trash by admin.	warning	0	/trash	2026-06-30 18:11:07.139043
182	\N	sales	New Renewal Added	New renewal created for testing (Amazon Web Services). Renewal date: 2026-07-04	info	0	\N	2026-07-01 09:52:25.16414
183	\N	admin	New Renewal Added	New renewal created for testing (Amazon Web Services). Renewal date: 2026-07-04	info	0	/renewals?search=RMT-01	2026-07-01 09:52:25.167363
184	\N	finance	New Renewal Added	New renewal created for testing (Amazon Web Services). Renewal date: 2026-07-04	info	0	/renewals?search=RMT-01	2026-07-01 09:52:25.168442
185	\N	finance	Email Sent	3-day reminder sent for testing (Amazon Web Services).	info	0	\N	2026-07-01 10:00:01.881604
186	\N	admin	Renewal Details Updated	Renewal details updated for client "testing" (Amazon Web Services) by admin team. Reason: fgdfg.	info	0	/renewals?search=RMT-01	2026-07-01 10:26:46.859486
187	\N	finance	Renewal Details Updated	Renewal details updated for client "testing" (Amazon Web Services) by admin team. Reason: fgdfg.	info	0	/renewals?search=RMT-01	2026-07-01 10:26:46.860313
188	\N	admin	Renewal Details Updated	Renewal details updated for client "testing" (Amazon Web Services) by admin team. Reason: fgsdg.	info	0	/renewals?search=RMT-01	2026-07-01 10:29:42.879453
189	\N	finance	Renewal Details Updated	Renewal details updated for client "testing" (Amazon Web Services) by admin team. Reason: fgsdg.	info	0	/renewals?search=RMT-01	2026-07-01 10:29:42.880724
190	\N	finance	Email Sent	5-day reminder sent for testing (Amazon Web Services).	info	0	\N	2026-07-01 10:29:45.796084
191	\N	sales	Follow-Up Required	Please meet testing regarding Amazon Web Services renewal (5 days left).	warning	0	\N	2026-07-01 10:29:46.671793
192	\N	sales	Renewal Expired - Reason Required	testing's Amazon Web Services renewal has expired. Please provide a reason for the expiry.	error	0	\N	2026-07-01 10:41:08.393668
193	\N	admin	Renewal Details Updated	Renewal details updated for client "testing" (Amazon Web Services) by admin team. Reason: testing.	info	0	/renewals?search=RMT-01	2026-07-01 10:41:10.258061
194	\N	finance	Renewal Details Updated	Renewal details updated for client "testing" (Amazon Web Services) by admin team. Reason: testing.	info	0	/renewals?search=RMT-01	2026-07-01 10:41:10.259244
195	\N	admin	Renewal Details Updated	Renewal details updated for client "testing" (Amazon Web Services) by admin team. Reason: xgf.	info	0	/renewals?search=RMT-01	2026-07-01 10:50:20.437465
196	\N	finance	Renewal Details Updated	Renewal details updated for client "testing" (Amazon Web Services) by admin team. Reason: xgf.	info	0	/renewals?search=RMT-01	2026-07-01 10:50:20.438913
197	\N	sales	New Renewal Added	New renewal created for Cliq Test Client (Google Workspace). Renewal date: 2026-07-30	info	0	\N	2026-07-01 10:55:59.404209
198	\N	admin	New Renewal Added	New renewal created for Cliq Test Client (Google Workspace). Renewal date: 2026-07-30	info	0	/renewals?search=RMT-02	2026-07-01 10:55:59.405235
199	\N	finance	New Renewal Added	New renewal created for Cliq Test Client (Google Workspace). Renewal date: 2026-07-30	info	0	/renewals?search=RMT-02	2026-07-01 10:55:59.406198
200	\N	sales	Renewal Expired - Reason Required	Cliq Test Client's Google Workspace renewal has expired. Please provide a reason for the expiry.	error	0	\N	2026-07-01 10:55:59.425744
201	\N	admin	Renewal Details Updated	Renewal details updated for client "Cliq Test Client" (Google Workspace) by sales team. Reason: Transition to expired.	info	0	/renewals?search=RMT-02	2026-07-01 10:56:00.497355
202	\N	finance	Renewal Details Updated	Renewal details updated for client "Cliq Test Client" (Google Workspace) by sales team. Reason: Transition to expired.	info	0	/renewals?search=RMT-02	2026-07-01 10:56:00.498402
203	\N	admin	Renewal Deleted	Renewal for client "Cliq Test Client" (Google Workspace) has been moved to trash by admin.	warning	0	/trash	2026-07-01 10:56:58.588919
204	\N	finance	Renewal Deleted	Renewal for client "Cliq Test Client" (Google Workspace) has been moved to trash by admin.	warning	0	/trash	2026-07-01 10:56:58.59008
205	\N	sales	New Renewal Added	New renewal created for Cliq Test Client (Google Workspace). Renewal date: 2026-07-30	info	0	\N	2026-07-01 10:57:07.802559
206	\N	admin	New Renewal Added	New renewal created for Cliq Test Client (Google Workspace). Renewal date: 2026-07-30	info	0	/renewals?search=RMT-02	2026-07-01 10:57:07.803592
207	\N	finance	New Renewal Added	New renewal created for Cliq Test Client (Google Workspace). Renewal date: 2026-07-30	info	0	/renewals?search=RMT-02	2026-07-01 10:57:07.804549
208	\N	sales	Renewal Expired - Reason Required	Cliq Test Client's Google Workspace renewal has expired. Please provide a reason for the expiry.	error	0	\N	2026-07-01 10:57:07.821046
209	\N	admin	Renewal Details Updated	Renewal details updated for client "Cliq Test Client" (Google Workspace) by sales team. Reason: Transition to expired.	info	0	/renewals?search=RMT-02	2026-07-01 10:57:08.955574
210	\N	finance	Renewal Details Updated	Renewal details updated for client "Cliq Test Client" (Google Workspace) by sales team. Reason: Transition to expired.	info	0	/renewals?search=RMT-02	2026-07-01 10:57:08.956681
211	\N	admin	Renewal Deleted	Renewal for client "Cliq Test Client" (Google Workspace) has been moved to trash by admin.	warning	0	/trash	2026-07-01 10:57:23.304775
212	\N	finance	Renewal Deleted	Renewal for client "Cliq Test Client" (Google Workspace) has been moved to trash by admin.	warning	0	/trash	2026-07-01 10:57:23.30559
213	\N	admin	Renewal Details Updated	Renewal details updated for client "testing" (Amazon Web Services) by admin team. Reason: asdf.	info	0	/renewals?search=RMT-01	2026-07-01 10:58:13.72663
214	\N	finance	Renewal Details Updated	Renewal details updated for client "testing" (Amazon Web Services) by admin team. Reason: asdf.	info	0	/renewals?search=RMT-01	2026-07-01 10:58:13.727529
215	\N	admin	Renewal Details Updated	Renewal details updated for client "testing" (Amazon Web Services) by admin team. Reason: 35.	info	0	/renewals?search=RMT-01	2026-07-01 10:58:46.96654
216	\N	finance	Renewal Details Updated	Renewal details updated for client "testing" (Amazon Web Services) by admin team. Reason: 35.	info	0	/renewals?search=RMT-01	2026-07-01 10:58:46.967496
217	\N	finance	Email Sent	3-day reminder sent for testing (Amazon Web Services).	info	0	\N	2026-07-01 10:58:49.171032
218	\N	sales	New Renewal Added	New renewal created for Cliq Test Client (Google Workspace). Renewal date: 2026-07-30	info	0	\N	2026-07-01 11:02:12.284696
219	\N	admin	New Renewal Added	New renewal created for Cliq Test Client (Google Workspace). Renewal date: 2026-07-30	info	0	/renewals?search=RMT-02	2026-07-01 11:02:12.285693
220	\N	finance	New Renewal Added	New renewal created for Cliq Test Client (Google Workspace). Renewal date: 2026-07-30	info	0	/renewals?search=RMT-02	2026-07-01 11:02:12.286634
221	\N	sales	Renewal Expired - Reason Required	Cliq Test Client's Google Workspace renewal has expired. Please provide a reason for the expiry.	error	0	\N	2026-07-01 11:02:12.303653
222	\N	admin	Renewal Details Updated	Renewal details updated for client "Cliq Test Client" (Google Workspace) by sales team. Reason: Transition to expired.	info	0	/renewals?search=RMT-02	2026-07-01 11:02:14.177832
223	\N	finance	Renewal Details Updated	Renewal details updated for client "Cliq Test Client" (Google Workspace) by sales team. Reason: Transition to expired.	info	0	/renewals?search=RMT-02	2026-07-01 11:02:14.178824
224	\N	admin	Renewal Details Updated	Renewal details updated for client "testing" (Amazon Web Services) by admin team. Reason: sdgs.	info	0	/renewals?search=RMT-01	2026-07-01 11:06:30.116915
225	\N	finance	Renewal Details Updated	Renewal details updated for client "testing" (Amazon Web Services) by admin team. Reason: sdgs.	info	0	/renewals?search=RMT-01	2026-07-01 11:06:30.117935
226	\N	admin	Renewal Details Updated	Renewal details updated for client "testing" (Amazon Web Services) by admin team. Reason: test.	info	0	/renewals?search=RMT-01	2026-07-01 11:06:54.189478
227	\N	finance	Renewal Details Updated	Renewal details updated for client "testing" (Amazon Web Services) by admin team. Reason: test.	info	0	/renewals?search=RMT-01	2026-07-01 11:06:54.19042
228	\N	finance	Email Sent	5-day reminder sent for testing (Amazon Web Services).	info	0	\N	2026-07-01 11:06:56.572456
229	\N	sales	Follow-Up Required	Please meet testing regarding Amazon Web Services renewal (5 days left).	warning	0	\N	2026-07-01 11:06:57.504564
230	\N	finance	Email Sent	5-day reminder sent for testing (Amazon Web Services).	info	0	\N	2026-07-01 11:09:07.049431
231	\N	sales	Follow-Up Required	Please meet testing regarding Amazon Web Services renewal (5 days left).	warning	0	\N	2026-07-01 11:09:08.086396
232	\N	admin	Renewal Deleted	Renewal for client "testing" (Amazon Web Services) has been moved to trash by admin.	warning	0	/trash	2026-07-01 11:13:58.499969
233	\N	finance	Renewal Deleted	Renewal for client "testing" (Amazon Web Services) has been moved to trash by admin.	warning	0	/trash	2026-07-01 11:13:58.500946
234	\N	sales	New Renewal Added	New renewal created for testing (Amazon Web Services). Renewal date: 2026-07-04	info	0	\N	2026-07-01 11:15:04.375402
235	\N	admin	New Renewal Added	New renewal created for testing (Amazon Web Services). Renewal date: 2026-07-04	info	0	/renewals?search=RMT-01	2026-07-01 11:15:04.376368
236	\N	finance	New Renewal Added	New renewal created for testing (Amazon Web Services). Renewal date: 2026-07-04	info	0	/renewals?search=RMT-01	2026-07-01 11:15:04.377242
237	\N	admin	Renewal Deleted	Renewal for client "testing" (Amazon Web Services) has been moved to trash by admin.	warning	0	/trash	2026-07-01 11:19:54.707738
238	\N	finance	Renewal Deleted	Renewal for client "testing" (Amazon Web Services) has been moved to trash by admin.	warning	0	/trash	2026-07-01 11:19:54.708704
239	\N	sales	New Renewal Added	New renewal created for test (Amazon Web Services). Renewal date: 2026-07-04	info	0	\N	2026-07-01 11:20:29.152022
240	\N	admin	New Renewal Added	New renewal created for test (Amazon Web Services). Renewal date: 2026-07-04	info	0	/renewals?search=RMT-01	2026-07-01 11:20:29.152806
241	\N	finance	New Renewal Added	New renewal created for test (Amazon Web Services). Renewal date: 2026-07-04	info	0	/renewals?search=RMT-01	2026-07-01 11:20:29.153744
242	\N	finance	Email Sent	3-day reminder sent for test (Amazon Web Services).	info	0	\N	2026-07-01 11:23:02.36971
243	\N	sales	Renewal Expired - Reason Required	test's Amazon Web Services renewal has expired. Please provide a reason for the expiry.	error	0	\N	2026-07-01 11:23:41.495397
244	\N	admin	Renewal Details Updated	Renewal details updated for client "test" (Amazon Web Services) by admin team. Reason: 33645.	info	0	/renewals?search=RMT-01	2026-07-01 11:23:42.999011
245	\N	finance	Renewal Details Updated	Renewal details updated for client "test" (Amazon Web Services) by admin team. Reason: 33645.	info	0	/renewals?search=RMT-01	2026-07-01 11:23:42.999977
246	\N	admin	Renewal Details Updated	Renewal details updated for client "test" (Amazon Web Services) by admin team. Reason: dgd.	info	0	/renewals?search=RMT-01	2026-07-01 11:28:28.664559
247	\N	finance	Renewal Details Updated	Renewal details updated for client "test" (Amazon Web Services) by admin team. Reason: dgd.	info	0	/renewals?search=RMT-01	2026-07-01 11:28:28.66592
248	\N	admin	Renewal Details Updated	Renewal details updated for client "test" (Amazon Web Services) by admin team. Reason: sfdh.	info	0	/renewals?search=RMT-01	2026-07-01 11:32:22.495809
249	\N	finance	Renewal Details Updated	Renewal details updated for client "test" (Amazon Web Services) by admin team. Reason: sfdh.	info	0	/renewals?search=RMT-01	2026-07-01 11:32:22.496799
250	\N	finance	Email Sent	3-day reminder sent for test (Amazon Web Services).	info	0	\N	2026-07-01 11:32:25.760625
251	\N	finance	Email Sent	3-day reminder sent for test (Amazon Web Services).	info	0	\N	2026-07-01 11:35:33.994646
252	\N	finance	Email Sent	3-day reminder sent for test (Amazon Web Services).	info	0	\N	2026-07-01 11:41:19.924255
253	\N	admin	Renewal Deleted	Renewal for client "test" (Amazon Web Services) has been moved to trash by admin.	warning	0	/trash	2026-07-01 11:42:19.444428
254	\N	finance	Renewal Deleted	Renewal for client "test" (Amazon Web Services) has been moved to trash by admin.	warning	0	/trash	2026-07-01 11:42:19.445557
255	\N	sales	New Renewal Added	New renewal created for dsg (Microsoft Azure). Renewal date: 2026-07-04	info	0	\N	2026-07-01 11:42:46.445014
256	\N	admin	New Renewal Added	New renewal created for dsg (Microsoft Azure). Renewal date: 2026-07-04	info	0	/renewals?search=RMT-01	2026-07-01 11:42:46.44612
257	\N	finance	New Renewal Added	New renewal created for dsg (Microsoft Azure). Renewal date: 2026-07-04	info	0	/renewals?search=RMT-01	2026-07-01 11:42:46.44719
258	\N	finance	Email Sent	3-day reminder sent for dsg (Microsoft Azure).	info	0	\N	2026-07-01 11:42:48.566949
259	\N	finance	Email Sent	3-day reminder sent for dsg (Microsoft Azure).	info	0	\N	2026-07-01 11:45:44.593063
260	\N	sales	Renewal Expired - Reason Required	dsg's Microsoft Azure renewal has expired. Please provide a reason for the expiry.	error	0	\N	2026-07-01 11:47:43.975104
261	\N	admin	Renewal Details Updated	Renewal details updated for client "dsg" (Microsoft Azure) by admin team. Reason: dgh.	info	0	/renewals?search=RMT-01	2026-07-01 11:47:45.633789
262	\N	finance	Renewal Details Updated	Renewal details updated for client "dsg" (Microsoft Azure) by admin team. Reason: dgh.	info	0	/renewals?search=RMT-01	2026-07-01 11:47:45.634949
263	\N	admin	Renewal Deleted	Renewal for client "dsg" (Microsoft Azure) has been moved to trash by admin.	warning	0	/trash	2026-07-01 12:03:17.409636
264	\N	finance	Renewal Deleted	Renewal for client "dsg" (Microsoft Azure) has been moved to trash by admin.	warning	0	/trash	2026-07-01 12:03:17.4107
265	\N	sales	New Renewal Added	New renewal created for final testing  (Amazon Web Services). Renewal date: 2026-07-04	info	0	\N	2026-07-01 12:04:08.17372
266	\N	admin	New Renewal Added	New renewal created for final testing  (Amazon Web Services). Renewal date: 2026-07-04	info	0	/renewals?search=RMT-01	2026-07-01 12:04:08.174838
267	\N	finance	New Renewal Added	New renewal created for final testing  (Amazon Web Services). Renewal date: 2026-07-04	info	0	/renewals?search=RMT-01	2026-07-01 12:04:08.175624
268	\N	finance	Email Sent	3-day reminder sent for final testing  (Amazon Web Services).	info	0	\N	2026-07-01 12:04:10.912342
269	\N	admin	Renewal Details Updated	Renewal details updated for client "final testing " (Amazon Web Services) by admin team. Reason: 6434.	info	0	/renewals?search=RMT-01	2026-07-01 12:41:15.410548
270	\N	finance	Renewal Details Updated	Renewal details updated for client "final testing " (Amazon Web Services) by admin team. Reason: 6434.	info	0	/renewals?search=RMT-01	2026-07-01 12:41:15.411464
271	\N	finance	Email Sent	5-day reminder sent for final testing  (Amazon Web Services).	info	0	\N	2026-07-01 12:41:18.716418
272	\N	sales	Follow-Up Required	Please meet final testing  regarding Amazon Web Services renewal (5 days left).	warning	0	\N	2026-07-01 12:41:19.808717
273	\N	finance	Email Sent	5-day reminder sent for final testing  (Amazon Web Services).	info	0	\N	2026-07-01 12:42:33.844585
274	\N	sales	Follow-Up Required	Please meet final testing  regarding Amazon Web Services renewal (5 days left).	warning	0	\N	2026-07-01 12:42:35.515462
275	\N	finance	Email Sent	5-day reminder sent for final testing  (Amazon Web Services).	info	0	\N	2026-07-01 12:45:28.235113
276	\N	sales	Follow-Up Required	Please meet final testing  regarding Amazon Web Services renewal (5 days left).	warning	0	\N	2026-07-01 12:45:29.244515
277	\N	admin	Renewal Deleted	Renewal for client "final testing " (Amazon Web Services) has been moved to trash by admin.	warning	0	/trash	2026-07-01 12:46:13.644867
278	\N	finance	Renewal Deleted	Renewal for client "final testing " (Amazon Web Services) has been moved to trash by admin.	warning	0	/trash	2026-07-01 12:46:13.645818
279	\N	sales	New Renewal Added	New renewal created for Test Client (Amazon Web Services). Renewal date: 2026-07-15	info	0	\N	2026-07-01 14:56:57.360954
280	\N	admin	New Renewal Added	New renewal created for Test Client (Amazon Web Services). Renewal date: 2026-07-15	info	0	/renewals?search=RMT-01	2026-07-01 14:56:57.363522
281	\N	finance	New Renewal Added	New renewal created for Test Client (Amazon Web Services). Renewal date: 2026-07-15	info	0	/renewals?search=RMT-01	2026-07-01 14:56:57.370211
282	\N	sales	Renewal Expired - Reason Required	Expired Test Client's Amazon Web Services renewal has expired. Please provide a reason for the expiry.	error	0	\N	2026-07-01 14:56:59.986395
283	\N	sales	New Renewal Added	New renewal created for Expired Test Client (Amazon Web Services). Renewal date: 2026-06-01	info	0	\N	2026-07-01 14:57:01.360664
284	\N	admin	New Renewal Added	New renewal created for Expired Test Client (Amazon Web Services). Renewal date: 2026-06-01	info	0	/renewals?search=RMT-02	2026-07-01 14:57:01.361681
285	\N	finance	New Renewal Added	New renewal created for Expired Test Client (Amazon Web Services). Renewal date: 2026-06-01	info	0	/renewals?search=RMT-02	2026-07-01 14:57:01.362625
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: marslab_schema; Owner: marslab_user
--

COPY marslab_schema.refresh_tokens (id, user_id, token_hash, expires_at, revoked, created_at) FROM stdin;
1	3	1b39d2ed0931567aa7cdd21fc8a276e058303f7b0a2f36ca680b84a54679c5e4	2036-06-23 11:59:47.686	0	2026-06-23 11:59:47.686971
2	3	df7f97b3cf654730757261a211a4118164db22c4c43eff5b4d8140a477e92180	2036-06-29 14:21:22.514	1	2026-06-29 14:21:22.515054
3	3	779c798392a78031a737698626fe492e774f602528b644a29bf350c26f670934	2036-06-29 14:57:34.393	1	2026-06-29 14:57:34.394466
4	3	7f93dcc44033d34096aa20159dbdbb57b2f652f92241ef1a7aec0dbacafb4f65	2036-06-30 09:47:10.566	1	2026-06-30 09:47:10.566775
6	2	b94a363d2b94cca12281a4c8c8ae35f840a6010b6bd1a971aac3fd2c75f0bda0	2036-06-30 09:51:13.728	1	2026-06-30 09:51:13.728189
7	2	a93d25db78b1aee88901b4b93b6229a6245733ad640ec286df33ef7544ba562a	2036-06-30 09:54:58.379	1	2026-06-30 09:54:58.379324
8	2	93f1279320c65e9b868c2d7ec9e27d1d91a679869ba003895596b8a178bd46f1	2036-06-30 10:14:53.7	0	2026-06-30 10:14:53.700964
5	3	81e223350919571ec84f86247e3e480156bc8a59d21bb4c1807a4de1592c29f5	2036-06-30 09:50:03.352	1	2026-06-30 09:50:03.352902
9	3	cbccbf6b812616334c482a3719188c82500a86a93e20b617d73fa4d079c285e6	2036-06-30 10:16:33.076	1	2026-06-30 10:16:33.07635
11	2	ec92b872bb282bdb0e0538a747ba8d33b307706a3500c86d37a696c947b18c28	2036-06-30 10:41:51.3	0	2026-06-30 10:41:51.300135
10	3	55f4998901722ef1b3a768e406e25f1f84d5012cdee6f70dd6ce85ebc31c73f4	2036-06-30 10:41:37.072	1	2026-06-30 10:41:37.072606
12	3	97e4aefa0623b8579b0caadd3e323c3e84c45aea5c1c776299448c3d4513d938	2036-06-30 10:46:33.306	1	2026-06-30 10:46:33.306816
13	3	4e7ee64c524da0efe7f3f5eda4902d259b47f2b317f55e6545ed7b596b40b74f	2036-06-30 10:56:18.007	1	2026-06-30 10:56:18.008204
14	3	6e3108b17934fa8044328463009dd9ee0c6f3720abb2f88877b2cb2a4aaba819	2036-06-30 11:45:06.312	0	2026-06-30 11:45:06.3131
15	3	791e11c08dcc0e74135784bf59891a523e8b66a259295944e6020f3aa41b3b63	2036-06-30 12:07:15.131	1	2026-06-30 12:07:15.131789
16	3	d268bb4ec6ff9d87dae0c74d60c5b90fca9038d93817d33e8f55c005c94ec4e4	2036-06-30 15:41:38.949	1	2026-06-30 15:41:38.949493
17	3	35585cc2b78d0bb30702e174f352f03629581e68984ead28b4208b0d988e8d67	2036-06-30 17:08:36.327	1	2026-06-30 17:08:36.32789
18	3	5810d3138ce01f72f47490e12cb36bb8dc7516c6b12c3ee9e3f3fb7206eef520	2036-06-30 17:30:16.158	1	2026-06-30 17:30:16.158462
19	3	000e41260d6f36b8b136377bce880bd52727ad207354c23cf26cbf024cb15f95	2036-06-30 17:46:22.725	1	2026-06-30 17:46:22.726032
20	3	acb35bcafd18481189db84e80dd5e2d0ac263ca103d1c85a7e737ee6e09d76b3	2036-06-30 18:03:39.064	1	2026-06-30 18:03:39.064914
21	3	a2d303905e6363486747214aa47c426233697468a7f0fd2ddfe95bcfe522521a	2036-07-01 09:51:27.142	1	2026-07-01 09:51:27.142833
22	3	a79b4f43a4229a37248877dfdb9dcd67bcf9bbc3dd53d8baa96f3df1151ba82a	2036-07-01 10:13:18.468	1	2026-07-01 10:13:18.468246
23	3	80cdf6008c1c4a387adde3d3f6fa4d4ed591740ebe8b57fb347d6d7147c8cfff	2036-07-01 10:13:21.165	1	2026-07-01 10:13:21.165841
24	3	d2bdaca8a9ae664b2820b9f4480e4764acbcb77436c8026c98ad835c2a09c97b	2036-07-01 10:15:46.056	1	2026-07-01 10:15:46.056665
25	3	77734e372a9c67d0f96a8122c55ce8b1e738fcd698d83bc6f4d4a87d8ae2e265	2036-07-01 10:15:52.184	1	2026-07-01 10:15:52.184665
26	3	88c45c0c47e9728abc73bdcc610192883795794c5a1d1a8a120ce2ff1c3d940c	2036-07-01 10:15:53.109	1	2026-07-01 10:15:53.110052
27	3	c3be59f9fdd98257b026580232706d056702606f034f7bb5d3865bb0f542d71f	2036-07-01 10:15:53.999	1	2026-07-01 10:15:53.999712
28	3	6dceaae0aed8b49839afa9bf70bfb4c83bf0d209480ede010e027cf0ac4caacd	2036-07-01 10:17:52.288	1	2026-07-01 10:17:52.28866
29	3	a694fc57eb4731d6a4a9315f47c4e7bdd0646c7b6e447b56926f8e5acb0b6438	2036-07-01 10:18:16.785	1	2026-07-01 10:18:16.785676
30	3	a4fc8753b70f91e62d1a8ed7a075165db3632351fbaf54ef46ebb964c400d6ab	2036-07-01 10:18:20.015	1	2026-07-01 10:18:20.015549
31	3	f7677427cba73549d43df2e25f737431fc0478797c70600fb67d352ec39139a9	2036-07-01 10:18:20.344	1	2026-07-01 10:18:20.344414
32	3	2b7a35b5acf97b239486e190a68a373dae00190a87b4b2cdb09d5e98e85518dc	2036-07-01 10:18:20.487	1	2026-07-01 10:18:20.488027
33	3	2f9f7380e056b48130494426520d3e6a154621684ae361c074ed883b79d49c75	2036-07-01 10:18:24.058	1	2026-07-01 10:18:24.058591
34	3	fa82177e598c2878cda5bdbc5d02e61e82d5ad1aba4d0ba1f5606577f8bbd35a	2036-07-01 10:18:24.801	1	2026-07-01 10:18:24.801625
35	3	47a35afc26da847da846696a31e2fa138cbb6d4a943ab325d4df0883bd793feb	2036-07-01 10:18:24.958	1	2026-07-01 10:18:24.958835
36	3	2703c8fbfe70d0c8592239f73f43638bdf5b299ac997ee99af7f768631f1f4af	2036-07-01 10:22:06.261	1	2026-07-01 10:22:06.262025
37	3	678b989017612a52fc45432a669ae5a63d87b6c5e29063bb2f178bce3d23fa1a	2036-07-01 10:27:07.033	1	2026-07-01 10:27:07.033718
38	3	fa61700fa4b6f263fd0a298ca8ed5a99196a2888feebf4677c2b2a7fbc68749a	2036-07-01 10:29:24.951	1	2026-07-01 10:29:24.951502
39	3	5432ea49727f59369da5c71061448d1b79a2eb61a57d9a752247cbe6d8268137	2036-07-01 10:40:53.538	1	2026-07-01 10:40:53.538724
40	3	efbb2fc2158da2a2938e9ce7a6ea81af62df348da81832aae23d645689ff4a88	2036-07-01 10:40:54.127	1	2026-07-01 10:40:54.127913
41	3	4b1b9c0553a51ff7ad94f1a3bf1a6da2d8959b88852bf4f84ef116fafd1c56ec	2036-07-01 10:40:54.503	1	2026-07-01 10:40:54.503982
42	3	717f81d92a4d1c05454cf53430b2a52c560ab8199fed0058f3824b20f7ffcb69	2036-07-01 10:40:54.691	1	2026-07-01 10:40:54.691931
43	3	b26bcd5572452451fd42feda745bc9b284d8d38f966aff19d218184777e6dcf9	2036-07-01 10:56:52.552	1	2026-07-01 10:56:52.552336
44	3	956e14b4e6cccce41c733a3de136b417f62868a8aba029b16cbd0caa4da8e7a6	2036-07-01 10:57:07.954	1	2026-07-01 10:57:07.954227
45	3	fa3fad9528764178eaddc2fd90172d6307870d19a72780871613532d8bfa24c6	2036-07-01 10:57:18.046	1	2026-07-01 10:57:18.046571
46	3	1b7460ac9d02d234e81c0876dc6279e4387898417b20585fffe94f467f2e4de6	2036-07-01 10:57:33.544	1	2026-07-01 10:57:33.544625
47	3	d1589fc2ccc318ef3699c21a7b197314b3d349e441169873fb74e46295d63961	2036-07-01 10:57:34.768	1	2026-07-01 10:57:34.768766
48	3	76e830a3147ee2d090348c37d38ecb30694e71bca3e9fe100ae1d32a505f4a40	2036-07-01 10:57:35.359	1	2026-07-01 10:57:35.359191
49	3	4b735ded6a28ab5034088c443ff4b9efe6e3703c1a40fa7c78464f9a0ffa53e3	2036-07-01 10:57:35.521	1	2026-07-01 10:57:35.521905
50	3	24ef804d0a1523572b168848a592b97825af95cc068a88b6867b7223d138e819	2036-07-01 10:57:35.709	1	2026-07-01 10:57:35.709157
51	3	205574c005f8e7cf1184448af131fdcaab64acf7e9ad6d62e08ebd65a23a4b02	2036-07-01 10:57:57.135	1	2026-07-01 10:57:57.135485
52	3	ebceee2a82d87d87790fa31e90add73b2ad560b2d5da59b071886edc96b5480b	2036-07-01 10:58:32.72	1	2026-07-01 10:58:32.720444
53	3	04e828ce422fa351bd5287e330287f2a0bbbafd8f59658d4bd8a72591f040396	2036-07-01 10:59:50.324	1	2026-07-01 10:59:50.324565
54	3	414f7ca7dd8cba57cce159d82e1354e3ae9efd9f2b5771cb22e6eba29606e9d7	2036-07-01 11:06:11.635	1	2026-07-01 11:06:11.635556
55	3	602ec68b5cc58547cb362d5daf88af539222f1ce4c3cc4857af1c768fee8f07d	2036-07-01 11:06:14.525	1	2026-07-01 11:06:14.525313
56	3	5a236a75e3df90932f2172f896f01553a07f016d1e8d12e1c1a16da7eb657642	2036-07-01 11:11:29.491	1	2026-07-01 11:11:29.492099
57	3	83735a81a599123a541720348d1b188f887a8c23c0e84ac7d979f2f053fcc472	2036-07-01 11:11:30.054	1	2026-07-01 11:11:30.054572
58	3	64d4c11317875550283d6b5e7faa12b5411b2a0335c740a29d348314c1c013ff	2036-07-01 11:11:30.228	1	2026-07-01 11:11:30.228724
59	3	da8cc039d5e7773d0ac027a7cc0243391da828794a8339b7c3efb192ebd9b6fd	2036-07-01 11:11:30.437	1	2026-07-01 11:11:30.437573
60	3	5687ac16cb1f12f5b828639f839f5f296b781176771729daf2d9fc7d26871548	2036-07-01 11:11:30.601	1	2026-07-01 11:11:30.601243
61	3	106601618e980f5402df820a61f99a63bacf3c0ce5990edd200883e70323b00f	2036-07-01 11:11:30.78	1	2026-07-01 11:11:30.780652
62	3	0e36d9a82222043633edc2375118ed3e437ac175abe9c824e47a17df53f2f727	2036-07-01 11:11:30.944	1	2026-07-01 11:11:30.944931
63	3	06c666d55a018fff0ccfe7dd87b420c886e8391f2688364ba5e339ddc1bd37b8	2036-07-01 11:11:54.321	1	2026-07-01 11:11:54.321672
64	3	76f92bcf4c34184a98d44888d21c1aaa1c5324e7d981cfda9111807c36881421	2036-07-01 11:11:55.217	1	2026-07-01 11:11:55.217774
65	3	7ea8d54180e95e37da9e53763fead28985c21a36b9e669ab807f68b88832ddc7	2036-07-01 11:11:55.794	1	2026-07-01 11:11:55.794751
66	3	1e0c957f132c646b10777f8d4cc14c02fc1f1dab4b337c68f5517ae508c9c3fa	2036-07-01 11:11:57.124	1	2026-07-01 11:11:57.124813
67	3	20b9ff7d4bd9edad03c9d75fe69d4cb05977dc4be2ecad370303d999c648e662	2036-07-01 11:11:57.886	1	2026-07-01 11:11:57.886847
68	3	2b5e3cfa0c274fcc7fc18512d6939ce392c0084e1e57e671eb581d35b731e442	2036-07-01 11:11:58.076	1	2026-07-01 11:11:58.076425
69	3	d1566293aca15259764a08600d7ed37ffc273ced271eac8040119c595ab6eec6	2036-07-01 11:11:58.286	1	2026-07-01 11:11:58.286597
70	3	c74f5fe36e74647ee12cdbfb6c5293abaa179bf69151d216caf814e0bc6cda10	2036-07-01 11:12:00.464	1	2026-07-01 11:12:00.465036
71	3	d775b825f2adb329979bd0a4b45ae8985f530f2a9330d931fc78ccc6a175fee7	2036-07-01 11:13:19.259	1	2026-07-01 11:13:19.25984
72	3	fddc027e1c9201def13db20ed8e94fa6b3663150026ee9df4500d0edaddf28f0	2036-07-01 11:15:34.659	1	2026-07-01 11:15:34.659857
73	3	26920a6700e1704311ed4b7fdcb7837349165c18db625a18d5538e81c6fdca6a	2036-07-01 11:19:46.284	1	2026-07-01 11:19:46.284922
74	3	9b9f12f48d5abecc4391088f60df77523957a5d179c92bb836d4cc0577eb14f0	2036-07-01 11:20:43.656	1	2026-07-01 11:20:43.656472
75	3	65fbc438e2a39e6a4df7f390fac4e18f97c9036577bd08c09401bf95494ee7fe	2036-07-01 11:28:13.214	0	2026-07-01 11:28:13.21511
\.


--
-- Data for Name: renewal_history; Type: TABLE DATA; Schema: marslab_schema; Owner: marslab_user
--

COPY marslab_schema.renewal_history (id, renewal_id, action, previous_data, new_data, performed_by, performed_at) FROM stdin;
400	338	created	\N	{"client_name":"Test Client","service":"Amazon Web Services","renewal_date":"2026-07-15","value":1000,"owner":"sakthivel.k@marslab.work","client_email":"client@test.com","sales_email":"sakthivel.k@marslab.work","contact_number":"1234567890","reference_id":"REF-123","status":"Pending Renewal","plan_period":"yearly_plan","plan_duration":1,"invoice_number":"INV-999"}	3	2026-07-01 14:56:57.358348
401	339	created	\N	{"client_name":"Expired Test Client","service":"Amazon Web Services","renewal_date":"2026-06-01","value":1000,"owner":"sakthivel.k@marslab.work","client_email":"client@test.com","sales_email":"sakthivel.k@marslab.work","contact_number":"1234567890","reference_id":"REF-124","status":"Expired","plan_period":"yearly_plan","plan_duration":1,"invoice_number":"INV-999"}	3	2026-07-01 14:57:01.359816
\.


--
-- Data for Name: renewals; Type: TABLE DATA; Schema: marslab_schema; Owner: marslab_user
--

COPY marslab_schema.renewals (id, unique_id, client_name, service, renewal_date, value, owner, client_email, sales_email, status, locked, follow_up_status, follow_up_remarks, day_30_sent, day_20_sent, day_15_sent, day_10_sent, day_5_sent, day_3_sent, sales_15_sent, sales_5_sent, created_by, created_at, updated_at, edit_status, edit_reason, sales_3_sent, renewal_confirmation, contact_number, reference_id, is_deleted, expiry_reason, invoice_status, plan_period, invoice_number, invoice_value, invoice_sent_date, payment_status, payment_amount, payment_received_date, client_latitude, client_longitude, day_0_sent, plan_duration, product, description, quantity, purchase_cost, total_purchase_cost, sales_cost, total_sales_cost, profit, vendor, entity) FROM stdin;
338	RMT-01	Test Client	Amazon Web Services	2026-07-15	1000	sakthivel.k@marslab.work	client@test.com	sakthivel.k@marslab.work	Pending Renewal	1			Yes	Yes	Yes	No	No	No	Yes	No	3	2026-07-01 14:56:57.351994	2026-07-01 14:56:57.351994	\N	\N	No	pending	1234567890	REF-123	f	\N	Not	yearly_plan	INV-999	\N	\N	No	\N	\N	12.97160000	77.59460000	No	1	aws	12345	1	800.00	800.00	1000.00	1000.00	200.00	Amazon	SID
339	RMT-02	Expired Test Client	Amazon Web Services	2026-06-01	1000	sakthivel.k@marslab.work	client@test.com	sakthivel.k@marslab.work	Expired	1			Yes	Yes	Yes	Yes	Yes	Yes	Yes	Yes	3	2026-07-01 14:56:59.982458	2026-07-01 14:56:59.982458	\N	\N	Yes	pending	1234567890	REF-124	f	\N	Not	yearly_plan	INV-999	\N	\N	No	\N	\N	12.97160000	77.59460000	Yes	1	aws	12345	1	800.00	800.00	1000.00	1000.00	200.00	Amazon	SID
\.


--
-- Data for Name: trash_renewals; Type: TABLE DATA; Schema: marslab_schema; Owner: marslab_user
--

COPY marslab_schema.trash_renewals (id, original_id, unique_id, client_name, service, renewal_date, value, owner, client_email, sales_email, status, locked, follow_up_status, follow_up_remarks, day_30_sent, day_20_sent, day_15_sent, day_10_sent, day_5_sent, day_3_sent, sales_15_sent, sales_5_sent, created_by, created_at, updated_at, edit_status, edit_reason, sales_3_sent, renewal_confirmation, contact_number, reference_id, deleted_at, invoice_status, plan_period, invoice_number, invoice_value, invoice_sent_date, expiry_reason, payment_status, payment_amount, payment_received_date, client_latitude, client_longitude, day_0_sent, plan_duration, product, description, quantity, purchase_cost, total_purchase_cost, sales_cost, total_sales_cost, profit, vendor, entity) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: marslab_schema; Owner: marslab_user
--

COPY marslab_schema.users (id, username, email, password, full_name, role, avatar_color, created_at, updated_at, otp_code, otp_expires_at, is_active) FROM stdin;
3	sameerulrahman.f@marslab.work	sameerulrahman.f@marslab.work	$2a$10$HQaLhgC.WNRfotlRcGioWeu8yDedQ3hmzLQDCGN4h7oChFdJdFwyW	System Admin	admin	#f59e0b	2026-05-19 10:53:31.452297	2026-05-19 10:53:31.452297	956011	2026-05-19 12:55:46.216	t
1	financial.analyst@sidcorptech.in	financial.analyst@sidcorptech.in	$2a$10$n4zW/m1BC1CF/i.001GEsOnO/xZE2ZI6TQsZZlF6UZocbP0M/w3sq	Finance Lead	finance	#3b82f6	2026-05-19 10:53:31.446987	2026-05-19 10:53:31.446987	\N	\N	t
2	sakthivel.k@marslab.work	sakthivel.k@marslab.work	$2a$10$vKpWDgqG4AnX3LXxw.HPMu0PLkmY44Bfbx65ks0ONSVYgSgJ3na5u	Sakthivel K	sales	#10b981	2026-05-19 10:53:31.451004	2026-06-30 09:50:38.272192	\N	\N	t
\.


--
-- Data for Name: visit_locations; Type: TABLE DATA; Schema: marslab_schema; Owner: marslab_user
--

COPY marslab_schema.visit_locations (id, visit_id, latitude, longitude, accuracy, captured_at) FROM stdin;
\.


--
-- Data for Name: visits; Type: TABLE DATA; Schema: marslab_schema; Owner: marslab_user
--

COPY marslab_schema.visits (id, renewal_id, cst_id, status, start_time, arrival_time, check_in_time, check_out_time, start_latitude, start_longitude, client_reached, arrival_latitude, arrival_longitude, arrival_distance_meters, notes, photo_data, created_at, updated_at) FROM stdin;
\.


--
-- Name: activity_logs_id_seq; Type: SEQUENCE SET; Schema: marslab_schema; Owner: marslab_user
--

SELECT pg_catalog.setval('marslab_schema.activity_logs_id_seq', 1154, true);


--
-- Name: automation_logs_id_seq; Type: SEQUENCE SET; Schema: marslab_schema; Owner: marslab_user
--

SELECT pg_catalog.setval('marslab_schema.automation_logs_id_seq', 2, true);


--
-- Name: email_logs_id_seq; Type: SEQUENCE SET; Schema: marslab_schema; Owner: marslab_user
--

SELECT pg_catalog.setval('marslab_schema.email_logs_id_seq', 90, true);


--
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: marslab_schema; Owner: marslab_user
--

SELECT pg_catalog.setval('marslab_schema.notifications_id_seq', 285, true);


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: marslab_schema; Owner: marslab_user
--

SELECT pg_catalog.setval('marslab_schema.refresh_tokens_id_seq', 75, true);


--
-- Name: renewal_history_id_seq; Type: SEQUENCE SET; Schema: marslab_schema; Owner: marslab_user
--

SELECT pg_catalog.setval('marslab_schema.renewal_history_id_seq', 401, true);


--
-- Name: renewals_id_seq; Type: SEQUENCE SET; Schema: marslab_schema; Owner: marslab_user
--

SELECT pg_catalog.setval('marslab_schema.renewals_id_seq', 339, true);


--
-- Name: trash_renewals_id_seq; Type: SEQUENCE SET; Schema: marslab_schema; Owner: marslab_user
--

SELECT pg_catalog.setval('marslab_schema.trash_renewals_id_seq', 325, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: marslab_schema; Owner: marslab_user
--

SELECT pg_catalog.setval('marslab_schema.users_id_seq', 9, true);


--
-- Name: visit_locations_id_seq; Type: SEQUENCE SET; Schema: marslab_schema; Owner: marslab_user
--

SELECT pg_catalog.setval('marslab_schema.visit_locations_id_seq', 1, false);


--
-- Name: visits_id_seq; Type: SEQUENCE SET; Schema: marslab_schema; Owner: marslab_user
--

SELECT pg_catalog.setval('marslab_schema.visits_id_seq', 1, false);


--
-- Name: activity_logs activity_logs_pkey; Type: CONSTRAINT; Schema: marslab_schema; Owner: marslab_user
--

ALTER TABLE ONLY marslab_schema.activity_logs
    ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: marslab_schema; Owner: marslab_user
--

ALTER TABLE ONLY marslab_schema.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: automation_logs automation_logs_pkey; Type: CONSTRAINT; Schema: marslab_schema; Owner: marslab_user
--

ALTER TABLE ONLY marslab_schema.automation_logs
    ADD CONSTRAINT automation_logs_pkey PRIMARY KEY (id);


--
-- Name: automation_settings automation_settings_pkey; Type: CONSTRAINT; Schema: marslab_schema; Owner: marslab_user
--

ALTER TABLE ONLY marslab_schema.automation_settings
    ADD CONSTRAINT automation_settings_pkey PRIMARY KEY (key);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: marslab_schema; Owner: marslab_user
--

ALTER TABLE ONLY marslab_schema.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: email_logs email_logs_pkey; Type: CONSTRAINT; Schema: marslab_schema; Owner: marslab_user
--

ALTER TABLE ONLY marslab_schema.email_logs
    ADD CONSTRAINT email_logs_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: marslab_schema; Owner: marslab_user
--

ALTER TABLE ONLY marslab_schema.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: marslab_schema; Owner: marslab_user
--

ALTER TABLE ONLY marslab_schema.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_token_hash_key; Type: CONSTRAINT; Schema: marslab_schema; Owner: marslab_user
--

ALTER TABLE ONLY marslab_schema.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_hash_key UNIQUE (token_hash);


--
-- Name: renewal_history renewal_history_pkey; Type: CONSTRAINT; Schema: marslab_schema; Owner: marslab_user
--

ALTER TABLE ONLY marslab_schema.renewal_history
    ADD CONSTRAINT renewal_history_pkey PRIMARY KEY (id);


--
-- Name: renewals renewals_pkey; Type: CONSTRAINT; Schema: marslab_schema; Owner: marslab_user
--

ALTER TABLE ONLY marslab_schema.renewals
    ADD CONSTRAINT renewals_pkey PRIMARY KEY (id);


--
-- Name: renewals renewals_unique_id_key; Type: CONSTRAINT; Schema: marslab_schema; Owner: marslab_user
--

ALTER TABLE ONLY marslab_schema.renewals
    ADD CONSTRAINT renewals_unique_id_key UNIQUE (unique_id);


--
-- Name: trash_renewals trash_renewals_pkey; Type: CONSTRAINT; Schema: marslab_schema; Owner: marslab_user
--

ALTER TABLE ONLY marslab_schema.trash_renewals
    ADD CONSTRAINT trash_renewals_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: marslab_schema; Owner: marslab_user
--

ALTER TABLE ONLY marslab_schema.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: marslab_schema; Owner: marslab_user
--

ALTER TABLE ONLY marslab_schema.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: marslab_schema; Owner: marslab_user
--

ALTER TABLE ONLY marslab_schema.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: visit_locations visit_locations_pkey; Type: CONSTRAINT; Schema: marslab_schema; Owner: marslab_user
--

ALTER TABLE ONLY marslab_schema.visit_locations
    ADD CONSTRAINT visit_locations_pkey PRIMARY KEY (id);


--
-- Name: visits visits_pkey; Type: CONSTRAINT; Schema: marslab_schema; Owner: marslab_user
--

ALTER TABLE ONLY marslab_schema.visits
    ADD CONSTRAINT visits_pkey PRIMARY KEY (id);


--
-- Name: idx_audit_logs_action; Type: INDEX; Schema: marslab_schema; Owner: marslab_user
--

CREATE INDEX idx_audit_logs_action ON marslab_schema.audit_logs USING btree (action);


--
-- Name: idx_audit_logs_client; Type: INDEX; Schema: marslab_schema; Owner: marslab_user
--

CREATE INDEX idx_audit_logs_client ON marslab_schema.audit_logs USING btree (client_id, created_at DESC);


--
-- Name: idx_audit_logs_created; Type: INDEX; Schema: marslab_schema; Owner: marslab_user
--

CREATE INDEX idx_audit_logs_created ON marslab_schema.audit_logs USING btree (created_at DESC);


--
-- Name: idx_clients_created; Type: INDEX; Schema: marslab_schema; Owner: marslab_user
--

CREATE INDEX idx_clients_created ON marslab_schema.clients USING btree (created_at DESC);


--
-- Name: idx_clients_is_deleted; Type: INDEX; Schema: marslab_schema; Owner: marslab_user
--

CREATE INDEX idx_clients_is_deleted ON marslab_schema.clients USING btree (is_deleted);


--
-- Name: idx_clients_name; Type: INDEX; Schema: marslab_schema; Owner: marslab_user
--

CREATE INDEX idx_clients_name ON marslab_schema.clients USING btree (client_name);


--
-- Name: idx_clients_service; Type: INDEX; Schema: marslab_schema; Owner: marslab_user
--

CREATE INDEX idx_clients_service ON marslab_schema.clients USING btree (service);


--
-- Name: idx_visit_locations_visit; Type: INDEX; Schema: marslab_schema; Owner: marslab_user
--

CREATE INDEX idx_visit_locations_visit ON marslab_schema.visit_locations USING btree (visit_id, captured_at DESC);


--
-- Name: idx_visits_cst_status; Type: INDEX; Schema: marslab_schema; Owner: marslab_user
--

CREATE INDEX idx_visits_cst_status ON marslab_schema.visits USING btree (cst_id, status);


--
-- Name: idx_visits_renewal; Type: INDEX; Schema: marslab_schema; Owner: marslab_user
--

CREATE INDEX idx_visits_renewal ON marslab_schema.visits USING btree (renewal_id);


--
-- Name: clients trg_clients_updated_at; Type: TRIGGER; Schema: marslab_schema; Owner: marslab_user
--

CREATE TRIGGER trg_clients_updated_at BEFORE UPDATE ON marslab_schema.clients FOR EACH ROW EXECUTE FUNCTION marslab_schema.set_updated_at();


--
-- Name: renewals trigger_recalc_renewal_sent_flags; Type: TRIGGER; Schema: marslab_schema; Owner: marslab_user
--

CREATE TRIGGER trigger_recalc_renewal_sent_flags BEFORE INSERT OR UPDATE ON marslab_schema.renewals FOR EACH ROW EXECUTE FUNCTION marslab_schema.recalc_renewal_sent_flags();


--
-- Name: activity_logs activity_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: marslab_schema; Owner: marslab_user
--

ALTER TABLE ONLY marslab_schema.activity_logs
    ADD CONSTRAINT activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES marslab_schema.users(id);


--
-- Name: audit_logs audit_logs_client_id_fkey; Type: FK CONSTRAINT; Schema: marslab_schema; Owner: marslab_user
--

ALTER TABLE ONLY marslab_schema.audit_logs
    ADD CONSTRAINT audit_logs_client_id_fkey FOREIGN KEY (client_id) REFERENCES marslab_schema.clients(id) ON DELETE SET NULL;


--
-- Name: automation_logs automation_logs_performed_by_fkey; Type: FK CONSTRAINT; Schema: marslab_schema; Owner: marslab_user
--

ALTER TABLE ONLY marslab_schema.automation_logs
    ADD CONSTRAINT automation_logs_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES marslab_schema.users(id);


--
-- Name: automation_settings automation_settings_updated_by_fkey; Type: FK CONSTRAINT; Schema: marslab_schema; Owner: marslab_user
--

ALTER TABLE ONLY marslab_schema.automation_settings
    ADD CONSTRAINT automation_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES marslab_schema.users(id);


--
-- Name: email_logs email_logs_renewal_id_fkey; Type: FK CONSTRAINT; Schema: marslab_schema; Owner: marslab_user
--

ALTER TABLE ONLY marslab_schema.email_logs
    ADD CONSTRAINT email_logs_renewal_id_fkey FOREIGN KEY (renewal_id) REFERENCES marslab_schema.renewals(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: marslab_schema; Owner: marslab_user
--

ALTER TABLE ONLY marslab_schema.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES marslab_schema.users(id);


--
-- Name: refresh_tokens refresh_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: marslab_schema; Owner: marslab_user
--

ALTER TABLE ONLY marslab_schema.refresh_tokens
    ADD CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES marslab_schema.users(id) ON DELETE CASCADE;


--
-- Name: renewal_history renewal_history_performed_by_fkey; Type: FK CONSTRAINT; Schema: marslab_schema; Owner: marslab_user
--

ALTER TABLE ONLY marslab_schema.renewal_history
    ADD CONSTRAINT renewal_history_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES marslab_schema.users(id);


--
-- Name: renewal_history renewal_history_renewal_id_fkey; Type: FK CONSTRAINT; Schema: marslab_schema; Owner: marslab_user
--

ALTER TABLE ONLY marslab_schema.renewal_history
    ADD CONSTRAINT renewal_history_renewal_id_fkey FOREIGN KEY (renewal_id) REFERENCES marslab_schema.renewals(id) ON DELETE CASCADE;


--
-- Name: renewals renewals_created_by_fkey; Type: FK CONSTRAINT; Schema: marslab_schema; Owner: marslab_user
--

ALTER TABLE ONLY marslab_schema.renewals
    ADD CONSTRAINT renewals_created_by_fkey FOREIGN KEY (created_by) REFERENCES marslab_schema.users(id);


--
-- Name: visit_locations visit_locations_visit_id_fkey; Type: FK CONSTRAINT; Schema: marslab_schema; Owner: marslab_user
--

ALTER TABLE ONLY marslab_schema.visit_locations
    ADD CONSTRAINT visit_locations_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES marslab_schema.visits(id) ON DELETE CASCADE;


--
-- Name: visits visits_cst_id_fkey; Type: FK CONSTRAINT; Schema: marslab_schema; Owner: marslab_user
--

ALTER TABLE ONLY marslab_schema.visits
    ADD CONSTRAINT visits_cst_id_fkey FOREIGN KEY (cst_id) REFERENCES marslab_schema.users(id) ON DELETE CASCADE;


--
-- Name: visits visits_renewal_id_fkey; Type: FK CONSTRAINT; Schema: marslab_schema; Owner: marslab_user
--

ALTER TABLE ONLY marslab_schema.visits
    ADD CONSTRAINT visits_renewal_id_fkey FOREIGN KEY (renewal_id) REFERENCES marslab_schema.renewals(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict ewrzR3dc4vbH9sqwwqfOZQzqIPjCEDHVDsaVahzDde011Bdj2XfYZGZjqqhIjEZ

