--
-- PostgreSQL database dump
--

\restrict 7J3fKscIy9Am6CsAaUli3Z1MCYW9ODDE7ZWRCGBuARoOCq1eA8tJ2SjmXdeAN3g

-- Dumped from database version 15.18
-- Dumped by pg_dump version 15.18

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


ALTER TABLE marslab_schema.activity_logs_id_seq OWNER TO marslab_user;

--
-- Name: activity_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: marslab_schema; Owner: marslab_user
--

ALTER SEQUENCE marslab_schema.activity_logs_id_seq OWNED BY marslab_schema.activity_logs.id;


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
    CONSTRAINT email_logs_recipient_type_check CHECK (((recipient_type)::text = ANY ((ARRAY['client'::character varying, 'sales'::character varying])::text[]))),
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


ALTER TABLE marslab_schema.email_logs_id_seq OWNER TO marslab_user;

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


ALTER TABLE marslab_schema.notifications_id_seq OWNER TO marslab_user;

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


ALTER TABLE marslab_schema.refresh_tokens_id_seq OWNER TO marslab_user;

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


ALTER TABLE marslab_schema.renewal_history_id_seq OWNER TO marslab_user;

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
    contact_number character varying(50) DEFAULT ''::character varying,
    reference_id character varying(100) DEFAULT ''::character varying,
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
    renewal_confirmation character varying(50) DEFAULT 'pending'::character varying,
    edit_status character varying(50) DEFAULT NULL::character varying,
    edit_reason text,
    is_deleted boolean DEFAULT false,
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
    CONSTRAINT renewals_day_10_sent_check CHECK (((day_10_sent)::text = ANY ((ARRAY['Yes'::character varying, 'No'::character varying])::text[]))),
    CONSTRAINT renewals_day_15_sent_check CHECK (((day_15_sent)::text = ANY ((ARRAY['Yes'::character varying, 'No'::character varying])::text[]))),
    CONSTRAINT renewals_day_20_sent_check CHECK (((day_20_sent)::text = ANY ((ARRAY['Yes'::character varying, 'No'::character varying])::text[]))),
    CONSTRAINT renewals_day_30_sent_check CHECK (((day_30_sent)::text = ANY ((ARRAY['Yes'::character varying, 'No'::character varying])::text[]))),
    CONSTRAINT renewals_day_3_sent_check CHECK (((day_3_sent)::text = ANY ((ARRAY['Yes'::character varying, 'No'::character varying])::text[]))),
    CONSTRAINT renewals_day_5_sent_check CHECK (((day_5_sent)::text = ANY ((ARRAY['Yes'::character varying, 'No'::character varying])::text[]))),
    CONSTRAINT renewals_invoice_status_check CHECK (((invoice_status)::text = ANY ((ARRAY['Sent'::character varying, 'Not'::character varying])::text[]))),
    CONSTRAINT renewals_sales_15_sent_check CHECK (((sales_15_sent)::text = ANY ((ARRAY['Yes'::character varying, 'No'::character varying])::text[]))),
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


ALTER TABLE marslab_schema.renewals_id_seq OWNER TO marslab_user;

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
    client_longitude numeric(11,8)
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


ALTER TABLE marslab_schema.trash_renewals_id_seq OWNER TO marslab_user;

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
    otp_code character varying(6),
    otp_expires_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
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


ALTER TABLE marslab_schema.users_id_seq OWNER TO marslab_user;

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


ALTER TABLE marslab_schema.visit_locations_id_seq OWNER TO marslab_user;

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
    cst_id integer NOT NULL,
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


ALTER TABLE marslab_schema.visits_id_seq OWNER TO marslab_user;

--
-- Name: visits_id_seq; Type: SEQUENCE OWNED BY; Schema: marslab_schema; Owner: marslab_user
--

ALTER SEQUENCE marslab_schema.visits_id_seq OWNED BY marslab_schema.visits.id;


--
-- Name: activity_logs id; Type: DEFAULT; Schema: marslab_schema; Owner: marslab_user
--

ALTER TABLE ONLY marslab_schema.activity_logs ALTER COLUMN id SET DEFAULT nextval('marslab_schema.activity_logs_id_seq'::regclass);


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
-- Name: activity_logs activity_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: marslab_schema; Owner: marslab_user
--

ALTER TABLE ONLY marslab_schema.activity_logs
    ADD CONSTRAINT activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES marslab_schema.users(id);


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

\unrestrict 7J3fKscIy9Am6CsAaUli3Z1MCYW9ODDE7ZWRCGBuARoOCq1eA8tJ2SjmXdeAN3g

