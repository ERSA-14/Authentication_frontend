import express from "express";
import bodyParser from "body-parser";
import sql from "../db.js";

import AES from "crypto-js/aes.js";
import Utf8 from "crypto-js/enc-utf8.js";
import bcrypt, { hash } from "bcrypt";

import session from "express-session";
import passport from "passport";
import { Strategy } from "passport-local";
import GoogleStrategy from "passport-google-oauth2";
import env from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const saltRounds = 14;

const app = express();
const port = 3000;

// Load .env from project root (parent directory of src)
env.config({ path: join(__dirname, "..", ".env") });

// Set views directory to project root
app.set("views", join(__dirname, "..", "views"));
app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({ extended: true }));
// Serve static files from public folder in project root
app.use(express.static(join(__dirname, "..", "public")));

app.use(
  session({
    secret: process.env.SESSION_COOKIE_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 1000 * 60 * 60 * 6 },
  })
);

app.use(passport.initialize());
app.use(passport.session());

function encrypt(text, password) {
  return AES.encrypt(text, password).toString();
}

function decrypt(ciphertext, password) {
  const bytes = AES.decrypt(ciphertext, password);
  return bytes.toString(Utf8);
}

app.get("/", (req, res) => {
  res.render("home.ejs");
});

app.get("/login", (req, res) => {
  res.render("login.ejs");
});

app.get("/register", (req, res) => {
  res.render("register.ejs");
});

app.get("/secrets", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("secrets.ejs");
  } else {
    res.redirect("/login");
  }
});

app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

app.get(
  "/auth/google/secrets",
  passport.authenticate("google", {
    successRedirect: "/secrets",
    failureRedirect: "/login",
  })
);

app.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) console.log(err);
    res.redirect("/");
  });
});

app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/secrets",
    failureRedirect: "/login",
  })
);

app.post("/register", async (req, res) => {
  const password = req.body.password;

  if (req.body.username.length == 0 || req.body.password.length == 0) {
    res.send("<h1> Email / password not valid </h1>");
  } else {
    try {
      // Check if user exists
      const checkResult = await sql`
        SELECT * FROM users WHERE email = ${req.body.username}
      `;

      if (checkResult.length > 0) {
        res.send("<h1>Email already exists</h1>");
      } else {
        bcrypt.hash(password, saltRounds, async (err, hash) => {
          if (err) {
            console.log("error in hashing", err);
          } else {
            // Insert new user
            const result = await sql`
              INSERT INTO users(email, password) 
              VALUES (${req.body.username}, ${encrypt(
              hash,
              process.env.HASHING_SECRET
            )}) 
              RETURNING *
            `;
            const user = result[0];
            req.login(user, (err) => {
              console.log("success");
              res.redirect("/secrets");
            });
          }
        });
      }
    } catch (err) {
      console.log(err);
      res.send("<h1>Error during registration</h1>");
    }
  }
});

passport.use(
  "local",
  new Strategy(async function verify(username, password, cb) {
    try {
      const result = await sql`
        SELECT * FROM users WHERE email = ${username}
      `;
      if (result.length > 0) {
        const user = result[0];
        const storedPassword = decrypt(
          user.password,
          process.env.HASHING_SECRET
        );

        bcrypt.compare(password, storedPassword, (err, result) => {
          if (err) {
            console.log("error in comparing", err);
            return cb(err);
          } else {
            if (result) {
              return cb(null, user);
            } else {
              return cb(null, false);
            }
          }
        });
      } else {
        return cb("user not found");
      }
    } catch (err) {
      console.log(err);
      return cb(err);
    }
  })
);

passport.use(
  "google",
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // Dynamic callback URL for hosting
      callbackURL: `${
        process.env.BASE_URL || "http://localhost:3000"
      }/auth/google/secrets`,
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    async (accessToken, refreshToken, profile, cb) => {
      console.log(profile);
      try {
        const result = await sql`
          SELECT * FROM users WHERE email = ${profile.email}
        `;
        if (result.length === 0) {
          const NewUser = await sql`
            INSERT INTO users (email,password) 
            VALUES (${profile.email}, ${"google"}) 
            RETURNING *
          `;
          cb(null, NewUser[0]);
        } else {
          cb(null, result[0]);
        }
      } catch (err) {
        cb(err);
      }
    }
  )
);

