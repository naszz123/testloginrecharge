require("dotenv").config();
const express = require("express");
const session = require("express-session");
const passport = require("passport");
const GitHubStrategy = require("passport-github2").Strategy;
const path = require("path");
const fs = require("fs");

const app = express();

// ============================
//   SESSION CONFIG
// ============================
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

// ============================
//   PASSPORT GITHUB STRATEGY
// ============================
passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: process.env.GITHUB_CALLBACK_URL,
    },
    (accessToken, refreshToken, profile, done) => {
      return done(null, profile);
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user);
});
passport.deserializeUser((obj, done) => {
  done(null, obj);
});

// ============================
//   STATIC FILE (PUBLIC)
// ============================
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

// ============================
//   ROUTE: LOGIN PAGE (FORM NAMA + PASSWORD)
// ============================
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

// ============================
//   LOGIN MANUAL (NAMA + PASSWORD)
// ============================
app.post("/login", (req, res) => {
  const name = req.body.name;
  const password = req.body.password;

  // file user disimpan di GitHub → local clone harus ada user.js
  const usersFile = path.join(__dirname, "user.js");

  if (!fs.existsSync(usersFile)) {
    return res.send("File user.js tidak ditemukan di server.");
  }

  const users = require(usersFile);

  const found = users.find(
    (u) => u.name === name && u.password === password
  );

  if (!found) {
    return res.send("<h3>Akun salah / tidak terdaftar.</h3>");
  }

  // Simpan session login manual
  req.session.user = { name };

  return res.redirect("/");
});

// ============================
//   ROUTE: BUY ACCESS
// ============================
app.get("/buy", (req, res) => { 
  res.redirect("https://wa.me/6285797237843?text=bang%20mo%20beli%20akun%20recharge%20nya"); 
});

// ============================
//   GITHUB LOGIN ROUTES
// ============================
app.get(
  "/auth/github",
  passport.authenticate("github", { scope: ["user:email"] })
);

app.get(
  "/auth/github/callback",
  passport.authenticate("github", { failureRedirect: "/login" }),
  (req, res) => {
    res.redirect("/");
  }
);

// ============================
//   MIDDLEWARE CEK LOGIN
// ============================
function requireLogin(req, res, next) {
  if (req.isAuthenticated() || req.session.user) {
    return next();
  }
  return res.redirect("/login");
}

// ============================
//   HALAMAN UTAMA (index.html)
// ============================
app.get("/", requireLogin, (req, res) => {
  res.sendFile(process.env.HTML_PATH);
});

// ============================
//   LOGOUT
// ============================
app.get("/logout", (req, res) => {
  req.logout(() => {
    req.session.destroy(() => {
      res.redirect("/login");
    });
  });
});

// ============================
//   START SERVER
// ============================
app.listen(process.env.PORT, () => {
  console.log("Server berjalan di port " + process.env.PORT);
});
