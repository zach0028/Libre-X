/**
 * User Model - Supabase Wrapper
 * Maintains same interface as MongoDB user methods for seamless migration
 *
 * Original: packages/data-schemas/src/methods/user.ts
 * Migration: MongoDB → Supabase PostgreSQL
 */

const { supabaseAdmin, executeQuery, getUserProfile } = require('../../db/supabase');
const { ProfilesAdapter } = require('../../db/supabaseAdapter');
const bcrypt = require('bcryptjs');

/**
 * Find user by search criteria (MongoDB-compatible interface)
 * @param {Object} searchCriteria - Search filters (email, username, id, etc.)
 * @param {String} fieldsToSelect - Space-separated field names (MongoDB style) or Supabase column list
 * @returns {Promise<Object|null>} User object or null
 */
async function findUser(searchCriteria, fieldsToSelect = '*') {
  try {
    // Convert MongoDB-style field selection to Supabase format
    const selectFields = fieldsToSelect === '*'
      ? '*'
      : fieldsToSelect.split(' ').filter(f => !f.startsWith('-')).join(',');

    return await ProfilesAdapter.findOne(searchCriteria, selectFields);
  } catch (error) {
    console.error('[findUser] Error:', error);
    return null;
  }
}

/**
 * Get user by ID
 * @param {String} userId - User UUID
 * @param {String} fieldsToSelect - Fields to return
 * @returns {Promise<Object|null>}
 */
async function getUserById(userId, fieldsToSelect = '*') {
  try {
    const selectFields = fieldsToSelect === '*'
      ? '*'
      : fieldsToSelect.split(' ').filter(f => !f.startsWith('-')).join(',');

    return await ProfilesAdapter.findById(userId, selectFields);
  } catch (error) {
    console.error('[getUserById] Error:', error);
    return null;
  }
}

/**
 * Create new user with Supabase Auth + Profile
 * @param {Object} userData - User data object
 * @param {Object} balanceConfig - Balance configuration (optional)
 * @returns {Promise<Object>} Created user object
 */
async function createUser(userData, balanceConfig = {}) {
  try {
    // Step 1: Create auth user in Supabase Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: userData.emailVerified || false,
      user_metadata: {
        name: userData.name,
        username: userData.username,
        provider: userData.provider || 'email',
      },
    });

    if (authError) throw authError;

    // Step 2: Create profile in public.profiles
    const profileData = {
      id: authUser.user.id,
      name: userData.name || null,
      username: userData.username || null,
      email: userData.email,
      avatar: userData.avatar || null,
      role: userData.role || 'user',
      provider: userData.provider || 'email',
      subscription_plan: balanceConfig.enabled ? 'trial' : 'free',
      comparisons_count: 0,
      preferences: {
        language: 'en',
        theme: 'auto',
      },
      email_verified: userData.emailVerified || false,
    };

    const profile = await ProfilesAdapter.create(profileData);

    // Step 3: Initialize balance if enabled
    if (balanceConfig.enabled && balanceConfig.startBalance) {
      await supabaseAdmin.from('transactions').insert({
        user_id: authUser.user.id,
        amount: balanceConfig.startBalance,
        type: 'credit',
        source: 'initial_balance',
        description: 'Initial account balance',
        metadata: { reason: 'account_creation' },
      });

      // Update profile balance
      await ProfilesAdapter.updateById(authUser.user.id, {
        'preferences.balance': balanceConfig.startBalance,
      });
    }

    return {
      ...profile,
      _id: profile.id, // MongoDB compatibility
    };
  } catch (error) {
    console.error('[createUser] Error:', error);
    throw error;
  }
}

/**
 * Update user by ID
 * @param {String} userId - User UUID
 * @param {Object} updateData - Fields to update
 * @returns {Promise<Object|null>} Updated user object
 */
async function updateUser(userId, updateData) {
  try {
    // Handle nested updates (e.g., 'preferences.theme')
    const flattenedData = {};
    Object.entries(updateData).forEach(([key, value]) => {
      if (key.includes('.')) {
        // JSONB nested update
        const [parent, child] = key.split('.');
        if (!flattenedData[parent]) flattenedData[parent] = {};
        flattenedData[parent][child] = value;
      } else {
        flattenedData[key] = value;
      }
    });

    // If updating auth fields (email, password), update Supabase Auth
    if (updateData.email || updateData.password) {
      const authUpdate = {};
      if (updateData.email) authUpdate.email = updateData.email;
      if (updateData.password) authUpdate.password = updateData.password;

      await supabaseAdmin.auth.admin.updateUserById(userId, authUpdate);
    }

    // Update profile
    return await ProfilesAdapter.updateById(userId, flattenedData);
  } catch (error) {
    console.error('[updateUser] Error:', error);
    return null;
  }
}

/**
 * Delete user by ID (soft delete by default)
 * @param {String} userId - User UUID
 * @param {Boolean} hardDelete - If true, permanently delete from auth.users (cascades to profile)
 * @returns {Promise<Boolean>} Success status
 */
