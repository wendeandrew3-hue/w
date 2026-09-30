// GadgetGrub server - accounts + static store
// Deps: express only. Passwords hashed with scrypt, sessions via signed cookie.
const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const PROD = process.env.NODE_ENV === 'production';
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'users.json');

app.use(express.urlencoded({ extended: false }));
app.use(express.static(__dirname));

// ---------- tiny JSON db ----------
function loadDB() {
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); }
  catch { return { users: [] }; }
}
function saveDB(db) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// ---------- password hashing (scrypt) ----------
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}
function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const check = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(check, 'hex'));
}

// ---------- signed cookie session ----------
function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}
function verifyToken(token) {
  if (!token) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
  if (payload.exp < Date.now()) return null;
  return payload;
}
function setSession(res, user) {
  const token = sign({ uid: user.id, exp: Date.now() + 1000 * 60 * 60 * 24 * 30 });
  res.setHeader('Set-Cookie',
    `session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000${PROD ? '; Secure' : ''}`);
}
function currentUser(req) {
  const cookies = Object.fromEntries((req.headers.cookie || '').split(';')
    .map(c => c.trim().split('=')).filter(x => x.length === 2));
  const payload = verifyToken(cookies.session);
  if (!payload) return null;
  return loadDB().users.find(u => u.id === payload.uid) || null;
}

// ---------- auth routes ----------
app.post('/api/signup', (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password || password.length < 8) return res.redirect('/signup.html?error=1');
  const db = loadDB();
  if (db.users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
    return res.redirect('/signup.html?error=exists');
  }
  const user = {
    id: crypto.randomUUID(),
    name: String(name).slice(0, 80),
    email: String(email).slice(0, 120).toLowerCase(),
    password: hashPassword(password),
    created: new Date().toISOString()
  };
  db.users.push(user);
  saveDB(db);
  setSession(res, user);
  res.redirect('/account.html');
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body || {};
  const db = loadDB();
  const user = db.users.find(u => u.email.toLowerCase() === String(email || '').toLowerCase());
  if (!user || !verifyPassword(String(password || ''), user.password)) {
    return res.redirect('/login.html?error=1');
  }
  setSession(res, user);
  res.redirect('/account.html');
});

app.post('/api/logout', (req, res) => {
  res.setHeader('Set-Cookie', 'session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');
  res.redirect('/index.html');
});

app.get('/api/me', (req, res) => {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: 'not logged in' });
  res.json({ name: user.name, email: user.email });
});

// payment placeholder hook - your checkout code mounts here later
app.listen(PORT, () => console.log(`GadgetGrub running on port ${PORT}`));
