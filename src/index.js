import express from "express";
import bodyParser from "body-parser";
import db from "../db.js";

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

env.config({ path: join(__dirname, "..", ".env") });

app.set("views", join(__dirname, "..", "views"));
app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({ extended: true }));
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
      const [checkResult] = await db.execute(
        "SELECT * FROM users WHERE email = ?",
        [req.body.username]
      );

      if (checkResult.length > 0) {
        res.send("<h1>Email already exists</h1>");
      } else {
        bcrypt.hash(password, saltRounds, async (err, hash) => {
          if (err) {
            console.log("error in hashing", err);
          } else {
            const [result] = await db.execute(
              "INSERT INTO users(email, password) VALUES (?, ?)",
              [req.body.username, encrypt(hash, process.env.HASHING_SECRET)]
            );

            const [newUser] = await db.execute(
              "SELECT * FROM users WHERE id = ?",
              [result.insertId]
            );

            const user = newUser[0];
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
      const [result] = await db.execute("SELECT * FROM users WHERE email = ?", [
        username,
      ]);
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
      callbackURL: `${
        process.env.BASE_URL || "http://localhost:3000"
      }/auth/google/secrets`,
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    async (accessToken, refreshToken, profile, cb) => {
      console.log(profile);
      try {
        const [result] = await db.execute(
          "SELECT * FROM users WHERE email = ?",
          [profile.email]
        );
        if (result.length === 0) {
          const [insertResult] = await db.execute(
            "INSERT INTO users (email, password) VALUES (?, ?)",
            [profile.email, "google"]
          );
          const [newUser] = await db.execute(
            "SELECT * FROM users WHERE id = ?",
            [insertResult.insertId]
          );
          cb(null, newUser[0]);
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

app.get("/database", async (req, res) => {
  try {
    const [tables] = await db.execute(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = ?",
      [process.env.MYSQL_DATABASE || "auth_db"]
    );

    const tableData = {};
    for (const table of tables) {
      const tableName = table.TABLE_NAME || table.table_name;
      try {
        const [data] = await db.execute(
          `SELECT * FROM \`${tableName}\` LIMIT 100`
        );
        tableData[tableName] = data;
      } catch (err) {
        tableData[tableName] = { error: err.message };
      }
    }

    res.send(`<h1>you are authorized</h1>`);
  } catch (err) {
    res.status(500).send(`
      <h1>you are not authorized</h1>
    `);
  }
});

app.get("/api/database", async (req, res) => {
  try {
    const [tables] = await db.execute(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = ?",
      [process.env.MYSQL_DATABASE || "auth_db"]
    );

    const tableData = {};
    for (const table of tables) {
      const tableName = table.TABLE_NAME || table.table_name;
      try {
        const [data] = await db.execute(
          `SELECT * FROM \`${tableName}\` LIMIT 100`
        );
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

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
