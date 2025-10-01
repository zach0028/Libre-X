/**
 * Supabase Client for Backend (Server-Side)
 *
 * Uses SERVICE_ROLE key for full database access
 * Bypasses Row Level Security for admin operations
 */

const { createClient } = require('@supabase/supabase-js');
const { logger } = require('@librechat/data-schemas');

// Check environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL) {
  throw new Error('Missing environment variable: SUPABASE_URL');
}

if (!SUPABASE_SERVICE_KEY) {
  throw new Error('Missing environment variable: SUPABASE_SERVICE_KEY');
}

/**
 * Supabase Client with Service Role
 * - Full access to database
 * - Bypasses RLS
 * - Used for backend operations only
 */
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
  db: {
    schema: 'public',
  },
});

/**
 * Test connection to Supabase
 */
async function testSupabaseConnection() {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('count')
      .limit(1);

    if (error) {
      logger.error('[Supabase] Connection test failed:', error);
      return false;
    }

    logger.info('[Supabase] ✅ Connection successful');
    return true;
  } catch (err) {
    logger.error('[Supabase] Connection error:', err);
    return false;
  }
}

/**
 * Helper to handle Supabase errors uniformly
 */
function handleSupabaseError(error, context = '') {
  if (!error) return null;

  logger.error(`[Supabase Error] ${context}:`, {
    message: error.message,
    code: error.code,
    details: error.details,
    hint: error.hint,
  });

  // Map Supabase errors to common error codes
  const errorMap = {
    '23505': 'DUPLICATE_KEY', // Unique violation
    '23503': 'FOREIGN_KEY', // Foreign key violation
    '42501': 'PERMISSION_DENIED', // Insufficient privilege
    'PGRST116': 'NOT_FOUND', // Row not found
  };

  const mappedCode = errorMap[error.code] || 'DATABASE_ERROR';

  return {
    code: mappedCode,
    message: error.message,
    details: error.details,
  };
}

/**
 * Execute query with error handling
 */
async function executeQuery(queryFn, context = '') {
  try {
    const { data, error } = await queryFn();

    if (error) {
      const handledError = handleSupabaseError(error, context);
      throw new Error(handledError.message);
    }

    return data;
  } catch (err) {
    logger.error(`[Supabase Query Error] ${context}:`, err);
    throw err;
  }
}

/**
 * Get user by auth ID
 */
async function getUserProfile(userId) {
  return executeQuery(
    () => supabaseAdmin.from('profiles').select('*').eq('id', userId).single(),
    `getUserProfile(${userId})`,
  );
}

/**
 * Create or update user profile
 */
async function upsertUserProfile(userId, profileData) {
  return executeQuery(
    () =>
      supabaseAdmin
        .from('profiles')
        .upsert(
          {
            id: userId,
            ...profileData,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'id',
          },
        )
        .select()
        .single(),
    `upsertUserProfile(${userId})`,
  );
}

/**
 * Increment user's comparison count
 */
async function incrementComparisonCount(userId) {
  return executeQuery(
    () => supabaseAdmin.rpc('increment_comparison_count', { p_user_id: userId }),
    `incrementComparisonCount(${userId})`,
  );
}

/**
 * Get remaining comparisons for user
 */
async function getRemainingComparisons(userId) {
  return executeQuery(
    () => supabaseAdmin.rpc('get_remaining_comparisons', { p_user_id: userId }),
    `getRemainingComparisons(${userId})`,
  );
}

/**
 * Global cache for connection status
 */
let cachedConnection = { conn: null, promise: null };

/**
 * Connect to Supabase (idempotent)
 */
async function connectSupabase() {
  if (cachedConnection.conn) {
    logger.info('[Supabase] Using cached connection');
    return cachedConnection.conn;
  }

  if (!cachedConnection.promise) {
    logger.info('[Supabase] Establishing new connection...');
    cachedConnection.promise = testSupabaseConnection().then((success) => {
      if (success) {
        logger.info('[Supabase] ✅ Connected successfully');
        cachedConnection.conn = supabaseAdmin;
        return supabaseAdmin;
      } else {
        throw new Error('Failed to connect to Supabase');
      }
    });
  }

  return cachedConnection.promise;
}

module.exports = {
  supabase: supabaseAdmin,
  connectSupabase,
  testSupabaseConnection,
  handleSupabaseError,
  executeQuery,

  // User helpers
  getUserProfile,
  upsertUserProfile,
  incrementComparisonCount,
  getRemainingComparisons,
};
