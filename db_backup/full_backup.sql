--
-- PostgreSQL database dump
--

\restrict YlsikVGe6EmcKMBHV097wOc2f67yC4JCSdd0AHbZ6F7uxIPeEg5gntb7oZAEuK5

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
-- Data for Name: activity_logs; Type: TABLE DATA; Schema: marslab_schema; Owner: marslab_user
--

COPY marslab_schema.activity_logs (id, user_id, action, entity_type, entity_id, details, ip_address, created_at) FROM stdin;
1	1	create	renewal	RMT-01	Created renewal for testing - m365	\N	2026-05-21 07:47:20.41811
2	1	edit	renewal	RMT-01	Edited renewal details for testing. Reason: test	\N	2026-05-21 07:48:29.215394
3	1	edit	renewal	RMT-01	Edited renewal details for testing. Reason: test	\N	2026-05-21 07:53:06.877179
4	1	edit	renewal	RMT-01	Edited renewal details for testing. Reason: test	\N	2026-05-21 08:30:55.6288
5	1	create	renewal	RMT-02	Created renewal for Sidcorptech - Cloud-AWS	\N	2026-05-21 09:37:29.880118
6	1	renewal_confirmation	renewal	RMT-02	Admin marked Sidcorptech (Cloud-AWS) as "Awaiting Client Approval". 	\N	2026-05-21 09:38:00.087414
7	1	renewal_confirmation	renewal	RMT-01	Admin marked testing (m365) as "Quotation Confirmation". 	\N	2026-05-21 09:38:15.947178
8	1	create	renewal	RMT-03	Created renewal via CSV import for Delta Consulting 7 - GitHub Enterprise	\N	2026-05-21 09:45:17.360146
9	1	create	renewal	RMT-04	Created renewal via CSV import for Gamma Enterprises 5 - GitHub Enterprise	\N	2026-05-21 09:45:17.360146
10	1	create	renewal	RMT-05	Created renewal via CSV import for Phi Marketing 3 - Google Workspace Enterprise	\N	2026-05-21 09:45:17.360146
11	1	create	renewal	RMT-06	Created renewal via CSV import for Delta Consulting 6 - Zoom Pro Subscription	\N	2026-05-21 09:45:17.360146
12	1	create	renewal	RMT-07	Created renewal via CSV import for Chi Dev 9 - Slack Pro Workspace	\N	2026-05-21 09:45:17.360146
13	1	create	renewal	RMT-08	Created renewal via CSV import for Omega Holdings 6 - Salesforce CRM	\N	2026-05-21 09:45:17.360146
14	1	create	renewal	RMT-09	Created renewal via CSV import for Omicron Media 9 - GitHub Enterprise	\N	2026-05-21 09:45:17.360146
15	1	create	renewal	RMT-10	Created renewal via CSV import for Iota Digital 1 - Google Workspace Enterprise	\N	2026-05-21 09:45:17.360146
16	1	create	renewal	RMT-11	Created renewal via CSV import for Omicron Media 5 - Figma Design Plan	\N	2026-05-21 09:45:17.360146
17	1	create	renewal	RMT-12	Created renewal via CSV import for Epsilon Software 8 - Zendesk Support Enterprise	\N	2026-05-21 09:45:17.360146
18	1	create	renewal	RMT-13	Created renewal via CSV import for Upsilon Finance 2 - Microsoft 365 Business Standard	\N	2026-05-21 09:45:17.360146
19	1	create	renewal	RMT-14	Created renewal via CSV import for Nu Logistics 6 - Jira Cloud Premium	\N	2026-05-21 09:45:17.360146
20	1	create	renewal	RMT-15	Created renewal via CSV import for Lambda Group 2 - Dropbox Business	\N	2026-05-21 09:45:17.360146
21	1	create	renewal	RMT-16	Created renewal via CSV import for Omicron Media 5 - GitHub Enterprise	\N	2026-05-21 09:45:17.360146
22	1	create	renewal	RMT-17	Created renewal via CSV import for Upsilon Finance 6 - Asana Business	\N	2026-05-21 09:45:17.360146
23	1	create	renewal	RMT-18	Created renewal via CSV import for Alpha Technologies 3 - Microsoft 365 Business Standard	\N	2026-05-21 09:45:17.360146
24	1	create	renewal	RMT-19	Created renewal via CSV import for Zeta Systems 1 - Dropbox Business	\N	2026-05-21 09:45:17.360146
25	1	create	renewal	RMT-20	Created renewal via CSV import for Theta Labs 7 - Jira Cloud Premium	\N	2026-05-21 09:45:17.360146
26	1	create	renewal	RMT-21	Created renewal via CSV import for Gamma Enterprises 9 - Zendesk Support Enterprise	\N	2026-05-21 09:45:17.360146
27	1	create	renewal	RMT-22	Created renewal via CSV import for Kappa Tech 9 - Jira Cloud Premium	\N	2026-05-21 09:45:17.360146
28	1	create	renewal	RMT-23	Created renewal via CSV import for Kappa Tech 6 - Asana Business	\N	2026-05-21 09:45:17.360146
29	1	create	renewal	RMT-24	Created renewal via CSV import for Beta Solutions 3 - Zendesk Support Enterprise	\N	2026-05-21 09:45:17.360146
30	1	create	renewal	RMT-25	Created renewal via CSV import for Omicron Media 4 - Slack Pro Workspace	\N	2026-05-21 09:45:17.360146
31	1	create	renewal	RMT-26	Created renewal via CSV import for Kappa Tech 1 - Figma Design Plan	\N	2026-05-21 09:45:17.360146
32	1	create	renewal	RMT-27	Created renewal via CSV import for Beta Solutions 8 - GitHub Enterprise	\N	2026-05-21 09:45:17.360146
33	1	create	renewal	RMT-28	Created renewal via CSV import for Delta Consulting 5 - Zoom Pro Subscription	\N	2026-05-21 09:45:17.360146
34	1	create	renewal	RMT-29	Created renewal via CSV import for Upsilon Finance 2 - Microsoft 365 Business Standard	\N	2026-05-21 09:45:17.360146
35	1	create	renewal	RMT-30	Created renewal via CSV import for Phi Marketing 5 - Adobe Creative Cloud	\N	2026-05-21 09:45:17.360146
36	1	create	renewal	RMT-31	Created renewal via CSV import for Upsilon Finance 9 - Adobe Creative Cloud	\N	2026-05-21 09:45:17.360146
37	1	create	renewal	RMT-32	Created renewal via CSV import for Kappa Tech 2 - Jira Cloud Premium	\N	2026-05-21 09:45:17.360146
38	1	create	renewal	RMT-33	Created renewal via CSV import for Mu Services 6 - Zendesk Support Enterprise	\N	2026-05-21 09:45:17.360146
39	1	create	renewal	RMT-34	Created renewal via CSV import for Delta Consulting 5 - Zoom Pro Subscription	\N	2026-05-21 09:45:17.360146
40	1	create	renewal	RMT-35	Created renewal via CSV import for Sigma Retail 2 - Figma Design Plan	\N	2026-05-21 09:45:17.360146
41	1	create	renewal	RMT-36	Created renewal via CSV import for Delta Consulting 2 - Zendesk Support Enterprise	\N	2026-05-21 09:45:17.360146
42	1	create	renewal	RMT-37	Created renewal via CSV import for Sigma Retail 1 - Adobe Creative Cloud	\N	2026-05-21 09:45:17.360146
43	1	create	renewal	RMT-38	Created renewal via CSV import for Nu Logistics 1 - Jira Cloud Premium	\N	2026-05-21 09:45:17.360146
44	1	create	renewal	RMT-39	Created renewal via CSV import for Rho Global 4 - Mailchimp Premium	\N	2026-05-21 09:45:17.360146
45	1	create	renewal	RMT-40	Created renewal via CSV import for Phi Marketing 8 - GitHub Enterprise	\N	2026-05-21 09:45:17.360146
46	1	create	renewal	RMT-41	Created renewal via CSV import for Xi Industries 1 - GitHub Enterprise	\N	2026-05-21 09:45:17.360146
47	1	create	renewal	RMT-42	Created renewal via CSV import for Eta Ventures 2 - Figma Design Plan	\N	2026-05-21 09:45:17.360146
48	1	create	renewal	RMT-43	Created renewal via CSV import for Omicron Media 7 - Zendesk Support Enterprise	\N	2026-05-21 09:45:17.360146
49	1	create	renewal	RMT-44	Created renewal via CSV import for Pi Analytics 3 - Salesforce CRM	\N	2026-05-21 09:45:17.360146
50	1	create	renewal	RMT-45	Created renewal via CSV import for Nu Logistics 9 - Figma Design Plan	\N	2026-05-21 09:45:17.360146
51	1	create	renewal	RMT-46	Created renewal via CSV import for Alpha Technologies 3 - Dropbox Business	\N	2026-05-21 09:45:17.360146
52	1	create	renewal	RMT-47	Created renewal via CSV import for Lambda Group 2 - Figma Design Plan	\N	2026-05-21 09:45:17.360146
53	1	create	renewal	RMT-48	Created renewal via CSV import for Mu Services 7 - AWS Cloud Hosting	\N	2026-05-21 09:45:17.360146
54	1	create	renewal	RMT-49	Created renewal via CSV import for Rho Global 9 - Slack Pro Workspace	\N	2026-05-21 09:45:17.360146
55	1	create	renewal	RMT-50	Created renewal via CSV import for Eta Ventures 4 - Dropbox Business	\N	2026-05-21 09:45:17.360146
56	1	create	renewal	RMT-51	Created renewal via CSV import for Mu Services 2 - Dropbox Business	\N	2026-05-21 09:45:17.360146
57	1	create	renewal	RMT-52	Created renewal via CSV import for Phi Marketing 3 - GitHub Enterprise	\N	2026-05-21 09:45:17.360146
530	2	login	user	\N	Sakthivel K logged in via Zoho SSO.	\N	2026-05-30 04:11:51.242865
58	1	create	renewal	RMT-53	Created renewal via CSV import for Delta Consulting 8 - Jira Cloud Premium	\N	2026-05-21 09:45:17.360146
59	1	create	renewal	RMT-54	Created renewal via CSV import for Phi Marketing 7 - Mailchimp Premium	\N	2026-05-21 09:45:17.360146
60	1	create	renewal	RMT-55	Created renewal via CSV import for Delta Consulting 6 - Microsoft 365 Business Standard	\N	2026-05-21 09:45:17.360146
61	1	create	renewal	RMT-56	Created renewal via CSV import for Alpha Technologies 7 - Asana Business	\N	2026-05-21 09:45:17.360146
62	1	create	renewal	RMT-57	Created renewal via CSV import for Lambda Group 8 - Zoom Pro Subscription	\N	2026-05-21 09:45:17.360146
63	1	create	renewal	RMT-58	Created renewal via CSV import for Xi Industries 4 - Zoom Pro Subscription	\N	2026-05-21 09:45:17.360146
64	1	create	renewal	RMT-59	Created renewal via CSV import for Upsilon Finance 4 - Mailchimp Premium	\N	2026-05-21 09:45:17.360146
65	1	create	renewal	RMT-60	Created renewal via CSV import for Phi Marketing 5 - Adobe Creative Cloud	\N	2026-05-21 09:45:17.360146
66	1	create	renewal	RMT-61	Created renewal via CSV import for Omega Holdings 9 - Figma Design Plan	\N	2026-05-21 09:45:17.360146
67	1	create	renewal	RMT-62	Created renewal via CSV import for Tau Healthcare 5 - Asana Business	\N	2026-05-21 09:45:17.360146
68	1	create	renewal	RMT-63	Created renewal via CSV import for Omega Holdings 4 - Adobe Creative Cloud	\N	2026-05-21 09:45:17.360146
69	1	create	renewal	RMT-64	Created renewal via CSV import for Kappa Tech 2 - HubSpot Suite	\N	2026-05-21 09:45:17.360146
70	1	create	renewal	RMT-65	Created renewal via CSV import for Iota Digital 1 - Adobe Creative Cloud	\N	2026-05-21 09:45:17.360146
71	1	create	renewal	RMT-66	Created renewal via CSV import for Omega Holdings 5 - Adobe Creative Cloud	\N	2026-05-21 09:45:17.360146
72	1	create	renewal	RMT-67	Created renewal via CSV import for Tau Healthcare 9 - Jira Cloud Premium	\N	2026-05-21 09:45:17.360146
73	1	create	renewal	RMT-68	Created renewal via CSV import for Rho Global 1 - Zoom Pro Subscription	\N	2026-05-21 09:45:17.360146
74	1	create	renewal	RMT-69	Created renewal via CSV import for Xi Industries 3 - Google Workspace Enterprise	\N	2026-05-21 09:45:17.360146
75	1	create	renewal	RMT-70	Created renewal via CSV import for Eta Ventures 5 - Google Workspace Enterprise	\N	2026-05-21 09:45:17.360146
76	1	create	renewal	RMT-71	Created renewal via CSV import for Chi Dev 1 - Slack Pro Workspace	\N	2026-05-21 09:45:17.360146
77	1	create	renewal	RMT-72	Created renewal via CSV import for Zeta Systems 1 - HubSpot Suite	\N	2026-05-21 09:45:17.360146
78	1	create	renewal	RMT-73	Created renewal via CSV import for Sigma Retail 4 - Slack Pro Workspace	\N	2026-05-21 09:45:17.360146
79	1	create	renewal	RMT-74	Created renewal via CSV import for Gamma Enterprises 2 - Zendesk Support Enterprise	\N	2026-05-21 09:45:17.360146
80	1	create	renewal	RMT-75	Created renewal via CSV import for Omega Holdings 7 - AWS Cloud Hosting	\N	2026-05-21 09:45:17.360146
81	1	create	renewal	RMT-76	Created renewal via CSV import for Iota Digital 9 - Google Workspace Enterprise	\N	2026-05-21 09:45:17.360146
82	1	create	renewal	RMT-77	Created renewal via CSV import for Rho Global 5 - Google Workspace Enterprise	\N	2026-05-21 09:45:17.360146
83	1	create	renewal	RMT-78	Created renewal via CSV import for Upsilon Finance 9 - Asana Business	\N	2026-05-21 09:45:17.360146
84	1	create	renewal	RMT-79	Created renewal via CSV import for Eta Ventures 5 - Figma Design Plan	\N	2026-05-21 09:45:17.360146
85	1	create	renewal	RMT-80	Created renewal via CSV import for Chi Dev 5 - Jira Cloud Premium	\N	2026-05-21 09:45:17.360146
86	1	create	renewal	RMT-81	Created renewal via CSV import for Omicron Media 1 - HubSpot Suite	\N	2026-05-21 09:45:17.360146
87	1	create	renewal	RMT-82	Created renewal via CSV import for Phi Marketing 1 - Microsoft 365 Business Standard	\N	2026-05-21 09:45:17.360146
88	1	create	renewal	RMT-83	Created renewal via CSV import for Sigma Retail 8 - Dropbox Business	\N	2026-05-21 09:45:17.360146
89	1	create	renewal	RMT-84	Created renewal via CSV import for Iota Digital 7 - Zoom Pro Subscription	\N	2026-05-21 09:45:17.360146
90	1	create	renewal	RMT-85	Created renewal via CSV import for Psi Agency 2 - Zoom Pro Subscription	\N	2026-05-21 09:45:17.360146
91	1	create	renewal	RMT-86	Created renewal via CSV import for Nu Logistics 3 - Figma Design Plan	\N	2026-05-21 09:45:17.360146
92	1	create	renewal	RMT-87	Created renewal via CSV import for Rho Global 4 - Zendesk Support Enterprise	\N	2026-05-21 09:45:17.360146
93	1	create	renewal	RMT-88	Created renewal via CSV import for Xi Industries 9 - Zendesk Support Enterprise	\N	2026-05-21 09:45:17.360146
94	1	create	renewal	RMT-89	Created renewal via CSV import for Nu Logistics 3 - Salesforce CRM	\N	2026-05-21 09:45:17.360146
95	1	create	renewal	RMT-90	Created renewal via CSV import for Phi Marketing 1 - Slack Pro Workspace	\N	2026-05-21 09:45:17.360146
96	1	create	renewal	RMT-91	Created renewal via CSV import for Nu Logistics 3 - Asana Business	\N	2026-05-21 09:45:17.360146
97	1	create	renewal	RMT-92	Created renewal via CSV import for Delta Consulting 3 - Google Workspace Enterprise	\N	2026-05-21 09:45:17.360146
98	1	create	renewal	RMT-93	Created renewal via CSV import for Mu Services 1 - Zendesk Support Enterprise	\N	2026-05-21 09:45:17.360146
99	1	create	renewal	RMT-94	Created renewal via CSV import for Gamma Enterprises 3 - Figma Design Plan	\N	2026-05-21 09:45:17.360146
100	1	create	renewal	RMT-95	Created renewal via CSV import for Psi Agency 3 - Salesforce CRM	\N	2026-05-21 09:45:17.360146
101	1	create	renewal	RMT-96	Created renewal via CSV import for Lambda Group 8 - GitHub Enterprise	\N	2026-05-21 09:45:17.360146
102	1	create	renewal	RMT-97	Created renewal via CSV import for Delta Consulting 2 - HubSpot Suite	\N	2026-05-21 09:45:17.360146
103	1	create	renewal	RMT-98	Created renewal via CSV import for Zeta Systems 5 - Zoom Pro Subscription	\N	2026-05-21 09:45:17.360146
104	1	create	renewal	RMT-99	Created renewal via CSV import for Gamma Enterprises 2 - Adobe Creative Cloud	\N	2026-05-21 09:45:17.360146
105	1	create	renewal	RMT-100	Created renewal via CSV import for Phi Marketing 2 - Salesforce CRM	\N	2026-05-21 09:45:17.360146
106	1	create	renewal	RMT-101	Created renewal via CSV import for Theta Labs 8 - Asana Business	\N	2026-05-21 09:45:17.360146
107	1	create	renewal	RMT-102	Created renewal via CSV import for Xi Industries 5 - Google Workspace Enterprise	\N	2026-05-21 09:45:17.360146
108	1	create	renewal	RMT-03	Created renewal via CSV import for Delta Consulting 7 - GitHub Enterprise	\N	2026-05-21 09:59:05.866176
109	1	create	renewal	RMT-04	Created renewal via CSV import for Gamma Enterprises 5 - GitHub Enterprise	\N	2026-05-21 09:59:05.866176
110	1	create	renewal	RMT-05	Created renewal via CSV import for Phi Marketing 3 - Google Workspace Enterprise	\N	2026-05-21 09:59:05.866176
111	1	create	renewal	RMT-06	Created renewal via CSV import for Delta Consulting 6 - Zoom Pro Subscription	\N	2026-05-21 09:59:05.866176
112	1	create	renewal	RMT-07	Created renewal via CSV import for Chi Dev 9 - Slack Pro Workspace	\N	2026-05-21 09:59:05.866176
113	1	create	renewal	RMT-08	Created renewal via CSV import for Omega Holdings 6 - Salesforce CRM	\N	2026-05-21 09:59:05.866176
114	1	create	renewal	RMT-09	Created renewal via CSV import for Omicron Media 9 - GitHub Enterprise	\N	2026-05-21 09:59:05.866176
115	1	create	renewal	RMT-10	Created renewal via CSV import for Iota Digital 1 - Google Workspace Enterprise	\N	2026-05-21 09:59:05.866176
116	1	create	renewal	RMT-11	Created renewal via CSV import for Omicron Media 5 - Figma Design Plan	\N	2026-05-21 09:59:05.866176
117	1	create	renewal	RMT-12	Created renewal via CSV import for Epsilon Software 8 - Zendesk Support Enterprise	\N	2026-05-21 09:59:05.866176
118	1	create	renewal	RMT-13	Created renewal via CSV import for Upsilon Finance 2 - Microsoft 365 Business Standard	\N	2026-05-21 09:59:05.866176
119	1	create	renewal	RMT-14	Created renewal via CSV import for Nu Logistics 6 - Jira Cloud Premium	\N	2026-05-21 09:59:05.866176
120	1	create	renewal	RMT-15	Created renewal via CSV import for Lambda Group 2 - Dropbox Business	\N	2026-05-21 09:59:05.866176
121	1	create	renewal	RMT-16	Created renewal via CSV import for Omicron Media 5 - GitHub Enterprise	\N	2026-05-21 09:59:05.866176
122	1	create	renewal	RMT-17	Created renewal via CSV import for Upsilon Finance 6 - Asana Business	\N	2026-05-21 09:59:05.866176
123	1	create	renewal	RMT-18	Created renewal via CSV import for Alpha Technologies 3 - Microsoft 365 Business Standard	\N	2026-05-21 09:59:05.866176
124	1	create	renewal	RMT-19	Created renewal via CSV import for Zeta Systems 1 - Dropbox Business	\N	2026-05-21 09:59:05.866176
125	1	create	renewal	RMT-20	Created renewal via CSV import for Theta Labs 7 - Jira Cloud Premium	\N	2026-05-21 09:59:05.866176
126	1	create	renewal	RMT-21	Created renewal via CSV import for Gamma Enterprises 9 - Zendesk Support Enterprise	\N	2026-05-21 09:59:05.866176
127	1	create	renewal	RMT-22	Created renewal via CSV import for Kappa Tech 9 - Jira Cloud Premium	\N	2026-05-21 09:59:05.866176
128	1	create	renewal	RMT-23	Created renewal via CSV import for Kappa Tech 6 - Asana Business	\N	2026-05-21 09:59:05.866176
129	1	create	renewal	RMT-24	Created renewal via CSV import for Beta Solutions 3 - Zendesk Support Enterprise	\N	2026-05-21 09:59:05.866176
130	1	create	renewal	RMT-25	Created renewal via CSV import for Omicron Media 4 - Slack Pro Workspace	\N	2026-05-21 09:59:05.866176
131	1	create	renewal	RMT-26	Created renewal via CSV import for Kappa Tech 1 - Figma Design Plan	\N	2026-05-21 09:59:05.866176
132	1	create	renewal	RMT-27	Created renewal via CSV import for Beta Solutions 8 - GitHub Enterprise	\N	2026-05-21 09:59:05.866176
133	1	create	renewal	RMT-28	Created renewal via CSV import for Delta Consulting 5 - Zoom Pro Subscription	\N	2026-05-21 09:59:05.866176
134	1	create	renewal	RMT-29	Created renewal via CSV import for Upsilon Finance 2 - Microsoft 365 Business Standard	\N	2026-05-21 09:59:05.866176
135	1	create	renewal	RMT-30	Created renewal via CSV import for Phi Marketing 5 - Adobe Creative Cloud	\N	2026-05-21 09:59:05.866176
136	1	create	renewal	RMT-31	Created renewal via CSV import for Upsilon Finance 9 - Adobe Creative Cloud	\N	2026-05-21 09:59:05.866176
137	1	create	renewal	RMT-32	Created renewal via CSV import for Kappa Tech 2 - Jira Cloud Premium	\N	2026-05-21 09:59:05.866176
138	1	create	renewal	RMT-33	Created renewal via CSV import for Mu Services 6 - Zendesk Support Enterprise	\N	2026-05-21 09:59:05.866176
139	1	create	renewal	RMT-34	Created renewal via CSV import for Delta Consulting 5 - Zoom Pro Subscription	\N	2026-05-21 09:59:05.866176
140	1	create	renewal	RMT-35	Created renewal via CSV import for Sigma Retail 2 - Figma Design Plan	\N	2026-05-21 09:59:05.866176
141	1	create	renewal	RMT-36	Created renewal via CSV import for Delta Consulting 2 - Zendesk Support Enterprise	\N	2026-05-21 09:59:05.866176
142	1	create	renewal	RMT-37	Created renewal via CSV import for Sigma Retail 1 - Adobe Creative Cloud	\N	2026-05-21 09:59:05.866176
143	1	create	renewal	RMT-38	Created renewal via CSV import for Nu Logistics 1 - Jira Cloud Premium	\N	2026-05-21 09:59:05.866176
144	1	create	renewal	RMT-39	Created renewal via CSV import for Rho Global 4 - Mailchimp Premium	\N	2026-05-21 09:59:05.866176
145	1	create	renewal	RMT-40	Created renewal via CSV import for Phi Marketing 8 - GitHub Enterprise	\N	2026-05-21 09:59:05.866176
146	1	create	renewal	RMT-41	Created renewal via CSV import for Xi Industries 1 - GitHub Enterprise	\N	2026-05-21 09:59:05.866176
147	1	create	renewal	RMT-42	Created renewal via CSV import for Eta Ventures 2 - Figma Design Plan	\N	2026-05-21 09:59:05.866176
148	1	create	renewal	RMT-43	Created renewal via CSV import for Omicron Media 7 - Zendesk Support Enterprise	\N	2026-05-21 09:59:05.866176
149	1	create	renewal	RMT-44	Created renewal via CSV import for Pi Analytics 3 - Salesforce CRM	\N	2026-05-21 09:59:05.866176
150	1	create	renewal	RMT-45	Created renewal via CSV import for Nu Logistics 9 - Figma Design Plan	\N	2026-05-21 09:59:05.866176
151	1	create	renewal	RMT-46	Created renewal via CSV import for Alpha Technologies 3 - Dropbox Business	\N	2026-05-21 09:59:05.866176
152	1	create	renewal	RMT-47	Created renewal via CSV import for Lambda Group 2 - Figma Design Plan	\N	2026-05-21 09:59:05.866176
153	1	create	renewal	RMT-48	Created renewal via CSV import for Mu Services 7 - AWS Cloud Hosting	\N	2026-05-21 09:59:05.866176
154	1	create	renewal	RMT-49	Created renewal via CSV import for Rho Global 9 - Slack Pro Workspace	\N	2026-05-21 09:59:05.866176
155	1	create	renewal	RMT-50	Created renewal via CSV import for Eta Ventures 4 - Dropbox Business	\N	2026-05-21 09:59:05.866176
156	1	create	renewal	RMT-51	Created renewal via CSV import for Mu Services 2 - Dropbox Business	\N	2026-05-21 09:59:05.866176
157	1	create	renewal	RMT-52	Created renewal via CSV import for Phi Marketing 3 - GitHub Enterprise	\N	2026-05-21 09:59:05.866176
158	1	create	renewal	RMT-53	Created renewal via CSV import for Delta Consulting 8 - Jira Cloud Premium	\N	2026-05-21 09:59:05.866176
159	1	create	renewal	RMT-54	Created renewal via CSV import for Phi Marketing 7 - Mailchimp Premium	\N	2026-05-21 09:59:05.866176
160	1	create	renewal	RMT-55	Created renewal via CSV import for Delta Consulting 6 - Microsoft 365 Business Standard	\N	2026-05-21 09:59:05.866176
161	1	create	renewal	RMT-56	Created renewal via CSV import for Alpha Technologies 7 - Asana Business	\N	2026-05-21 09:59:05.866176
162	1	create	renewal	RMT-57	Created renewal via CSV import for Lambda Group 8 - Zoom Pro Subscription	\N	2026-05-21 09:59:05.866176
163	1	create	renewal	RMT-58	Created renewal via CSV import for Xi Industries 4 - Zoom Pro Subscription	\N	2026-05-21 09:59:05.866176
164	1	create	renewal	RMT-59	Created renewal via CSV import for Upsilon Finance 4 - Mailchimp Premium	\N	2026-05-21 09:59:05.866176
165	1	create	renewal	RMT-60	Created renewal via CSV import for Phi Marketing 5 - Adobe Creative Cloud	\N	2026-05-21 09:59:05.866176
166	1	create	renewal	RMT-61	Created renewal via CSV import for Omega Holdings 9 - Figma Design Plan	\N	2026-05-21 09:59:05.866176
167	1	create	renewal	RMT-62	Created renewal via CSV import for Tau Healthcare 5 - Asana Business	\N	2026-05-21 09:59:05.866176
168	1	create	renewal	RMT-63	Created renewal via CSV import for Omega Holdings 4 - Adobe Creative Cloud	\N	2026-05-21 09:59:05.866176
169	1	create	renewal	RMT-64	Created renewal via CSV import for Kappa Tech 2 - HubSpot Suite	\N	2026-05-21 09:59:05.866176
170	1	create	renewal	RMT-65	Created renewal via CSV import for Iota Digital 1 - Adobe Creative Cloud	\N	2026-05-21 09:59:05.866176
421	1	delete_soft	renewal	RMT-45	Moved renewal to trash: Nu Logistics 9 - Figma Design Plan	\N	2026-05-26 08:42:00.797377
171	1	create	renewal	RMT-66	Created renewal via CSV import for Omega Holdings 5 - Adobe Creative Cloud	\N	2026-05-21 09:59:05.866176
172	1	create	renewal	RMT-67	Created renewal via CSV import for Tau Healthcare 9 - Jira Cloud Premium	\N	2026-05-21 09:59:05.866176
173	1	create	renewal	RMT-68	Created renewal via CSV import for Rho Global 1 - Zoom Pro Subscription	\N	2026-05-21 09:59:05.866176
174	1	create	renewal	RMT-69	Created renewal via CSV import for Xi Industries 3 - Google Workspace Enterprise	\N	2026-05-21 09:59:05.866176
175	1	create	renewal	RMT-70	Created renewal via CSV import for Eta Ventures 5 - Google Workspace Enterprise	\N	2026-05-21 09:59:05.866176
176	1	create	renewal	RMT-71	Created renewal via CSV import for Chi Dev 1 - Slack Pro Workspace	\N	2026-05-21 09:59:05.866176
177	1	create	renewal	RMT-72	Created renewal via CSV import for Zeta Systems 1 - HubSpot Suite	\N	2026-05-21 09:59:05.866176
178	1	create	renewal	RMT-73	Created renewal via CSV import for Sigma Retail 4 - Slack Pro Workspace	\N	2026-05-21 09:59:05.866176
179	1	create	renewal	RMT-74	Created renewal via CSV import for Gamma Enterprises 2 - Zendesk Support Enterprise	\N	2026-05-21 09:59:05.866176
180	1	create	renewal	RMT-75	Created renewal via CSV import for Omega Holdings 7 - AWS Cloud Hosting	\N	2026-05-21 09:59:05.866176
181	1	create	renewal	RMT-76	Created renewal via CSV import for Iota Digital 9 - Google Workspace Enterprise	\N	2026-05-21 09:59:05.866176
182	1	create	renewal	RMT-77	Created renewal via CSV import for Rho Global 5 - Google Workspace Enterprise	\N	2026-05-21 09:59:05.866176
183	1	create	renewal	RMT-78	Created renewal via CSV import for Upsilon Finance 9 - Asana Business	\N	2026-05-21 09:59:05.866176
184	1	create	renewal	RMT-79	Created renewal via CSV import for Eta Ventures 5 - Figma Design Plan	\N	2026-05-21 09:59:05.866176
185	1	create	renewal	RMT-80	Created renewal via CSV import for Chi Dev 5 - Jira Cloud Premium	\N	2026-05-21 09:59:05.866176
186	1	create	renewal	RMT-81	Created renewal via CSV import for Omicron Media 1 - HubSpot Suite	\N	2026-05-21 09:59:05.866176
187	1	create	renewal	RMT-82	Created renewal via CSV import for Phi Marketing 1 - Microsoft 365 Business Standard	\N	2026-05-21 09:59:05.866176
188	1	create	renewal	RMT-83	Created renewal via CSV import for Sigma Retail 8 - Dropbox Business	\N	2026-05-21 09:59:05.866176
189	1	create	renewal	RMT-84	Created renewal via CSV import for Iota Digital 7 - Zoom Pro Subscription	\N	2026-05-21 09:59:05.866176
190	1	create	renewal	RMT-85	Created renewal via CSV import for Psi Agency 2 - Zoom Pro Subscription	\N	2026-05-21 09:59:05.866176
191	1	create	renewal	RMT-86	Created renewal via CSV import for Nu Logistics 3 - Figma Design Plan	\N	2026-05-21 09:59:05.866176
192	1	create	renewal	RMT-87	Created renewal via CSV import for Rho Global 4 - Zendesk Support Enterprise	\N	2026-05-21 09:59:05.866176
193	1	create	renewal	RMT-88	Created renewal via CSV import for Xi Industries 9 - Zendesk Support Enterprise	\N	2026-05-21 09:59:05.866176
194	1	create	renewal	RMT-89	Created renewal via CSV import for Nu Logistics 3 - Salesforce CRM	\N	2026-05-21 09:59:05.866176
195	1	create	renewal	RMT-90	Created renewal via CSV import for Phi Marketing 1 - Slack Pro Workspace	\N	2026-05-21 09:59:05.866176
196	1	create	renewal	RMT-91	Created renewal via CSV import for Nu Logistics 3 - Asana Business	\N	2026-05-21 09:59:05.866176
197	1	create	renewal	RMT-92	Created renewal via CSV import for Delta Consulting 3 - Google Workspace Enterprise	\N	2026-05-21 09:59:05.866176
198	1	create	renewal	RMT-93	Created renewal via CSV import for Mu Services 1 - Zendesk Support Enterprise	\N	2026-05-21 09:59:05.866176
199	1	create	renewal	RMT-94	Created renewal via CSV import for Gamma Enterprises 3 - Figma Design Plan	\N	2026-05-21 09:59:05.866176
200	1	create	renewal	RMT-95	Created renewal via CSV import for Psi Agency 3 - Salesforce CRM	\N	2026-05-21 09:59:05.866176
201	1	create	renewal	RMT-96	Created renewal via CSV import for Lambda Group 8 - GitHub Enterprise	\N	2026-05-21 09:59:05.866176
202	1	create	renewal	RMT-97	Created renewal via CSV import for Delta Consulting 2 - HubSpot Suite	\N	2026-05-21 09:59:05.866176
203	1	create	renewal	RMT-98	Created renewal via CSV import for Zeta Systems 5 - Zoom Pro Subscription	\N	2026-05-21 09:59:05.866176
204	1	create	renewal	RMT-99	Created renewal via CSV import for Gamma Enterprises 2 - Adobe Creative Cloud	\N	2026-05-21 09:59:05.866176
205	1	create	renewal	RMT-100	Created renewal via CSV import for Phi Marketing 2 - Salesforce CRM	\N	2026-05-21 09:59:05.866176
206	1	create	renewal	RMT-101	Created renewal via CSV import for Theta Labs 8 - Asana Business	\N	2026-05-21 09:59:05.866176
207	1	create	renewal	RMT-102	Created renewal via CSV import for Xi Industries 5 - Google Workspace Enterprise	\N	2026-05-21 09:59:05.866176
208	3	login	user	\N	Ranjith Kumar logged in via Zoho SSO.	\N	2026-05-21 10:26:19.788899
209	1	login	user	\N	Sameerul Rahman logged in via Zoho SSO.	\N	2026-05-21 10:49:22.24887
210	1	login	user	\N	Sameerul Rahman logged in via Zoho SSO.	\N	2026-05-21 10:52:52.129816
211	1	renewal_confirmation	renewal	RMT-84	Admin marked Iota Digital 7 (Zoom Pro Subscription) as "Quotation Confirmation". 	\N	2026-05-21 11:01:47.027592
212	1	renewal_confirmation	renewal	RMT-84	Admin marked Iota Digital 7 (Zoom Pro Subscription) as "Renewed". 	\N	2026-05-21 11:02:06.780882
213	1	renewal_confirmation	renewal	RMT-60	Admin marked Phi Marketing 5 (Adobe Creative Cloud) as "Service Discontinued". 	\N	2026-05-21 11:03:08.791973
214	1	renewal_confirmation	renewal	RMT-62	Admin marked Tau Healthcare 5 (Asana Business) as "Awaiting with Vendor". 	\N	2026-05-21 11:14:14.938944
215	1	renewal_confirmation	renewal	RMT-50	Admin marked Eta Ventures 4 (Dropbox Business) as "Renewed". 	\N	2026-05-21 11:18:24.748767
216	1	renewal_confirmation	renewal	RMT-75	Admin marked Omega Holdings 7 (AWS Cloud Hosting) as "Renewed". 	\N	2026-05-21 11:18:45.779278
217	1	renewal_confirmation	renewal	RMT-36	Admin marked Delta Consulting 2 (Zendesk Support Enterprise) as "Renewed". 	\N	2026-05-21 11:20:21.300447
218	1	renewal_confirmation	renewal	RMT-24	Admin marked Beta Solutions 3 (Zendesk Support Enterprise) as "Renewed". 	\N	2026-05-21 11:20:43.024667
219	1	renewal_confirmation	renewal	RMT-30	Admin marked Phi Marketing 5 (Adobe Creative Cloud) as "Renewed". 	\N	2026-05-21 11:20:55.399535
220	1	renewal_confirmation	renewal	RMT-102	Admin marked Xi Industries 5 (Google Workspace Enterprise) as "Service Discontinued". 	\N	2026-05-21 11:21:01.207323
221	1	login	user	\N	Sameerul Rahman logged in via Zoho SSO.	\N	2026-05-22 04:18:49.419879
222	2	login	user	\N	Sakthivel K logged in via Zoho SSO.	\N	2026-05-22 04:20:03.028124
223	3	login	user	\N	Ranjith Kumar logged in via Zoho SSO.	\N	2026-05-22 04:20:49.092109
224	2	create	renewal	RMT-103	Created renewal for sameer test - m365	\N	2026-05-22 04:34:22.31917
225	2	create	renewal	RMT-104	Created renewal for sameer2 - aws	\N	2026-05-22 04:40:25.10077
226	1	edit	renewal	RMT-104	Edited renewal details for sameer2. Reason: test	\N	2026-05-22 04:44:44.781998
227	1	delete	renewal	RMT-46	Deleted renewal: Alpha Technologies 3 - Dropbox Business	\N	2026-05-22 05:05:44.680982
228	2	renewal_confirmation	renewal	RMT-10	CST team marked Iota Digital 1 (Google Workspace Enterprise) as "Awaiting Client Approval". 	\N	2026-05-22 05:25:10.592684
229	1	delete_soft	renewal	RMT-57	Moved renewal to trash: Lambda Group 8 - Zoom Pro Subscription	\N	2026-05-22 05:54:49.729893
230	1	delete_soft	renewal	RMT-57	Moved renewal to trash: Lambda Group 8 - Zoom Pro Subscription	\N	2026-05-22 05:59:14.233173
231	1	delete_soft	renewal	RMT-77	Moved renewal to trash: Rho Global 5 - Google Workspace Enterprise	\N	2026-05-22 06:01:36.700888
232	1	delete_soft	renewal	RMT-20	Moved renewal to trash: Theta Labs 7 - Jira Cloud Premium	\N	2026-05-22 06:01:57.101821
233	1	delete_soft	renewal	RMT-77	Moved renewal to trash: Rho Global 5 - Google Workspace Enterprise	\N	2026-05-22 06:07:17.171783
234	1	restore	renewal	RMT-77	Restored renewal: Rho Global 5 - Google Workspace Enterprise	\N	2026-05-22 06:17:30.527456
235	1	delete_soft	renewal	RMT-17	Moved renewal to trash: Upsilon Finance 6 - Asana Business	\N	2026-05-22 06:20:36.076984
236	1	restore	renewal	RMT-17	Restored renewal: Upsilon Finance 6 - Asana Business	\N	2026-05-22 06:20:42.812101
237	1	delete_soft	renewal	RMT-77	Moved renewal to trash: Rho Global 5 - Google Workspace Enterprise	\N	2026-05-22 06:20:56.328022
238	1	delete_permanent	renewal	RMT-77	Permanently deleted renewal: Rho Global 5 - Google Workspace Enterprise	\N	2026-05-22 06:21:09.0287
239	1	delete_soft	renewal	RMT-17	Moved renewal to trash: Upsilon Finance 6 - Asana Business	\N	2026-05-22 06:21:34.666922
240	2	login	user	\N	Sakthivel K logged in via Zoho SSO.	\N	2026-05-22 07:16:17.777616
241	2	edit	renewal	RMT-10	Edited renewal details for Iota Digital 1. Reason: test	\N	2026-05-22 07:17:45.868307
242	1	edit	renewal	RMT-07	Edited renewal details for Chi Dev 9. Reason: test	\N	2026-05-22 07:23:48.722209
243	1	edit	renewal	RMT-104	Edited renewal details for sameer2. Reason: test	\N	2026-05-22 07:26:03.451881
244	2	login	user	\N	Sakthivel K logged in via Zoho SSO.	\N	2026-05-22 07:40:18.076534
245	2	create	renewal	RMT-105	Created renewal for test - m365	\N	2026-05-22 07:44:09.318739
246	2	edit	renewal	RMT-104	Edited renewal details for sameer2. Reason: test	\N	2026-05-22 07:52:48.241571
247	2	renewal_confirmation	renewal	RMT-54	CST team marked Phi Marketing 7 (Mailchimp Premium) as "Quotation Confirmation". 	\N	2026-05-22 07:59:06.045466
248	2	renewal_confirmation	renewal	RMT-54	CST team marked Phi Marketing 7 (Mailchimp Premium) as "Awaiting with Vendor". 	\N	2026-05-22 08:15:06.10097
249	2	renewal_confirmation	renewal	RMT-105	CST team marked test (m365) as "Renewed". 	\N	2026-05-22 08:17:31.960286
250	2	edit	renewal	RMT-105	Edited renewal details for test. Reason: sameer test 	\N	2026-05-22 08:26:43.476903
251	1	delete_soft	renewal	RMT-54	Moved renewal to trash: Phi Marketing 7 - Mailchimp Premium	\N	2026-05-22 08:36:54.467359
252	1	delete_soft	renewal	RMT-55	Moved renewal to trash: Delta Consulting 6 - Microsoft 365 Business Standard	\N	2026-05-22 08:40:41.953189
253	1	edit	renewal	RMT-105	Edited renewal details for test. Reason: test	\N	2026-05-22 10:41:32.073247
254	1	edit	renewal	RMT-105	Edited renewal details for test. Reason: test	\N	2026-05-22 10:42:29.515201
255	1	login	user	\N	Sameerul Rahman logged in via Zoho SSO.	\N	2026-05-23 10:38:22.661198
256	1	delete_soft	renewal	RMT-07	Moved renewal to trash: Chi Dev 9 - Slack Pro Workspace	\N	2026-05-23 10:39:13.505222
257	1	delete_soft	renewal	RMT-10	Moved renewal to trash: Iota Digital 1 - Google Workspace Enterprise	\N	2026-05-23 10:39:15.798025
258	1	delete_soft	renewal	RMT-89	Moved renewal to trash: Nu Logistics 3 - Salesforce CRM	\N	2026-05-23 10:39:17.99564
259	1	delete_soft	renewal	RMT-67	Moved renewal to trash: Tau Healthcare 9 - Jira Cloud Premium	\N	2026-05-23 10:39:20.011618
260	1	delete_soft	renewal	RMT-104	Moved renewal to trash: sameer2 - aws	\N	2026-05-23 10:39:21.794021
261	1	delete_soft	renewal	RMT-97	Moved renewal to trash: Delta Consulting 2 - HubSpot Suite	\N	2026-05-23 10:39:23.686305
262	1	delete_soft	renewal	RMT-19	Moved renewal to trash: Zeta Systems 1 - Dropbox Business	\N	2026-05-23 10:39:25.421612
263	1	delete_soft	renewal	RMT-02	Moved renewal to trash: Sidcorptech - Cloud-AWS	\N	2026-05-23 10:39:27.254098
264	1	delete_soft	renewal	RMT-45	Moved renewal to trash: Nu Logistics 9 - Figma Design Plan	\N	2026-05-23 10:39:29.316469
265	1	delete_soft	renewal	RMT-71	Moved renewal to trash: Chi Dev 1 - Slack Pro Workspace	\N	2026-05-23 10:39:30.967783
266	1	delete_soft	renewal	RMT-68	Moved renewal to trash: Rho Global 1 - Zoom Pro Subscription	\N	2026-05-23 10:39:32.841857
267	1	delete_soft	renewal	RMT-06	Moved renewal to trash: Delta Consulting 6 - Zoom Pro Subscription	\N	2026-05-23 10:39:34.681323
268	1	delete_soft	renewal	RMT-01	Moved renewal to trash: testing - m365	\N	2026-05-23 10:39:36.574425
269	1	delete_soft	renewal	RMT-56	Moved renewal to trash: Alpha Technologies 7 - Asana Business	\N	2026-05-23 10:39:38.995232
270	1	delete_soft	renewal	RMT-37	Moved renewal to trash: Sigma Retail 1 - Adobe Creative Cloud	\N	2026-05-23 10:39:40.823459
271	1	delete_soft	renewal	RMT-74	Moved renewal to trash: Gamma Enterprises 2 - Zendesk Support Enterprise	\N	2026-05-23 10:39:42.582504
272	1	delete_soft	renewal	RMT-78	Moved renewal to trash: Upsilon Finance 9 - Asana Business	\N	2026-05-23 10:39:44.563826
273	1	delete_soft	renewal	RMT-58	Moved renewal to trash: Xi Industries 4 - Zoom Pro Subscription	\N	2026-05-23 10:39:47.387102
274	1	delete_soft	renewal	RMT-105	Moved renewal to trash: test - m365	\N	2026-05-23 10:39:49.186517
275	1	delete_soft	renewal	RMT-51	Moved renewal to trash: Mu Services 2 - Dropbox Business	\N	2026-05-23 10:39:51.485806
276	1	delete_soft	renewal	RMT-20	Moved renewal to trash: Theta Labs 7 - Jira Cloud Premium	\N	2026-05-23 10:39:55.351464
277	1	delete_soft	renewal	RMT-57	Moved renewal to trash: Lambda Group 8 - Zoom Pro Subscription	\N	2026-05-23 10:39:57.257349
278	1	delete_soft	renewal	RMT-69	Moved renewal to trash: Xi Industries 3 - Google Workspace Enterprise	\N	2026-05-23 10:40:01.103777
279	1	delete_soft	renewal	RMT-23	Moved renewal to trash: Kappa Tech 6 - Asana Business	\N	2026-05-23 10:40:03.030217
280	1	delete_soft	renewal	RMT-11	Moved renewal to trash: Omicron Media 5 - Figma Design Plan	\N	2026-05-23 10:40:04.777766
281	1	delete_soft	renewal	RMT-35	Moved renewal to trash: Sigma Retail 2 - Figma Design Plan	\N	2026-05-23 10:40:06.270333
282	1	delete_soft	renewal	RMT-79	Moved renewal to trash: Eta Ventures 5 - Figma Design Plan	\N	2026-05-23 10:40:07.796414
283	1	delete_soft	renewal	RMT-26	Moved renewal to trash: Kappa Tech 1 - Figma Design Plan	\N	2026-05-23 10:40:09.932109
284	1	delete_soft	renewal	RMT-04	Moved renewal to trash: Gamma Enterprises 5 - GitHub Enterprise	\N	2026-05-23 10:40:11.791693
285	1	delete_soft	renewal	RMT-80	Moved renewal to trash: Chi Dev 5 - Jira Cloud Premium	\N	2026-05-23 10:40:13.531742
286	1	delete_soft	renewal	RMT-29	Moved renewal to trash: Upsilon Finance 2 - Microsoft 365 Business Standard	\N	2026-05-23 10:40:15.676248
287	1	delete_soft	renewal	RMT-12	Moved renewal to trash: Epsilon Software 8 - Zendesk Support Enterprise	\N	2026-05-23 10:40:20.29319
288	1	delete_soft	renewal	RMT-99	Moved renewal to trash: Gamma Enterprises 2 - Adobe Creative Cloud	\N	2026-05-23 10:40:24.404489
289	1	delete_soft	renewal	RMT-52	Moved renewal to trash: Phi Marketing 3 - GitHub Enterprise	\N	2026-05-23 10:40:26.696577
290	1	delete_soft	renewal	RMT-43	Moved renewal to trash: Omicron Media 7 - Zendesk Support Enterprise	\N	2026-05-23 10:40:30.596659
291	1	delete_soft	renewal	RMT-87	Moved renewal to trash: Rho Global 4 - Zendesk Support Enterprise	\N	2026-05-23 10:41:44.866497
292	1	delete_soft	renewal	RMT-34	Moved renewal to trash: Delta Consulting 5 - Zoom Pro Subscription	\N	2026-05-23 10:41:46.829233
293	1	delete_soft	renewal	RMT-91	Moved renewal to trash: Nu Logistics 3 - Asana Business	\N	2026-05-23 10:41:48.68708
294	1	delete_soft	renewal	RMT-73	Moved renewal to trash: Sigma Retail 4 - Slack Pro Workspace	\N	2026-05-23 10:41:50.875416
295	1	delete_soft	renewal	RMT-84	Moved renewal to trash: Iota Digital 7 - Zoom Pro Subscription	\N	2026-05-23 10:42:10.261687
296	1	delete_soft	renewal	RMT-86	Moved renewal to trash: Nu Logistics 3 - Figma Design Plan	\N	2026-05-23 10:42:15.914488
297	1	delete_soft	renewal	RMT-24	Moved renewal to trash: Beta Solutions 3 - Zendesk Support Enterprise	\N	2026-05-23 10:42:18.187814
298	1	delete_soft	renewal	RMT-75	Moved renewal to trash: Omega Holdings 7 - AWS Cloud Hosting	\N	2026-05-23 10:42:19.988399
299	1	delete_soft	renewal	RMT-50	Moved renewal to trash: Eta Ventures 4 - Dropbox Business	\N	2026-05-23 10:42:26.769645
300	1	delete_soft	renewal	RMT-103	Moved renewal to trash: sameer test - m365	\N	2026-05-23 10:42:28.765982
301	1	delete_soft	renewal	RMT-36	Moved renewal to trash: Delta Consulting 2 - Zendesk Support Enterprise	\N	2026-05-23 10:42:30.405886
302	1	delete_soft	renewal	RMT-30	Moved renewal to trash: Phi Marketing 5 - Adobe Creative Cloud	\N	2026-05-23 10:42:32.801789
303	1	delete_soft	renewal	RMT-38	Moved renewal to trash: Nu Logistics 1 - Jira Cloud Premium	\N	2026-05-23 10:42:35.015504
304	1	delete_soft	renewal	RMT-21	Moved renewal to trash: Gamma Enterprises 9 - Zendesk Support Enterprise	\N	2026-05-23 10:42:36.778987
305	1	delete_soft	renewal	RMT-14	Moved renewal to trash: Nu Logistics 6 - Jira Cloud Premium	\N	2026-05-23 10:42:40.249586
306	1	delete_soft	renewal	RMT-60	Moved renewal to trash: Phi Marketing 5 - Adobe Creative Cloud	\N	2026-05-23 10:42:42.411233
307	1	delete_soft	renewal	RMT-63	Moved renewal to trash: Omega Holdings 4 - Adobe Creative Cloud	\N	2026-05-23 10:42:44.030962
308	1	delete_soft	renewal	RMT-93	Moved renewal to trash: Mu Services 1 - Zendesk Support Enterprise	\N	2026-05-23 10:42:45.998114
309	1	delete_soft	renewal	RMT-61	Moved renewal to trash: Omega Holdings 9 - Figma Design Plan	\N	2026-05-23 10:42:47.995295
310	1	delete_soft	renewal	RMT-09	Moved renewal to trash: Omicron Media 9 - GitHub Enterprise	\N	2026-05-23 10:42:49.784143
311	1	delete_soft	renewal	RMT-15	Moved renewal to trash: Lambda Group 2 - Dropbox Business	\N	2026-05-23 10:42:51.320567
312	1	delete_soft	renewal	RMT-95	Moved renewal to trash: Psi Agency 3 - Salesforce CRM	\N	2026-05-23 10:42:52.960064
313	1	delete_soft	renewal	RMT-98	Moved renewal to trash: Zeta Systems 5 - Zoom Pro Subscription	\N	2026-05-23 10:42:54.906735
314	1	delete_soft	renewal	RMT-94	Moved renewal to trash: Gamma Enterprises 3 - Figma Design Plan	\N	2026-05-23 10:42:56.687937
315	1	delete_soft	renewal	RMT-48	Moved renewal to trash: Mu Services 7 - AWS Cloud Hosting	\N	2026-05-23 10:42:58.393994
316	1	delete_soft	renewal	RMT-27	Moved renewal to trash: Beta Solutions 8 - GitHub Enterprise	\N	2026-05-23 10:43:02.589402
317	1	delete_soft	renewal	RMT-102	Moved renewal to trash: Xi Industries 5 - Google Workspace Enterprise	\N	2026-05-23 10:45:42.972597
318	1	delete_soft	renewal	RMT-08	Moved renewal to trash: Omega Holdings 6 - Salesforce CRM	\N	2026-05-23 10:45:44.424348
319	1	delete_soft	renewal	RMT-72	Moved renewal to trash: Zeta Systems 1 - HubSpot Suite	\N	2026-05-23 10:45:46.972076
320	1	delete_soft	renewal	RMT-49	Moved renewal to trash: Rho Global 9 - Slack Pro Workspace	\N	2026-05-23 10:45:48.6946
321	1	delete_soft	renewal	RMT-62	Moved renewal to trash: Tau Healthcare 5 - Asana Business	\N	2026-05-23 10:45:50.187251
322	1	delete_soft	renewal	RMT-59	Moved renewal to trash: Upsilon Finance 4 - Mailchimp Premium	\N	2026-05-23 10:45:52.053916
323	1	delete_soft	renewal	RMT-101	Moved renewal to trash: Theta Labs 8 - Asana Business	\N	2026-05-23 10:45:53.902475
324	1	delete_soft	renewal	RMT-83	Moved renewal to trash: Sigma Retail 8 - Dropbox Business	\N	2026-05-23 10:45:55.708768
325	1	delete_soft	renewal	RMT-13	Moved renewal to trash: Upsilon Finance 2 - Microsoft 365 Business Standard	\N	2026-05-23 10:45:57.529426
326	1	delete_soft	renewal	RMT-65	Moved renewal to trash: Iota Digital 1 - Adobe Creative Cloud	\N	2026-05-23 10:45:59.340725
327	1	delete_soft	renewal	RMT-53	Moved renewal to trash: Delta Consulting 8 - Jira Cloud Premium	\N	2026-05-23 10:46:01.043562
328	1	delete_soft	renewal	RMT-40	Moved renewal to trash: Phi Marketing 8 - GitHub Enterprise	\N	2026-05-23 10:46:05.331524
329	1	delete_soft	renewal	RMT-33	Moved renewal to trash: Mu Services 6 - Zendesk Support Enterprise	\N	2026-05-23 10:46:07.107316
330	1	delete_soft	renewal	RMT-18	Moved renewal to trash: Alpha Technologies 3 - Microsoft 365 Business Standard	\N	2026-05-23 10:46:09.198896
331	1	delete_soft	renewal	RMT-96	Moved renewal to trash: Lambda Group 8 - GitHub Enterprise	\N	2026-05-23 10:46:10.780617
332	1	delete_soft	renewal	RMT-39	Moved renewal to trash: Rho Global 4 - Mailchimp Premium	\N	2026-05-23 10:46:12.681103
333	1	delete_soft	renewal	RMT-88	Moved renewal to trash: Xi Industries 9 - Zendesk Support Enterprise	\N	2026-05-23 10:46:14.392702
334	1	delete_soft	renewal	RMT-100	Moved renewal to trash: Phi Marketing 2 - Salesforce CRM	\N	2026-05-23 10:46:16.040175
335	1	delete_soft	renewal	RMT-28	Moved renewal to trash: Delta Consulting 5 - Zoom Pro Subscription	\N	2026-05-23 10:46:17.807588
336	1	delete_soft	renewal	RMT-44	Moved renewal to trash: Pi Analytics 3 - Salesforce CRM	\N	2026-05-23 10:46:20.744118
337	1	delete_soft	renewal	RMT-64	Moved renewal to trash: Kappa Tech 2 - HubSpot Suite	\N	2026-05-23 10:46:22.566695
338	1	delete_soft	renewal	RMT-05	Moved renewal to trash: Phi Marketing 3 - Google Workspace Enterprise	\N	2026-05-23 10:46:24.127131
339	1	delete_soft	renewal	RMT-92	Moved renewal to trash: Delta Consulting 3 - Google Workspace Enterprise	\N	2026-05-23 10:46:26.064018
340	1	delete_soft	renewal	RMT-25	Moved renewal to trash: Omicron Media 4 - Slack Pro Workspace	\N	2026-05-23 10:46:27.893396
341	1	delete_soft	renewal	RMT-85	Moved renewal to trash: Psi Agency 2 - Zoom Pro Subscription	\N	2026-05-23 10:46:30.384989
342	1	delete_soft	renewal	RMT-47	Moved renewal to trash: Lambda Group 2 - Figma Design Plan	\N	2026-05-23 10:47:01.440454
343	1	delete_soft	renewal	RMT-66	Moved renewal to trash: Omega Holdings 5 - Adobe Creative Cloud	\N	2026-05-23 10:47:03.387164
344	1	delete_soft	renewal	RMT-81	Moved renewal to trash: Omicron Media 1 - HubSpot Suite	\N	2026-05-23 10:47:05.419477
345	1	delete_soft	renewal	RMT-31	Moved renewal to trash: Upsilon Finance 9 - Adobe Creative Cloud	\N	2026-05-23 10:47:07.976213
346	1	delete_soft	renewal	RMT-16	Moved renewal to trash: Omicron Media 5 - GitHub Enterprise	\N	2026-05-23 10:47:54.305439
347	1	delete_soft	renewal	RMT-41	Moved renewal to trash: Xi Industries 1 - GitHub Enterprise	\N	2026-05-23 10:47:56.810529
348	1	delete_soft	renewal	RMT-22	Moved renewal to trash: Kappa Tech 9 - Jira Cloud Premium	\N	2026-05-23 10:47:58.433893
349	1	delete_soft	renewal	RMT-03	Moved renewal to trash: Delta Consulting 7 - GitHub Enterprise	\N	2026-05-23 10:48:00.470269
518	2	login	user	\N	Sakthivel K logged in via Zoho SSO.	\N	2026-05-27 08:30:29.75321
350	1	delete_soft	renewal	RMT-90	Moved renewal to trash: Phi Marketing 1 - Slack Pro Workspace	\N	2026-05-23 10:48:03.739403
351	1	delete_soft	renewal	RMT-42	Moved renewal to trash: Eta Ventures 2 - Figma Design Plan	\N	2026-05-23 10:48:05.756191
352	1	delete_soft	renewal	RMT-70	Moved renewal to trash: Eta Ventures 5 - Google Workspace Enterprise	\N	2026-05-23 10:48:07.432613
353	1	delete_soft	renewal	RMT-82	Moved renewal to trash: Phi Marketing 1 - Microsoft 365 Business Standard	\N	2026-05-23 10:48:09.436214
354	1	delete_soft	renewal	RMT-32	Moved renewal to trash: Kappa Tech 2 - Jira Cloud Premium	\N	2026-05-23 10:48:11.374331
355	1	delete_soft	renewal	RMT-76	Moved renewal to trash: Iota Digital 9 - Google Workspace Enterprise	\N	2026-05-23 10:48:13.69278
356	1	create	renewal	RMT-01	Created renewal for test - m365	\N	2026-05-23 10:53:36.94898
357	3	login	user	\N	Ranjith Kumar logged in via Zoho SSO.	\N	2026-05-23 10:55:03.408985
358	1	edit	renewal	RMT-01	Edited renewal details for test. Reason: test	\N	2026-05-23 11:05:35.616433
359	1	edit	renewal	RMT-01	Edited renewal details for test. Reason: test	\N	2026-05-23 11:05:59.534258
360	1	edit	renewal	RMT-01	Edited renewal details for test. Reason: test	\N	2026-05-23 12:17:45.277812
361	1	renewal_confirmation	renewal	RMT-01	Admin marked test (m365) as "Renewed". 	\N	2026-05-23 13:34:29.540189
362	1	edit	renewal	RMT-01	Edited renewal details for test. Reason: test	\N	2026-05-23 13:48:26.697462
363	1	edit	renewal	RMT-01	Edited renewal details for test. Reason: test	\N	2026-05-23 14:35:41.72925
364	1	login	user	\N	Sameerul Rahman logged in via Zoho SSO.	\N	2026-05-25 04:54:37.68133
365	3	login	user	\N	Ranjith Kumar logged in via Zoho SSO.	\N	2026-05-25 05:01:16.209984
366	1	edit	renewal	RMT-01	Edited renewal details for test. Reason: test	\N	2026-05-25 05:30:30.166257
367	1	edit	renewal	RMT-01	Edited renewal details for test. Reason: test	\N	2026-05-25 05:36:19.466984
368	1	delete_soft	renewal	RMT-01	Moved renewal to trash: test - m365	\N	2026-05-25 05:40:23.81151
369	1	restore	renewal	RMT-01	Restored renewal: test - m365	\N	2026-05-25 05:40:30.498869
370	2	login	user	\N	Sakthivel K logged in via Zoho SSO.	\N	2026-05-25 05:47:49.629319
371	1	renewal_confirmation	renewal	RMT-01	Admin marked test (m365) as "Renewed". 	\N	2026-05-25 05:50:20.859094
372	1	edit	renewal	RMT-01	Edited renewal details for test. Reason: test	\N	2026-05-25 05:50:54.826728
373	1	edit	renewal	RMT-01	Edited renewal details for test. Reason: test	\N	2026-05-25 06:37:07.161584
374	1	edit	renewal	RMT-01	Edited renewal details for test. Reason: test	\N	2026-05-25 06:43:10.805684
375	1	edit	renewal	RMT-01	Edited renewal details for test. Reason: test	\N	2026-05-25 06:43:53.690341
376	1	edit	renewal	RMT-01	Edited renewal details for test. Reason: test	\N	2026-05-25 06:45:46.9093
377	1	edit	renewal	RMT-01	Edited renewal details for test. Reason: test	\N	2026-05-25 06:46:05.955305
378	1	edit	renewal	RMT-01	Edited renewal details for test. Reason: 1	\N	2026-05-25 06:50:41.525536
379	1	edit	renewal	RMT-01	Edited renewal details for test. Reason: test	\N	2026-05-25 06:55:50.990928
380	1	renewal_confirmation	renewal	RMT-01	Admin marked test (m365) as "Renewed". 	\N	2026-05-25 06:57:20.909654
381	1	renewal_confirmation	renewal	RMT-01	Admin marked test (m365) as "Renewed". 	\N	2026-05-25 06:57:30.25114
382	1	edit	renewal	RMT-01	Edited renewal details for test. Reason: test	\N	2026-05-25 07:08:31.191548
383	2	edit	renewal	RMT-01	Edited renewal details for test. Reason: test	\N	2026-05-25 07:13:20.468542
384	1	renewal_confirmation	renewal	RMT-01	Admin marked test (m365) as "Renewed". 	\N	2026-05-25 07:15:30.664306
385	1	renewal_confirmation	renewal	RMT-01	Admin marked test (m365) as "Renewed". 	\N	2026-05-25 07:15:32.199874
386	1	renewal_confirmation	renewal	RMT-01	Admin marked test (m365) as "Renewed". 	\N	2026-05-25 07:15:35.490993
387	1	edit	renewal	RMT-01	Edited renewal details for test. Reason: gtestg	\N	2026-05-25 08:21:34.430144
388	2	update_expiry_reason	renewal	RMT-01	Provided reason for expired renewal of test: Client requested budget review, expecting renewal next month.	\N	2026-05-25 09:14:10.26843
389	1	edit	renewal	RMT-01	Edited renewal details for test. Reason: test	\N	2026-05-25 09:15:19.559087
390	1	edit	renewal	RMT-01	Edited renewal details for test. Reason: test	\N	2026-05-25 09:19:52.320366
391	2	create	renewal	RMT-02	Created renewal for Cliq Test Client - Google Workspace	\N	2026-05-25 09:22:01.574058
392	2	edit	renewal	RMT-02	Edited renewal details for Cliq Test Client. Reason: Transition to expired	\N	2026-05-25 09:22:01.906936
393	2	update_expiry_reason	renewal	RMT-02	Provided reason for expired renewal of Cliq Test Client: test	\N	2026-05-25 09:23:55.139915
394	2	login	user	\N	Sakthivel K logged in via Zoho SSO.	\N	2026-05-25 09:25:35.447869
395	1	delete_soft	renewal	RMT-02	Moved renewal to trash: Cliq Test Client - Google Workspace	\N	2026-05-25 09:25:47.578542
396	1	edit	renewal	RMT-01	Edited renewal details for test. Reason: test	\N	2026-05-25 09:26:52.813842
397	1	edit	renewal	RMT-01	Edited renewal details for test. Reason: test	\N	2026-05-25 09:27:34.670418
398	2	update_expiry_reason	renewal	RMT-01	Provided reason for expired renewal of test: testing this feature 	\N	2026-05-25 09:28:16.367507
399	1	edit	renewal	RMT-01	Edited renewal details for test. Reason: test	\N	2026-05-25 09:29:30.470768
400	1	edit	renewal	RMT-01	Edited renewal details for test. Reason: test	\N	2026-05-25 09:32:54.710086
401	1	edit	renewal	RMT-01	Edited renewal details for test. Reason: test	\N	2026-05-25 09:33:26.088202
402	2	update_expiry_reason	renewal	RMT-01	Provided reason for expired renewal of test: testing 1	\N	2026-05-25 09:49:33.919964
403	1	edit	renewal	RMT-01	Edited renewal details for test. Reason: test	\N	2026-05-25 09:56:46.69424
404	1	edit	renewal	RMT-01	Edited renewal details for test. Reason: test	\N	2026-05-25 09:57:15.754925
405	2	update_expiry_reason	renewal	RMT-01	Provided reason for expired renewal of test: test	\N	2026-05-25 10:42:27.043745
406	1	renewal_confirmation	renewal	RMT-01	Admin marked test (m365) as "Service Discontinued". 	\N	2026-05-25 12:22:07.90749
407	1	renewal_confirmation	renewal	RMT-01	Admin marked test (m365) as "Order Confirmation". 	\N	2026-05-25 12:28:50.105857
408	1	edit	renewal	RMT-01	Edited renewal details for test. Reason: test	\N	2026-05-25 12:29:21.818398
409	1	edit	renewal	RMT-01	Edited renewal details for test. Reason: test	\N	2026-05-25 12:35:59.820658
410	1	login	user	\N	Sameerul Rahman logged in via Zoho SSO.	\N	2026-05-25 12:57:56.847982
411	1	login	user	\N	Sameerul Rahman logged in via Zoho SSO.	\N	2026-05-26 04:29:49.277392
412	3	login	user	\N	Ranjith Kumar logged in via Zoho SSO.	\N	2026-05-26 04:31:04.974124
413	1	login	user	\N	Sameerul Rahman logged in via Zoho SSO.	\N	2026-05-26 08:25:50.502
414	3	login	user	\N	Ranjith Kumar logged in via Zoho SSO.	\N	2026-05-26 08:26:15.793836
519	1	restore	renewal	RMT-104	Restored renewal: sameer2 - aws	\N	2026-05-27 08:35:49.712509
416	1	delete_soft	renewal	RMT-67	Moved renewal to trash: Tau Healthcare 9 - Jira Cloud Premium	\N	2026-05-26 08:37:43.782416
417	1	delete_soft	renewal	RMT-89	Moved renewal to trash: Nu Logistics 3 - Salesforce CRM	\N	2026-05-26 08:37:45.648295
418	1	delete_soft	renewal	RMT-19	Moved renewal to trash: Zeta Systems 1 - Dropbox Business	\N	2026-05-26 08:37:47.904888
419	1	delete_soft	renewal	RMT-97	Moved renewal to trash: Delta Consulting 2 - HubSpot Suite	\N	2026-05-26 08:37:53.500769
420	1	renewal_confirmation	renewal	RMT-02	Admin marked Sidcorptech (Cloud-AWS) as "Renewed". 	\N	2026-05-26 08:38:23.611633
422	1	delete_soft	renewal	RMT-68	Moved renewal to trash: Rho Global 1 - Zoom Pro Subscription	\N	2026-05-26 08:46:16.89735
423	1	delete_soft	renewal	RMT-71	Moved renewal to trash: Chi Dev 1 - Slack Pro Workspace	\N	2026-05-26 08:46:16.902306
424	1	delete_soft	renewal	RMT-06	Moved renewal to trash: Delta Consulting 6 - Zoom Pro Subscription	\N	2026-05-26 08:46:16.906581
425	1	delete_soft	renewal	RMT-01	Moved renewal to trash: testing - m365	\N	2026-05-26 08:46:16.911229
426	1	delete_soft	renewal	RMT-56	Moved renewal to trash: Alpha Technologies 7 - Asana Business	\N	2026-05-26 08:46:16.915054
427	1	delete_soft	renewal	RMT-37	Moved renewal to trash: Sigma Retail 1 - Adobe Creative Cloud	\N	2026-05-26 08:46:16.918662
428	1	delete_soft	renewal	RMT-74	Moved renewal to trash: Gamma Enterprises 2 - Zendesk Support Enterprise	\N	2026-05-26 08:46:16.922173
429	1	delete_soft	renewal	RMT-78	Moved renewal to trash: Upsilon Finance 9 - Asana Business	\N	2026-05-26 08:46:16.926477
430	1	delete_soft	renewal	RMT-58	Moved renewal to trash: Xi Industries 4 - Zoom Pro Subscription	\N	2026-05-26 08:46:16.930159
431	1	delete_soft	renewal	RMT-51	Moved renewal to trash: Mu Services 2 - Dropbox Business	\N	2026-05-26 08:46:16.933986
432	1	delete_soft	renewal	RMT-20	Moved renewal to trash: Theta Labs 7 - Jira Cloud Premium	\N	2026-05-26 08:46:16.937762
433	1	delete_soft	renewal	RMT-57	Moved renewal to trash: Lambda Group 8 - Zoom Pro Subscription	\N	2026-05-26 08:46:16.941615
434	1	delete_soft	renewal	RMT-69	Moved renewal to trash: Xi Industries 3 - Google Workspace Enterprise	\N	2026-05-26 08:46:16.945304
435	1	delete_soft	renewal	RMT-23	Moved renewal to trash: Kappa Tech 6 - Asana Business	\N	2026-05-26 08:46:16.949053
436	1	delete_soft	renewal	RMT-11	Moved renewal to trash: Omicron Media 5 - Figma Design Plan	\N	2026-05-26 08:46:16.952841
437	1	delete_soft	renewal	RMT-35	Moved renewal to trash: Sigma Retail 2 - Figma Design Plan	\N	2026-05-26 08:46:16.9567
438	1	delete_soft	renewal	RMT-79	Moved renewal to trash: Eta Ventures 5 - Figma Design Plan	\N	2026-05-26 08:46:16.960415
439	1	delete_soft	renewal	RMT-04	Moved renewal to trash: Gamma Enterprises 5 - GitHub Enterprise	\N	2026-05-26 08:46:16.963933
440	1	delete_soft	renewal	RMT-26	Moved renewal to trash: Kappa Tech 1 - Figma Design Plan	\N	2026-05-26 08:46:16.967762
441	1	delete_soft	renewal	RMT-80	Moved renewal to trash: Chi Dev 5 - Jira Cloud Premium	\N	2026-05-26 08:46:16.971713
442	1	delete_soft	renewal	RMT-29	Moved renewal to trash: Upsilon Finance 2 - Microsoft 365 Business Standard	\N	2026-05-26 08:46:16.975317
443	1	delete_soft	renewal	RMT-12	Moved renewal to trash: Epsilon Software 8 - Zendesk Support Enterprise	\N	2026-05-26 08:46:16.979207
444	1	delete_soft	renewal	RMT-99	Moved renewal to trash: Gamma Enterprises 2 - Adobe Creative Cloud	\N	2026-05-26 08:46:16.983069
445	1	delete_soft	renewal	RMT-52	Moved renewal to trash: Phi Marketing 3 - GitHub Enterprise	\N	2026-05-26 08:46:16.986708
446	1	delete_soft	renewal	RMT-43	Moved renewal to trash: Omicron Media 7 - Zendesk Support Enterprise	\N	2026-05-26 08:46:16.990027
447	1	delete_soft	renewal	RMT-87	Moved renewal to trash: Rho Global 4 - Zendesk Support Enterprise	\N	2026-05-26 08:46:21.650792
448	1	delete_soft	renewal	RMT-34	Moved renewal to trash: Delta Consulting 5 - Zoom Pro Subscription	\N	2026-05-26 08:46:21.654888
449	1	delete_soft	renewal	RMT-91	Moved renewal to trash: Nu Logistics 3 - Asana Business	\N	2026-05-26 08:46:21.658515
450	1	delete_soft	renewal	RMT-73	Moved renewal to trash: Sigma Retail 4 - Slack Pro Workspace	\N	2026-05-26 08:46:21.662076
451	1	delete_soft	renewal	RMT-84	Moved renewal to trash: Iota Digital 7 - Zoom Pro Subscription	\N	2026-05-26 08:46:21.666089
452	1	delete_soft	renewal	RMT-86	Moved renewal to trash: Nu Logistics 3 - Figma Design Plan	\N	2026-05-26 08:46:21.669376
453	1	delete_soft	renewal	RMT-75	Moved renewal to trash: Omega Holdings 7 - AWS Cloud Hosting	\N	2026-05-26 08:46:21.67375
454	1	delete_soft	renewal	RMT-24	Moved renewal to trash: Beta Solutions 3 - Zendesk Support Enterprise	\N	2026-05-26 08:46:21.677623
455	1	delete_soft	renewal	RMT-50	Moved renewal to trash: Eta Ventures 4 - Dropbox Business	\N	2026-05-26 08:46:21.681036
456	1	delete_soft	renewal	RMT-103	Moved renewal to trash: sameer test - m365	\N	2026-05-26 08:46:21.684399
457	1	delete_soft	renewal	RMT-36	Moved renewal to trash: Delta Consulting 2 - Zendesk Support Enterprise	\N	2026-05-26 08:46:21.688639
458	1	delete_soft	renewal	RMT-30	Moved renewal to trash: Phi Marketing 5 - Adobe Creative Cloud	\N	2026-05-26 08:46:21.693221
459	1	delete_soft	renewal	RMT-07	Moved renewal to trash: Chi Dev 9 - Slack Pro Workspace	\N	2026-05-26 08:46:21.697137
460	1	delete_soft	renewal	RMT-02	Moved renewal to trash: Sidcorptech - Cloud-AWS	\N	2026-05-26 08:46:21.701059
461	1	delete_soft	renewal	RMT-09	Moved renewal to trash: Omicron Media 9 - GitHub Enterprise	\N	2026-05-26 08:46:21.704552
462	1	delete_soft	renewal	RMT-93	Moved renewal to trash: Mu Services 1 - Zendesk Support Enterprise	\N	2026-05-26 08:46:21.708108
463	1	delete_soft	renewal	RMT-102	Moved renewal to trash: Xi Industries 5 - Google Workspace Enterprise	\N	2026-05-26 08:46:21.712065
464	1	delete_soft	renewal	RMT-63	Moved renewal to trash: Omega Holdings 4 - Adobe Creative Cloud	\N	2026-05-26 08:46:21.715413
465	1	delete_soft	renewal	RMT-48	Moved renewal to trash: Mu Services 7 - AWS Cloud Hosting	\N	2026-05-26 08:46:21.718481
466	1	delete_soft	renewal	RMT-15	Moved renewal to trash: Lambda Group 2 - Dropbox Business	\N	2026-05-26 08:46:21.721566
467	1	delete_soft	renewal	RMT-61	Moved renewal to trash: Omega Holdings 9 - Figma Design Plan	\N	2026-05-26 08:46:21.724418
468	1	delete_soft	renewal	RMT-14	Moved renewal to trash: Nu Logistics 6 - Jira Cloud Premium	\N	2026-05-26 08:46:21.727091
469	1	delete_soft	renewal	RMT-27	Moved renewal to trash: Beta Solutions 8 - GitHub Enterprise	\N	2026-05-26 08:46:21.72988
470	1	delete_soft	renewal	RMT-60	Moved renewal to trash: Phi Marketing 5 - Adobe Creative Cloud	\N	2026-05-26 08:46:21.734036
471	1	delete_soft	renewal	RMT-95	Moved renewal to trash: Psi Agency 3 - Salesforce CRM	\N	2026-05-26 08:46:21.73802
472	1	delete_soft	renewal	RMT-94	Moved renewal to trash: Gamma Enterprises 3 - Figma Design Plan	\N	2026-05-26 08:46:31.592087
473	1	delete_soft	renewal	RMT-38	Moved renewal to trash: Nu Logistics 1 - Jira Cloud Premium	\N	2026-05-26 08:46:31.595949
474	1	delete_soft	renewal	RMT-21	Moved renewal to trash: Gamma Enterprises 9 - Zendesk Support Enterprise	\N	2026-05-26 08:46:31.600047
475	1	delete_soft	renewal	RMT-98	Moved renewal to trash: Zeta Systems 5 - Zoom Pro Subscription	\N	2026-05-26 08:46:31.6037
476	1	delete_soft	renewal	RMT-72	Moved renewal to trash: Zeta Systems 1 - HubSpot Suite	\N	2026-05-26 08:46:31.607326
477	1	delete_soft	renewal	RMT-08	Moved renewal to trash: Omega Holdings 6 - Salesforce CRM	\N	2026-05-26 08:46:31.610854
478	1	delete_soft	renewal	RMT-49	Moved renewal to trash: Rho Global 9 - Slack Pro Workspace	\N	2026-05-26 08:46:31.613928
479	1	delete_soft	renewal	RMT-62	Moved renewal to trash: Tau Healthcare 5 - Asana Business	\N	2026-05-26 08:46:31.617085
480	1	delete_soft	renewal	RMT-101	Moved renewal to trash: Theta Labs 8 - Asana Business	\N	2026-05-26 08:46:31.61995
481	1	delete_soft	renewal	RMT-59	Moved renewal to trash: Upsilon Finance 4 - Mailchimp Premium	\N	2026-05-26 08:46:31.62283
482	1	delete_soft	renewal	RMT-83	Moved renewal to trash: Sigma Retail 8 - Dropbox Business	\N	2026-05-26 08:46:31.627004
483	1	delete_soft	renewal	RMT-65	Moved renewal to trash: Iota Digital 1 - Adobe Creative Cloud	\N	2026-05-26 08:46:31.630843
484	1	delete_soft	renewal	RMT-13	Moved renewal to trash: Upsilon Finance 2 - Microsoft 365 Business Standard	\N	2026-05-26 08:46:31.63464
485	1	delete_soft	renewal	RMT-40	Moved renewal to trash: Phi Marketing 8 - GitHub Enterprise	\N	2026-05-26 08:46:31.638211
486	1	delete_soft	renewal	RMT-53	Moved renewal to trash: Delta Consulting 8 - Jira Cloud Premium	\N	2026-05-26 08:46:31.642043
487	1	delete_soft	renewal	RMT-33	Moved renewal to trash: Mu Services 6 - Zendesk Support Enterprise	\N	2026-05-26 08:46:31.645847
488	1	delete_soft	renewal	RMT-96	Moved renewal to trash: Lambda Group 8 - GitHub Enterprise	\N	2026-05-26 08:46:31.649587
489	1	delete_soft	renewal	RMT-18	Moved renewal to trash: Alpha Technologies 3 - Microsoft 365 Business Standard	\N	2026-05-26 08:46:31.653113
490	1	delete_soft	renewal	RMT-39	Moved renewal to trash: Rho Global 4 - Mailchimp Premium	\N	2026-05-26 08:46:31.656711
491	1	delete_soft	renewal	RMT-88	Moved renewal to trash: Xi Industries 9 - Zendesk Support Enterprise	\N	2026-05-26 08:46:31.660139
492	1	delete_soft	renewal	RMT-100	Moved renewal to trash: Phi Marketing 2 - Salesforce CRM	\N	2026-05-26 08:46:31.663647
493	1	delete_soft	renewal	RMT-28	Moved renewal to trash: Delta Consulting 5 - Zoom Pro Subscription	\N	2026-05-26 08:46:31.667434
494	1	delete_soft	renewal	RMT-44	Moved renewal to trash: Pi Analytics 3 - Salesforce CRM	\N	2026-05-26 08:46:31.670999
495	1	delete_soft	renewal	RMT-64	Moved renewal to trash: Kappa Tech 2 - HubSpot Suite	\N	2026-05-26 08:46:31.674268
496	1	delete_soft	renewal	RMT-05	Moved renewal to trash: Phi Marketing 3 - Google Workspace Enterprise	\N	2026-05-26 08:46:31.677999
497	1	delete_soft	renewal	RMT-92	Moved renewal to trash: Delta Consulting 3 - Google Workspace Enterprise	\N	2026-05-26 08:46:35.447531
498	1	delete_soft	renewal	RMT-25	Moved renewal to trash: Omicron Media 4 - Slack Pro Workspace	\N	2026-05-26 08:46:35.452244
499	1	delete_soft	renewal	RMT-85	Moved renewal to trash: Psi Agency 2 - Zoom Pro Subscription	\N	2026-05-26 08:46:35.45587
500	1	delete_soft	renewal	RMT-47	Moved renewal to trash: Lambda Group 2 - Figma Design Plan	\N	2026-05-26 08:46:35.459523
501	1	delete_soft	renewal	RMT-66	Moved renewal to trash: Omega Holdings 5 - Adobe Creative Cloud	\N	2026-05-26 08:46:35.463179
502	1	delete_soft	renewal	RMT-81	Moved renewal to trash: Omicron Media 1 - HubSpot Suite	\N	2026-05-26 08:46:35.466795
503	1	delete_soft	renewal	RMT-31	Moved renewal to trash: Upsilon Finance 9 - Adobe Creative Cloud	\N	2026-05-26 08:46:35.470447
504	1	delete_soft	renewal	RMT-16	Moved renewal to trash: Omicron Media 5 - GitHub Enterprise	\N	2026-05-26 08:46:35.474006
505	1	delete_soft	renewal	RMT-41	Moved renewal to trash: Xi Industries 1 - GitHub Enterprise	\N	2026-05-26 08:46:35.477371
506	1	delete_soft	renewal	RMT-03	Moved renewal to trash: Delta Consulting 7 - GitHub Enterprise	\N	2026-05-26 08:46:35.48082
507	1	delete_soft	renewal	RMT-22	Moved renewal to trash: Kappa Tech 9 - Jira Cloud Premium	\N	2026-05-26 08:46:35.485142
508	1	delete_soft	renewal	RMT-90	Moved renewal to trash: Phi Marketing 1 - Slack Pro Workspace	\N	2026-05-26 08:46:35.488897
509	1	delete_soft	renewal	RMT-82	Moved renewal to trash: Phi Marketing 1 - Microsoft 365 Business Standard	\N	2026-05-26 08:46:35.492559
510	1	delete_soft	renewal	RMT-42	Moved renewal to trash: Eta Ventures 2 - Figma Design Plan	\N	2026-05-26 08:46:35.496561
511	1	delete_soft	renewal	RMT-70	Moved renewal to trash: Eta Ventures 5 - Google Workspace Enterprise	\N	2026-05-26 08:46:35.500472
512	1	delete_soft	renewal	RMT-32	Moved renewal to trash: Kappa Tech 2 - Jira Cloud Premium	\N	2026-05-26 08:46:35.504454
513	1	delete_soft	renewal	RMT-76	Moved renewal to trash: Iota Digital 9 - Google Workspace Enterprise	\N	2026-05-26 08:46:35.508095
514	1	delete_soft	renewal	RMT-10	Moved renewal to trash: Iota Digital 1 - Google Workspace Enterprise	\N	2026-05-26 08:46:35.512112
515	1	delete_soft	renewal	RMT-54	Moved renewal to trash: Phi Marketing 7 - Mailchimp Premium	\N	2026-05-26 08:46:35.515651
516	1	delete_soft	renewal	RMT-55	Moved renewal to trash: Delta Consulting 6 - Microsoft 365 Business Standard	\N	2026-05-26 08:46:35.519452
517	1	delete_soft	renewal	RMT-104	Moved renewal to trash: sameer2 - aws	\N	2026-05-26 08:46:35.523393
520	2	update_expiry_reason	renewal	RMT-104	Provided reason for expired renewal of sameer2: test	\N	2026-05-27 08:37:26.542887
521	2	renewal_confirmation	renewal	RMT-104	CST team marked sameer2 (aws) as "Service Discontinued". 	\N	2026-05-27 08:38:17.477038
522	2	renewal_confirmation	renewal	RMT-104	CST team marked sameer2 (aws) as "Renewed". 	\N	2026-05-27 08:40:39.053053
523	2	edit	renewal	RMT-104	Edited renewal details for sameer2. Reason: sfsag	\N	2026-05-27 08:42:03.974637
524	2	edit	renewal	RMT-104	Edited renewal details for sameer2. Reason: 21536	\N	2026-05-27 08:44:04.353587
525	1	edit	renewal	RMT-104	Edited renewal details for sameer2. Reason: 1324	\N	2026-05-27 08:45:35.073501
526	1	edit	renewal	RMT-104	Edited renewal details for sameer2. Reason: test	\N	2026-05-27 08:51:37.475987
527	1	edit	renewal	RMT-104	Edited renewal details for sameer2. Reason: dgdzg	\N	2026-05-27 09:14:51.094779
528	1	edit	renewal	RMT-104	Edited renewal details for sameer2. Reason: fv	\N	2026-05-27 09:25:17.69942
529	1	edit	renewal	RMT-104	Edited renewal details for sameer2. Reason: asfasf	\N	2026-05-27 09:29:45.923631
531	2	create	renewal	RMT-105	Created renewal for test - Amazon Web Services	\N	2026-05-30 04:13:57.94762
532	2	edit	renewal	RMT-105	Edited renewal details for test. Reason: test	\N	2026-05-30 04:16:29.34429
533	2	edit	renewal	RMT-105	Edited renewal details for test. Reason: test1	\N	2026-05-30 04:18:00.223954
534	1	edit	renewal	RMT-105	Edited renewal details for test. Reason: test	\N	2026-05-30 04:20:29.067697
535	1	edit	renewal	RMT-105	Edited renewal details for test. Reason: test	\N	2026-05-30 04:21:35.783432
536	1	edit	renewal	RMT-105	Edited renewal details for test. Reason: test	\N	2026-05-30 04:26:32.602668
537	1	edit	renewal	RMT-105	Edited renewal details for test. Reason: test	\N	2026-05-30 04:44:21.562517
538	2	update_expiry_reason	renewal	RMT-105	Provided reason for expired renewal of test: test	\N	2026-05-30 04:46:49.523348
539	1	delete_soft	renewal	RMT-105	Moved renewal to trash: test - Amazon Web Services	\N	2026-05-30 04:53:45.426214
540	1	restore	renewal	RMT-105	Restored renewal: test - Amazon Web Services	\N	2026-05-30 04:53:57.430874
541	1	login	user	\N	Sameerul Rahman logged in via Zoho SSO.	\N	2026-06-01 07:20:46.381914
542	1	delete_soft	renewal	RMT-104	Moved renewal to trash: sameer2 - aws	\N	2026-06-02 07:59:11.149326
543	1	renewal_confirmation	renewal	RMT-105	Admin marked test (Amazon Web Services) as "Renewed". 	\N	2026-06-02 09:21:33.904128
544	1	delete_soft	renewal	RMT-105	Moved renewal to trash: test - Amazon Web Services	\N	2026-06-02 09:22:00.571303
545	2	login	user	\N	Sakthivel K logged in via Zoho SSO.	\N	2026-06-02 09:44:41.953102
546	1	create	renewal	RMT-01	Created renewal for test - Amazon Web Services	\N	2026-06-02 09:45:22.817801
547	2	Start Visit	visit	1	Started visit to client: test	\N	2026-06-02 09:45:52.089895
548	2	Check-In	visit	1	Checked in at test. Reached client: No (837896m away)	\N	2026-06-02 09:46:25.580736
549	2	Check-In	visit	1	Checked in at test. Reached client: No (837896m away)	\N	2026-06-02 09:46:31.595143
550	2	Check-In	visit	1	Checked in at test. Reached client: No (837896m away)	\N	2026-06-02 09:48:04.220608
551	2	Check-In	visit	1	Checked in at test. Reached client: No (837896m away)	\N	2026-06-02 09:48:05.371935
552	2	login	user	\N	Sakthivel K logged in via Zoho SSO.	\N	2026-06-02 09:48:13.707444
553	2	Check-Out	visit	1	Completed visit to client: test	\N	2026-06-02 09:48:30.453831
554	2	Start Visit	visit	2	Started visit to client: test	\N	2026-06-02 09:49:32.032465
555	2	Check-In	visit	2	Checked in at test. Reached client: No (288641m away)	\N	2026-06-02 09:49:34.312225
556	2	Check-In	visit	2	Checked in at test. Reached client: No (288641m away)	\N	2026-06-02 09:49:38.100617
557	2	Check-In	visit	2	Checked in at test. Reached client: No (288641m away)	\N	2026-06-02 09:49:38.776702
558	2	Check-In	visit	2	Checked in at test. Reached client: No (288641m away)	\N	2026-06-02 09:49:39.325059
559	2	Check-In	visit	2	Checked in at test. Reached client: No (288641m away)	\N	2026-06-02 09:49:39.868821
560	2	Check-In	visit	2	Checked in at test. Reached client: No (288641m away)	\N	2026-06-02 09:49:40.378412
561	2	Check-In	visit	2	Checked in at test. Reached client: No (288641m away)	\N	2026-06-02 09:49:40.558696
562	2	Check-In	visit	2	Checked in at test. Reached client: No (288641m away)	\N	2026-06-02 09:49:40.742721
563	2	Check-In	visit	2	Checked in at test. Reached client: No (288641m away)	\N	2026-06-02 09:49:40.918431
564	2	Check-In	visit	2	Checked in at test. Reached client: No (288641m away)	\N	2026-06-02 09:49:41.114435
565	2	Check-In	visit	2	Checked in at test. Reached client: No (288641m away)	\N	2026-06-02 09:49:41.274843
566	2	Check-In	visit	2	Checked in at test. Reached client: No (288641m away)	\N	2026-06-02 09:49:41.44269
567	2	Check-Out	visit	2	Completed visit to client: test	\N	2026-06-02 09:50:03.853425
568	2	Start Visit	visit	3	Started visit to client: test	\N	2026-06-02 09:50:06.554797
569	2	Check-In	visit	3	Checked in at test. Reached client: No (288641m away)	\N	2026-06-02 09:50:10.750995
570	2	Check-In	visit	3	Checked in at test. Reached client: No (288641m away)	\N	2026-06-02 09:50:23.708632
571	2	Check-Out	visit	3	Completed visit to client: test	\N	2026-06-02 09:52:12.721473
572	2	Start Visit	visit	4	Started visit to client: test	\N	2026-06-02 09:54:38.043685
573	2	Check-In	visit	4	Checked in at test. Reached client: No (288641m away)	\N	2026-06-02 09:54:38.056409
574	2	Check-Out	visit	4	Completed visit to client: test	\N	2026-06-02 09:56:16.996628
575	2	Start Visit	visit	5	Started visit to client: test	\N	2026-06-02 09:56:34.462221
576	2	Check-In	visit	5	Checked in at test. Reached client: No (837896m away)	\N	2026-06-02 09:56:36.009899
577	2	Check-In	visit	5	Checked in at test. Reached client: No (837896m away)	\N	2026-06-02 09:56:44.84368
578	2	Check-In	visit	5	Checked in at test. Reached client: No (837896m away)	\N	2026-06-02 09:57:02.936242
579	2	login	user	\N	Sakthivel K logged in via Zoho SSO.	\N	2026-06-03 04:22:17.499999
580	2	Check-Out	visit	5	Completed visit to client: test	\N	2026-06-03 04:22:21.814465
581	2	Start Visit	visit	6	Started visit to client: test	\N	2026-06-03 04:45:53.367781
582	2	Check-In	visit	6	Checked in at test. Reached client: No (288642m away)	\N	2026-06-03 04:46:08.269131
583	2	Check-Out	visit	6	Completed visit to client: test	\N	2026-06-03 04:49:04.856833
584	2	Start Visit	visit	7	Started visit to client: test	\N	2026-06-03 04:49:20.596019
585	2	Check-In	visit	7	Checked in at test. Reached client: No (837896m away)	\N	2026-06-03 04:49:23.093709
586	2	Check-Out	visit	7	Completed visit to client: test	\N	2026-06-03 04:49:29.172682
587	2	Start Visit	visit	8	Started visit to client: test	\N	2026-06-03 04:49:39.604015
588	2	Check-In	visit	8	Checked in at test (Coordinates: 13.05683, 80.2574052)	\N	2026-06-03 05:06:32.065389
589	2	Check-Out	visit	8	Completed visit to client: test	\N	2026-06-03 05:14:40.977101
590	2	Start Visit	visit	9	Started visit to client: test	\N	2026-06-03 05:23:00.391389
591	2	Check-In	visit	9	Checked in at test (Coordinates: 18.9582347, 72.8319514)	\N	2026-06-03 05:24:37.291533
592	2	Check-Out	visit	9	Completed visit to client: test	\N	2026-06-03 05:25:26.606142
593	2	Start Visit	visit	10	Started visit to client: test	\N	2026-06-03 05:26:17.477038
594	2	Check-In	visit	10	Checked in at test (Coordinates: 13.0568652, 80.257343)	\N	2026-06-03 05:26:40.05903
595	2	Check-Out	visit	10	Completed visit to client: test	\N	2026-06-03 05:26:57.667516
596	2	Start Visit	visit	11	Started visit to client: test	\N	2026-06-03 05:44:14.47297
597	2	Check-In	visit	11	Checked in at test (Coordinates: 18.9582347, 72.8319514)	\N	2026-06-03 05:44:18.943813
598	2	Check-Out	visit	11	Completed visit to client: test	\N	2026-06-03 05:44:27.581204
599	2	Start Visit	visit	12	Started visit to client: test	\N	2026-06-03 05:45:07.653863
600	2	Check-In	visit	12	Checked in at test (Coordinates: 13.0567703, 80.2573238)	\N	2026-06-03 05:45:44.984285
601	2	Check-Out	visit	12	Completed visit to client: test	\N	2026-06-03 05:50:17.272746
602	2	Start Visit	visit	13	Started visit to client: test	\N	2026-06-03 06:02:31.873118
603	2	Check-In	visit	13	Checked in at test (Coordinates: 13.0567675, 80.2573209)	\N	2026-06-03 06:02:34.289547
604	1	edit	renewal	RMT-01	Edited renewal details for test. Reason: test	\N	2026-06-03 06:18:05.869341
605	2	Check-Out	visit	13	Completed visit to client: test	\N	2026-06-03 07:12:58.317073
\.


