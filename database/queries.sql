-- Authentication Users Table
-- Run this in Supabase SQL Editor: https://app.supabase.com/ → SQL Editor

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password TEXT NOT NULL,  -- Stores encrypted bcrypt hash
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster email lookups during login
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Add comment for documentation
COMMENT ON TABLE users IS 'Stores user authentication credentials with encrypted passwords';
COMMENT ON COLUMN users.password IS 'Encrypted using AES + bcrypt (see src/index.js)';