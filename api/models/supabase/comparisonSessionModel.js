/**
 * Comparison Session Model - Supabase Wrapper
 * Replaces Conversation model for AI comparison & scoring use case
 *
 * Original: api/models/Conversation.js
 * Migration: MongoDB Conversations → Supabase ComparisonSessions
 */

const { logger } = require('@librechat/data-schemas');
const { supabaseAdmin } = require('../../db/supabase');
const { ComparisonSessionsAdapter } = require('../../db/supabaseAdapter');
const { deleteMessages } = require('../Message'); // Keep for now during migration

/**
 * Search for a comparison session by ID
 * @param {String} sessionId - Session UUID
 * @returns {Promise<Object|null>}
 */
const searchSession = async (sessionId) => {
  try {
    return await ComparisonSessionsAdapter.findById(sessionId, 'id,user_id');
  } catch (error) {
    logger.error('[searchSession] Error searching comparison session', error);
    throw new Error('Error searching comparison session');
  }
};

/**
 * Get single comparison session for user
 * @param {String} userId - User UUID
 * @param {String} sessionId - Session UUID
 * @returns {Promise<Object|null>}
 */
const getSession = async (userId, sessionId) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('comparison_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    logger.error('[getSession] Error getting comparison session', error);
    return { message: 'Error getting comparison session' };
  }
};

/**
 * Get session files (for file attachments)
 * @param {String} sessionId - Session UUID
 * @returns {Promise<Array>}
 */
const getSessionFiles = async (sessionId) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('comparison_sessions')
      .select('file_ids')
      .eq('id', sessionId)
      .single();

    if (error) throw error;
    return data?.file_ids || [];
  } catch (error) {
    logger.error('[getSessionFiles] Error getting session files', error);
    throw new Error('Error getting session files');
  }
};

/**
 * Save/update comparison session (MongoDB-compatible interface)
 * @param {Object} req - Request object with user info
 * @param {Object} sessionData - Session data
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<Object>}
 */
const saveSession = async (req, { sessionId, newSessionId, ...sessionData }, metadata) => {
  try {
    if (metadata?.context) {
      logger.debug(`[saveSession] ${metadata.context}`);
    }

    const userId = req.user.id;

    // Prepare update data
    const update = {
      user_id: userId,
      title: sessionData.title,
      prompt: sessionData.prompt || {},
      models: sessionData.models || [],
      responses: sessionData.responses || [],
      winner: sessionData.winner || null,
      scoring_template_id: sessionData.scoringTemplateId || null,
      scores: sessionData.scores || {},
      file_ids: sessionData.fileIds || [],
      metadata: {
        ...sessionData.metadata,
        endpoint: sessionData.endpoint,
        model: sessionData.model,
        isPublic: sessionData.metadata?.isPublic || false,
        tags: sessionData.metadata?.tags || [],
        category: sessionData.metadata?.category || 'general',
      },
      is_archived: sessionData.isArchived || false,
    };

    // Handle temporary chats (expired_at)
    if (req?.body?.isTemporary) {
      const expirationHours = req.config?.interfaceConfig?.temporaryChatRetention || 24;
      const expirationDate = new Date();
      expirationDate.setHours(expirationDate.getHours() + expirationHours);
      update.expired_at = expirationDate.toISOString();
    } else {
      update.expired_at = null;
    }

    // Upsert session
    const targetSessionId = newSessionId || sessionId;

    let session;
    if (targetSessionId) {
      // Update existing
      session = await ComparisonSessionsAdapter.findByIdAndUpdate(
        targetSessionId,
        update,
        { upsert: true }
      );
    } else {
      // Create new
      session = await ComparisonSessionsAdapter.create(update);
    }

    // Increment user's comparison count if new session
    if (!sessionId && session.id) {
      await supabaseAdmin.rpc('increment_comparison_count', { p_user_id: userId });
    }

    return {
      ...session,
      conversationId: session.id, // MongoDB compatibility
      user: session.user_id,
    };
  } catch (error) {
    logger.error('[saveSession] Error saving comparison session', error);
    if (metadata?.context) {
      logger.info(`[saveSession] ${metadata.context}`);
    }
    return { message: 'Error saving comparison session' };
  }
};

