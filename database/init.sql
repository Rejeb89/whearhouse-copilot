-- PostgreSQL initialization script
-- This file runs once when the container first creates the database volume.

-- Ensure the database exists (docker-compose already creates it via POSTGRES_DB,
-- but you can add extra setup here).

-- Enable useful extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
