/**
 * Database Router / Abstraction Layer
 *
 * Routes database operations to either MongoDB or Supabase based on DB_MODE environment variable
 * This allows gradual migration and easy toggling between databases
 *
 * Usage:
 *   const { getConvo, saveConvo, getMessage, saveMessage } = require('~/models/db-router');
 *   // Works with both MongoDB and Supabase automatically
 */

const DB_MODE = process.env.DB_MODE || 'mongodb';
const USE_SUPABASE = DB_MODE === 'supabase';

// Import MongoDB models (original)
const mongoModels = {
  Conversation: require('./Conversation'),
  Message: require('./Message'),
  File: require('./File'),
  Preset: require('./Preset'),
  // Add other models as needed
};

// Import Supabase models
const supabaseModels = USE_SUPABASE
  ? {
      user: require('./supabase/userModel'),
      comparisonSession: require('./supabase/comparisonSessionModel'),
      file: require('./supabase/fileModel'),
      transaction: require('./supabase/transactionModel'),
      scoringTemplate: require('./supabase/scoringTemplateModel'),
    }
  : {};

/**
 * Conversation / Comparison Session Methods
 * Maps MongoDB Conversation operations to Supabase comparison_sessions
 */
const getConvo = USE_SUPABASE
  ? async (userId, conversationId) => {
      const { getSession } = supabaseModels.comparisonSession;
      return await getSession(userId, conversationId);
    }
  : mongoModels.Conversation.getConvo;

const saveConvo = USE_SUPABASE
  ? async (req, sessionData, metadata) => {
      const { saveSession } = supabaseModels.comparisonSession;
      return await saveSession(req, sessionData, metadata);
    }
  : mongoModels.Conversation.saveConvo;

const getConvosByCursor = USE_SUPABASE
  ? async (userId, options) => {
      const { getSessionsByCursor } = supabaseModels.comparisonSession;
      return await getSessionsByCursor(userId, options);
    }
  : mongoModels.Conversation.getConvosByCursor;

const deleteConvos = USE_SUPABASE
  ? async (filter) => {
      const { deleteSessions } = supabaseModels.comparisonSession;
      return await deleteSessions(filter);
    }
  : mongoModels.Conversation.deleteConvos;

const getConvoTitle = USE_SUPABASE
  ? async (userId, conversationId) => {
      const session = await getConvo(userId, conversationId);
      return session?.title;
    }
  : mongoModels.Conversation.getConvoTitle;

const getConvosQueried = USE_SUPABASE
  ? async (userId, messages, cursor) => {
      // Implement Supabase version when needed
      console.warn('[db-router] getConvosQueried not yet implemented for Supabase');
      return { conversations: [], pageNumber: 1, pages: 1 };
    }
  : mongoModels.Conversation.getConvosQueried;

/**
 * Message Methods
 * Note: In Supabase, messages are embedded in comparison_sessions.responses[]
 * These methods provide MongoDB-compatible interface
 */
const getMessage = USE_SUPABASE
  ? async ({ user, messageId, conversationId }) => {
      const session = await getConvo(user, conversationId);
      if (!session) return null;
      return session.responses?.find((r) => r.responseId === messageId) || null;
    }
  : mongoModels.Message.getMessage;

const saveMessage = USE_SUPABASE
  ? async (req, messageData, metadata) => {
      // In Supabase, messages are part of the session
      // This would update the session's responses array
      console.warn('[db-router] saveMessage for Supabase should update session.responses');
      const { conversationId, messageId, text } = messageData;
      const session = await getConvo(req.user.id, conversationId);
      if (!session) {
        throw new Error('Session not found');
      }

      const responses = session.responses || [];
      const existingIndex = responses.findIndex((r) => r.responseId === messageId);

      const newResponse = {
        responseId: messageId,
        text,
        ...messageData,
      };

      if (existingIndex >= 0) {
        responses[existingIndex] = newResponse;
      } else {
        responses.push(newResponse);
      }

      return await saveConvo(req, { conversationId, responses }, metadata);
    }
  : mongoModels.Message.saveMessage;

