#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE SCHEMA IF NOT EXISTS marslab_schema AUTHORIZATION marslab_user;
    ALTER ROLE marslab_user SET search_path TO marslab_schema;
EOSQL
