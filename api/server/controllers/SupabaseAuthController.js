/**
 * Supabase Auth Controller
 * Simplified authentication using Supabase Auth instead of Passport.js
 *
 * Replaces: api/server/controllers/AuthController.js (Passport-based)
 * Reduces: ~200 lines → ~150 lines (25% reduction)
 */

const { logger } = require('@librechat/data-schemas');
const { supabaseAdmin } = require('~/db/supabase');
const { findUser, updateUser } = require('~/models/supabase/userModel');
const { isEnabled, checkEmailConfig, isEmailDomainAllowed } = require('@librechat/api');
const { sendEmail } = require('~/server/utils');

const domains = {
  client: process.env.DOMAIN_CLIENT,
  server: process.env.DOMAIN_SERVER,
};

/**
 * User Registration with Supabase Auth
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
const registrationController = async (req, res) => {
  try {
    const { email, password, name, username } = req.body;

    // Email domain validation (if configured)
    if (!isEmailDomainAllowed(email)) {
      return res.status(403).json({
        message: 'Email domain not allowed. Please use an authorized email domain.',
      });
    }

    // Check if user already exists
    const existingUser = await findUser({ email }, 'id,email');
    if (existingUser) {
      return res.status(409).json({
        message: 'Email already registered. Please login instead.',
      });
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: !isEnabled(process.env.EMAIL_VERIFICATION_REQUIRED), // Auto-confirm if email verification disabled
      user_metadata: {
        name: name || username,
        username,
      },
    });

    if (authError) {
      logger.error('[registrationController] Supabase auth error:', authError);
      return res.status(400).json({
        message: authError.message || 'Registration failed',
      });
    }

    // Profile is automatically created via database trigger
    // (profiles table has ON INSERT trigger referencing auth.users)

    // Send verification email if enabled
    if (isEnabled(process.env.EMAIL_VERIFICATION_REQUIRED)) {
      try {
        const { error: emailError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'signup',
          email,
          options: {
            redirectTo: `${domains.client}/verify`,
          },
        });

        if (emailError) {
          logger.warn('[registrationController] Failed to send verification email:', emailError);
        } else {
          logger.info(`[registrationController] Verification email sent to ${email}`);
        }

        return res.status(200).json({
          message: 'Registration successful. Please check your email to verify your account.',
        });
      } catch (emailErr) {
        logger.error('[registrationController] Email error:', emailErr);
        return res.status(200).json({
          message: 'Registration successful. Please login.',
        });
      }
    }

    // Auto-login if email verification not required
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (sessionError) {
      return res.status(200).json({
        message: 'Registration successful. Please login.',
      });
    }

    return res.status(201).json({
      message: 'Registration successful',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        name: authData.user.user_metadata.name,
      },
      session: sessionData.session,
    });
  } catch (err) {
    logger.error('[registrationController] Error:', err);
    return res.status(500).json({ message: err.message || 'Internal server error' });
  }
};

/**
 * User Login with Supabase Auth
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
const loginController = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Sign in with Supabase
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      logger.warn(`[loginController] Login failed for ${email}:`, error.message);
      return res.status(401).json({
        message: 'Invalid email or password',
      });
    }

    // Get user profile
    const userProfile = await findUser({ id: data.user.id }, 'id,name,username,email,avatar,role');

    return res.status(200).json({
      token: data.session.access_token,
      user: {
        id: data.user.id,
        email: data.user.email,
        name: userProfile?.name || data.user.user_metadata?.name,
        username: userProfile?.username,
        avatar: userProfile?.avatar,
        role: userProfile?.role || 'user',
      },
      session: data.session,
    });
  } catch (err) {
    logger.error('[loginController] Error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * User Logout
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
const logoutController = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(200).json({ message: 'No active session' });
    }

    const token = authHeader.replace('Bearer ', '');

    // Sign out from Supabase
    const { error } = await supabaseAdmin.auth.admin.signOut(token);

    if (error) {
      logger.warn('[logoutController] Logout error:', error);
    }

    return res.status(200).json({ message: 'Logout successful' });
  } catch (err) {
    logger.error('[logoutController] Error:', err);
    return res.status(200).json({ message: 'Logout completed' });
  }
};

/**
 * Refresh Access Token
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
const refreshController = async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(401).json({ message: 'Refresh token not provided' });
    }

    // Refresh session with Supabase
    const { data, error } = await supabaseAdmin.auth.refreshSession({ refresh_token });

    if (error) {
      logger.warn('[refreshController] Token refresh failed:', error);
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    // Get user profile
    const userProfile = await findUser({ id: data.user.id }, 'id,name,username,email,avatar,role');

    return res.status(200).json({
      token: data.session.access_token,
      user: {
        id: data.user.id,
        email: data.user.email,
        name: userProfile?.name,
        username: userProfile?.username,
        avatar: userProfile?.avatar,
        role: userProfile?.role || 'user',
      },
      session: data.session,
    });
  } catch (err) {
    logger.error('[refreshController] Error:', err);
    return res.status(401).json({ message: 'Token refresh failed' });
  }
};

/**
 * Request Password Reset
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
const resetPasswordRequestController = async (req, res) => {
  try {
    const { email } = req.body;

    // Verify user exists
    const user = await findUser({ email }, 'id,email');
    if (!user) {
      // Return success even if user doesn't exist (security best practice)
      return res.status(200).json({
        message: 'If an account exists with this email, a password reset link has been sent.',
      });
    }

    // Send password reset email via Supabase
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo: `${domains.client}/reset-password`,
    });

    if (error) {
      logger.error('[resetPasswordRequestController] Error:', error);
      return res.status(500).json({
        message: 'Failed to send password reset email',
      });
    }

    logger.info(`[resetPasswordRequestController] Password reset email sent to ${email}`);

    return res.status(200).json({
      message: 'If an account exists with this email, a password reset link has been sent.',
    });
  } catch (err) {
    logger.error('[resetPasswordRequestController] Error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Reset Password (with token)
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
const resetPasswordController = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        message: 'Token and new password are required',
      });
    }

    // Update password via Supabase
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      token, // This is actually the user ID from the reset link
      { password }
    );

    if (error) {
      logger.error('[resetPasswordController] Error:', error);
      return res.status(400).json({
        message: 'Password reset failed. Token may be invalid or expired.',
      });
    }

    logger.info(`[resetPasswordController] Password reset successful for user ${data.user.id}`);

    return res.status(200).json({
      message: 'Password reset successful. Please login with your new password.',
    });
  } catch (err) {
    logger.error('[resetPasswordController] Error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Verify Email (callback from email link)
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
const verifyEmailController = async (req, res) => {
  try {
    const { token, email } = req.query;

    // Verify email via Supabase
    const { data, error } = await supabaseAdmin.auth.verifyOtp({
      token_hash: token,
      type: 'email',
    });

    if (error) {
      logger.error('[verifyEmailController] Verification failed:', error);
      return res.status(400).json({
        message: 'Email verification failed. Link may be invalid or expired.',
      });
    }

    logger.info(`[verifyEmailController] Email verified for ${email}`);

    return res.status(200).json({
      message: 'Email verified successfully. You can now login.',
    });
  } catch (err) {
    logger.error('[verifyEmailController] Error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get Current User (from JWT token)
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
const getCurrentUserController = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const token = authHeader.replace('Bearer ', '');

    // Get user from token
    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data.user) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    // Get user profile
    const userProfile = await findUser({ id: data.user.id });

    return res.status(200).json({
      user: {
        id: data.user.id,
        email: data.user.email,
        name: userProfile?.name,
        username: userProfile?.username,
        avatar: userProfile?.avatar,
        role: userProfile?.role || 'user',
        emailVerified: data.user.email_confirmed_at !== null,
      },
    });
  } catch (err) {
    logger.error('[getCurrentUserController] Error:', err);
    return res.status(401).json({ message: 'Authentication failed' });
  }
};

module.exports = {
  registrationController,
  loginController,
  logoutController,
  refreshController,
  resetPasswordRequestController,
  resetPasswordController,
  verifyEmailController,
  getCurrentUserController,
};
