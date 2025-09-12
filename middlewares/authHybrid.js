// middlewares/authHybrid.js
const authenticateToken = require('./auth');

/*
  Grant access if either:
   - a Passport session exists (req.isAuthenticated() && req.user)
   - OR a valid Bearer JWT is present (delegates to existing authenticateToken)
*/
module.exports = function authHybrid(req, res, next) {
  // Prefer Passport session when available
  if (typeof req.isAuthenticated === 'function' && req.isAuthenticated() && req.user) {
    // Normalize user id if needed
    if (!req.user.id && (req.user.sub || req.user.user_id)) {
      req.user.id = req.user.sub || req.user.user_id;
    }
    return next();
  }

  // Fallback to JWT middleware
  return authenticateToken(req, res, next);
};
