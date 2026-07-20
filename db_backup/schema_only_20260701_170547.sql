--
-- PostgreSQL database dump
--

\restrict Udq5cacIpQCMp1hT3J52ceOrAfFEvtwdKhaklhgeuq6ykfC0Fgzbp1u59isYzsx

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

\unrestrict Udq5cacIpQCMp1hT3J52ceOrAfFEvtwdKhaklhgeuq6ykfC0Fgzbp1u59isYzsx

