# Authentication App with MySQL

A Node.js authentication application using Express, Passport.js, and MySQL.

## Features

- ✅ User registration with email/password
- ✅ User login with local strategy
- ✅ Google OAuth 2.0 authentication
- ✅ Password hashing with bcrypt
- ✅ Password encryption with AES
- ✅ Session management
- ✅ Real-time database viewer (read-only)

## Prerequisites

- Node.js 18+
- MySQL Server (local or remote)

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up MySQL Database

Connect to your MySQL server and run:

```sql
CREATE DATABASE IF NOT EXISTS auth_db;

USE auth_db;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

Or run the SQL file:
```bash
mysql -u root -p < database/queries.sql
```

### 3. Configure Environment Variables

Copy `.env.example` to `.env` and update values:

```bash
cp .env.example .env
```

Update your `.env` file:
```env
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=auth_db

SESSION_COOKIE_SECRET=your_secret_here
HASHING_SECRET=your_hashing_secret
```

### 4. Start the Server

```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

## Routes

| Route | Description |
|-------|-------------|
| `/` | Home page |
| `/login` | Login page |
| `/register` | Registration page |
| `/secrets` | Protected secrets page |
| `/database` | Real-time database viewer (read-only) |
| `/logout` | Logout |
| `/auth/google` | Google OAuth login |

## Database Viewer

Access `/database` to view all tables in your MySQL database in real-time. The viewer auto-refreshes every 5 seconds and is read-only for security.

## Project Structure

```
Authentication_frontend/
├── db.js                 # MySQL connection pool
├── src/
│   └── index.js          # Main application
├── views/
│   ├── home.ejs
│   ├── login.ejs
│   ├── register.ejs
│   └── secrets.ejs
├── public/               # Static files
├── database/
│   └── queries.sql       # MySQL schema
├── .env.example          # Environment template
└── package.json
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `MYSQL_HOST` | MySQL server host (default: localhost) |
| `MYSQL_PORT` | MySQL server port (default: 3306) |
| `MYSQL_USER` | MySQL username (default: root) |
| `MYSQL_PASSWORD` | MySQL password |
| `MYSQL_DATABASE` | Database name (default: auth_db) |
| `SESSION_COOKIE_SECRET` | Secret for session cookies |
| `HASHING_SECRET` | Secret for password encryption |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `BASE_URL` | Application base URL |
