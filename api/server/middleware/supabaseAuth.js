/**
 * Supabase Authentication Middleware
 * Replaces Passport.js JWT verification with Supabase Auth
 *
 * Original: api/server/middleware/requireJwtAuth.js (Passport-based)
 * Simplification: ~75 lines → ~40 lines (47% reduction)
 */

const { logger } = require('@librechat/data-schemas');
const { supabaseAdmin } = require('~/db/supabase');
const { findUser } = require('~/models/supabase/userModel');

/**
 * Middleware to verify Supabase JWT token and attach user to request
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 */
const requireSupabaseAuth = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.debug('[requireSupabaseAuth] No authorization header found');
      return res.status(401).json({
        message: 'Unauthorized - No token provided',
      });
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify token with Supabase
    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data.user) {
      logger.debug('[requireSupabaseAuth] Invalid token:', error?.message);
      return res.status(401).json({
        message: 'Unauthorized - Invalid or expired token',
      });
    }

    // Get full user profile from database
    const userProfile = await findUser(
      { id: data.user.id },
      'id,email,name,username,avatar,role,preferences,subscription_plan'
    );

    if (!userProfile) {
      logger.warn(`[requireSupabaseAuth] User profile not found for ${data.user.id}`);
      return res.status(401).json({
        message: 'Unauthorized - User not found',
      });
    }

    // Attach user to request (compatible with existing code)
    req.user = {
      id: userProfile.id,
      _id: userProfile.id, // MongoDB compatibility
      email: userProfile.email,
      name: userProfile.name,
      username: userProfile.username,
      avatar: userProfile.avatar,
      role: userProfile.role || 'user',
      preferences: userProfile.preferences || {},
      subscriptionPlan: userProfile.subscription_plan,
    };

    // Attach Supabase user object
    req.supabaseUser = data.user;

    next();
  } catch (err) {
    logger.error('[requireSupabaseAuth] Unexpected error:', err);
    return res.status(500).json({
      message: 'Internal authentication error',
    });
  }
};

/**
 * Optional authentication - attach user if token exists, but don't require it
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 */
const optionalSupabaseAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided - continue without user
      return next();
    }

    const token = authHeader.replace('Bearer ', '');

    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data.user) {
      // Invalid token - continue without user
      logger.debug('[optionalSupabaseAuth] Invalid token, continuing without auth');
      return next();
    }

    // Get user profile
    const userProfile = await findUser({ id: data.user.id });

    if (userProfile) {
      req.user = {
        id: userProfile.id,
        _id: userProfile.id,
        email: userProfile.email,
        name: userProfile.name,
        username: userProfile.username,
        avatar: userProfile.avatar,
        role: userProfile.role || 'user',
      };
      req.supabaseUser = data.user;
    }

    next();
  } catch (err) {
    logger.debug('[optionalSupabaseAuth] Error (continuing):', err);
    next();
  }
};

/**
 * Middleware to check user has specific role
 * @param {String[]} allowedRoles - Array of allowed roles
 * @returns {Function} Express middleware
 */
const requireRole = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        message: 'Unauthorized - Authentication required',
      });
    }

    const userRole = req.user.role || 'user';

    if (!allowedRoles.includes(userRole)) {
      logger.warn(
        `[requireRole] User ${req.user.id} with role ${userRole} attempted to access ${req.path}`
      );
      return res.status(403).json({
        message: 'Forbidden - Insufficient permissions',
      });
    }

    next();
  };
};

/**
 * Middleware to check user is admin
 */
const requireAdmin = requireRole(['admin']);

/**
 * Session validation middleware (checks if user still exists and is active)
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 */
const validateSession = async (req, res, next) => {
  if (!req.user) {
    return next();
  }

  try {
    // Check if user still exists and is not deleted
    const user = await findUser({ id: req.user.id }, 'id,deleted_at');

    if (!user || user.deleted_at) {
      logger.warn(`[validateSession] User ${req.user.id} is deleted or not found`);
      return res.status(401).json({
        message: 'Session invalid - User account not found',
      });
    }

    next();
  } catch (err) {
    logger.error('[validateSession] Error:', err);
    return res.status(500).json({
      message: 'Session validation error',
    });
  }
};

module.exports = {
  requireSupabaseAuth,
  optionalSupabaseAuth,
  requireRole,
  requireAdmin,
  validateSession,
};
