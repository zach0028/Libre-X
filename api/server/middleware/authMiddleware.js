/**
 * Universal Authentication Middleware
 * Automatically uses Supabase or Passport depending on DB_MODE
 *
 * This allows existing routes to work with both auth systems
 * without modification
 */

const { logger } = require('@librechat/data-schemas');

const USE_SUPABASE = process.env.DB_MODE === 'supabase';

let authMiddleware;
let optionalAuthMiddleware;

if (USE_SUPABASE) {
  // Use Supabase authentication
  const {
    requireSupabaseAuth,
    optionalSupabaseAuth,
  } = require('./supabaseAuth');

  authMiddleware = requireSupabaseAuth;
  optionalAuthMiddleware = optionalSupabaseAuth;

  logger.info('[Auth Middleware] Using Supabase authentication');
} else {
  // Use Passport.js authentication (legacy)
  const requireJwtAuth = require('./requireJwtAuth');

  authMiddleware = requireJwtAuth;
  optionalAuthMiddleware = (req, res, next) => {
    // Passport doesn't have optional auth, so just continue
    next();
  };

  logger.info('[Auth Middleware] Using Passport.js authentication');
}

module.exports = authMiddleware;
module.exports.requireAuth = authMiddleware;
module.exports.optionalAuth = optionalAuthMiddleware;