--
-- Data for Name: email_logs; Type: TABLE DATA; Schema: marslab_schema; Owner: marslab_user
--

COPY marslab_schema.email_logs (id, renewal_id, recipient_email, recipient_type, email_type, subject, status, error_message, sent_at) FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: marslab_schema; Owner: marslab_user
--

COPY marslab_schema.notifications (id, user_id, role, title, message, type, read, link, created_at) FROM stdin;
9	\N	admin	Edit Access Requested	CST team requested edit access for testing	info	1	\N	2026-05-21 08:31:40.862204
5	\N	admin	Edit Access Requested	CST team requested edit access for testing	info	1	\N	2026-05-21 08:04:10.069064
1	\N	sales	New Renewal Added	New renewal created for testing (m365). Renewal date: 2026-12-01	info	1	\N	2026-05-21 07:47:20.421429
3	\N	sales	Follow-Up Required	Please meet testing regarding m365 renewal (5 days left).	warning	1	\N	2026-05-21 07:48:34.184009
6	\N	sales	Edit Access Approved	Admin approved edit access for testing	success	1	\N	2026-05-21 08:04:44.145628
2	\N	finance	Email Sent	5-day reminder sent for testing (m365).	info	1	\N	2026-05-21 07:48:32.499753
4	\N	finance	Email Sent	3-day reminder sent for testing (m365).	info	1	\N	2026-05-21 07:53:09.279676
7	\N	finance	Email Sent	15-day reminder sent for testing (m365).	info	1	\N	2026-05-21 08:30:59.028967
12	\N	finance	Renewal Update	Sidcorptech (Cloud-AWS) has been marked as "Awaiting Client Approval" by admin.	warning	1	\N	2026-05-21 09:38:00.09014
13	\N	finance	Renewal Update	testing (m365) has been marked as "Quotation Confirmation" by admin.	warning	1	\N	2026-05-21 09:38:15.950169
14	\N	finance	Email Sent	5-day reminder sent for Chi Dev 9 (Slack Pro Workspace).	info	1	\N	2026-05-21 10:22:44.208412
16	\N	finance	Email Sent	3-day reminder sent for Iota Digital 1 (Google Workspace Enterprise).	info	1	\N	2026-05-21 10:22:46.939086
17	\N	finance	Email Sent	3-day reminder sent for Phi Marketing 7 (Mailchimp Premium).	info	1	\N	2026-05-21 10:22:48.022518
18	\N	finance	Email Sent	5-day reminder sent for Tau Healthcare 9 (Jira Cloud Premium).	info	1	\N	2026-05-21 10:22:51.100459
20	\N	finance	Email Sent	5-day reminder sent for Nu Logistics 3 (Salesforce CRM).	info	1	\N	2026-05-21 10:22:53.056568
22	\N	finance	Renewal Update	Iota Digital 7 (Zoom Pro Subscription) has been marked as "Quotation Confirmation" by admin.	warning	1	\N	2026-05-21 11:01:47.031283
23	\N	finance	Renewal Update	Iota Digital 7 (Zoom Pro Subscription) has been marked as "Renewed" by admin.	success	1	\N	2026-05-21 11:02:06.782936
24	\N	finance	Renewal Update	Phi Marketing 5 (Adobe Creative Cloud) has been marked as "Service Discontinued" by admin.	error	1	\N	2026-05-21 11:03:08.795516
53	\N	finance	Renewal Update	Iota Digital 1 (Google Workspace Enterprise) has been marked as "Awaiting Client Approval" by cst team.	warning	1	\N	2026-05-22 05:25:10.594426
52	\N	admin	Edit Access Requested	CST team requested edit access for Upsilon Finance 6	info	1	\N	2026-05-22 05:21:13.893989
55	\N	admin	Edit Access Requested	CST team requested edit access for Theta Labs 7	info	1	\N	2026-05-22 05:41:01.515694
8	\N	sales	Follow-Up Required	Please meet testing regarding m365 renewal (15 days left).	warning	1	\N	2026-05-21 08:31:00.172503
10	\N	sales	Edit Access Approved	Admin approved edit access for testing	success	1	\N	2026-05-21 08:31:59.960557
11	\N	sales	New Renewal Added	New renewal created for Sidcorptech (Cloud-AWS). Renewal date: 2026-06-01	info	1	\N	2026-05-21 09:37:29.882978
15	\N	sales	Follow-Up Required	Please meet Chi Dev 9 regarding Slack Pro Workspace renewal (5 days left).	warning	1	\N	2026-05-21 10:22:45.238642
19	\N	sales	Follow-Up Required	Please meet Tau Healthcare 9 regarding Jira Cloud Premium renewal (5 days left).	warning	1	\N	2026-05-21 10:22:51.954757
21	\N	sales	Follow-Up Required	Please meet Nu Logistics 3 regarding Salesforce CRM renewal (5 days left).	warning	1	\N	2026-05-21 10:22:54.898914
34	\N	sales	Follow-Up Required	Please meet Delta Consulting 2 regarding HubSpot Suite renewal (5 days left).	warning	1	\N	2026-05-22 04:04:13.627091
37	\N	sales	Follow-Up Required	Please meet Zeta Systems 1 regarding Dropbox Business renewal (5 days left).	warning	1	\N	2026-05-22 04:04:36.194432
39	\N	sales	Follow-Up Required	Please meet Alpha Technologies 7 regarding Asana Business renewal (15 days left).	warning	1	\N	2026-05-22 04:04:45.903988
40	\N	sales	New Renewal Added	New renewal created for sameer test (m365). Renewal date: 2026-12-01	info	1	\N	2026-05-22 04:34:22.323231
41	\N	sales	New Renewal Added	New renewal created for sameer2 (aws). Renewal date: 2026-05-25	info	1	\N	2026-05-22 04:40:25.10422
47	\N	sales	Follow-Up Required	Please meet Delta Consulting 2 regarding HubSpot Suite renewal (5 days left).	warning	1	\N	2026-05-22 05:00:08.565739
49	\N	sales	Follow-Up Required	Please meet Alpha Technologies 7 regarding Asana Business renewal (15 days left).	warning	1	\N	2026-05-22 05:00:14.370566
51	\N	sales	Follow-Up Required	Please meet Zeta Systems 1 regarding Dropbox Business renewal (5 days left).	warning	1	\N	2026-05-22 05:00:17.915014
54	\N	sales	Edit Access Approved	Admin approved edit access for Upsilon Finance 6	success	1	\N	2026-05-22 05:38:09.168995
56	\N	sales	Edit Access Approved	Admin approved edit access for Theta Labs 7	success	1	\N	2026-05-22 05:41:15.399597
25	\N	finance	Renewal Update	Tau Healthcare 5 (Asana Business) has been marked as "Awaiting with Vendor" by admin.	warning	1	\N	2026-05-21 11:14:14.941507
26	\N	finance	Renewal Update	Eta Ventures 4 (Dropbox Business) has been marked as "Renewed" by admin.	success	1	\N	2026-05-21 11:18:24.751543
27	\N	finance	Renewal Update	Omega Holdings 7 (AWS Cloud Hosting) has been marked as "Renewed" by admin.	success	1	\N	2026-05-21 11:18:45.782134
28	\N	finance	Renewal Update	Delta Consulting 2 (Zendesk Support Enterprise) has been marked as "Renewed" by admin.	success	1	\N	2026-05-21 11:20:21.303095
29	\N	finance	Renewal Update	Beta Solutions 3 (Zendesk Support Enterprise) has been marked as "Renewed" by admin.	success	1	\N	2026-05-21 11:20:43.027569
30	\N	finance	Renewal Update	Phi Marketing 5 (Adobe Creative Cloud) has been marked as "Renewed" by admin.	success	1	\N	2026-05-21 11:20:55.40175
31	\N	finance	Renewal Update	Xi Industries 5 (Google Workspace Enterprise) has been marked as "Service Discontinued" by admin.	error	1	\N	2026-05-21 11:21:01.20995
32	\N	finance	Email Sent	10-day reminder sent for Sidcorptech (Cloud-AWS).	info	1	\N	2026-05-22 04:03:56.360938
33	\N	finance	Email Sent	5-day reminder sent for Delta Consulting 2 (HubSpot Suite).	info	1	\N	2026-05-22 04:04:08.892514
35	\N	finance	Email Sent	3-day reminder sent for Delta Consulting 6 (Microsoft 365 Business Standard).	info	1	\N	2026-05-22 04:04:25.88706
36	\N	finance	Email Sent	5-day reminder sent for Zeta Systems 1 (Dropbox Business).	info	1	\N	2026-05-22 04:04:30.970718
38	\N	finance	Email Sent	15-day reminder sent for Alpha Technologies 7 (Asana Business).	info	1	\N	2026-05-22 04:04:41.194775
42	\N	finance	Email Sent	3-day reminder sent for sameer2 (aws).	info	1	\N	2026-05-22 04:48:49.616383
43	\N	finance	Email Sent	10-day reminder sent for Sidcorptech (Cloud-AWS).	info	1	\N	2026-05-22 05:00:03.824591
44	\N	finance	Email Sent	3-day reminder sent for Delta Consulting 6 (Microsoft 365 Business Standard).	info	1	\N	2026-05-22 05:00:05.468006
45	\N	finance	Email Sent	3-day reminder sent for sameer2 (aws).	info	1	\N	2026-05-22 05:00:06.496352
46	\N	finance	Email Sent	5-day reminder sent for Delta Consulting 2 (HubSpot Suite).	info	1	\N	2026-05-22 05:00:07.548176
48	\N	finance	Email Sent	15-day reminder sent for Alpha Technologies 7 (Asana Business).	info	1	\N	2026-05-22 05:00:09.947231
50	\N	finance	Email Sent	5-day reminder sent for Zeta Systems 1 (Dropbox Business).	info	1	\N	2026-05-22 05:00:17.116142
57	\N	finance	Email Sent	10-day reminder sent for Nu Logistics 9 (Figma Design Plan).	info	0	\N	2026-05-26 08:32:17.533962
58	\N	finance	Email Sent	3-day reminder sent for Zeta Systems 1 (Dropbox Business).	info	0	\N	2026-05-26 08:32:18.764368
59	\N	finance	Email Sent	10-day reminder sent for Delta Consulting 6 (Zoom Pro Subscription).	info	0	\N	2026-05-26 08:32:20.040172
60	\N	finance	Email Sent	3-day reminder sent for Tau Healthcare 9 (Jira Cloud Premium).	info	0	\N	2026-05-26 08:32:21.052545
61	\N	finance	Email Sent	20-day reminder sent for Gamma Enterprises 2 (Zendesk Support Enterprise).	info	0	\N	2026-05-26 08:32:21.974178
62	\N	finance	Email Sent	10-day reminder sent for Rho Global 1 (Zoom Pro Subscription).	info	0	\N	2026-05-26 08:32:22.912668
63	\N	finance	Email Sent	3-day reminder sent for Nu Logistics 3 (Salesforce CRM).	info	0	\N	2026-05-26 08:32:25.148157
64	\N	finance	Email Sent	15-day reminder sent for Sigma Retail 1 (Adobe Creative Cloud).	info	0	\N	2026-05-26 08:32:26.078981
65	\N	sales	Follow-Up Required	Please meet Sigma Retail 1 regarding Adobe Creative Cloud renewal (15 days left).	warning	0	\N	2026-05-26 08:32:26.8006
66	\N	finance	Email Sent	10-day reminder sent for testing (m365).	info	0	\N	2026-05-26 08:32:27.856281
67	\N	finance	Email Sent	10-day reminder sent for Chi Dev 1 (Slack Pro Workspace).	info	0	\N	2026-05-26 08:32:28.799314
68	\N	finance	Email Sent	3-day reminder sent for Delta Consulting 2 (HubSpot Suite).	info	0	\N	2026-05-26 08:32:29.823978
69	\N	finance	Email Sent	3-day reminder sent for Chi Dev 9 (Slack Pro Workspace).	info	0	\N	2026-05-26 08:32:30.719205
70	\N	admin	Invoice Updated	Invoice details updated for client "Chi Dev 9" (Slack Pro Workspace): Invoice #inv123, Value: ₹3,20,000.	info	0	/renewals?search=RMT-07	2026-05-26 08:36:20.669604
73	\N	admin	Renewal Deleted	Renewal for client "Tau Healthcare 9" (Jira Cloud Premium) has been moved to trash by admin.	warning	0	/trash	2026-05-26 08:37:43.784491
75	\N	admin	Renewal Deleted	Renewal for client "Nu Logistics 3" (Salesforce CRM) has been moved to trash by admin.	warning	0	/trash	2026-05-26 08:37:45.64961
77	\N	admin	Renewal Deleted	Renewal for client "Zeta Systems 1" (Dropbox Business) has been moved to trash by admin.	warning	0	/trash	2026-05-26 08:37:47.906289
79	\N	admin	Renewal Deleted	Renewal for client "Delta Consulting 2" (HubSpot Suite) has been moved to trash by admin.	warning	0	/trash	2026-05-26 08:37:53.502071
82	\N	admin	Renewal Update	Sidcorptech (Cloud-AWS) has been marked as "Renewed" by admin.	success	0	/renewals?search=RMT-02	2026-05-26 08:38:23.613681
83	\N	admin	Renewal Deleted	Renewal for client "Nu Logistics 9" (Figma Design Plan) has been moved to trash by admin.	warning	0	/trash	2026-05-26 08:42:00.798997
85	\N	admin	Renewals Deleted	25 renewals have been moved to trash by admin.	warning	0	/trash	2026-05-26 08:46:16.991175
87	\N	admin	Renewals Deleted	25 renewals have been moved to trash by admin.	warning	0	/trash	2026-05-26 08:46:21.739179
89	\N	admin	Renewals Deleted	25 renewals have been moved to trash by admin.	warning	0	/trash	2026-05-26 08:46:31.679051
91	\N	admin	Renewals Deleted	21 renewals have been moved to trash by admin.	warning	0	/trash	2026-05-26 08:46:35.524472
93	\N	admin	Renewal Expiry Reason Provided	CST team has provided the reason for expired renewal of client "sameer2" (aws). Reason: test	info	0	/renewals?search=RMT-104	2026-05-27 08:37:26.545157
96	\N	admin	Renewal Update	sameer2 (aws) has been marked as "Service Discontinued" by cst team.	error	0	/renewals?search=RMT-104	2026-05-27 08:38:17.479415
98	\N	admin	Renewal Update	sameer2 (aws) has been marked as "Renewed" by cst team.	success	0	/renewals?search=RMT-104	2026-05-27 08:40:39.05491
99	\N	admin	Edit Access Requested	CST team requested edit access for sameer2	info	1	\N	2026-05-27 08:40:51.977769
100	\N	sales	Edit Access Approved	Admin approved edit access for sameer2	success	0	\N	2026-05-27 08:41:30.541232
101	\N	admin	Renewal Details Updated	Renewal details updated for client "sameer2" (aws) by sales team. Reason: sfsag.	info	0	/renewals?search=RMT-104	2026-05-27 08:42:03.976129
103	\N	admin	Edit Access Requested	CST team requested edit access for sameer2	info	0	\N	2026-05-27 08:43:06.366731
104	\N	sales	Edit Access Approved	Admin approved edit access for sameer2	success	0	\N	2026-05-27 08:43:16.196399
105	\N	admin	Renewal Details Updated	Renewal details updated for client "sameer2" (aws) by sales team. Reason: 21536.	info	0	/renewals?search=RMT-104	2026-05-27 08:44:04.355321
97	\N	finance	Renewal Update	sameer2 (aws) has been marked as "Renewed" by cst team.	success	1	/renewals?search=RMT-104	2026-05-27 08:40:39.054057
95	\N	finance	Renewal Update	sameer2 (aws) has been marked as "Service Discontinued" by cst team.	error	1	/renewals?search=RMT-104	2026-05-27 08:38:17.478306
94	\N	finance	Renewal Expiry Reason Provided	CST team has provided the reason for expired renewal of client "sameer2" (aws). Reason: test	info	1	/renewals?search=RMT-104	2026-05-27 08:37:26.547074
92	\N	finance	Renewals Deleted	21 renewals have been moved to trash by admin.	warning	1	/trash	2026-05-26 08:46:35.52539
90	\N	finance	Renewals Deleted	25 renewals have been moved to trash by admin.	warning	1	/trash	2026-05-26 08:46:31.680004
88	\N	finance	Renewals Deleted	25 renewals have been moved to trash by admin.	warning	1	/trash	2026-05-26 08:46:21.740065
86	\N	finance	Renewals Deleted	25 renewals have been moved to trash by admin.	warning	1	/trash	2026-05-26 08:46:16.99202
84	\N	finance	Renewal Deleted	Renewal for client "Nu Logistics 9" (Figma Design Plan) has been moved to trash by admin.	warning	1	/trash	2026-05-26 08:42:00.800343
81	\N	finance	Renewal Update	Sidcorptech (Cloud-AWS) has been marked as "Renewed" by admin.	success	1	/renewals?search=RMT-02	2026-05-26 08:38:23.612774
80	\N	finance	Renewal Deleted	Renewal for client "Delta Consulting 2" (HubSpot Suite) has been moved to trash by admin.	warning	1	/trash	2026-05-26 08:37:53.503229
78	\N	finance	Renewal Deleted	Renewal for client "Zeta Systems 1" (Dropbox Business) has been moved to trash by admin.	warning	1	/trash	2026-05-26 08:37:47.907388
76	\N	finance	Renewal Deleted	Renewal for client "Nu Logistics 3" (Salesforce CRM) has been moved to trash by admin.	warning	1	/trash	2026-05-26 08:37:45.650679
71	\N	finance	Invoice Updated	Invoice details updated for client "Chi Dev 9" (Slack Pro Workspace): Invoice #inv123, Value: ₹3,20,000.	info	1	/renewals?search=RMT-07	2026-05-26 08:36:20.670879
107	\N	finance	Email Sent	3-day reminder sent for sameer2 (aws).	info	0	\N	2026-05-27 08:44:07.074869
108	\N	admin	Renewal Details Updated	Renewal details updated for client "sameer2" (aws) by admin team. Reason: 1324.	info	0	/renewals?search=RMT-104	2026-05-27 08:45:35.074474
110	\N	finance	Email Sent	5-day reminder sent for sameer2 (aws).	info	0	\N	2026-05-27 08:45:37.072069
111	\N	sales	Follow-Up Required	Please meet sameer2 regarding aws renewal (5 days left).	warning	0	\N	2026-05-27 08:50:31.477019
112	\N	admin	Renewal Details Updated	Renewal details updated for client "sameer2" (aws) by admin team. Reason: test.	info	0	/renewals?search=RMT-104	2026-05-27 08:51:37.477405
114	\N	finance	Email Sent	15-day reminder sent for sameer2 (aws).	info	0	\N	2026-05-27 08:51:39.523831
115	\N	sales	Follow-Up Required	Please meet sameer2 regarding aws renewal (15 days left).	warning	0	\N	2026-05-27 08:51:40.378471
116	\N	admin	Invoice Updated	Invoice details updated for client "sameer2" (aws): Invoice #124325, Value: ₹10,000.	info	0	/renewals?search=RMT-104	2026-05-27 08:54:57.535316
118	\N	admin	Renewal Details Updated	Renewal details updated for client "sameer2" (aws) by admin team. Reason: dgdzg.	info	0	/renewals?search=RMT-104	2026-05-27 09:14:51.097262
119	\N	finance	Renewal Details Updated	Renewal details updated for client "sameer2" (aws) by admin team. Reason: dgdzg.	info	1	/renewals?search=RMT-104	2026-05-27 09:14:51.098955
109	\N	finance	Renewal Details Updated	Renewal details updated for client "sameer2" (aws) by admin team. Reason: 1324.	info	1	/renewals?search=RMT-104	2026-05-27 08:45:35.075493
113	\N	finance	Renewal Details Updated	Renewal details updated for client "sameer2" (aws) by admin team. Reason: test.	info	1	/renewals?search=RMT-104	2026-05-27 08:51:37.478431
117	\N	finance	Invoice Updated	Invoice details updated for client "sameer2" (aws): Invoice #124325, Value: ₹10,000.	info	1	/renewals?search=RMT-104	2026-05-27 08:54:57.537475
106	\N	finance	Renewal Details Updated	Renewal details updated for client "sameer2" (aws) by sales team. Reason: 21536.	info	1	/renewals?search=RMT-104	2026-05-27 08:44:04.356634
102	\N	finance	Renewal Details Updated	Renewal details updated for client "sameer2" (aws) by sales team. Reason: sfsag.	info	1	/renewals?search=RMT-104	2026-05-27 08:42:03.977439
74	\N	finance	Renewal Deleted	Renewal for client "Tau Healthcare 9" (Jira Cloud Premium) has been moved to trash by admin.	warning	1	/trash	2026-05-26 08:37:43.785923
120	\N	admin	Renewal Details Updated	Renewal details updated for client "sameer2" (aws) by admin team. Reason: fv.	info	0	/renewals?search=RMT-104	2026-05-27 09:25:17.701244
121	\N	finance	Renewal Details Updated	Renewal details updated for client "sameer2" (aws) by admin team. Reason: fv.	info	1	/renewals?search=RMT-104	2026-05-27 09:25:17.70257
122	\N	admin	Renewal Details Updated	Renewal details updated for client "sameer2" (aws) by admin team. Reason: asfasf.	info	0	/renewals?search=RMT-104	2026-05-27 09:29:45.925285
123	\N	finance	Renewal Details Updated	Renewal details updated for client "sameer2" (aws) by admin team. Reason: asfasf.	info	1	/renewals?search=RMT-104	2026-05-27 09:29:45.92663
124	\N	admin	Invoice Updated	Invoice marked as not sent for client "sameer2" (aws).	info	0	/renewals?search=RMT-104	2026-05-30 04:00:50.044097
126	\N	admin	Invoice Updated	Invoice details updated for client "sameer2" (aws): Invoice #inv123, Value: ₹13,240.	info	0	/renewals?search=RMT-104	2026-05-30 04:01:29.219237
127	\N	finance	Invoice Updated	Invoice details updated for client "sameer2" (aws): Invoice #inv123, Value: ₹13,240.	info	1	/renewals?search=RMT-104	2026-05-30 04:01:29.220497
128	\N	sales	New Renewal Added	New renewal created for test (Amazon Web Services). Renewal date: 2027-01-01	info	0	\N	2026-05-30 04:13:57.95556
129	\N	admin	New Renewal Added	New renewal created for test (Amazon Web Services). Renewal date: 2027-01-01	info	0	/renewals?search=RMT-105	2026-05-30 04:13:57.957336
131	\N	admin	Edit Access Requested	CST team requested edit access for test	info	0	\N	2026-05-30 04:14:40.993237
132	\N	sales	Edit Access Approved	Admin approved edit access for test	success	0	\N	2026-05-30 04:15:10.529637
133	\N	admin	Renewal Details Updated	Renewal details updated for client "test" (Amazon Web Services) by sales team. Reason: test.	info	0	/renewals?search=RMT-105	2026-05-30 04:16:29.345779
135	\N	admin	Edit Access Requested	CST team requested edit access for test	info	0	\N	2026-05-30 04:16:36.236645
136	\N	sales	Edit Access Approved	Admin approved edit access for test	success	0	\N	2026-05-30 04:17:24.46181
137	\N	admin	Renewal Details Updated	Renewal details updated for client "test" (Amazon Web Services) by sales team. Reason: test1.	info	0	/renewals?search=RMT-105	2026-05-30 04:18:00.226373
139	\N	admin	Renewal Details Updated	Renewal details updated for client "test" (Amazon Web Services) by admin team. Reason: test.	info	0	/renewals?search=RMT-105	2026-05-30 04:20:29.069006
141	\N	admin	Renewal Details Updated	Renewal details updated for client "test" (Amazon Web Services) by admin team. Reason: test.	info	0	/renewals?search=RMT-105	2026-05-30 04:21:35.785177
143	\N	finance	Email Sent	30-day reminder sent for test (Amazon Web Services).	info	0	\N	2026-05-30 04:21:39.676489
144	\N	admin	Renewal Details Updated	Renewal details updated for client "test" (Amazon Web Services) by admin team. Reason: test.	info	0	/renewals?search=RMT-105	2026-05-30 04:26:32.606112
146	\N	finance	Email Sent	15-day reminder sent for test (Amazon Web Services).	info	0	\N	2026-05-30 04:26:34.70918
147	\N	sales	Follow-Up Required	Please meet test regarding Amazon Web Services renewal (15 days left).	warning	0	\N	2026-05-30 04:26:35.446122
148	\N	sales	Renewal Expired - Reason Required	test's Amazon Web Services renewal has expired. Please provide a reason for the expiry.	error	0	\N	2026-05-30 04:44:19.576619
142	\N	finance	Renewal Details Updated	Renewal details updated for client "test" (Amazon Web Services) by admin team. Reason: test.	info	1	/renewals?search=RMT-105	2026-05-30 04:21:35.786182
138	\N	finance	Renewal Details Updated	Renewal details updated for client "test" (Amazon Web Services) by sales team. Reason: test1.	info	1	/renewals?search=RMT-105	2026-05-30 04:18:00.227953
134	\N	finance	Renewal Details Updated	Renewal details updated for client "test" (Amazon Web Services) by sales team. Reason: test.	info	1	/renewals?search=RMT-105	2026-05-30 04:16:29.347054
130	\N	finance	New Renewal Added	New renewal created for test (Amazon Web Services). Renewal date: 2027-01-01	info	1	/renewals?search=RMT-105	2026-05-30 04:13:57.959152
125	\N	finance	Invoice Updated	Invoice marked as not sent for client "sameer2" (aws).	info	1	/renewals?search=RMT-104	2026-05-30 04:00:50.046537
149	\N	admin	Renewal Details Updated	Renewal details updated for client "test" (Amazon Web Services) by admin team. Reason: test.	info	0	/renewals?search=RMT-105	2026-05-30 04:44:21.567653
151	\N	admin	Renewal Expiry Reason Provided	CST team has provided the reason for expired renewal of client "test" (Amazon Web Services). Reason: test	info	1	/renewals?search=RMT-105	2026-05-30 04:46:49.525973
153	\N	admin	Invoice Updated	Invoice details updated for client "test" (Amazon Web Services): Invoice #inv123, Value: ₹10,000.	info	0	/renewals?search=RMT-105	2026-05-30 04:48:33.958344
155	\N	admin	Renewal Deleted	Renewal for client "test" (Amazon Web Services) has been moved to trash by admin.	warning	0	/trash	2026-05-30 04:53:45.42862
157	\N	finance	Email Sent	10-day reminder sent for sameer2 (aws).	info	0	\N	2026-06-01 04:17:46.839718
156	\N	finance	Renewal Deleted	Renewal for client "test" (Amazon Web Services) has been moved to trash by admin.	warning	1	/trash	2026-05-30 04:53:45.431028
154	\N	finance	Invoice Updated	Invoice details updated for client "test" (Amazon Web Services): Invoice #inv123, Value: ₹10,000.	info	1	/renewals?search=RMT-105	2026-05-30 04:48:33.962324
152	\N	finance	Renewal Expiry Reason Provided	CST team has provided the reason for expired renewal of client "test" (Amazon Web Services). Reason: test	info	1	/renewals?search=RMT-105	2026-05-30 04:46:49.529059
150	\N	finance	Renewal Details Updated	Renewal details updated for client "test" (Amazon Web Services) by admin team. Reason: test.	info	1	/renewals?search=RMT-105	2026-05-30 04:44:21.569873
145	\N	finance	Renewal Details Updated	Renewal details updated for client "test" (Amazon Web Services) by admin team. Reason: test.	info	1	/renewals?search=RMT-105	2026-05-30 04:26:32.608257
140	\N	finance	Renewal Details Updated	Renewal details updated for client "test" (Amazon Web Services) by admin team. Reason: test.	info	1	/renewals?search=RMT-105	2026-05-30 04:20:29.070119
158	\N	admin	Renewal Deleted	Renewal for client "sameer2" (aws) has been moved to trash by admin.	warning	0	/trash	2026-06-02 07:59:11.152312
159	\N	finance	Renewal Deleted	Renewal for client "sameer2" (aws) has been moved to trash by admin.	warning	1	/trash	2026-06-02 07:59:11.1538
160	\N	admin	Invoice Updated	Invoice marked as not sent for client "test" (Amazon Web Services).	info	0	/renewals?search=RMT-105	2026-06-02 07:59:48.008759
161	\N	finance	Invoice Updated	Invoice marked as not sent for client "test" (Amazon Web Services).	info	1	/renewals?search=RMT-105	2026-06-02 07:59:48.010335
162	\N	admin	Invoice Updated	Invoice details updated for client "test" (Amazon Web Services): Invoice #inv123, Value: ₹10,000.	info	0	/renewals?search=RMT-105	2026-06-02 09:14:55.297969
164	\N	admin	Invoice Updated	Invoice marked as not sent for client "test" (Amazon Web Services).	info	0	/renewals?search=RMT-105	2026-06-02 09:15:53.817649
166	\N	admin	Invoice Updated	Invoice details updated for client "test" (Amazon Web Services): Invoice #inv1234, Value: ₹10,000.	info	0	/renewals?search=RMT-105	2026-06-02 09:16:05.877884
168	\N	admin	Invoice Updated	Invoice marked as not sent for client "test" (Amazon Web Services).	info	0	/renewals?search=RMT-105	2026-06-02 09:21:23.130522
171	\N	admin	Renewal Update	test (Amazon Web Services) has been marked as "Renewed" by admin.	success	0	/renewals?search=RMT-105	2026-06-02 09:21:33.906671
172	\N	admin	Renewal Deleted	Renewal for client "test" (Amazon Web Services) has been moved to trash by admin.	warning	0	/trash	2026-06-02 09:22:00.573235
173	\N	finance	Renewal Deleted	Renewal for client "test" (Amazon Web Services) has been moved to trash by admin.	warning	1	/trash	2026-06-02 09:22:00.574493
170	\N	finance	Renewal Update	test (Amazon Web Services) has been marked as "Renewed" by admin.	success	1	/renewals?search=RMT-105	2026-06-02 09:21:33.905533
169	\N	finance	Invoice Updated	Invoice marked as not sent for client "test" (Amazon Web Services).	info	1	/renewals?search=RMT-105	2026-06-02 09:21:23.131842
167	\N	finance	Invoice Updated	Invoice details updated for client "test" (Amazon Web Services): Invoice #inv1234, Value: ₹10,000.	info	1	/renewals?search=RMT-105	2026-06-02 09:16:05.87921
165	\N	finance	Invoice Updated	Invoice marked as not sent for client "test" (Amazon Web Services).	info	1	/renewals?search=RMT-105	2026-06-02 09:15:53.819228
163	\N	finance	Invoice Updated	Invoice details updated for client "test" (Amazon Web Services): Invoice #inv123, Value: ₹10,000.	info	1	/renewals?search=RMT-105	2026-06-02 09:14:55.300447
174	\N	sales	New Renewal Added	New renewal created for test (Amazon Web Services). Renewal date: 2026-11-01	info	0	\N	2026-06-02 09:45:22.82101
175	\N	admin	New Renewal Added	New renewal created for test (Amazon Web Services). Renewal date: 2026-11-01	info	0	/renewals?search=RMT-01	2026-06-02 09:45:22.822258
176	\N	finance	New Renewal Added	New renewal created for test (Amazon Web Services). Renewal date: 2026-11-01	info	1	/renewals?search=RMT-01	2026-06-02 09:45:22.823161
177	\N	admin	Renewal Details Updated	Renewal details updated for client "test" (Amazon Web Services) by admin team. Reason: test.	info	0	/renewals?search=RMT-01	2026-06-03 06:18:05.871182
178	\N	finance	Renewal Details Updated	Renewal details updated for client "test" (Amazon Web Services) by admin team. Reason: test.	info	0	/renewals?search=RMT-01	2026-06-03 06:18:05.872633
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: marslab_schema; Owner: marslab_user
--