const getMessages = USE_SUPABASE
  ? async (filter, select) => {
      const { conversationId, user } = filter;
      const session = await getConvo(user, conversationId);
      return session?.responses || [];
    }
  : mongoModels.Message.getMessages;

const deleteMessages = USE_SUPABASE
  ? async (filter) => {
      console.warn('[db-router] deleteMessages not fully implemented for Supabase');
      return { deletedCount: 0 };
    }
  : mongoModels.Message.deleteMessages;

const deleteMessagesSince = USE_SUPABASE
  ? async ({ conversationId, messageId, user }) => {
      console.warn('[db-router] deleteMessagesSince not fully implemented for Supabase');
      return { deletedCount: 0 };
    }
  : mongoModels.Message.deleteMessagesSince;

const updateMessage = USE_SUPABASE
  ? async (filter, update) => {
      console.warn('[db-router] updateMessage not fully implemented for Supabase');
      return null;
    }
  : mongoModels.Message.updateMessage;

const recordMessage = USE_SUPABASE
  ? async (messageData) => {
      console.warn('[db-router] recordMessage not fully implemented for Supabase');
      return null;
    }
  : mongoModels.Message.recordMessage;

/**
 * File Methods
 */
const findFileById = USE_SUPABASE
  ? supabaseModels.file.findFileById
  : mongoModels.File.findFileById;

const createFile = USE_SUPABASE
  ? supabaseModels.file.createFile
  : mongoModels.File.createFile;

const getFiles = USE_SUPABASE
  ? supabaseModels.file.getFiles
  : mongoModels.File.getFiles;

const deleteFile = USE_SUPABASE
  ? supabaseModels.file.deleteFile
  : mongoModels.File.deleteFile;

const deleteFiles = USE_SUPABASE
  ? supabaseModels.file.deleteFiles
  : mongoModels.File.deleteFiles;

const updateFile = USE_SUPABASE
  ? supabaseModels.file.updateFile
  : mongoModels.File.updateFile;

const updateFileUsage = USE_SUPABASE
  ? supabaseModels.file.updateFileUsage
  : mongoModels.File.updateFileUsage;

const getToolFilesByIds = USE_SUPABASE
  ? supabaseModels.file.getToolFilesByIds
  : mongoModels.File.getToolFilesByIds;

const batchUpdateFiles = USE_SUPABASE
  ? supabaseModels.file.batchUpdateFiles
  : mongoModels.File.batchUpdateFiles;

const deleteFileByFilter = USE_SUPABASE
  ? supabaseModels.file.deleteFileByFilter
  : mongoModels.File.deleteFileByFilter;

/**
 * Preset Methods (now ScoringTemplate in Supabase)
 */
const getPreset = USE_SUPABASE
  ? supabaseModels.scoringTemplate.getPreset
  : mongoModels.Preset.getPreset;

const getPresets = USE_SUPABASE
  ? supabaseModels.scoringTemplate.getPresets
  : mongoModels.Preset.getPresets;

const savePreset = USE_SUPABASE
  ? supabaseModels.scoringTemplate.savePreset
  : mongoModels.Preset.savePreset;

const deletePresets = USE_SUPABASE
  ? supabaseModels.scoringTemplate.deletePresets
  : mongoModels.Preset.deletePresets;

// Log which database mode is active
if (USE_SUPABASE) {
  console.log('🔵 [DB Router] Using SUPABASE database');
} else {
  console.log('🟢 [DB Router] Using MONGODB database');
}

module.exports = {
  // Conversation/Session methods
  getConvo,
  saveConvo,
  getConvosByCursor,
  deleteConvos,
  getConvoTitle,
  getConvosQueried,

  // Message methods
  getMessage,
  saveMessage,
  getMessages,
  deleteMessages,
  deleteMessagesSince,
  updateMessage,
  recordMessage,

  // File methods
  findFileById,
  createFile,
  getFiles,
  deleteFile,
  deleteFiles,
  updateFile,
  updateFileUsage,
  getToolFilesByIds,
  batchUpdateFiles,
  deleteFileByFilter,

  // Preset methods
  getPreset,
  getPresets,
  savePreset,
  deletePresets,

  // Metadata
  DB_MODE,
  USE_SUPABASE,
};
