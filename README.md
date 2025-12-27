# Authentication Frontend Project

A Node.js + Express authentication application with PostgreSQL, Passport.js, and Google OAuth2.

## 📁 Project Structure

```
Authentication_frontend/
├── src/                    # Server-side code
│   ├── index.js           # Main application entry point
│   ├── solution.js        # Solution implementation
│   ├── routes/            # Route handlers (future)
│   └── config/            # Configuration files (future)
├── views/                  # EJS templates
│   ├── partials/          # Reusable EJS partials
│   │   ├── header.ejs
│   │   └── footer.ejs
│   ├── home.ejs
│   ├── login.ejs
│   ├── register.ejs
│   └── secrets.ejs
├── public/                 # Static assets
│   └── css/
│       └── styles.css
├── database/              # Database scripts
│   └── queries.sql
├── .env                   # Environment variables (not in git)
├── package.json           # Dependencies and scripts
└── README.md              # This file
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- PostgreSQL
- npm or yarn

### Installation

1. Install dependencies:

```bash
npm install
```

2. **Set up your environment variables in `.env`**:

   ⚠️ **IMPORTANT**: Your `.env` file is currently empty! Copy from the template:

   ```bash
   cp .env.example .env
   ```

   Then edit `.env` and fill in your actual values:

   ```env
   # Required for session management
   SESSION_COOKIE_SECRET=your_session_secret_min_32_characters_long

   # Required for password encryption
   HASHING_SECRET=your_hashing_secret_here

   # Required for Google OAuth (get from https://console.cloud.google.com/)
   GOOGLE_CLIENT_ID=your_google_client_id_here
   GOOGLE_CLIENT_SECRET=your_google_client_secret_here

   # Required for Supabase (see SUPABASE_SETUP.md for detailed instructions)
   SUPABASE_DB_URL=your_supabase_connection_string_here
   ```

3. **Set up Supabase database** (instead of local PostgreSQL):

   📖 **Follow the detailed guide**: [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)

   Quick summary:

   - Create a free Supabase project at [app.supabase.com](https://app.supabase.com/)
   - Get your connection string from Settings → Database
   - Run the SQL from `database/queries.sql` in Supabase SQL Editor
   - Add the connection string to your `.env` file

### Running the Application

Start the server:

```bash
npm start
```

Or for development with auto-restart:

```bash
npm run dev
```

## 🔧 Technologies Used

- **Backend**: Node.js, Express.js
- **View Engine**: EJS
- **Database**: PostgreSQL
- **Authentication**: Passport.js (Local Strategy & Google OAuth2)
- **Security**: bcrypt, express-session, crypto-js
- **Environment**: dotenv

## 📝 Notes

- Make sure PostgreSQL is running before starting the application
- The application uses session-based authentication
- Google OAuth2 requires proper callback URL configuration