COPY marslab_schema.refresh_tokens (id, user_id, token_hash, expires_at, revoked, created_at) FROM stdin;
1	1	a121e2e797b3e10ca5b4dd1ec83790f520b6bae07df9731a03bfee6ae4a7982d	2036-05-26 08:25:50.496	1	2026-05-26 08:25:50.496927
3	1	ca4b4c602043e9d140cdbdf4eb25b3992778cc10f325283e7993ad62376175af	2036-05-26 08:30:05.496	1	2026-05-26 08:30:05.496456
4	1	92b367226e2a4aff9c3edbff67fbbe108c88aa5df6b9aac4a7e95fe806c1fec3	2036-05-26 08:30:38.047	1	2026-05-26 08:30:38.048157
5	1	0753081bb03a205d038e3c131ed3eb89ce2eab2735829ced989f154c28f97f84	2036-05-26 08:30:46.062	1	2026-05-26 08:30:46.06253
2	3	393e89e66a930711c59532a1a2a2635ea350c209403520aa480c9554f4a6a628	2036-05-26 08:26:15.79	1	2026-05-26 08:26:15.790306
7	3	ace544dd80aa13e36506bd6b0ec6e4103c4406320ea0c3be070d2b9d7b80d719	2036-05-26 08:31:04.65	1	2026-05-26 08:31:04.650205
6	1	5b7177bd163c987ee9614bb06e31847baf60fb94ac31becf0209f92e6aaf0a8d	2036-05-26 08:30:56.385	1	2026-05-26 08:30:56.386076
9	1	6f9564421a2b3aecaef3492c3f3130da477ffd19108db642afbf6d353c327ee1	2036-05-26 08:31:13.899	1	2026-05-26 08:31:13.900037
10	1	5767445d1cc33bb097dfb78256b2cf2f60d4186f3cecca1ea7c9ba33363df40c	2036-05-26 08:33:03.188	1	2026-05-26 08:33:03.188899
11	1	72414f88bda70b3b05165cb6b503d82d02cc09490d335873080dd1f7180e5efc	2036-05-26 08:33:05.011	1	2026-05-26 08:33:05.011463
12	1	8b759fae112f5b8e37b4cad28be1b7d99cb2e8f06a8a8754b5300b3b51baf5aa	2036-05-26 08:33:07.482	1	2026-05-26 08:33:07.482192
13	1	4e98fec79e3b4ff87b2984b9e80ee0020b61d6723c92d89be28e002fbf206c2c	2036-05-26 08:33:10.678	1	2026-05-26 08:33:10.67831
14	1	e6befe87331c47fb672cda90716d8ab3c1ebbee2e5835ada28b074f14cacdb8d	2036-05-26 08:33:11.269	1	2026-05-26 08:33:11.270014
15	1	d35a37570e5659e5b1178978e4f51cf8066ead4ebf70edb16cb61811e87c6517	2036-05-26 08:33:11.466	1	2026-05-26 08:33:11.466439
16	1	fece553dc8f59cd0948db68d0e6017890c6a0e51457cab4a2d8e14b699ee062e	2036-05-26 08:33:11.649	1	2026-05-26 08:33:11.650041
17	1	b5d8bf6bc011851fae10f3fa0f0166c9a930858b6b18cc40533c04257f3e87d6	2036-05-26 08:33:11.825	1	2026-05-26 08:33:11.825656
18	1	6083fa02b4f594111188351fa5563f697ba91a0354eed95d3dd80f8d65095236	2036-05-26 08:33:43.138	1	2026-05-26 08:33:43.13865
19	1	734bdd2e6195cb22d8375561ef7e25edebeb8b4b9bae6c4a1bde861b9ffa99aa	2036-05-26 08:33:45.505	1	2026-05-26 08:33:45.505877
20	1	296331fd4ff82be30ae13b5a8a86ba768931eddfb4291c9849d2ce22cce05649	2036-05-26 08:33:46.326	1	2026-05-26 08:33:46.326804
21	1	add9bee5622de57ffd5c34c45a777ebf3aa430f43712e7d36f4e02a33b8345cd	2036-05-26 08:33:46.534	1	2026-05-26 08:33:46.535282
22	1	9b7d955fe33c6a8443111dc59010aff4c46b4c04d718872b54c696edae0ccae6	2036-05-26 08:33:46.725	1	2026-05-26 08:33:46.725894
23	1	34206f5b25b73dc330dd547f98b085ebac3d6b71e4f5f09af796be19dc72bda3	2036-05-26 08:33:46.91	1	2026-05-26 08:33:46.910445
24	1	1f5eb6edd3db75bbcbfaab3f7afe6abbdb10016bed068a7a2ad3923bafe55569	2036-05-26 08:33:47.092	1	2026-05-26 08:33:47.092793
25	1	71d2e8b23a67e3920c3a7cfbfa3069d3a82324d6030d3c3479557cb02e5e02a6	2036-05-26 08:33:47.268	1	2026-05-26 08:33:47.269034
26	1	28581b1f1dc1d29d91d30a451c8c483001ab71c1af85ed3eab75dea32754544b	2036-05-26 08:33:47.447	1	2026-05-26 08:33:47.448012
27	1	d035cc0dd324473062d81ce6b1b571f001e73226e7242789904aa018d5c11ed6	2036-05-26 08:33:47.628	1	2026-05-26 08:33:47.628782
8	3	45b70947eeb1894145648e9355cb9bc4ed8dc8f81e842b9584bc7ded68cb978e	2036-05-26 08:31:08.486	1	2026-05-26 08:31:08.486364
28	1	65dc8c2b6370adc4bc51d192aaf3a17fd58934996c508760cc45db582823395e	2036-05-26 08:35:46.717	1	2026-05-26 08:35:46.717871
29	3	1f58d658302149d7bdfe0d260c67f7c7143891bd8d7a3a0559cd69bdd0c9aa65	2036-05-26 08:40:45.286	1	2026-05-26 08:40:45.286858
30	1	36736bab85421985776d9a88dba27930064f6d8cecb65b045974629fcfe61bf7	2036-05-26 08:41:46.852	1	2026-05-26 08:41:46.85258
32	1	a5c3b6a6791f8882c326e6003d7468c3aa0a116fc39389c36dd907a248727394	2036-05-26 08:45:08.819	1	2026-05-26 08:45:08.819824
33	1	a140a852f314dda65cb7c5ee54f9604e4fad2c1caaca9ce362ce360649e3c1d4	2036-05-26 08:46:06.186	1	2026-05-26 08:46:06.186782
34	1	c5cb0a83f4510ff394901adc4626f6c5bd9a0aa1882b0092ab9fd1390cba167c	2036-05-26 08:46:43.504	1	2026-05-26 08:46:43.50435
31	3	f7b06c1bce963b8a9eb537c17b85dbeb8f3eaaed7d410b39863ff5686d3fc978	2036-05-26 08:45:02.571	1	2026-05-26 08:45:02.571618
35	1	d2258b5e49841d71504483a28d66c8242d588c09528023fd9624a31aacb9f7bf	2036-05-27 08:29:32.564	1	2026-05-27 08:29:32.564866
36	2	3b7b90cb338a69e25940d22284740f285fdcd66a10bb0a4394264c1c1855f151	2036-05-27 08:30:29.75	1	2026-05-27 08:30:29.750371
39	2	e36d8943adece92ef2dc1e4b69399af0803d977c9435fe10059c5a04bbbd81af	2036-05-27 08:35:58.688	1	2026-05-27 08:35:58.688803
40	2	9b3f5b4de875b4214d374b57da5efbc22b6270ed3a3a0f9f3ed50b14e7da55e2	2036-05-27 08:36:23.021	1	2026-05-27 08:36:23.021454
41	2	4c5bab29ac59d947d9229ab44ecb6123c7737337786391b9d8596b17053dac35	2036-05-27 08:36:24.952	1	2026-05-27 08:36:24.952471
42	2	c9d2dce09b2c45ad57ee4cf85c3a4fb50025d865d15ab6a0ea6c6362b46448f1	2036-05-27 08:36:25.53	1	2026-05-27 08:36:25.530748
43	2	944ff54c0df3ce5353b86642dc17b106516d141d2af63dd2eca1a58b2aa44d6c	2036-05-27 08:36:25.836	1	2026-05-27 08:36:25.836405
44	2	4ee61e1dfa36f9a318643c870c5c705a4a4a5fea5600b60fdb6730e60f83e51e	2036-05-27 08:36:26.141	1	2026-05-27 08:36:26.141935
45	2	9b73348fef6f7d00e2cf0b5c8e9634413989efd9c285203066c6ad3afacc681c	2036-05-27 08:36:37.689	1	2026-05-27 08:36:37.689654
46	2	0459abf8ae0a44ba6f417d26126d16a4e4b031bd57de8b7355aeab8f7ddf6693	2036-05-27 08:36:59.247	1	2026-05-27 08:36:59.247561
38	1	3c90aa34d88cb982b085fc504107ba0adac992234f9ebfd9a0d4ca1a8ac91bf0	2036-05-27 08:35:53.563	1	2026-05-27 08:35:53.56369
47	2	4a262eba3cff36c1b62b967385a4361c4279b75d5225bb89dc43d95fa4f8f483	2036-05-27 08:41:41.882	1	2026-05-27 08:41:41.882287
48	1	72976b50a62b035b41673aaf7bc0661a01ead5ea2142927c71e7edf4e1ac4afe	2036-05-27 08:43:30.515	1	2026-05-27 08:43:30.515438
50	1	18d5f15b33a411b134cc4141c3be4ba71c56bf6cef3a3687afc3f224785f762e	2036-05-27 08:45:13.975	1	2026-05-27 08:45:13.975931
37	3	c8a874ff2bc20e136dade102938b8651c9dfa647fff788d3b8eb8b5b2b86b990	2036-05-27 08:30:43.646	1	2026-05-27 08:30:43.647067
51	1	7884b5e0905e2666ffda3ee06cd2c144ce885f91f7dcfa1d9a0d04f26a3db6a2	2036-05-27 08:46:13.437	1	2026-05-27 08:46:13.437434
53	1	6771aebbb261fb532ba64315b5cadf5effa40c87addbfc2c112e1b050a67326c	2036-05-27 08:51:14.132	1	2026-05-27 08:51:14.132633
52	3	1defb822344ecf804d399b478cab31a83f206e60ae774e2219bbb8e139b5c333	2036-05-27 08:48:32.188	1	2026-05-27 08:48:32.188496
49	2	637818ad7a960845147b8b85aaa765ffeda6e8d7b8ea4f8681cd03f8d9285db3	2036-05-27 08:43:38.997	1	2026-05-27 08:43:38.997997
56	2	f9d5757bab620637c13ca4ce59d8d1d0562153381cc29ee40cb26a209cee14e9	2036-05-27 09:00:45.773	0	2026-05-27 09:00:45.773619
55	3	e7378f40983f888d9a07e7784c057a952e0b20af403fe750501aa1b23dd42ceb	2036-05-27 08:53:33.088	1	2026-05-27 08:53:33.088442
54	1	0561a15489e048af18c02cdeffe908a1c321b4c38194992c1c76556aaee7ffc7	2036-05-27 08:52:33.039	1	2026-05-27 08:52:33.039672
58	1	723e4e3dd2589fecc57f9ab04a9326b4fabce68d4da432dbe5bf815fa1aa2c05	2036-05-27 09:01:56.131	1	2026-05-27 09:01:56.131596
59	1	264db036f8f89dbfe39d3f16e02970fd042bfeaeb60464f472d95563aa726ca9	2036-05-27 09:02:21.34	1	2026-05-27 09:02:21.341001
57	3	4bbc7a1b816d9b137437e790e14af6048936f4e751285b049a2e5a2d7a17a46e	2036-05-27 09:00:52.518	1	2026-05-27 09:00:52.51879
60	1	a26e765a50e5867eb69f6e38de379bbd20839eab4085755d301697316d22dc31	2036-05-27 09:02:21.521	1	2026-05-27 09:02:21.522141
61	1	bf6c1096b5cb67e39b9b24182aa0292e6946f485ce9d9c43d790256eccbbb2ee	2036-05-27 09:02:21.696	1	2026-05-27 09:02:21.69646
62	1	e976a97955eff41edd8dbd89e2994044576cf29107e9c58a6271026d34c6abee	2036-05-27 09:02:21.877	1	2026-05-27 09:02:21.878021
63	1	2fd32138dfe2172986b38ac13efe454ea80cd263ba937a34c67ec45f014e7908	2036-05-27 09:02:23.46	1	2026-05-27 09:02:23.461005
64	3	66333455bfe4249841838749ffe51ae55b749719c42eee8f9834a02cdba32982	2036-05-27 09:05:56.05	1	2026-05-27 09:05:56.050538
65	1	c51503e270f91e7dd136d6b6b4b9f21881c122985b1f149580b2c3fa0efa527c	2036-05-27 09:07:20.308	1	2026-05-27 09:07:20.309052
67	1	32a1330d2ba0255b54a7e11fd803682b9f9ea34023b33d4535cab43244da0f06	2036-05-27 09:16:41.959	1	2026-05-27 09:16:41.959724
66	3	8b5661990fcf91dc8889b1421bcf84055b6ddabf123ae0708977ff3451809f52	2036-05-27 09:12:46.5	1	2026-05-27 09:12:46.500969
69	3	956e584aedaa03977a2861a4869088f8cc4c37b7487e19a421f5eba0bee5a3ca	2036-05-27 09:20:57.055	1	2026-05-27 09:20:57.055311
70	3	39536a901ddf20896d99f5674d7bc07cb717296fbdc7bd76a023f37d27ff2663	2036-05-27 09:26:34.974	1	2026-05-27 09:26:34.974815
71	3	67bb8758d86a9124846c8a65f57f2a842bce3b61993ff20f8efb647403261cbb	2036-05-27 09:26:46.94	1	2026-05-27 09:26:46.940293
72	3	96a16d43ca5e17cb23a442ca25e8a0db1145e4457770ee36bff2d6a255fad5a5	2036-05-27 09:26:51.886	1	2026-05-27 09:26:51.886801
73	3	7114394093a49961a09708b4ca1376bb906437a1072ac401b1f3913b3c2e9e9e	2036-05-27 09:26:57.921	1	2026-05-27 09:26:57.921691
74	3	d59f69811563eba54d5c334cc5da306f3e4609e40c0cbfc4429fbfd834b0c3a3	2036-05-27 09:29:58.606	1	2026-05-27 09:29:58.607011
75	3	223b5bb0aa130968457034c9b1fba1796806e24de99d574cbbd22eaf0428fa21	2036-05-27 09:30:11.728	1	2026-05-27 09:30:11.728753
76	3	5de2c30de07daaf92937cfc427c13578d5387011973dbd1e09336fce1d033ae5	2036-05-27 09:33:28.158	1	2026-05-27 09:33:28.159249
77	3	3ed5dddce06f94f73ba73a16fbbe7a60a351f00d120526a27a27837b771eb2b8	2036-05-27 09:37:55.85	1	2026-05-27 09:37:55.850904
78	3	e2ca04c2647cd1ddead13e4b742e8708a43f722830731bd2959d78cac5967b70	2036-05-27 09:50:53.165	1	2026-05-27 09:50:53.166194
68	1	80cdb0ea07508673d61060d6d089e966fa22994aab0fa30e9a628fcee81ac9ee	2036-05-27 09:20:52.739	1	2026-05-27 09:20:52.74013
80	1	beffab1cec9237f220fecd0708b90a0bad5b83bb2f640dd834b1325318a04e6f	2036-05-27 09:56:52.055	1	2026-05-27 09:56:52.056181
81	1	1e667ae396c91f1b2d3b38f855ec0d337460d5fc5d9521d7e128e38b100699de	2036-05-29 04:51:22.3	1	2026-05-29 04:51:22.300909
79	3	c404be20411be82ce0c515bb4a4d77f1f4f9c3917c547a7e1538537228b71132	2036-05-27 09:56:44.612	1	2026-05-27 09:56:44.612696
82	1	9f6d7e5b0d7abefbfe4071fb9b3fade6a07ba08ab4020e61875b8ec1e92d8e62	2036-05-29 04:51:32.839	1	2026-05-29 04:51:32.839186
83	3	4292b87469f12eae8a457b321b0e558abfa1ca4b42b9cbf78e1b1ab3f4065af2	2036-05-29 04:51:49.174	1	2026-05-29 04:51:49.174384
85	3	eb35466e63cfa8efa463b44d8ed75eb73175af4498627b38f2fb402bd4811077	2036-05-30 03:52:22.306	1	2026-05-30 03:52:22.307001
87	2	ecbaa4dec7eec69c0dece3f2b49977d7e4a176da87822e85db23e6914b72b558	2036-05-30 04:11:51.239	1	2026-05-30 04:11:51.239375
84	1	426b0c832d84fa034a4ff0549b89d611c8434a134b1d7edbee5082fbe12fe118	2036-05-30 03:51:52.743	1	2026-05-30 03:51:52.744308
88	2	8d3bd43ef5bfbb9d6e1eebef1eb84f22aa41b46df6a47289c6c81e21d4240dc7	2036-05-30 04:15:21.53	1	2026-05-30 04:15:21.530486
89	1	e173ec1f684a04e11599a742eb5008ce57db23c536c309bcca8a56fef4e9cc2c	2036-05-30 04:17:16.557	1	2026-05-30 04:17:16.558246
90	2	06698ee9e8b557f18cee784cbfb7c99f7cb815c5834749cb425ecd5ba4749e66	2036-05-30 04:17:35.386	1	2026-05-30 04:17:35.387163
92	2	fdadc177de076d6cdafccf8af02b11eb15c309d778f713a439d4cd3bf6ffe5ae	2036-05-30 04:44:33.833	1	2026-05-30 04:44:33.834429
93	2	487e4605737718d0e58a76bb41de535a49e269a08958cf84b789415cc373f334	2036-05-30 04:44:56.836	0	2026-05-30 04:44:56.837127
86	3	2f96e54a1f3fd093a48d6f8d142580696b7db38d8324e351989e74d65e7ecab4	2036-05-30 04:08:12.492	1	2026-05-30 04:08:12.49298
91	1	7152ebaa78c23c88c9595e5d7a8f5fa73d37400fb3e6f52641ccaad68fe618f4	2036-05-30 04:22:08.208	1	2026-05-30 04:22:08.208311
95	1	269eb38670f31016f891b86ddcf60fbdb265d4ea26e304af239819f1c40f82a9	2036-06-01 06:46:35.833	1	2026-06-01 06:46:35.834073
96	1	6060ef04d5d354e0b682e4bf11b03888b7fe80a6a043b85e5efa4c9b01a249cc	2036-06-01 06:57:20.013	1	2026-06-01 06:57:20.013419
97	1	54a5587f61f51e17f81143788c16953374098981203bb55648093b3ad39f8267	2036-06-01 07:00:55.022	1	2026-06-01 07:00:55.023294
98	1	703b3e94eca285271963e89122627fcb60612603f723ca9ea6538231c52604ee	2036-06-01 07:20:37.36	1	2026-06-01 07:20:37.360951
99	1	54c6f146e3b912506db99e403201a0a9a96bbb2755b9b6440172ef1bf309fc9c	2036-06-01 07:20:46.378	1	2026-06-01 07:20:46.378256
100	1	a894293b3c96083130641cabef6239f4dd81d864a1a4053d53a7b70dcd97a88b	2036-06-01 07:23:19.967	1	2026-06-01 07:23:19.967424
101	1	e78ca0bb34406c353610733832e88682f1518a0c3beb75f75d85739dd0c2fc6d	2036-06-01 09:23:19.761	1	2026-06-01 09:23:19.762057
102	1	790822efd3cc493f63cfb05129b800b6b5d90700f309142e3865bb8233126247	2036-06-01 10:44:37.054	1	2026-06-01 10:44:37.054438
103	1	b55f4be863a99c8552d11af4aea13416954151b0540b71764ec59a9bb39a5917	2036-06-01 12:55:22.095	1	2026-06-01 12:55:22.095219
104	1	9c55f7a0dc086ca552adc66dd88ea77da23c20fcf5dbb59c0f2483cbe553c092	2036-06-01 12:59:13.481	1	2026-06-01 12:59:13.481562
105	1	75ab2e556e0ea4a969017a9e4431f4079f1e9d74e3dd2d24b89dcbb50efa1ea1	2036-06-01 12:59:14.395	1	2026-06-01 12:59:14.395511
106	1	c69bd91788b6e64651fdf41daf83df684bfeac9e9c2d9a8febc701dbc5a6417d	2036-06-02 07:45:13.149	1	2026-06-02 07:45:13.150053
94	3	2cb4a90da2be7ac20aa051ee41a515b69ee896cba85786394dac665cc880922f	2036-05-30 04:48:19.03	1	2026-05-30 04:48:19.03068
107	1	27c5eab6b2fa655cb6ab27deef530873b42bee96aeba39a58f4a946e05890d47	2036-06-02 07:58:13.744	1	2026-06-02 07:58:13.744844
109	1	c24854150ef959bdc571612ae7bc57298dca18c2909963dec8c4f6b768df95d8	2036-06-02 08:00:11.986	1	2026-06-02 08:00:11.987059
108	3	3100642dd8cb7beb32be68aad04b1ac1d88deba74d444b3f547d727bf6b050e4	2036-06-02 07:58:26.94	1	2026-06-02 07:58:26.941228
110	1	22372f0e4ccd969502664c40b5086c0b83ed7bc565ed733f3772c069daff30c1	2036-06-02 09:01:47.02	1	2026-06-02 09:01:47.020417
112	1	d061609b66e4ca676f8dffb7bd1b92e2c4d59803b426d85b65f8c2f5af5e2325	2036-06-02 09:15:58.923	1	2026-06-02 09:15:58.924235
114	2	a7299c45868e5a4937852327768a82bf9397c258f5e53e5c2d726e6b02a77942	2036-06-02 09:44:41.949	1	2026-06-02 09:44:41.9492
113	1	ce08af04c75caa7f643d4e8f7a71197fa8b39e99f20777ecd80381aa4f754bc5	2036-06-02 09:43:33.317	1	2026-06-02 09:43:33.318277
115	2	9db8e5673c9115277de27884dd3ef7f6db53a40a9d8fc146a9f6ec87b5de6203	2036-06-02 09:48:13.703	1	2026-06-02 09:48:13.703813
117	2	98195a4e0c2c6d5b7fa8a7a277375c3260dfb1e5ef945bc8db7c205cc8413642	2036-06-02 09:49:55.769	1	2026-06-02 09:49:55.769904
118	2	fc1b996cd0483c3329f1ba47905a25e7f1337206b7a79e4b8c9a92574a4cb300	2036-06-02 09:50:09.02	1	2026-06-02 09:50:09.020712
116	1	e2344b72f6d0af1254c993bb93aedcfcca75a9aebbe403836dc07e7bcb13c711	2036-06-02 09:49:03.653	1	2026-06-02 09:49:03.653529
111	3	1fcc48370f6af9f96ee73c6c4249ba698c21932f7851b57656772def78153db2	2036-06-02 09:06:51.831	1	2026-06-02 09:06:51.832026
121	3	92d5fdc3679feff1c9ee8a530dcf4a5bbcbd39594b2111710f2efac896335c9d	2036-06-02 09:52:34.313	0	2026-06-02 09:52:34.313306
119	2	00d47c5282095fc0ed7d8508a0cabcd77a86961184e0bce0ff0ce7d2c04235c8	2036-06-02 09:50:25.379	1	2026-06-02 09:50:25.379216
122	2	b3c9f169d87da1fa02f82a5240c433e1035cebf05761ec02e0a52b2b3fc12fa3	2036-06-02 09:56:13.129	1	2026-06-02 09:56:13.129823
123	2	438c830ad43be314066e1b4148dc20916dbe4e9d89e38eb8ca6e352b17458bc8	2036-06-02 09:56:15.308	1	2026-06-02 09:56:15.308312
124	2	dc4c795dc8db8cc2fb1d94746f09fcbc6f334db8e204e3c63374dee7c23034ee	2036-06-02 09:56:16.135	0	2026-06-02 09:56:16.136034
120	1	fcb44e192a84ba8c645a5918ecd6aee11db0762943e755d6f98ebd2c4b632faa	2036-06-02 09:52:19.512	1	2026-06-02 09:52:19.512494
125	1	d60ced4faf809e615f902ab423b35aa97eb9b18c829c519c10c37e6e040ce731	2036-06-02 09:56:23.199	1	2026-06-02 09:56:23.199468
126	1	55e702a3c16888bb575174fb6dc4a1d5af17a2ad3369cf8322c413e8f6171e18	2036-06-03 04:21:33.597	1	2026-06-03 04:21:33.598281
127	2	93b4738c91477571ea2b30dd4ce8f07e1afbbd4c774d0fc102ca10204f234f3e	2036-06-03 04:22:17.496	1	2026-06-03 04:22:17.496299
128	1	ef320e928ffe4b74d9b940b9ef96ed23919c06d2bf14d2a1f3c5bfbedab67224	2036-06-03 04:43:34.207	1	2026-06-03 04:43:34.207883
130	1	2e59133db6d1aef570bd2f68b69401e873ab7739dad4470207077bdfda184f6c	2036-06-03 04:46:35.622	1	2026-06-03 04:46:35.622455
129	2	64f8cda00da27bdcfcd334d2215dc69e9895d93b2deb1b20e9f44d11b8fc0194	2036-06-03 04:45:50.609	1	2026-06-03 04:45:50.610303
132	2	4a19be3113515930f210cf0508d10e958b9ae9b7e430af27d7005a7b889d0627	2036-06-03 04:59:38.96	1	2026-06-03 04:59:38.960514
133	2	58923be9d1a9c6b0f333fc4fc00aac558a042ea953f23bc88db04dd8a3cdf59e	2036-06-03 04:59:46.724	1	2026-06-03 04:59:46.724657
134	2	cb00dcfabf0e6fadc430a2d31206dc1605990e6a1020fc5851de9847c8693154	2036-06-03 04:59:47.727	1	2026-06-03 04:59:47.727932
135	2	54d9340275b92ed5190a3e54fcd646e362f7dcee05e00361b7d24495f5329ce1	2036-06-03 04:59:47.911	1	2026-06-03 04:59:47.912079
136	2	57d5c9f5d7917cf6680649c45631184f6c5a247490e14fc42f9c596368b3fc9b	2036-06-03 04:59:48.107	1	2026-06-03 04:59:48.107609
137	2	6e83ed2ab4b7f2d3b02a2f1189d17ccf3b9b11c5b2c72daf80653773d33283fd	2036-06-03 04:59:48.283	1	2026-06-03 04:59:48.283626
131	1	2386b9212779403ddd87d06b79679fe8c0cd7da8d4d36a63d6c7db0c61196a3b	2036-06-03 04:49:13.11	1	2026-06-03 04:49:13.110957
139	1	87ab606e635239fe4e6df02dce4fe7259e5daadf5643dbf6f0cfc12563c9991b	2036-06-03 04:59:52.56	1	2026-06-03 04:59:52.560475
140	1	2558dd9ec840b3d1b7fdd9d496f1965d9e8ccbeacb486e33663a97d96021efb7	2036-06-03 04:59:54.277	1	2026-06-03 04:59:54.277722
141	1	5f2e7a1c1498f4e4c9466392dc3313c7462f9a8b7b4f750d0b22675c7c9f591c	2036-06-03 04:59:54.861	1	2026-06-03 04:59:54.862204
142	1	176f5d1b5a9da5631de661b9be6d07f0f0f174dbadd1ea01ddb927b530de32a2	2036-06-03 04:59:55.044	1	2026-06-03 04:59:55.044448
143	1	8bc305ca55e755028ca98c18c26a02c68bc4e2c8ea78931df06cd8871b94a554	2036-06-03 04:59:55.215	1	2026-06-03 04:59:55.215872
138	2	8c050e5dcc54a0ac9b66f7ed8ecfde689cce6e9964d1a53d3de53a9e4616dee7	2036-06-03 04:59:48.428	1	2026-06-03 04:59:48.428701
145	2	77976186b4955cc303fbb9723eaa7bef3e4a17e7d20994080ce2524cc0aa3f1a	2036-06-03 05:00:18.31	1	2026-06-03 05:00:18.310582
146	2	53690bcb321cead920a55878f3bab9e9bf9bfb94cf276417cbc011c1f889cc47	2036-06-03 05:03:23.176	1	2026-06-03 05:03:23.177073
147	2	e1e4768e5705fd622e60ef095e68f55aff19bb1b23f39db4807e17a7f5c00074	2036-06-03 05:04:07.317	1	2026-06-03 05:04:07.317888
148	2	881728cd49bca9bc4574cb483fa6daefc0abbd000bc1d47c8b54aa1ad79bc001	2036-06-03 05:04:09.367	1	2026-06-03 05:04:09.367591
149	2	9bc8be5c1aff05f87bbd2b86477fa11986695586a70eca8296c9197eb2b161f4	2036-06-03 05:04:09.547	1	2026-06-03 05:04:09.547346
144	1	3c759c00db9dd73c4299d3d0b6f7a7b9a19eda1a12ca7197a237dc4f6b899409	2036-06-03 04:59:55.359	1	2026-06-03 04:59:55.359883
151	1	7236baa2b20d51eb4bfba63c3d451c9fe767b44ce84652567bea4fb4d4433d2b	2036-06-03 05:06:23.01	1	2026-06-03 05:06:23.010608
152	1	92777c1a5ace1e480057c98b843e285411dd175f42d7037dccf8d4e2d35ac983	2036-06-03 05:06:44.031	1	2026-06-03 05:06:44.031669
153	1	a7fd2dbcb8e9c4472d929aaa7eb089587f266e3f6b0bdc338ac60dff2cdec3ba	2036-06-03 05:12:58.528	1	2026-06-03 05:12:58.528733
150	2	e803b1adeb722b22b0902fe80bea85cc5ea2cc2d7984951f88777158c7a5a672	2036-06-03 05:04:09.71	1	2026-06-03 05:04:09.710935
155	2	6a98b766d622a582bd6119142ed13adaa0e28a2f60e81596d2863d3df3db084a	2036-06-03 05:19:29.444	1	2026-06-03 05:19:29.444901
156	2	13e6bbd5ad6a0d407b5643abd0e1a25f373dec463b010ee6eb49415edb977b2f	2036-06-03 05:19:41.78	1	2026-06-03 05:19:41.780411
157	2	2ab7dc0be05b44b93a0e58c709174253606afc53377052c2fa7aac6d2315c4a5	2036-06-03 05:19:42.751	1	2026-06-03 05:19:42.751788
158	2	685a6fa204ce05f68b55b2d12f2fd2a67e8529a72b071f5da2a713aae7be0ed2	2036-06-03 05:19:42.91	1	2026-06-03 05:19:42.910487
159	2	f7009a804f7980c536661aab7803d6fdbac64e0eaa141861e0e4799519199400	2036-06-03 05:19:43.093	1	2026-06-03 05:19:43.093815
160	2	483b71e5fad049e85e48d0a1dc1614ddbb4953fff40e9039322cc6881309dd2a	2036-06-03 05:19:43.261	1	2026-06-03 05:19:43.261295
161	2	7ebfd39cbcd2d0b7886a094b6b8e54de7892c64c7d2faa9d09b9a8ef870c5046	2036-06-03 05:19:43.442	1	2026-06-03 05:19:43.442234
162	2	fc88f8225a20378cf6e12ae17b3c9f97fae3bc56a997e7c341035ae689706c60	2036-06-03 05:19:43.619	1	2026-06-03 05:19:43.619732
154	1	59e0496eabc297c92fd5079fa6c0b0f6bef36111ca36803c7b24c7771cf1b9b4	2036-06-03 05:16:34.017	1	2026-06-03 05:16:34.018201
163	2	547dac9e70a8f4921e5cd62615f9291dbefa77910f7292814354fd9d5a0d6f94	2036-06-03 05:19:43.787	1	2026-06-03 05:19:43.788174
165	2	56d97d0533bb622292c6975903b5dfe625db0d872d9c797ce900fc1f7dce3c58	2036-06-03 05:20:00.335	1	2026-06-03 05:20:00.335497
166	2	de5d662fc7260e846fd144e5df8ea2d38a12de03c027a3480a8e1ea8efae1494	2036-06-03 05:20:01.868	1	2026-06-03 05:20:01.868546
167	2	04b28ebf11bc4253bb3f651f6c34cf830adaf2ebdc5072d0aa40a9eb59b58981	2036-06-03 05:20:02.036	1	2026-06-03 05:20:02.036271
168	2	1071c7f35577a56db1fdd38f98477ce24ff4958ec7b052ea89bcfb2e2ec7fae7	2036-06-03 05:20:02.212	1	2026-06-03 05:20:02.212532
169	2	17a3194b4ca5fda0ac23598f204b35f870a16bc142e5eabc3dc4ef4ea7af0635	2036-06-03 05:20:02.386	1	2026-06-03 05:20:02.386481
170	2	3d057493a1699dff3098c3242b9d8e9ee13af7d8bf3a52d2c5bb21b78505af1b	2036-06-03 05:20:02.556	1	2026-06-03 05:20:02.556822
164	1	fa498b7c7deb07b8c7d8a39a39249da85122dc28a9ec35fbb3cbb4e782c12ed2	2036-06-03 05:19:55.682	1	2026-06-03 05:19:55.682313
172	1	841d855c5662125fb531c027c9c49b58e2b9276a32fa29aa753f0c0adf5808da	2036-06-03 05:21:09.393	1	2026-06-03 05:21:09.393811
173	1	03bc6e628bdd36b88ce6b1142b968595f776560aae29b0473dfafeae688de360	2036-06-03 05:27:12.904	1	2026-06-03 05:27:12.904469
174	1	35c7edd2ca857c9a0e8c8f6214d8ac2edc98c2efed9905b05b313ccf5cc872e1	2036-06-03 05:44:00.244	1	2026-06-03 05:44:00.244939
171	2	d1786a9a0246416411359e9128090492b0483770af7a95919bc0e34bd3e32f48	2036-06-03 05:20:51.731	1	2026-06-03 05:20:51.732187
176	2	848c447739d0ded376e2ddc10a453442d00f47be50e6255ea85074c465176e61	2036-06-03 05:50:14.1	0	2026-06-03 05:50:14.100443
175	1	e3f7327aa195a9b3f075592fc04982f09b0ba89e4e66a1871e6f24ec2d6e52f9	2036-06-03 05:44:30.784	1	2026-06-03 05:44:30.784937
177	1	75aa9a3f8e275bb7ef141ee4d598baf7bf74f3104cc6b6f5f15dc8fb2568beda	2036-06-03 05:55:55.46	1	2026-06-03 05:55:55.461221
178	1	1aac12213d5b6df6093f629304732c9774a12d3738ad5dcd4d5f757cf0a3c28e	2036-06-03 06:17:26.281	0	2026-06-03 06:17:26.281259
\.


