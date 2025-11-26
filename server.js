require("dotenv").config();
const express = require("express");
const path = require("path");
const session = require("express-session");
const passport = require("passport");
const GitHubStrategy = require("passport-github2").Strategy;

const app = express();

// === Load Local Users ===
const users = require("./user.js");

// === EXPRESS CONFIG ===
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET || "default_secret",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());
app.use(express.static("public"));

// === GITHUB LOGIN STRATEGY ===
passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: process.env.GITHUB_CALLBACK_URL,
    },
    (accessToken, refreshToken, profile, done) => done(null, profile)
  )
);

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

// === MIDDLEWARE ===
function checkAuth(req, res, next) {
  if (req.isAuthenticated() || req.session.loggedIn) return next();
  res.redirect("/login");
}

// === ROUTES ===
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public/login.html"));
});

app.post("/manual-login", (req, res) => {
  const { username, password } = req.body;

  const user = users.find(
    (u) => u.username === username && u.password === password
  );

  if (!user) {
    return res.send(`
      <script>
        alert("Username atau Password salah!");
        window.location.href="/login";
      </script>
    `);
  }

  req.session.loggedIn = true;
  req.session.username = username;

  res.redirect("/");
});

app.get("/auth/github", passport.authenticate("github", { scope: ["user:email"] }));

app.get(
  "/auth/github/callback",
  passport.authenticate("github", { failureRedirect: "/login" }),
  (req, res) => res.redirect("/")
);

app.get("/", checkAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/login"));
});

// === EXPORT UNTUK VERCEL ===
module.exports = app;
    