async function deleteUserById(userId, hardDelete = false) {
  try {
    if (hardDelete) {
      // Delete from Supabase Auth (CASCADE deletes profile automatically)
      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (error) throw error;
    } else {
      // Soft delete: Mark as deleted
      await ProfilesAdapter.updateById(userId, {
        deleted_at: new Date().toISOString(),
        email: `deleted_${userId}@deleted.local`, // Prevent email conflicts
        username: null,
      });
    }
    return true;
  } catch (error) {
    console.error('[deleteUserById] Error:', error);
    return false;
  }
}

/**
 * Count users matching criteria
 * @param {Object} criteria - Filter criteria
 * @returns {Promise<Number>} User count
 */
async function countUsers(criteria = {}) {
  try {
    let query = supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true });

    Object.entries(criteria).forEach(([key, value]) => {
      if (value && typeof value === 'object' && '$ne' in value) {
        query = query.neq(key, value.$ne);
      } else {
        query = query.eq(key, value);
      }
    });

    const { count } = await query;
    return count || 0;
  } catch (error) {
    console.error('[countUsers] Error:', error);
    return 0;
  }
}

/**
 * Generate JWT token for user session (compatible with existing LibreChat token system)
 * Note: Supabase has built-in JWT, but this maintains compatibility
 * @param {Object} user - User object
 * @returns {String} JWT token
 */
async function generateToken(user) {
  // Use Supabase's built-in session token
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email: user.email,
  });

  if (error) {
    console.error('[generateToken] Error:', error);
    return null;
  }

  return data.properties.action_link;
}

/**
 * Compare password with hashed password
 * Note: Supabase Auth handles this internally, but kept for compatibility
 * @param {String} candidatePassword - Plain text password
 * @param {String} userPassword - Hashed password (legacy)
 * @returns {Promise<Boolean>}
 */
async function comparePassword(candidatePassword, userPassword) {
  try {
    return await bcrypt.compare(candidatePassword, userPassword);
  } catch (error) {
    console.error('[comparePassword] Error:', error);
    return false;
  }
}

/**
 * Get users by multiple IDs
 * @param {Array<String>} userIds - Array of user UUIDs
 * @param {String} fieldsToSelect - Fields to return
 * @returns {Promise<Array>} Array of user objects
 */
async function getUsersByIds(userIds, fieldsToSelect = '*') {
  try {
    const selectFields = fieldsToSelect === '*'
      ? '*'
      : fieldsToSelect.split(' ').filter(f => !f.startsWith('-')).join(',');

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select(selectFields)
      .in('id', userIds);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[getUsersByIds] Error:', error);
    return [];
  }
}

/**
 * Search users (for admin panel, mentions, etc.)
 * @param {String} searchTerm - Search query
 * @param {Object} options - Search options
 * @returns {Promise<Array>} Matching users
 */
async function searchUsers(searchTerm, options = {}) {
  try {
    const { limit = 20, offset = 0, fieldsToSelect = 'id,name,username,email,avatar' } = options;

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select(fieldsToSelect)
      .or(`name.ilike.%${searchTerm}%,username.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
      .is('deleted_at', null)
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[searchUsers] Error:', error);
    return [];
  }
}

/**
 * Update user's last activity timestamp
 * @param {String} userId - User UUID
 * @returns {Promise<Boolean>}
 */
async function updateLastActivity(userId) {
  try {
    await ProfilesAdapter.updateById(userId, {
      last_active_at: new Date().toISOString(),
    });
    return true;
  } catch (error) {
    console.error('[updateLastActivity] Error:', error);
    return false;
  }
}

/**
 * Increment user's comparison count (trigger function exists, but this is manual fallback)
 * @param {String} userId - User UUID
 * @returns {Promise<Boolean>}
 */
async function incrementComparisonCount(userId) {
  try {
    const { error } = await supabaseAdmin.rpc('increment_comparison_count', { p_user_id: userId });
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('[incrementComparisonCount] Error:', error);
    return false;
  }
}

/**
 * Get remaining comparisons for user (based on subscription plan)
 * @param {String} userId - User UUID
 * @returns {Promise<Number>} Remaining comparisons
 */
async function getRemainingComparisons(userId) {
  try {
    const { data, error } = await supabaseAdmin.rpc('get_remaining_comparisons', {
      p_user_id: userId
    });
    if (error) throw error;
    return data || 0;
  } catch (error) {
    console.error('[getRemainingComparisons] Error:', error);
    return 0;
  }
}

// Export all methods (MongoDB-compatible interface)
module.exports = {
  // Core CRUD
  findUser,
  getUserById,
  createUser,
  updateUser,
  deleteUserById,
  countUsers,

  // Batch operations
  getUsersByIds,
  searchUsers,

  // Auth helpers
  generateToken,
  comparePassword,

  // Activity tracking
  updateLastActivity,
  incrementComparisonCount,
  getRemainingComparisons,
};
