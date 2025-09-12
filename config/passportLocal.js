// config\passportLocal.js
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');           // use native bcrypt already installed
const usersModel = require('../models/user');

/**
 * Local strategy that expects a "username" field.
 * For flexibility, it will look up by username OR email using the same identifier.
 * It supports common password hash column names: password_hash / password_digest / password.
 */
module.exports = function setupPassportLocal(passport) {
  passport.use(
    new LocalStrategy(
      { usernameField: 'username', passwordField: 'password', session: true },
      async (identifier, password, done) => {
        try {
          // Try to find by username OR email (same identifier passed twice)
          const user = await usersModel.findByUsernameOrEmail(identifier, identifier);
          if (!user) {
            return done(null, false, { message: 'Invalid credentials' });
          }

          // Support multiple possible hash column names
          const hash = user.password_hash || user.password_digest || user.password;
          if (!hash) {
            return done(null, false, { message: 'Invalid credentials' });
          }

          const ok = await bcrypt.compare(password, hash);
          if (!ok) {
            return done(null, false, { message: 'Invalid credentials' });
          }

          // Never expose hash, return safe shape
          const safeUser = {
            id: user.id,
            email: user.email,
            username: user.username,
            role: user.role,
          };

          return done(null, safeUser);
        } catch (err) {
          console.error('[passport-local] error:', err);
          return done(err);
        }
      }
    )
  );
};
