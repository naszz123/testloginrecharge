// server.js
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// PATH to your HTML file (change if needed)
const HTML_PATH = process.env.HTML_PATH || '/mnt/data/final_tiktok_recharge.html';

// Basic session config (use secure settings in production)
app.use(session({
  secret: process.env.SESSION_SECRET || 'replace_this_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    // secure: true -> enable in production with HTTPS
  }
}));

app.use(passport.initialize());
app.use(passport.session());

// Passport GitHub Strategy
passport.serializeUser((user, done) => {
  done(null, user); // keep whole profile (small apps). For prod store minimal id.
});
passport.deserializeUser((obj, done) => {
  done(null, obj);
});

passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: process.env.GITHUB_CALLBACK_URL || `http://localhost:${PORT}/auth/github/callback`
  },
  function(accessToken, refreshToken, profile, done) {
    // Here you can save user to DB if needed
    return done(null, profile);
  }
));

// Middleware to protect routes
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/login');
}

/* ---------- Routes ---------- */

// Login landing (shows simple login link)
app.get('/login', (req, res) => {
  res.send(`
    <h2>Login with GitHub to continue</h2>
    <a href="/auth/github"><button>Login with GitHub</button></a>
  `);
});

// GitHub OAuth start
app.get('/auth/github',
  passport.authenticate('github', { scope: ['user:email'] })
);

// OAuth callback
app.get('/auth/github/callback',
  passport.authenticate('github', { failureRedirect: '/login' }),
  (req, res) => {
    // Successful auth, redirect to home (protected)
    res.redirect('/');
  }
);

// Logout
app.get('/logout', (req, res) => {
  req.logout(() => {
    res.redirect('/login');
  });
});

// Protected home — send your HTML file only if authenticated
app.get('/', ensureAuthenticated, (req, res) => {
  // Optional: you can inject username into page by serving a template instead
  if (!HTML_PATH) return res.status(500).send('HTML path not configured.');
  res.sendFile(path.resolve(HTML_PATH), err => {
    if (err) {
      console.error('Failed to send HTML:', err);
      res.status(500).send('Failed to load page.');
    }
  });
});

// optional: API for current user info
app.get('/api/me', ensureAuthenticated, (req, res) => {
  res.json({ user: req.user });
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