passport.serializeUser((user, cb) => {
  cb(null, user);
});

passport.deserializeUser((user, cb) => {
  cb(null, user);
});

// Database Viewer Route - Real-time read-only view of all tables
app.get("/database", async (req, res) => {
  try {
    // Get all tables in the public schema
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;

    // Get data from each table
    const tableData = {};
    for (const table of tables) {
      const tableName = table.table_name;
      try {
        // Use unsafe for dynamic table names (read-only)
        const data = await sql.unsafe(`SELECT * FROM "${tableName}" LIMIT 100`);
        tableData[tableName] = data;
      } catch (err) {
        tableData[tableName] = { error: err.message };
      }
    }

    // Send HTML response with database view
    res.send(generateDatabaseViewHTML(tableData));
  } catch (err) {
    res.status(500).send(`
      <html>
        <head><title>Database Error</title></head>
        <body style="font-family: Arial; padding: 40px; background: #1a1a2e; color: #eee;">
          <h1 style="color: #ff6b6b;">❌ Database Connection Error</h1>
          <p style="color: #ffd93d;">${err.message}</p>
          <a href="/" style="color: #6bcb77;">← Back to Home</a>
        </body>
      </html>
    `);
  }
});

// API endpoint for real-time data refresh
app.get("/api/database", async (req, res) => {
  try {
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;

    const tableData = {};
    for (const table of tables) {
      const tableName = table.table_name;
      try {
        const data = await sql.unsafe(`SELECT * FROM "${tableName}" LIMIT 100`);
        tableData[tableName] = data;
      } catch (err) {
        tableData[tableName] = { error: err.message };
      }
    }

    res.json({
      success: true,
      tables: tableData,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Generate beautiful HTML for database view
function generateDatabaseViewHTML(tableData) {
  const tableNames = Object.keys(tableData);

  let tablesHTML = "";
  for (const tableName of tableNames) {
    const data = tableData[tableName];

    if (data.error) {
      tablesHTML += `
        <div class="table-card error">
          <h2>📋 ${tableName}</h2>
          <p class="error-msg">Error: ${data.error}</p>
        </div>
      `;
      continue;
    }

    if (data.length === 0) {
      tablesHTML += `
        <div class="table-card empty">
          <h2>📋 ${tableName}</h2>
          <p class="empty-msg">No data in this table</p>
        </div>
      `;
      continue;
    }

    const columns = Object.keys(data[0]);

    let tableRows = data
      .map((row) => {
        const cells = columns
          .map((col) => {
            let value = row[col];
            if (typeof value === "object") value = JSON.stringify(value);
            if (typeof value === "string" && value.length > 50) {
              value = value.substring(0, 50) + "...";
            }
            return `<td>${value ?? '<span class="null">NULL</span>'}</td>`;
          })
          .join("");
        return `<tr>${cells}</tr>`;
      })
      .join("");

    tablesHTML += `
      <div class="table-card">
        <h2>📋 ${tableName} <span class="count">(${
      data.length
    } rows)</span></h2>
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>${columns.map((c) => `<th>${c}</th>`).join("")}</tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Database Viewer - Real-time</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);
      min-height: 100vh;
      color: #e0e0e0;
    }
    
    .header {
      background: rgba(0,0,0,0.3);
      padding: 20px 40px;
      border-bottom: 1px solid rgba(255,255,255,0.1);
      display: flex;
      justify-content: space-between;
      align-items: center;
      backdrop-filter: blur(10px);
    }
    
    .header h1 {
      font-size: 24px;
      background: linear-gradient(90deg, #00d4ff, #7b2cbf);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    
    .status {
      display: flex;
      align-items: center;
      gap: 15px;
    }
    
    .live-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: rgba(75, 255, 128, 0.15);
      border: 1px solid rgba(75, 255, 128, 0.3);
      border-radius: 20px;
      font-size: 14px;
      color: #4bff80;
    }
    
    .live-dot {
      width: 10px;
      height: 10px;
      background: #4bff80;
      border-radius: 50%;
      animation: pulse 1.5s infinite;
    }
    
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(0.8); }
    }
    
    .last-updated {
      font-size: 12px;
      color: #888;
    }
    
    .back-link {
      color: #00d4ff;
      text-decoration: none;
      padding: 8px 16px;
      border: 1px solid #00d4ff;
      border-radius: 8px;
      transition: all 0.3s;
    }
    
    .back-link:hover {
      background: #00d4ff;
      color: #0f0c29;
    }
    
    .container {
      padding: 30px;
      max-width: 1400px;
      margin: 0 auto;
    }
    
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    
    .summary-card {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      padding: 20px;
      text-align: center;
      backdrop-filter: blur(10px);
    }
    
    .summary-card .number {
      font-size: 36px;
      font-weight: bold;
      background: linear-gradient(90deg, #00d4ff, #7b2cbf);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    
    .summary-card .label {
      color: #888;
      font-size: 14px;
      margin-top: 5px;
    }
    
    .table-card {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 16px;
      margin-bottom: 25px;
      overflow: hidden;
      backdrop-filter: blur(10px);
    }
    
    .table-card h2 {
      padding: 18px 24px;
      background: rgba(0,0,0,0.2);
      font-size: 18px;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }
    
    .table-card h2 .count {
      color: #888;
      font-weight: normal;
      font-size: 14px;
    }
    
    .table-wrapper {
      overflow-x: auto;
      max-height: 400px;
      overflow-y: auto;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }
    
    th {
      background: rgba(0,0,0,0.3);
      padding: 12px 16px;
      text-align: left;
      font-weight: 600;
      color: #00d4ff;
      position: sticky;
      top: 0;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }
    
    td {
      padding: 12px 16px;
      border-bottom: 1px solid rgba(255,255,255,0.05);
      max-width: 300px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    
    tr:hover td {
      background: rgba(255,255,255,0.05);
    }
    
    .null {
      color: #666;
      font-style: italic;
    }
    
    .empty-msg, .error-msg {
      padding: 30px;
      text-align: center;
      color: #888;
    }
    
    .error-msg {
      color: #ff6b6b;
    }
    
    .table-card.error {
      border-color: rgba(255, 107, 107, 0.3);
    }
    
    .table-card.empty {
      border-color: rgba(255, 221, 51, 0.3);
    }
    
    .read-only-badge {
      background: rgba(255, 193, 7, 0.2);
      color: #ffc107;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      border: 1px solid rgba(255, 193, 7, 0.3);
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🗄️ Database Viewer</h1>
    <div class="status">
      <span class="read-only-badge">🔒 Read-Only</span>
      <div class="live-indicator">
        <span class="live-dot"></span>
        <span>Live</span>
      </div>
      <span class="last-updated" id="lastUpdated">Updated: ${new Date().toLocaleTimeString()}</span>
    </div>
    <a href="/" class="back-link">← Back to App</a>
  </div>
  
  <div class="container">
    <div class="summary">
      <div class="summary-card">
        <div class="number">${tableNames.length}</div>
        <div class="label">Total Tables</div>
      </div>
      <div class="summary-card">
        <div class="number">${Object.values(tableData).reduce(
          (sum, t) => sum + (Array.isArray(t) ? t.length : 0),
          0
        )}</div>
        <div class="label">Total Rows</div>
      </div>
      <div class="summary-card">
        <div class="number">∞</div>
        <div class="label">Auto-Refresh</div>
      </div>
    </div>
    
    <div id="tables-container">
      ${tablesHTML}
    </div>
  </div>
  
  <script>
    // Auto-refresh every 5 seconds
    setInterval(async () => {
      try {
        const res = await fetch('/api/database');
        const data = await res.json();
        if (data.success) {
          document.getElementById('lastUpdated').textContent = 'Updated: ' + new Date().toLocaleTimeString();
        }
      } catch (err) {
        console.log('Refresh failed:', err);
      }
    }, 5000);
  </script>
</body>
</html>
  `;
}

// Test database connection and start server
async function startServer() {
  try {
    // Test connection with a simple query
    await sql`SELECT 1`;
    console.log("✅ Connected to Database");

    app.listen(port, () => {
      console.log(`🚀 Server running on port ${port}`);
      console.log(`📍 Visit: http://localhost:${port}`);
      console.log(`🗄️  Database Viewer: http://localhost:${port}/database`);
    });
  } catch (err) {
    console.error("❌ Database connection error:", err.message);
    console.error("\n💡 Tips:");
    console.error("   1. Check your DATABASE_URL in .env");
    console.error("   2. Use port 6543 for Session Pooler");
    console.error("   3. Verify your password is correct");
    process.exit(1);
  }
}

startServer();
