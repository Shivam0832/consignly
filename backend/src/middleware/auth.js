const jwt = require("jsonwebtoken");
const { User } = require("../models");

/**
 * Verifies the JWT on the Authorization: Bearer <token> header, then loads
 * the user so a deleted account or a changed role takes effect immediately
 * instead of whenever the 7-day token expires. Attaches { id, role, email,
 * name } to req.user.
 */
async function authenticate(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing auth token" });

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  try {
    const user = await User.findByPk(payload.id, { attributes: ["id", "role", "email", "name"] });
    if (!user) return res.status(401).json({ error: "Account no longer exists" });
    req.user = { id: user.id, role: user.role, email: user.email, name: user.name };
    next();
  } catch (err) {
    next(err);
  }
}

// Usage: authorize("ADMIN"), authorize("ADMIN", "AGENT")
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Not authenticated" });
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden: insufficient role" });
    }
    next();
  };
}

module.exports = { authenticate, authorize };