--
-- Data for Name: renewal_history; Type: TABLE DATA; Schema: marslab_schema; Owner: marslab_user
--

COPY marslab_schema.renewal_history (id, renewal_id, action, previous_data, new_data, performed_by, performed_at) FROM stdin;
239	206	created	\N	{"client_name":"test","service":"Amazon Web Services","renewal_date":"2026-11-01","value":"13124","owner":"Sameer Rahman","client_email":"sameerulrahman.f@marslab.work","sales_email":"sameerulrahman.f@marslab.work","contact_number":"124215","reference_id":"124135","status":"Active","plan_period":"yearly_plan","invoice_number":"inv1213"}	1	2026-06-02 09:45:22.819505
240	206	edited	{"client_name":"test","service":"Amazon Web Services","renewal_date":"2026-11-01T00:00:00.000Z","value":"13124","owner":"Sameer Rahman","client_email":"sameerulrahman.f@marslab.work","sales_email":"sameerulrahman.f@marslab.work","contact_number":"124215","reference_id":"124135","status":"Active","plan_period":"yearly_plan","invoice_number":"inv1213"}	{"client_name":"test","service":"Amazon Web Services","renewal_date":"2026-06-10","value":13124,"owner":"Sameer Rahman","client_email":"sameerulrahman.f@marslab.work","sales_email":"sameerulrahman.f@marslab.work","contact_number":"124215","reference_id":"124135","status":"Pending Renewal","reason":"test","plan_period":"yearly_plan","invoice_number":"inv1213"}	1	2026-06-03 06:18:05.866732
\.


