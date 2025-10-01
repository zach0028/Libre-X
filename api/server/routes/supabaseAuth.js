/**
 * Supabase Authentication Routes
 * Simplified auth routes using Supabase Auth instead of Passport.js
 *
 * Original: api/server/routes/auth.js (Passport-based, ~300 lines)
 * New: Supabase-based (~80 lines) - 73% reduction
 */

const express = require('express');
const router = express.Router();
const { logger } = require('@librechat/data-schemas');

// Supabase controllers
const {
  registrationController,
  loginController,
  logoutController,
  refreshController,
  resetPasswordRequestController,
  resetPasswordController,
  verifyEmailController,
  getCurrentUserController,
} = require('~/server/controllers/SupabaseAuthController');

// Middleware
const {
  requireSupabaseAuth,
  optionalSupabaseAuth,
} = require('~/server/middleware/supabaseAuth');

/**
 * POST /auth/register
 * Register new user
 */
router.post('/register', registrationController);

/**
 * POST /auth/login
 * Login with email/password
 */
router.post('/login', loginController);

/**
 * POST /auth/logout
 * Logout current user
 */
router.post('/logout', requireSupabaseAuth, logoutController);

/**
 * POST /auth/refresh
 * Refresh access token
 */
router.post('/refresh', refreshController);

/**
 * POST /auth/requestPasswordReset
 * Request password reset email
 */
router.post('/requestPasswordReset', resetPasswordRequestController);

/**
 * POST /auth/resetPassword
 * Reset password with token
 */
router.post('/resetPassword', resetPasswordController);

/**
 * GET /auth/verify
 * Verify email address (callback from email link)
 */
router.get('/verify', verifyEmailController);

/**
 * GET /auth/user
 * Get current authenticated user
 */
router.get('/user', requireSupabaseAuth, getCurrentUserController);

/**
 * OAuth Provider Routes (Supabase handles OAuth automatically)
 * These endpoints redirect to Supabase hosted OAuth flow
 */

/**
 * GET /auth/google
 * Initiate Google OAuth
 */
router.get('/google', (req, res) => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const redirectUrl = `${supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${process.env.DOMAIN_CLIENT}/auth/callback`;
  res.redirect(redirectUrl);
});

/**
 * GET /auth/github
 * Initiate GitHub OAuth
 */
router.get('/github', (req, res) => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const redirectUrl = `${supabaseUrl}/auth/v1/authorize?provider=github&redirect_to=${process.env.DOMAIN_CLIENT}/auth/callback`;
  res.redirect(redirectUrl);
});

/**
 * GET /auth/discord
 * Initiate Discord OAuth
 */
router.get('/discord', (req, res) => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const redirectUrl = `${supabaseUrl}/auth/v1/authorize?provider=discord&redirect_to=${process.env.DOMAIN_CLIENT}/auth/callback`;
  res.redirect(redirectUrl);
});

/**
 * GET /auth/callback
 * OAuth callback handler (all providers)
 * Frontend will handle the OAuth response from Supabase
 */
router.get('/callback', (req, res) => {
  // Supabase handles the OAuth flow and redirects back with tokens in URL hash
  // Frontend will extract tokens from URL and store them
  res.redirect(`${process.env.DOMAIN_CLIENT}/auth/callback`);
});

/**
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    auth: 'supabase',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
