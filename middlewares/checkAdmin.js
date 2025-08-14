// middlewares/checkAdmin.js
const User = require('../models/user');

module.exports = async function checkAdmin(req, res, next) {
  try {
    // Must be authenticated first (authenticateToken should have set req.user.id)
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Load role from DB (token payload contains only { id } in this project)
    const dbUser = await User.findByIdWithRole(req.user.id);
    if (!dbUser) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check admin role
    if (dbUser.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Attach role (optional, but handy for downstream)
    req.user.role = dbUser.role;
    return next();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
};