--
-- Data for Name: renewals; Type: TABLE DATA; Schema: marslab_schema; Owner: marslab_user
--

COPY marslab_schema.renewals (id, unique_id, client_name, service, renewal_date, value, owner, client_email, sales_email, contact_number, reference_id, status, locked, follow_up_status, follow_up_remarks, day_30_sent, day_20_sent, day_15_sent, day_10_sent, day_5_sent, day_3_sent, sales_15_sent, sales_5_sent, created_by, created_at, updated_at, renewal_confirmation, edit_status, edit_reason, is_deleted, invoice_status, plan_period, invoice_number, invoice_value, invoice_sent_date, expiry_reason, payment_status, payment_amount, payment_received_date, client_latitude, client_longitude) FROM stdin;
206	RMT-01	test	Amazon Web Services	2026-06-10	13124	Sameer Rahman	sameerulrahman.f@marslab.work	sameerulrahman.f@marslab.work	124215	124135	Pending Renewal	1			Yes	Yes	Yes	Yes	No	No	Yes	No	1	2026-06-02 09:45:22.814436	2026-06-03 06:18:05.861348	pending	\N	test	f	Not	yearly_plan	inv1213	\N	\N	\N	No	\N	\N	12.97160000	77.59460000
\.


--
-- Data for Name: trash_renewals; Type: TABLE DATA; Schema: marslab_schema; Owner: marslab_user
--

