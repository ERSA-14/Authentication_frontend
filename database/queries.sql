-- MySQL Schema for Authentication App
-- Run this in your MySQL database to create the required tables

-- Create the database if it doesn't exist
CREATE DATABASE IF NOT EXISTS auth_db;

-- Use the database
USE auth_db;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster email lookups
CREATE INDEX idx_users_email ON users(email);

-- View all users (for testing)
-- SELECT * FROM users;