/**
 * Bulk save comparison sessions
 * @param {Array} sessions - Array of session objects
 * @returns {Promise<Object>}
 */
const bulkSaveSessions = async (sessions) => {
  try {
    const preparedSessions = sessions.map((session) => ({
      id: session.sessionId || session.id,
      user_id: session.user || session.user_id,
      title: session.title,
      prompt: session.prompt || {},
      models: session.models || [],
      responses: session.responses || [],
      winner: session.winner || null,
      metadata: session.metadata || {},
      is_archived: session.isArchived || false,
    }));

    const { data, error } = await supabaseAdmin
      .from('comparison_sessions')
      .upsert(preparedSessions, { onConflict: 'id' });

    if (error) throw error;

    return {
      modifiedCount: data?.length || 0,
      upsertedCount: data?.length || 0,
    };
  } catch (error) {
    logger.error('[bulkSaveSessions] Error bulk saving sessions', error);
    throw new Error('Failed to save sessions in bulk.');
  }
};

/**
 * Get sessions with cursor pagination
 * @param {String} userId - User UUID
 * @param {Object} options - Query options
 * @returns {Promise<Object>}
 */
const getSessionsByCursor = async (
  userId,
  { cursor, limit = 25, isArchived = false, tags, search, order = 'desc' } = {}
) => {
  try {
    let query = supabaseAdmin
      .from('comparison_sessions')
      .select('id,title,prompt,models,winner,metadata,created_at,updated_at,user_id')
      .eq('user_id', userId)
      .is('expired_at', null);

    // Archive filter
    query = isArchived
      ? query.eq('is_archived', true)
      : query.or('is_archived.is.false,is_archived.is.null');

    // Tags filter
    if (Array.isArray(tags) && tags.length > 0) {
      query = query.contains('metadata->tags', tags);
    }

    // Cursor pagination
    if (cursor) {
      const cursorDate = new Date(cursor).toISOString();
      query = order === 'asc'
        ? query.gt('updated_at', cursorDate)
        : query.lt('updated_at', cursorDate);
    }

    // Search (basic text search - can be enhanced with PostgreSQL full-text search)
    if (search) {
      query = query.or(`title.ilike.%${search}%,metadata->category.ilike.%${search}%`);
    }

    // Sort and limit
    query = query
      .order('updated_at', { ascending: order === 'asc' })
      .limit(limit + 1);

    const { data, error } = await query;
    if (error) throw error;

    let nextCursor = null;
    if (data.length > limit) {
      const lastSession = data.pop();
      nextCursor = lastSession.updated_at;
    }

    // Transform to MongoDB-compatible format
    const sessions = data.map((session) => ({
      conversationId: session.id,
      title: session.title,
      endpoint: session.metadata?.endpoint || 'comparison',
      model: session.models?.[0] || 'multi-model',
      createdAt: session.created_at,
      updatedAt: session.updated_at,
      user: session.user_id,
    }));

    return { conversations: sessions, nextCursor };
  } catch (error) {
    logger.error('[getSessionsByCursor] Error getting sessions', error);
    return { message: 'Error getting comparison sessions' };
  }
};

/**
 * Get sessions by IDs (for batch operations)
 * @param {String} userId - User UUID
 * @param {Array} sessionIds - Array of session IDs
 * @param {String} cursor - Pagination cursor
 * @param {Number} limit - Results limit
 * @returns {Promise<Object>}
 */