COPY marslab_schema.trash_renewals (id, original_id, unique_id, client_name, service, renewal_date, value, owner, client_email, sales_email, status, locked, follow_up_status, follow_up_remarks, day_30_sent, day_20_sent, day_15_sent, day_10_sent, day_5_sent, day_3_sent, sales_15_sent, sales_5_sent, created_by, created_at, updated_at, edit_status, edit_reason, sales_3_sent, renewal_confirmation, contact_number, reference_id, deleted_at, invoice_status, plan_period, invoice_number, invoice_value, invoice_sent_date, expiry_reason, payment_status, payment_amount, payment_received_date, client_latitude, client_longitude) FROM stdin;
4	117	RMT-17	Upsilon Finance 6	Asana Business	2026-05-22	138000	Deepak S	contact@upsilonfinance6.com	billing@upsilonfinance6.com	Pending Renewal	1			Yes	Yes	Yes	Yes	Yes	Yes	Yes	Yes	1	2026-05-21 09:59:05.866	2026-05-22 05:20:58.609	approved	\N	\N	pending	990141615	INV-2026-015	2026-05-22 06:21:34.660088	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
5	167	RMT-67	Tau Healthcare 9	Jira Cloud Premium	2026-05-26	201000	Rajesh M	contact@tauhealthcare9.com	billing@tauhealthcare9.com	Pending Renewal	1			Yes	Yes	Yes	Yes	Yes	Yes	Yes	Yes	1	2026-05-21 09:59:05.866	2026-05-26 08:32:21.051	\N	\N	\N	awaiting_client_approval	914596663	INV-2026-065	2026-05-26 08:37:43.776364	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
6	189	RMT-89	Nu Logistics 3	Salesforce CRM	2026-05-26	292000	Ranjith Kumar	contact@nulogistics3.com	billing@nulogistics3.com	Pending Renewal	1			Yes	Yes	Yes	Yes	Yes	Yes	Yes	Yes	1	2026-05-21 09:59:05.866	2026-05-26 08:32:25.146	\N	\N	\N	awaiting_client_approval	941369782	INV-2026-087	2026-05-26 08:37:45.643669	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
7	119	RMT-19	Zeta Systems 1	Dropbox Business	2026-05-27	272000	Deepak S	contact@zetasystems1.com	billing@zetasystems1.com	Pending Renewal	1			Yes	Yes	Yes	Yes	Yes	Yes	Yes	Yes	1	2026-05-21 09:59:05.866	2026-05-26 08:32:18.762	\N	\N	\N	awaiting_with_vendor	985449718	INV-2026-017	2026-05-26 08:37:47.899813	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
8	197	RMT-97	Delta Consulting 2	HubSpot Suite	2026-05-27	49000	Karthik P	contact@deltaconsulting2.com	billing@deltaconsulting2.com	Pending Renewal	1			Yes	Yes	Yes	Yes	Yes	Yes	Yes	Yes	1	2026-05-21 09:59:05.866	2026-05-26 08:32:29.822	\N	\N	\N	pending	996589987	INV-2026-095	2026-05-26 08:37:53.497205	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
9	145	RMT-45	Nu Logistics 9	Figma Design Plan	2026-06-02	352000	Ranjith Kumar	contact@nulogistics9.com	billing@nulogistics9.com	Pending Renewal	1			Yes	Yes	Yes	Yes	No	No	Yes	No	1	2026-05-21 09:59:05.866	2026-05-26 08:32:17.532	\N	\N	\N	pending	967621018	INV-2026-043	2026-05-26 08:42:00.791825	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
10	168	RMT-68	Rho Global 1	Zoom Pro Subscription	2026-06-03	245000	Dinesh K	contact@rhoglobal1.com	billing@rhoglobal1.com	Pending Renewal	1			Yes	Yes	Yes	Yes	No	No	Yes	No	1	2026-05-21 09:59:05.866	2026-05-26 08:32:22.911	\N	\N	\N	awaiting_with_vendor	991309607	INV-2026-066	2026-05-26 08:46:16.892308	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
11	171	RMT-71	Chi Dev 1	Slack Pro Workspace	2026-06-03	288000	Suresh N	contact@chidev1.com	billing@chidev1.com	Pending Renewal	1			Yes	Yes	Yes	Yes	No	No	Yes	No	1	2026-05-21 09:59:05.866	2026-05-26 08:32:28.798	\N	\N	\N	pending	945587930	INV-2026-069	2026-05-26 08:46:16.899981	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
12	106	RMT-06	Delta Consulting 6	Zoom Pro Subscription	2026-06-04	339000	Suresh N	contact@deltaconsulting6.com	billing@deltaconsulting6.com	Pending Renewal	1			Yes	Yes	Yes	Yes	No	No	Yes	No	1	2026-05-21 09:59:05.866	2026-05-26 08:32:20.038	\N	\N	\N	quotation_confirmation	910304768	INV-2026-004	2026-05-26 08:46:16.904127	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
13	1	RMT-01	testing	m365	2026-06-05	1234455	Sameer Rahman	sameerulrahman.f@marslab.work	sameerulrahman.f@marslab.work	Pending Renewal	1			Yes	Yes	Yes	Yes	No	No	Yes	No	1	2026-05-21 07:47:20.415	2026-05-26 08:32:27.855	approved	test	\N	quotation_confirmation	125235624	ivn-1234	2026-05-26 08:46:16.908644	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
14	156	RMT-56	Alpha Technologies 7	Asana Business	2026-06-06	446000	Karthik P	contact@alphatechnologies7.com	billing@alphatechnologies7.com	Pending Renewal	1			Yes	Yes	Yes	No	No	No	Yes	No	1	2026-05-21 09:59:05.866	2026-05-22 05:00:14.365	\N	\N	\N	awaiting_client_approval	983903851	INV-2026-054	2026-05-26 08:46:16.912751	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
15	137	RMT-37	Sigma Retail 1	Adobe Creative Cloud	2026-06-08	194000	Dinesh K	contact@sigmaretail1.com	billing@sigmaretail1.com	Pending Renewal	1			Yes	Yes	Yes	No	No	No	Yes	No	1	2026-05-21 09:59:05.866	2026-05-26 08:32:26.795	\N	\N	\N	pending	930821464	INV-2026-035	2026-05-26 08:46:16.916561	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
16	174	RMT-74	Gamma Enterprises 2	Zendesk Support Enterprise	2026-06-13	73000	Vijay R	contact@gammaenterprises2.com	billing@gammaenterprises2.com	Pending Renewal	1			Yes	Yes	No	No	No	No	No	No	1	2026-05-21 09:59:05.866	2026-05-26 08:32:21.972	\N	\N	\N	pending	921534017	INV-2026-072	2026-05-26 08:46:16.920204	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
17	178	RMT-78	Upsilon Finance 9	Asana Business	2026-06-16	232000	Suresh N	contact@upsilonfinance9.com	billing@upsilonfinance9.com	Pending Renewal	1			Yes	No	No	No	No	No	No	No	1	2026-05-21 09:59:05.866	2026-05-21 09:59:05.866	\N	\N	\N	awaiting_with_vendor	991179542	INV-2026-076	2026-05-26 08:46:16.924301	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
18	158	RMT-58	Xi Industries 4	Zoom Pro Subscription	2026-06-17	293000	Vijay R	contact@xiindustries4.com	billing@xiindustries4.com	Pending Renewal	1			Yes	No	No	No	No	No	No	No	1	2026-05-21 09:59:05.866	2026-05-21 09:59:05.866	\N	\N	\N	quotation_confirmation	924257533	INV-2026-056	2026-05-26 08:46:16.927926	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
19	151	RMT-51	Mu Services 2	Dropbox Business	2026-06-18	345000	Ranjith Kumar	contact@muservices2.com	billing@muservices2.com	Pending Renewal	1			Yes	No	No	No	No	No	No	No	1	2026-05-21 09:59:05.866	2026-05-21 09:59:05.866	\N	\N	\N	awaiting_with_vendor	926818441	INV-2026-049	2026-05-26 08:46:16.931831	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
20	120	RMT-20	Theta Labs 7	Jira Cloud Premium	2026-07-03	285000	Vijay R	contact@thetalabs7.com	billing@thetalabs7.com	Active	1			No	No	No	No	No	No	No	No	1	2026-05-21 09:59:05.866	2026-05-22 06:01:57.08	approved	\N	\N	renewed	952349736	INV-2026-018	2026-05-26 08:46:16.935751	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
21	157	RMT-57	Lambda Group 8	Zoom Pro Subscription	2026-07-22	215000	Ranjith Kumar	contact@lambdagroup8.com	billing@lambdagroup8.com	Active	1			No	No	No	No	No	No	No	No	1	2026-05-21 09:59:05.866	2026-05-22 05:59:14.229	\N	\N	\N	renewed	925371289	INV-2026-055	2026-05-26 08:46:16.939382	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
22	169	RMT-69	Xi Industries 3	Google Workspace Enterprise	2026-07-24	26000	Ranjith Kumar	contact@xiindustries3.com	billing@xiindustries3.com	Active	1			No	No	No	No	No	No	No	No	1	2026-05-21 09:59:05.866	2026-05-21 09:59:05.866	\N	\N	\N	renewed	955424126	INV-2026-067	2026-05-26 08:46:16.943241	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
23	123	RMT-23	Kappa Tech 6	Asana Business	2026-07-24	158000	Vijay R	contact@kappatech6.com	billing@kappatech6.com	Active	1			No	No	No	No	No	No	No	No	1	2026-05-21 09:59:05.866	2026-05-21 09:59:05.866	\N	\N	\N	renewed	945001128	INV-2026-021	2026-05-26 08:46:16.946806	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
24	111	RMT-11	Omicron Media 5	Figma Design Plan	2026-07-31	244000	Dinesh K	contact@omicronmedia5.com	billing@omicronmedia5.com	Active	1			No	No	No	No	No	No	No	No	1	2026-05-21 09:59:05.866	2026-05-21 09:59:05.866	\N	\N	\N	renewed	924757737	INV-2026-009	2026-05-26 08:46:16.950709	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
25	135	RMT-35	Sigma Retail 2	Figma Design Plan	2026-08-01	316000	Ranjith Kumar	contact@sigmaretail2.com	billing@sigmaretail2.com	Active	1			No	No	No	No	No	No	No	No	1	2026-05-21 09:59:05.866	2026-05-21 09:59:05.866	\N	\N	\N	renewed	947662289	INV-2026-033	2026-05-26 08:46:16.954492	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
26	179	RMT-79	Eta Ventures 5	Figma Design Plan	2026-08-02	122000	Suresh N	contact@etaventures5.com	billing@etaventures5.com	Active	1			No	No	No	No	No	No	No	No	1	2026-05-21 09:59:05.866	2026-05-21 09:59:05.866	\N	\N	\N	renewed	917884269	INV-2026-077	2026-05-26 08:46:16.958278	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
27	104	RMT-04	Gamma Enterprises 5	GitHub Enterprise	2026-08-04	84000	Karthik P	contact@gammaenterprises5.com	billing@gammaenterprises5.com	Active	1			No	No	No	No	No	No	No	No	1	2026-05-21 09:59:05.866	2026-05-21 09:59:05.866	\N	\N	\N	renewed	951891525	INV-2026-002	2026-05-26 08:46:16.96194	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
28	126	RMT-26	Kappa Tech 1	Figma Design Plan	2026-08-04	204000	Rajesh M	contact@kappatech1.com	billing@kappatech1.com	Active	1			No	No	No	No	No	No	No	No	1	2026-05-21 09:59:05.866	2026-05-21 09:59:05.866	\N	\N	\N	renewed	956879523	INV-2026-024	2026-05-26 08:46:16.965607	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
29	180	RMT-80	Chi Dev 5	Jira Cloud Premium	2026-08-07	400000	Suresh N	contact@chidev5.com	billing@chidev5.com	Active	1			No	No	No	No	No	No	No	No	1	2026-05-21 09:59:05.866	2026-05-21 09:59:05.866	\N	\N	\N	renewed	930453514	INV-2026-078	2026-05-26 08:46:16.969436	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
30	129	RMT-29	Upsilon Finance 2	Microsoft 365 Business Standard	2026-08-09	356000	Arun Kumar	contact@upsilonfinance2.com	billing@upsilonfinance2.com	Active	1			No	No	No	No	No	No	No	No	1	2026-05-21 09:59:05.866	2026-05-21 09:59:05.866	\N	\N	\N	renewed	944644994	INV-2026-027	2026-05-26 08:46:16.97323	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
31	112	RMT-12	Epsilon Software 8	Zendesk Support Enterprise	2026-08-10	58000	Karthik P	contact@epsilonsoftware8.com	billing@epsilonsoftware8.com	Active	1			No	No	No	No	No	No	No	No	1	2026-05-21 09:59:05.866	2026-05-21 09:59:05.866	\N	\N	\N	renewed	997155604	INV-2026-010	2026-05-26 08:46:16.977212	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
32	199	RMT-99	Gamma Enterprises 2	Adobe Creative Cloud	2026-08-11	188000	Karthik P	contact@gammaenterprises2.com	billing@gammaenterprises2.com	Active	1			No	No	No	No	No	No	No	No	1	2026-05-21 09:59:05.866	2026-05-21 09:59:05.866	\N	\N	\N	renewed	997266227	INV-2026-097	2026-05-26 08:46:16.980735	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
33	152	RMT-52	Phi Marketing 3	GitHub Enterprise	2026-08-12	137000	Dinesh K	contact@phimarketing3.com	billing@phimarketing3.com	Active	1			No	No	No	No	No	No	No	No	1	2026-05-21 09:59:05.866	2026-05-21 09:59:05.866	\N	\N	\N	renewed	975610389	INV-2026-050	2026-05-26 08:46:16.984504	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
34	143	RMT-43	Omicron Media 7	Zendesk Support Enterprise	2026-08-22	354000	Deepak S	contact@omicronmedia7.com	billing@omicronmedia7.com	Active	1			No	No	No	No	No	No	No	No	1	2026-05-21 09:59:05.866	2026-05-21 09:59:05.866	\N	\N	\N	renewed	949972114	INV-2026-041	2026-05-26 08:46:16.987884	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
35	187	RMT-87	Rho Global 4	Zendesk Support Enterprise	2026-08-23	425000	Arun Kumar	contact@rhoglobal4.com	billing@rhoglobal4.com	Active	1			No	No	No	No	No	No	No	No	1	2026-05-21 09:59:05.866	2026-05-21 09:59:05.866	\N	\N	\N	renewed	954931725	INV-2026-085	2026-05-26 08:46:21.646199	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
36	134	RMT-34	Delta Consulting 5	Zoom Pro Subscription	2026-08-25	33000	Dinesh K	contact@deltaconsulting5.com	billing@deltaconsulting5.com	Active	1			No	No	No	No	No	No	No	No	1	2026-05-21 09:59:05.866	2026-05-21 09:59:05.866	\N	\N	\N	renewed	983370453	INV-2026-032	2026-05-26 08:46:21.652627	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
37	191	RMT-91	Nu Logistics 3	Asana Business	2026-08-29	237000	Deepak S	contact@nulogistics3.com	billing@nulogistics3.com	Active	1			No	No	No	No	No	No	No	No	1	2026-05-21 09:59:05.866	2026-05-21 09:59:05.866	\N	\N	\N	renewed	953329802	INV-2026-089	2026-05-26 08:46:21.656501	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
38	173	RMT-73	Sigma Retail 4	Slack Pro Workspace	2026-08-31	238000	Suresh N	contact@sigmaretail4.com	billing@sigmaretail4.com	Active	1			No	No	No	No	No	No	No	No	1	2026-05-21 09:59:05.866	2026-05-21 09:59:05.866	\N	\N	\N	renewed	995116001	INV-2026-071	2026-05-26 08:46:21.660046	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
39	184	RMT-84	Iota Digital 7	Zoom Pro Subscription	2026-09-01	369000	Dinesh K	contact@iotadigital7.com	billing@iotadigital7.com	Active	1			No	No	No	No	No	No	No	No	1	2026-05-21 09:59:05.866	2026-05-21 11:02:06.773	\N	\N	\N	renewed	993078587	INV-2026-082	2026-05-26 08:46:21.663644	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
40	186	RMT-86	Nu Logistics 3	Figma Design Plan	2026-09-02	216000	Karthik P	contact@nulogistics3.com	billing@nulogistics3.com	Active	1			No	No	No	No	No	No	No	No	1	2026-05-21 09:59:05.866	2026-05-21 09:59:05.866	\N	\N	\N	renewed	937756124	INV-2026-084	2026-05-26 08:46:21.667511	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
41	175	RMT-75	Omega Holdings 7	AWS Cloud Hosting	2026-10-21	120000	Rajesh M	contact@omegaholdings7.com	billing@omegaholdings7.com	Active	1			No	No	No	No	No	No	No	No	1	2026-05-21 09:59:05.866	2026-05-21 11:18:45.76	\N	\N	\N	renewed	964572542	INV-2026-073	2026-05-26 08:46:21.671294	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
42	124	RMT-24	Beta Solutions 3	Zendesk Support Enterprise	2026-10-21	313000	Karthik P	contact@betasolutions3.com	billing@betasolutions3.com	Active	1			No	No	No	No	No	No	No	No	1	2026-05-21 09:59:05.866	2026-05-21 11:20:43.014	\N	\N	\N	renewed	941048365	INV-2026-022	2026-05-26 08:46:21.675462	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
43	150	RMT-50	Eta Ventures 4	Dropbox Business	2026-10-21	195000	Sameerul Rahman	contact@etaventures4.com	billing@etaventures4.com	Active	1			No	No	No	No	No	No	No	No	1	2026-05-21 09:59:05.866	2026-05-21 11:18:24.733	\N	\N	\N	renewed	965072906	INV-2026-048	2026-05-26 08:46:21.678888	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
44	203	RMT-103	sameer test	m365	2026-12-01	1234	Sameer Rahman	sameerulrahman.f@marslab.work	sameerulrahman.f@marslab.work	Active	1			No	No	No	No	No	No	No	No	2	2026-05-22 04:34:22.315	2026-05-22 04:34:22.315	\N	\N	\N	renewed	12334566	inv123	2026-05-26 08:46:21.682401	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
45	136	RMT-36	Delta Consulting 2	Zendesk Support Enterprise	2026-12-16	158000	Deepak S	contact@deltaconsulting2.com	billing@deltaconsulting2.com	Active	1			No	No	No	No	No	No	No	No	1	2026-05-21 09:59:05.866	2026-05-21 11:20:21.291	\N	\N	\N	renewed	934661827	INV-2026-034	2026-05-26 08:46:21.686316	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
46	130	RMT-30	Phi Marketing 5	Adobe Creative Cloud	2027-02-23	54000	Sameerul Rahman	contact@phimarketing5.com	billing@phimarketing5.com	Active	1			No	No	No	No	No	No	No	No	1	2026-05-21 09:59:05.866	2026-05-21 11:20:55.391	\N	\N	\N	renewed	939968971	INV-2026-028	2026-05-26 08:46:21.690606	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
47	107	RMT-07	Chi Dev 9	Slack Pro Workspace	2027-05-26	320000	Dinesh K	contact@chidev9.com	billing@chidev9.com	Active	1	Completed		No	No	No	No	No	No	No	\N	1	2026-05-21 09:59:05.866	2026-05-26 08:37:31.955	\N	\N	\N	renewed	995173697	INV-2026-005	2026-05-26 08:46:21.694776	Sent	yearly_plan	inv123	320000.00	2026-05-26	\N	Yes	320000.00	2026-05-26	\N	\N
48	2	RMT-02	Sidcorptech	Cloud-AWS	2027-06-01	987654321	Sameer Rahman	sameerulrahman.f@marslab.work	sameerulrahman.f@marslab.work	Active	1	Completed		No	No	No	No	No	No	No	\N	1	2026-05-21 09:37:29.878	2026-05-26 08:38:23.589	\N	\N	\N	renewed	9498540128	INV/26-27/0140	2026-05-26 08:46:21.69883	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
49	109	RMT-09	Omicron Media 9	GitHub Enterprise	\N	0	Deepak S	contact@omicronmedia9.com	billing@omicronmedia9.com	-	1			No	No	No	No	No	No	No	No	1	2026-05-21 09:59:05.866	2026-05-21 09:59:05.866	\N	\N	\N	service_discontinued	945424480	INV-2026-007	2026-05-26 08:46:21.702583	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
50	193	RMT-93	Mu Services 1	Zendesk Support Enterprise	\N	0	Karthik P	contact@muservices1.com	billing@muservices1.com	-	1			No	No	No	No	No	No	No	No	1	2026-05-21 09:59:05.866	2026-05-21 09:59:05.866	\N	\N	\N	service_discontinued	938549461	INV-2026-091	2026-05-26 08:46:21.706153	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
51	202	RMT-102	Xi Industries 5	Google Workspace Enterprise	\N	0	Rajesh M	contact@xiindustries5.com	billing@xiindustries5.com	-	1			No	No	No	No	No	No	No	No	1	2026-05-21 09:59:05.866	2026-05-21 11:21:01.199	\N	\N	\N	service_discontinued	970541420	INV-2026-100	2026-05-26 08:46:21.709646	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
52	163	RMT-63	Omega Holdings 4	Adobe Creative Cloud	\N	0	Arun Kumar	contact@omegaholdings4.com	billing@omegaholdings4.com	-	1			No	No	No	No	No	No	No	No	1	2026-05-21 09:59:05.866	2026-05-21 09:59:05.866	\N	\N	\N	service_discontinued	945341286	INV-2026-061	2026-05-26 08:46:21.713418	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
53	148	RMT-48	Mu Services 7	AWS Cloud Hosting	\N	0	Dinesh K	contact@muservices7.com	billing@muservices7.com	-	1			No	No	No	No	No	No	No	No	1	2026-05-21 09:59:05.866	2026-05-21 09:59:05.866	\N	\N	\N	service_discontinued	970557917	INV-2026-046	2026-05-26 08:46:21.716671	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
54	115	RMT-15	Lambda Group 2	Dropbox Business	\N	0	Ranjith Kumar	contact@lambdagroup2.com	billing@lambdagroup2.com	-	1			No	No	No	No	No	No	No	No	1	2026-05-21 09:59:05.866	2026-05-21 09:59:05.866	\N	\N	\N	service_discontinued	916658524	INV-2026-013	2026-05-26 08:46:21.719711	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
55	161	RMT-61	Omega Holdings 9	Figma Design Plan	\N	0	Karthik P	contact@omegaholdings9.com	billing@omegaholdings9.com	-	1			No	No	No	No	No	No	No	No	1	2026-05-21 09:59:05.866	2026-05-21 09:59:05.866	\N	\N	\N	service_discontinued	965472806	INV-2026-059	2026-05-26 08:46:21.722535	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
56	114	RMT-14	Nu Logistics 6	Jira Cloud Premium	\N	0	Deepak S	contact@nulogistics6.com	billing@nulogistics6.com	-	1			No	No	No	No	No	No	No	No	1	2026-05-21 09:59:05.866	2026-05-21 09:59:05.866	\N	\N	\N	service_discontinued	989025951	INV-2026-012	2026-05-26 08:46:21.725544	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
57	127	RMT-27	Beta Solutions 8	GitHub Enterprise	\N	0	Dinesh K	contact@betasolutions8.com	billing@betasolutions8.com	-	1			No	No	No	No	No	No	No	No	1	2026-05-21 09:59:05.866	2026-05-21 09:59:05.866	\N	\N	\N	service_discontinued	946113648	INV-2026-025	2026-05-26 08:46:21.728236	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
58	160	RMT-60	Phi Marketing 5	Adobe Creative Cloud	\N	0	Sameerul Rahman	contact@phimarketing5.com	billing@phimarketing5.com	-	1			No	No	No	No	No	No	No	No	1	2026-05-21 09:59:05.866	2026-05-21 11:03:08.779	\N	\N	\N	service_discontinued	930890527	INV-2026-058	2026-05-26 08:46:21.731448	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
59	195	RMT-95	Psi Agency 3	Salesforce CRM	\N	0	Arun Kumar	contact@psiagency3.com	billing@psiagency3.com	-	1			No	No	No	No	No	No	No	No	1	2026-05-21 09:59:05.866	2026-05-21 09:59:05.866	\N	\N	\N	service_discontinued	995763865	INV-2026-093	2026-05-26 08:46:21.735651	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
60	194	RMT-94	Gamma Enterprises 3	Figma Design Plan	\N	0	Deepak S	contact@gammaenterprises3.com	billing@gammaenterprises3.com	-	1			No	No	No	No	No	No	No	No	1	2026-05-21 09:59:05.866	2026-05-21 09:59:05.866	\N	\N	\N	service_discontinued	996125903	INV-2026-092	2026-05-26 08:46:31.58758	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
61	138	RMT-38	Nu Logistics 1	Jira Cloud Premium	\N	0	Vijay R	contact@nulogistics1.com	billing@nulogistics1.com	-	1			No	No	No	No	No	No	No	No	1	2026-05-21 09:59:05.866	2026-05-21 09:59:05.866	\N	\N	\N	service_discontinued	921398893	INV-2026-036	2026-05-26 08:46:31.593719	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
62	121	RMT-21	Gamma Enterprises 9	Zendesk Support Enterprise	\N	0	Arun Kumar	contact@gammaenterprises9.com	billing@gammaenterprises9.com	-	1			No	No	No	No	No	No	No	No	1	2026-05-21 09:59:05.866	2026-05-21 09:59:05.866	\N	\N	\N	service_discontinued	955010725	INV-2026-019	2026-05-26 08:46:31.597702	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
63	198	RMT-98	Zeta Systems 5	Zoom Pro Subscription	\N	0	Karthik P	contact@zetasystems5.com	billing@zetasystems5.com	-	1			No	No	No	No	No	No	No	No	1	2026-05-21 09:59:05.866	2026-05-21 09:59:05.866	\N	\N	\N	service_discontinued	935393917	INV-2026-096	2026-05-26 08:46:31.601508	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
64	172	RMT-72	Zeta Systems 1	HubSpot Suite	2026-04-21	79000	Suresh N	contact@zetasystems1.com	billing@zetasystems1.com	Expired	1			No	No	No	No	No	No	No	No	1	2026-05-21 09:59:05.866	2026-05-21 09:59:05.866	\N	\N	\N	quotation_confirmation	940269792	INV-2026-070	2026-05-26 08:46:31.605337	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
65	108	RMT-08	Omega Holdings 6	Salesforce CRM	2026-04-21	186000	Karthik P	contact@omegaholdings6.com	billing@omegaholdings6.com	Expired	1			No	No	No	No	No	No	No	No	1	2026-05-21 09:59:05.866	2026-05-21 09:59:05.866	\N	\N	\N	awaiting_client_approval	927405778	INV-2026-006	2026-05-26 08:46:31.608874	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
66	149	RMT-49	Rho Global 9	Slack Pro Workspace	2026-04-23	343000	Ranjith Kumar	contact@rhoglobal9.com	billing@rhoglobal9.com	Expired	1			No	No	No	No	No	No	No	No	1	2026-05-21 09:59:05.866	2026-05-21 09:59:05.866	\N	\N	\N	quotation_confirmation	973196185	INV-2026-047	2026-05-26 08:46:31.612142	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
67	162	RMT-62	Tau Healthcare 5	Asana Business	2026-04-23	139000	Arun Kumar	contact@tauhealthcare5.com	billing@tauhealthcare5.com	Expired	1			No	No	No	No	No	No	No	No	1	2026-05-21 09:59:05.866	2026-05-21 11:14:14.934	\N	\N	\N	awaiting_with_vendor	955697213	INV-2026-060	2026-05-26 08:46:31.615295	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
68	201	RMT-101	Theta Labs 8	Asana Business	2026-04-26	231000	Dinesh K	contact@thetalabs8.com	billing@thetalabs8.com	Expired	1			No	No	No	No	No	No	No	No	1	2026-05-21 09:59:05.866	2026-05-21 11:17:39.12	\N	\N	\N	pending	975118708	INV-2026-099	2026-05-26 08:46:31.618256	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
69	159	RMT-59	Upsilon Finance 4	Mailchimp Premium	2026-04-26	290000	Rajesh M	contact@upsilonfinance4.com	billing@upsilonfinance4.com	Expired	1			No	No	No	No	No	No	No	No	1	2026-05-21 09:59:05.866	2026-05-21 09:59:05.866	\N	\N	\N	quotation_confirmation	975278484	INV-2026-057	2026-05-26 08:46:31.62116	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
70	183	RMT-83	Sigma Retail 8	Dropbox Business	2026-04-26	378000	Deepak S	contact@sigmaretail8.com	billing@sigmaretail8.com	Expired	1			No	No	No	No	No	No	No	No	1	2026-05-21 09:59:05.866	2026-05-21 09:59:05.866	\N	\N	\N	awaiting_client_approval	961019348	INV-2026-081	2026-05-26 08:46:31.624588	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
71	165	RMT-65	Iota Digital 1	Adobe Creative Cloud	2026-04-28	16000	Rajesh M	contact@iotadigital1.com	billing@iotadigital1.com	Expired	1			No	No	No	No	No	No	No	No	1	2026-05-21 09:59:05.866	2026-05-21 09:59:05.866	\N	\N	\N	awaiting_with_vendor	925289932	INV-2026-063	2026-05-26 08:46:31.628537	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
72	113	RMT-13	Upsilon Finance 2	Microsoft 365 Business Standard	2026-04-28	370000	Rajesh M	contact@upsilonfinance2.com	billing@upsilonfinance2.com	Expired	1			No	No	No	No	No	No	No	No	1	2026-05-21 09:59:05.866	2026-05-21 09:59:05.866	\N	\N	\N	pending	934140090	INV-2026-011	2026-05-26 08:46:31.632505	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
73	140	RMT-40	Phi Marketing 8	GitHub Enterprise	2026-05-01	28000	Ranjith Kumar	contact@phimarketing8.com	billing@phimarketing8.com	Expired	1			No	No	No	No	No	No	No	No	1	2026-05-21 09:59:05.866	2026-05-21 09:59:05.866	\N	\N	\N	awaiting_client_approval	992641195	INV-2026-038	2026-05-26 08:46:31.636249	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
74	153	RMT-53	Delta Consulting 8	Jira Cloud Premium	2026-05-01	368000	Vijay R	contact@deltaconsulting8.com	billing@deltaconsulting8.com	Expired	1			No	No	No	No	No	No	No	No	1	2026-05-21 09:59:05.866	2026-05-21 11:17:40.254	\N	\N	\N	pending	985897804	INV-2026-051	2026-05-26 08:46:31.639625	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
75	133	RMT-33	Mu Services 6	Zendesk Support Enterprise	2026-05-02	342000	Karthik P	contact@muservices6.com	billing@muservices6.com	Expired	1			No	No	No	No	No	No	No	No	1	2026-05-21 09:59:05.866	2026-05-21 09:59:05.866	\N	\N	\N	quotation_confirmation	937780821	INV-2026-031	2026-05-26 08:46:31.643513	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
76	196	RMT-96	Lambda Group 8	GitHub Enterprise	2026-05-02	418000	Deepak S	contact@lambdagroup8.com	billing@lambdagroup8.com	Expired	1			No	No	No	No	No	No	No	No	1	2026-05-21 09:59:05.866	2026-05-21 09:59:05.866	\N	\N	\N	awaiting_with_vendor	944907215	INV-2026-094	2026-05-26 08:46:31.647452	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
77	118	RMT-18	Alpha Technologies 3	Microsoft 365 Business Standard	2026-05-02	257000	Rajesh M	contact@alphatechnologies3.com	billing@alphatechnologies3.com	Expired	1			No	No	No	No	No	No	No	No	1	2026-05-21 09:59:05.866	2026-05-21 09:59:05.866	\N	\N	\N	awaiting_with_vendor	949501749	INV-2026-016	2026-05-26 08:46:31.65114	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
78	139	RMT-39	Rho Global 4	Mailchimp Premium	2026-05-03	249000	Sakthivel K	contact@rhoglobal4.com	billing@rhoglobal4.com	Expired	1			No	No	No	No	No	No	No	No	1	2026-05-21 09:59:05.866	2026-05-21 11:17:42.267	\N	\N	\N	pending	931084992	INV-2026-037	2026-05-26 08:46:31.654528	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
79	188	RMT-88	Xi Industries 9	Zendesk Support Enterprise	2026-05-03	291000	Karthik P	contact@xiindustries9.com	billing@xiindustries9.com	Expired	1			No	No	No	No	No	No	No	No	1	2026-05-21 09:59:05.866	2026-05-21 11:17:41.275	\N	\N	\N	pending	956031845	INV-2026-086	2026-05-26 08:46:31.658031	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
80	200	RMT-100	Phi Marketing 2	Salesforce CRM	2026-05-04	50000	Dinesh K	contact@phimarketing2.com	billing@phimarketing2.com	Expired	1			No	No	No	No	No	No	No	No	1	2026-05-21 09:59:05.866	2026-05-21 09:59:05.866	\N	\N	\N	quotation_confirmation	990547099	INV-2026-098	2026-05-26 08:46:31.661563	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
81	128	RMT-28	Delta Consulting 5	Zoom Pro Subscription	2026-05-04	380000	Karthik P	contact@deltaconsulting5.com	billing@deltaconsulting5.com	Expired	1			No	No	No	No	No	No	No	No	1	2026-05-21 09:59:05.866	2026-05-21 09:59:05.866	\N	\N	\N	awaiting_with_vendor	933144195	INV-2026-026	2026-05-26 08:46:31.665313	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
82	144	RMT-44	Pi Analytics 3	Salesforce CRM	2026-05-06	258000	Suresh N	contact@pianalytics3.com	billing@pianalytics3.com	Expired	1			No	No	No	No	No	No	No	No	1	2026-05-21 09:59:05.866	2026-05-21 09:59:05.866	\N	\N	\N	quotation_confirmation	956210821	INV-2026-042	2026-05-26 08:46:31.669069	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
83	164	RMT-64	Kappa Tech 2	HubSpot Suite	2026-05-06	366000	Vijay R	contact@kappatech2.com	billing@kappatech2.com	Expired	1			No	No	No	No	No	No	No	No	1	2026-05-21 09:59:05.866	2026-05-21 09:59:05.866	\N	\N	\N	quotation_confirmation	975921234	INV-2026-062	2026-05-26 08:46:31.672096	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
84	105	RMT-05	Phi Marketing 3	Google Workspace Enterprise	2026-05-07	170000	Sakthivel K	contact@phimarketing3.com	billing@phimarketing3.com	Expired	1			No	No	No	No	No	No	No	No	1	2026-05-21 09:59:05.866	2026-05-21 09:59:05.866	\N	\N	\N	pending	946863050	INV-2026-003	2026-05-26 08:46:31.675856	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
85	192	RMT-92	Delta Consulting 3	Google Workspace Enterprise	2026-05-08	364000	Dinesh K	contact@deltaconsulting3.com	billing@deltaconsulting3.com	Expired	1			No	No	No	No	No	No	No	No	1	2026-05-21 09:59:05.866	2026-05-21 11:17:43.268	\N	\N	\N	pending	941780914	INV-2026-090	2026-05-26 08:46:35.425481	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
86	125	RMT-25	Omicron Media 4	Slack Pro Workspace	2026-05-09	208000	Vijay R	contact@omicronmedia4.com	billing@omicronmedia4.com	Expired	1			No	No	No	No	No	No	No	No	1	2026-05-21 09:59:05.866	2026-05-21 09:59:05.866	\N	\N	\N	quotation_confirmation	928322031	INV-2026-023	2026-05-26 08:46:35.44929	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
87	185	RMT-85	Psi Agency 2	Zoom Pro Subscription	2026-05-09	52000	Dinesh K	contact@psiagency2.com	billing@psiagency2.com	Expired	1			No	No	No	No	No	No	No	No	1	2026-05-21 09:59:05.866	2026-05-21 09:59:05.866	\N	\N	\N	awaiting_client_approval	943712396	INV-2026-083	2026-05-26 08:46:35.453865	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
88	147	RMT-47	Lambda Group 2	Figma Design Plan	2026-05-10	173000	Vijay R	contact@lambdagroup2.com	billing@lambdagroup2.com	Expired	1			No	No	No	No	No	No	No	No	1	2026-05-21 09:59:05.866	2026-05-21 11:17:44.247	\N	\N	\N	pending	994662293	INV-2026-045	2026-05-26 08:46:35.457317	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
89	166	RMT-66	Omega Holdings 5	Adobe Creative Cloud	2026-05-12	30000	Sakthivel K	contact@omegaholdings5.com	billing@omegaholdings5.com	Expired	1			No	No	No	No	No	No	No	No	1	2026-05-21 09:59:05.866	2026-05-21 09:59:05.866	\N	\N	\N	awaiting_with_vendor	983440096	INV-2026-064	2026-05-26 08:46:35.461038	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
90	181	RMT-81	Omicron Media 1	HubSpot Suite	2026-05-13	119000	Dinesh K	contact@omicronmedia1.com	billing@omicronmedia1.com	Expired	1			No	No	No	No	No	No	No	No	1	2026-05-21 09:59:05.866	2026-05-21 09:59:05.866	\N	\N	\N	awaiting_with_vendor	987523350	INV-2026-079	2026-05-26 08:46:35.464707	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
91	131	RMT-31	Upsilon Finance 9	Adobe Creative Cloud	2026-05-16	274000	Arun Kumar	contact@upsilonfinance9.com	billing@upsilonfinance9.com	Expired	1			No	No	No	No	No	No	No	No	1	2026-05-21 09:59:05.866	2026-05-21 09:59:05.866	\N	\N	\N	awaiting_client_approval	997319376	INV-2026-029	2026-05-26 08:46:35.468514	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
92	116	RMT-16	Omicron Media 5	GitHub Enterprise	2026-05-17	23000	Arun Kumar	contact@omicronmedia5.com	billing@omicronmedia5.com	Expired	1			No	No	No	No	No	No	No	No	1	2026-05-21 09:59:05.866	2026-05-21 11:10:33.89	\N	\N	\N	pending	973818424	INV-2026-014	2026-05-26 08:46:35.471942	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
93	141	RMT-41	Xi Industries 1	GitHub Enterprise	2026-05-17	230000	Arun Kumar	contact@xiindustries1.com	billing@xiindustries1.com	Expired	1			No	No	No	No	No	No	No	No	1	2026-05-21 09:59:05.866	2026-05-21 09:59:05.866	\N	\N	\N	pending	998170147	INV-2026-039	2026-05-26 08:46:35.475321	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
94	103	RMT-03	Delta Consulting 7	GitHub Enterprise	2026-05-18	374000	Deepak S	contact@deltaconsulting7.com	billing@deltaconsulting7.com	Expired	1			No	No	No	No	No	No	No	No	1	2026-05-21 09:59:05.866	2026-05-21 09:59:05.866	\N	\N	\N	awaiting_client_approval	971736208	INV-2026-001	2026-05-26 08:46:35.478821	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
95	122	RMT-22	Kappa Tech 9	Jira Cloud Premium	2026-05-18	30000	Vijay R	contact@kappatech9.com	billing@kappatech9.com	Expired	1			No	No	No	No	No	No	No	No	1	2026-05-21 09:59:05.866	2026-05-21 09:59:05.866	\N	\N	\N	pending	922846199	INV-2026-020	2026-05-26 08:46:35.482796	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
96	190	RMT-90	Phi Marketing 1	Slack Pro Workspace	2026-05-19	255000	Dinesh K	contact@phimarketing1.com	billing@phimarketing1.com	Expired	1			No	No	No	No	No	No	No	No	1	2026-05-21 09:59:05.866	2026-05-21 09:59:05.866	\N	\N	\N	awaiting_client_approval	974489225	INV-2026-088	2026-05-26 08:46:35.48662	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
97	182	RMT-82	Phi Marketing 1	Microsoft 365 Business Standard	2026-05-20	383000	Deepak S	contact@phimarketing1.com	billing@phimarketing1.com	Expired	1			No	No	No	No	No	No	No	No	1	2026-05-21 09:59:05.866	2026-05-21 09:59:05.866	\N	\N	\N	quotation_confirmation	965698230	INV-2026-080	2026-05-26 08:46:35.490287	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
98	142	RMT-42	Eta Ventures 2	Figma Design Plan	2026-05-20	359000	Karthik P	contact@etaventures2.com	billing@etaventures2.com	Expired	1			No	No	No	No	No	No	No	No	1	2026-05-21 09:59:05.866	2026-05-21 09:59:05.866	\N	\N	\N	pending	987373909	INV-2026-040	2026-05-26 08:46:35.494363	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
99	170	RMT-70	Eta Ventures 5	Google Workspace Enterprise	2026-05-20	368000	Karthik P	contact@etaventures5.com	billing@etaventures5.com	Expired	1			No	No	No	No	No	No	No	No	1	2026-05-21 09:59:05.866	2026-05-21 09:59:05.866	\N	\N	\N	pending	969350694	INV-2026-068	2026-05-26 08:46:35.498275	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
100	132	RMT-32	Kappa Tech 2	Jira Cloud Premium	2026-05-21	226000	Dinesh K	contact@kappatech2.com	billing@kappatech2.com	Expired	1			No	No	No	No	No	No	No	No	1	2026-05-21 09:59:05.866	2026-05-21 11:17:45.185	\N	\N	\N	pending	986058117	INV-2026-030	2026-05-26 08:46:35.502217	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
101	176	RMT-76	Iota Digital 9	Google Workspace Enterprise	2026-05-21	410000	Dinesh K	contact@iotadigital9.com	billing@iotadigital9.com	Expired	1			No	No	No	No	No	No	No	No	1	2026-05-21 09:59:05.866	2026-05-21 09:59:05.866	\N	\N	\N	awaiting_with_vendor	978405811	INV-2026-074	2026-05-26 08:46:35.505823	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
102	110	RMT-10	Iota Digital 1	Google Workspace Enterprise	2026-05-24	422000	Ranjith Kumar	contact@iotadigital1.com	billing@iotadigital1.com	Expired	1			Yes	Yes	Yes	Yes	Yes	Yes	Yes	Yes	1	2026-05-21 09:59:05.866	2026-05-22 05:25:10.588	\N	\N	\N	awaiting_client_approval	911620176	INV-2026-008	2026-05-26 08:46:35.509737	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
103	154	RMT-54	Phi Marketing 7	Mailchimp Premium	2026-05-24	419000	Arun Kumar	contact@phimarketing7.com	billing@phimarketing7.com	Expired	1			Yes	Yes	Yes	Yes	Yes	Yes	Yes	Yes	1	2026-05-21 09:59:05.866	2026-05-21 10:22:48.021	\N	\N	\N	pending	981306724	INV-2026-052	2026-05-26 08:46:35.513504	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
104	155	RMT-55	Delta Consulting 6	Microsoft 365 Business Standard	2026-05-25	333000	Deepak S	contact@deltaconsulting6.com	billing@deltaconsulting6.com	Expired	1			Yes	Yes	Yes	Yes	Yes	Yes	Yes	Yes	1	2026-05-21 09:59:05.866	2026-05-22 05:00:05.466	\N	\N	\N	quotation_confirmation	937312390	INV-2026-053	2026-05-26 08:46:35.516971	Not	yearly_plan	\N	\N	\N	\N	No	\N	\N	\N	\N
107	204	RMT-104	sameer2	aws	2026-06-11	13243	Sameer Rahman	sameerulrahman.f@marslab.work	sameerulrahman.f@marslab.work	Pending Renewal	1	Completed		Yes	Yes	Yes	Yes	No	No	Yes	No	2	2026-05-22 04:40:25.097	2026-06-01 04:17:46.838	\N	asfasf	\N	pending	12345	1234	2026-06-02 07:59:11.125329	Sent	yearly_plan	inv123	13240.00	2026-05-30	\N	No	\N	\N	\N	\N
108	205	RMT-105	test	Amazon Web Services	2027-05-25	10000	Sameer Rahman	sameerulrahman.f@marslab.work	sameerulrahman.f@marslab.work	Active	1	Completed		No	No	No	No	No	No	No	No	2	2026-05-30 04:13:57.943	2026-06-02 09:21:40.48	\N	test	\N	renewed	1234567890	inv123	2026-06-02 09:22:00.565028	Not	yearly_plan	\N	\N	\N	test	No	\N	\N	\N	\N
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: marslab_schema; Owner: marslab_user
--

