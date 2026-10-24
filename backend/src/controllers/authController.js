const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { User } = require("../models");
const { ROLES } = require("../utils/constants");

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, email: user.email, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

function publicUser(user) {
  const plain = user.toJSON ? user.toJSON() : user;
  const { password, ...rest } = plain;
  return rest;
}

/**
 * Public self-registration. Role is restricted to CUSTOMER here — AGENT and
 * ADMIN accounts must be created by an existing admin via /api/admin/users
 * so random visitors can't grant themselves elevated access.
 */
const MIN_PASSWORD = 8;
const DUMMY_HASH = bcrypt.hashSync("timing-equalizer-not-a-password", 10);

/** Emails are compared case-insensitively: "Anita@X.com" and "anita@x.com" are one account. */
function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

async function register(req, res) {
  const { name, password, phone } = req.body;
  const email = normalizeEmail(req.body.email);
  if (!String(name || "").trim() || !email || !password) {
    return res.status(400).json({ error: "name, email, password are required" });
  }
  if (String(password).length < MIN_PASSWORD) {
    return res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD} characters` });
  }
  const existing = await User.findOne({ where: { email } });
  if (existing) return res.status(409).json({ error: "Email already registered" });

  const hash = await bcrypt.hash(String(password), 10);
  const user = await User.create({
    name: String(name).trim(),
    email,
    password: hash,
    phone: phone ? String(phone).trim() : null,
    role: ROLES.CUSTOMER,
  });

  const token = signToken(user);
  res.status(201).json({ token, user: publicUser(user) });
}

async function login(req, res) {
  const { password } = req.body;
  const email = normalizeEmail(req.body.email);
  if (!email || !password) return res.status(400).json({ error: "email and password required" });

  const user = await User.findOne({ where: { email } });
  // Compare against a dummy hash when the user doesn't exist so response
  // time doesn't reveal which emails are registered.
  const ok = await bcrypt.compare(String(password), user ? user.password : DUMMY_HASH);
  if (!user || !ok) return res.status(401).json({ error: "Invalid credentials" });

  const token = signToken(user);
  res.json({ token, user: publicUser(user) });
}

async function me(req, res) {
  const user = await User.findByPk(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user: publicUser(user) });
}

module.exports = { register, login, me, signToken, publicUser, normalizeEmail, MIN_PASSWORD };