const getSessionsQueried = async (userId, sessionIds, cursor = null, limit = 25) => {
  try {
    if (!sessionIds?.length) {
      return { conversations: [], nextCursor: null, convoMap: {} };
    }

    const ids = sessionIds.map((s) => s.sessionId || s.id || s);

    let query = supabaseAdmin
      .from('comparison_sessions')
      .select('*')
      .eq('user_id', userId)
      .in('id', ids)
      .is('expired_at', null);

    if (cursor && cursor !== 'start') {
      query = query.lt('updated_at', new Date(cursor).toISOString());
    }

    query = query.order('updated_at', { ascending: false }).limit(limit + 1);

    const { data, error } = await query;
    if (error) throw error;

    let nextCursor = null;
    if (data.length > limit) {
      const lastSession = data.pop();
      nextCursor = lastSession.updated_at;
    }

    const sessionMap = {};
    data.forEach((session) => {
      sessionMap[session.id] = {
        ...session,
        conversationId: session.id,
        user: session.user_id,
      };
    });

    return {
      conversations: data,
      nextCursor,
      convoMap: sessionMap,
    };
  } catch (error) {
    logger.error('[getSessionsQueried] Error getting queried sessions', error);
    return { message: 'Error fetching comparison sessions' };
  }
};

/**
 * Get session title
 * @param {String} userId - User UUID
 * @param {String} sessionId - Session UUID
 * @returns {Promise<String>}
 */
const getSessionTitle = async (userId, sessionId) => {
  try {
    const session = await getSession(userId, sessionId);
    if (session && !session.title) {
      return null;
    }
    return session?.title || 'New Comparison';
  } catch (error) {
    logger.error('[getSessionTitle] Error getting session title', error);
    return { message: 'Error getting session title' };
  }
};

/**
 * Delete sessions and associated data
 * @param {String} userId - User UUID
 * @param {Object} filter - Delete filters
 * @returns {Promise<Object>}
 */
const deleteSessions = async (userId, filter) => {
  try {
    const userFilter = { ...filter, user_id: userId };

    // Find sessions to delete
    const sessions = await ComparisonSessionsAdapter.find(userFilter, { select: 'id' });
    const sessionIds = sessions.map((s) => s.id);

    if (!sessionIds.length) {
      throw new Error('Session not found or already deleted.');
    }

    // Delete sessions (CASCADE will delete related data)
    const { data: deletedSessions, error } = await supabaseAdmin
      .from('comparison_sessions')
      .delete()
      .in('id', sessionIds)
      .eq('user_id', userId);

    if (error) throw error;

    // For backward compatibility, also delete old messages if they exist
    // TODO: Remove this after full migration
    const deleteMessagesResult = await deleteMessages({
      conversationId: { $in: sessionIds },
    }).catch(() => ({ deletedCount: 0 }));

    return {
      deletedCount: sessionIds.length,
      messages: deleteMessagesResult,
    };
  } catch (error) {
    logger.error('[deleteSessions] Error deleting sessions', error);
    throw error;
  }
};

/**
 * Delete null or empty sessions (cleanup utility)
 * @returns {Promise<Object>}
 */
const deleteNullOrEmptySessions = async () => {
  try {
    const { data, error } = await supabaseAdmin
      .from('comparison_sessions')
      .delete()
      .or('id.is.null,title.is.null,user_id.is.null');

    if (error) throw error;

    logger.info(`[deleteNullOrEmptySessions] Deleted ${data?.length || 0} invalid sessions`);

    return {
      conversations: { deletedCount: data?.length || 0 },
      messages: { deletedCount: 0 },
    };
  } catch (error) {
    logger.error('[deleteNullOrEmptySessions] Error deleting invalid sessions', error);
    throw new Error('Error deleting invalid sessions');
  }
};

// Export MongoDB-compatible interface
module.exports = {
  // Core operations
  searchConversation: searchSession, // Alias for compatibility
  searchSession,
  getConvo: getSession, // Alias
  getSession,
  saveConvo: saveSession, // Alias
  saveSession,
  bulkSaveConvos: bulkSaveSessions, // Alias
  bulkSaveSessions,

  // Query operations
  getConvosByCursor: getSessionsByCursor, // Alias
  getSessionsByCursor,
  getConvosQueried: getSessionsQueried, // Alias
  getSessionsQueried,
  getConvoTitle: getSessionTitle, // Alias
  getSessionTitle,

  // File operations
  getConvoFiles: getSessionFiles, // Alias
  getSessionFiles,

  // Delete operations
  deleteConvos: deleteSessions, // Alias
  deleteSessions,
  deleteNullOrEmptyConversations: deleteNullOrEmptySessions, // Alias
  deleteNullOrEmptySessions,
};