COPY marslab_schema.users (id, username, email, password, full_name, role, avatar_color, otp_code, otp_expires_at, created_at, updated_at) FROM stdin;
1	sameerulrahman.f@marslab.work	sameerulrahman.f@marslab.work	$2a$10$jnYoQTxF5P2BfC1X.1OuIuvFc44AyVNKdabuxh0b.z7g36mBcRngq	Sameerul Rahman	admin	#f59e0b	\N	\N	2026-05-21 05:56:22.601466	2026-05-21 05:56:22.601466
2	sakthivel.k@marslab.work	sakthivel.k@marslab.work	$2a$10$jnYoQTxF5P2BfC1X.1OuIuvFc44AyVNKdabuxh0b.z7g36mBcRngq	Sakthivel K	sales	#10b981	\N	\N	2026-05-21 05:56:22.605659	2026-05-21 05:56:22.605659
3	ranjithkumar.v@marslab.work	ranjithkumar.v@marslab.work	$2a$10$jnYoQTxF5P2BfC1X.1OuIuvFc44AyVNKdabuxh0b.z7g36mBcRngq	Ranjith Kumar	finance	#3b82f6	\N	\N	2026-05-21 05:56:22.607543	2026-05-21 05:56:22.607543
5	sameerulrahman.f@marslab.work	sameerulrahman.f@marslab.work	$2a$10$dIa65lSxiTuwLbyC.CEUs.c40k6mZquhPLkXvys0npBaRZivvlnry	Sameerul Rahman	admin	#f59e0b	\N	\N	2026-06-01 06:59:42.210779	2026-06-01 06:59:42.210779
\.


