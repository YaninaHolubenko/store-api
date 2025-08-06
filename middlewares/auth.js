// middlewares/auth.js

const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
  // Expect header: "Authorization: Bearer <token>"
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token missing' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, payload) => {
    if (err) {
      return res.status(403).json({ error: 'Token invalid or expired' });
    }
    // Attach user ID from token payload
    req.user = { id: payload.id };
    next();
  });
}

module.exports = authenticateToken;