--
-- Data for Name: visit_locations; Type: TABLE DATA; Schema: marslab_schema; Owner: marslab_user
--

COPY marslab_schema.visit_locations (id, visit_id, latitude, longitude, accuracy, captured_at) FROM stdin;
1	1	13.05673280	80.25736940	19.60	2026-06-02 09:45:52.106269
2	1	13.05673280	80.25736940	19.60	2026-06-02 09:45:54.10413
3	1	13.05673280	80.25736940	19.60	2026-06-02 09:46:01.971823
4	1	13.05677790	80.25741760	20.00	2026-06-02 09:48:26.094039
5	2	13.05677790	80.25741760	20.00	2026-06-02 09:49:32.047728
6	2	13.05677790	80.25741760	20.00	2026-06-02 09:49:34.045734
7	2	13.05677790	80.25741760	20.00	2026-06-02 09:49:42.027294
8	2	13.05677790	80.25741760	20.00	2026-06-02 09:49:55.814688
9	2	13.05677790	80.25741760	20.00	2026-06-02 09:49:57.813234
10	2	13.05677790	80.25741760	20.00	2026-06-02 09:50:02.458771
11	3	13.05677790	80.25741760	20.00	2026-06-02 09:50:06.57068
12	3	13.05677790	80.25741760	20.00	2026-06-02 09:50:08.56873
13	3	13.05677790	80.25741760	20.00	2026-06-02 09:50:09.053665
14	3	13.05677790	80.25741760	20.00	2026-06-02 09:50:11.048109
15	3	13.05677790	80.25741760	20.00	2026-06-02 09:50:25.423468
16	3	13.05677790	80.25741760	20.00	2026-06-02 09:50:27.423769
17	3	13.05675680	80.25735680	19.90	2026-06-02 09:52:02.270967
18	5	13.05677070	80.25734780	15.83	2026-06-02 09:58:54.632049
19	5	13.05679560	80.25735230	16.71	2026-06-02 10:11:04.651272
20	5	13.05673340	80.25733840	30.70	2026-06-02 10:23:14.694432
21	5	13.05680690	80.25741330	25.10	2026-06-02 10:35:24.640795
22	5	13.05675310	80.25739470	21.17	2026-06-02 10:37:34.705971
23	5	13.05678000	80.25741190	14.97	2026-06-02 10:49:45.120745
24	5	13.05677600	80.25739000	18.48	2026-06-02 10:54:04.710003
25	5	13.05676620	80.25740070	19.15	2026-06-02 11:06:14.697056
26	5	13.05676450	80.25739720	19.49	2026-06-02 11:08:24.725819
27	5	13.05678590	80.25738300	15.97	2026-06-02 11:20:34.725422
28	6	13.05694260	80.25743030	28.10	2026-06-03 04:45:53.391119
29	6	13.05694260	80.25743030	28.10	2026-06-03 04:45:55.38564
30	6	13.05694260	80.25743030	28.10	2026-06-03 04:46:03.132747
31	8	13.05679000	80.25741750	14.43	2026-06-03 04:50:23.352542
32	8	13.05675180	80.25738950	24.76	2026-06-03 05:02:37.385568
33	8	13.05675180	80.25738950	24.76	2026-06-03 05:03:23.232234
34	8	13.05675180	80.25738950	24.76	2026-06-03 05:03:25.231085
35	8	13.05675180	80.25738950	24.76	2026-06-03 05:04:07.362771
36	8	13.05675180	80.25738950	24.76	2026-06-03 05:04:09.395227
37	8	13.05675180	80.25738950	24.76	2026-06-03 05:04:09.572196
38	8	13.05675180	80.25738950	24.76	2026-06-03 05:04:09.741822
39	8	13.05675180	80.25738950	24.76	2026-06-03 05:04:11.734356
40	8	13.05683000	80.25740520	15.98	2026-06-03 05:06:30.363221
41	8	13.05683000	80.25740520	15.98	2026-06-03 05:06:32.177946
42	9	13.05682430	80.25740460	36.90	2026-06-03 05:23:00.412824
43	9	13.05682430	80.25740460	36.90	2026-06-03 05:23:02.406937
44	9	13.05682430	80.25740460	36.90	2026-06-03 05:23:10.207161
45	10	13.05686520	80.25734300	42.50	2026-06-03 05:26:17.495392
46	10	13.05686520	80.25734300	42.50	2026-06-03 05:26:19.49249
47	10	13.05686520	80.25734300	42.50	2026-06-03 05:26:26.932683
48	12	13.05677030	80.25732380	20.90	2026-06-03 05:45:07.669277
49	12	13.05677030	80.25732380	20.90	2026-06-03 05:45:09.668206
50	12	13.05677030	80.25732380	20.90	2026-06-03 05:45:17.501318
51	13	13.05676750	80.25732090	16.07	2026-06-03 06:02:31.892855
52	13	13.05676750	80.25732090	16.07	2026-06-03 06:02:33.889039
53	13	13.05676750	80.25732090	16.07	2026-06-03 06:02:41.650939
54	13	13.05680310	80.25738670	26.40	2026-06-03 06:37:01.873323
55	13	13.05675970	80.25741370	20.25	2026-06-03 06:41:21.902602
56	13	13.05657640	80.25731180	23.85	2026-06-03 06:55:41.935743
\.


--
-- Data for Name: visits; Type: TABLE DATA; Schema: marslab_schema; Owner: marslab_user
--

COPY marslab_schema.visits (id, renewal_id, cst_id, status, start_time, arrival_time, check_in_time, check_out_time, start_latitude, start_longitude, client_reached, arrival_latitude, arrival_longitude, arrival_distance_meters, notes, photo_data, created_at, updated_at) FROM stdin;
12	206	2	completed	2026-06-03 05:45:07.649819	2026-06-03 05:45:44.980682	2026-06-03 05:45:44.980682	2026-06-03 05:50:17.268918	13.05677030	80.25732380	t	13.05677030	80.25732380	\N	test	\N	2026-06-03 05:45:07.649819	2026-06-03 05:50:17.418716
1	206	2	completed	2026-06-02 09:45:52.085336	2026-06-02 09:46:25.577741	2026-06-02 09:48:05.368304	2026-06-02 09:48:30.435194	13.05673280	80.25736940	f	18.95823470	72.83195140	837895.91		\N	2026-06-02 09:45:52.085336	2026-06-02 09:48:30.435194
13	206	2	completed	2026-06-03 06:02:31.869451	2026-06-03 06:02:34.286158	2026-06-03 06:02:34.286158	2026-06-03 07:12:58.298169	13.05676750	80.25732090	t	13.05676750	80.25732090	\N		\N	2026-06-03 06:02:31.869451	2026-06-03 07:12:58.298169
2	206	2	completed	2026-06-02 09:49:32.028416	2026-06-02 09:49:34.308866	2026-06-02 09:49:41.439371	2026-06-02 09:50:03.849527	13.05677790	80.25741760	f	13.05677790	80.25741760	288640.58		\N	2026-06-02 09:49:32.028416	2026-06-02 09:50:03.849527
3	206	2	completed	2026-06-02 09:50:06.551071	2026-06-02 09:50:10.74757	2026-06-02 09:50:23.705215	2026-06-02 09:52:12.718052	13.05677790	80.25741760	f	13.05677790	80.25741760	288640.58		\N	2026-06-02 09:50:06.551071	2026-06-02 09:52:12.718052
4	206	2	completed	2026-06-02 09:54:38.039413	2026-06-02 09:54:38.054844	2026-06-02 09:54:38.054844	2026-06-02 09:56:16.992518	13.05677800	80.25741800	f	13.05677800	80.25741800	288640.62	Test check-in notes	\N	2026-06-02 09:54:38.039413	2026-06-02 09:56:16.992518
5	206	2	completed	2026-06-02 09:56:34.457815	2026-06-02 09:56:36.006361	2026-06-02 09:57:02.93261	2026-06-03 04:22:21.81079	18.95823470	72.83195140	f	18.95823470	72.83195140	837895.91		\N	2026-06-02 09:56:34.457815	2026-06-03 04:22:21.81079
6	206	2	completed	2026-06-03 04:45:53.363783	2026-06-03 04:46:08.265474	2026-06-03 04:46:08.265474	2026-06-03 04:49:04.853588	13.05694260	80.25743030	f	13.05694260	80.25743030	288642.46		\N	2026-06-03 04:45:53.363783	2026-06-03 04:49:04.853588
7	206	2	completed	2026-06-03 04:49:20.573988	2026-06-03 04:49:23.092151	2026-06-03 04:49:23.092151	2026-06-03 04:49:29.169323	18.95823470	72.83195140	f	18.95823470	72.83195140	837895.91		\N	2026-06-03 04:49:20.573988	2026-06-03 04:49:29.169323
8	206	2	completed	2026-06-03 04:49:39.600151	2026-06-03 05:06:32.061423	2026-06-03 05:06:32.061423	2026-06-03 05:14:40.974744	18.95823470	72.83195140	t	13.05683000	80.25740520	\N		\N	2026-06-03 04:49:39.600151	2026-06-03 05:14:40.974744
9	206	2	completed	2026-06-03 05:23:00.386923	2026-06-03 05:24:37.287809	2026-06-03 05:24:37.287809	2026-06-03 05:25:26.602394	13.05682430	80.25740460	t	18.95823470	72.83195140	\N		\N	2026-06-03 05:23:00.386923	2026-06-03 05:25:26.602394
10	206	2	completed	2026-06-03 05:26:17.475132	2026-06-03 05:26:40.055122	2026-06-03 05:26:40.055122	2026-06-03 05:26:57.663852	13.05686520	80.25734300	t	13.05686520	80.25734300	\N		\N	2026-06-03 05:26:17.475132	2026-06-03 05:26:57.663852
11	206	2	completed	2026-06-03 05:44:14.451259	2026-06-03 05:44:18.923007	2026-06-03 05:44:18.923007	2026-06-03 05:44:27.577647	18.95823470	72.83195140	t	18.95823470	72.83195140	\N		\N	2026-06-03 05:44:14.451259	2026-06-03 05:44:27.577647
\.


--
-- Name: activity_logs_id_seq; Type: SEQUENCE SET; Schema: marslab_schema; Owner: marslab_user
--

SELECT pg_catalog.setval('marslab_schema.activity_logs_id_seq', 605, true);


--
-- Name: email_logs_id_seq; Type: SEQUENCE SET; Schema: marslab_schema; Owner: marslab_user
--

SELECT pg_catalog.setval('marslab_schema.email_logs_id_seq', 54, true);


--
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: marslab_schema; Owner: marslab_user
--

SELECT pg_catalog.setval('marslab_schema.notifications_id_seq', 178, true);


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: marslab_schema; Owner: marslab_user
--

SELECT pg_catalog.setval('marslab_schema.refresh_tokens_id_seq', 178, true);


--
-- Name: renewal_history_id_seq; Type: SEQUENCE SET; Schema: marslab_schema; Owner: marslab_user
--

SELECT pg_catalog.setval('marslab_schema.renewal_history_id_seq', 240, true);


--
-- Name: renewals_id_seq; Type: SEQUENCE SET; Schema: marslab_schema; Owner: marslab_user
--

SELECT pg_catalog.setval('marslab_schema.renewals_id_seq', 206, true);


--
-- Name: trash_renewals_id_seq; Type: SEQUENCE SET; Schema: marslab_schema; Owner: marslab_user
--

SELECT pg_catalog.setval('marslab_schema.trash_renewals_id_seq', 108, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: marslab_schema; Owner: marslab_user
--

SELECT pg_catalog.setval('marslab_schema.users_id_seq', 5, true);


--
-- Name: visit_locations_id_seq; Type: SEQUENCE SET; Schema: marslab_schema; Owner: marslab_user
--

SELECT pg_catalog.setval('marslab_schema.visit_locations_id_seq', 56, true);


--
-- Name: visits_id_seq; Type: SEQUENCE SET; Schema: marslab_schema; Owner: marslab_user
--

SELECT pg_catalog.setval('marslab_schema.visits_id_seq', 13, true);


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

\unrestrict YlsikVGe6EmcKMBHV097wOc2f67yC4JCSdd0AHbZ6F7uxIPeEg5gntb7oZAEuK5

