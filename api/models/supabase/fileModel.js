/**
 * File Model - Supabase Implementation
 * Replaces MongoDB File model
 *
 * Original: api/models/File.js
 * Migration: MongoDB files → Supabase files table
 */

const { logger } = require('@librechat/data-schemas');
const { supabaseAdmin } = require('../../db/supabase');

/**
 * Finds a file by its file_id
 * @param {string} file_id - The unique identifier of the file
 * @param {object} options - Query options (ignored for Supabase, kept for compatibility)
 * @returns {Promise<Object|null>}
 */
const findFileById = async (file_id, options = {}) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('files')
      .select('*')
      .eq('file_id', file_id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      throw error;
    }

    return data;
  } catch (error) {
    logger.error('[findFileById] Error finding file:', error);
    return null;
  }
};

/**
 * Retrieves files matching a given filter, sorted by most recently updated
 * @param {Object} filter - The filter criteria
 * @param {Object} [sortOptions] - Optional sort parameters (ignored, always sorts by updatedAt)
 * @param {Object|String} [selectFields] - Fields to include/exclude (not implemented for Supabase)
 * @returns {Promise<Array<Object>>}
 */
const getFiles = async (filter, sortOptions, selectFields) => {
  try {
    let query = supabaseAdmin.from('files').select('*');

    // Apply filters
    if (filter.user_id) {
      query = query.eq('user_id', filter.user_id);
    }
    if (filter.file_id) {
      if (Array.isArray(filter.file_id)) {
        query = query.in('file_id', filter.file_id);
      } else {
        query = query.eq('file_id', filter.file_id);
      }
    }
    if (filter.type) {
      query = query.eq('type', filter.type);
    }
    if (filter.context) {
      query = query.eq('metadata->>context', filter.context);
    }

    // Sort by updated_at descending
    query = query.order('updated_at', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    logger.error('[getFiles] Error retrieving files:', error);
    return [];
  }
};

/**
 * Retrieves tool files (files that are embedded or have a fileIdentifier)
 * @param {string[]} fileIds - Array of file_id strings
 * @param {Set} toolResourceSet - Optional filter for tool resources
 * @returns {Promise<Array<Object>>}
 */
const getToolFilesByIds = async (fileIds, toolResourceSet) => {
  if (!fileIds || !fileIds.length) {
    return [];
  }

  try {
    let query = supabaseAdmin
      .from('files')
      .select('*')
      .in('file_id', fileIds);

    // Apply tool resource filters if provided
    if (toolResourceSet && toolResourceSet.size > 0) {
      // Note: This is simplified - adjust based on your actual metadata structure
      query = query.or(
        `metadata->>embedded.eq.true,metadata->>fileIdentifier.not.is.null`,
      );
    }

    query = query.order('updated_at', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    logger.error('[getToolFilesByIds] Error retrieving tool files:', error);
    throw new Error('Error retrieving tool files');
  }
};

/**
 * Creates a new file with optional TTL
 * @param {Object} data - The file data to be created
 * @param {boolean} disableTTL - Whether to disable the TTL
 * @returns {Promise<Object>}
 */
const createFile = async (data, disableTTL) => {
  try {
    const fileData = {
      user_id: data.user,
      file_id: data.file_id,
      filename: data.filename || data.file_id,
      filepath: data.filepath || '',
      type: data.type,
      bytes: data.bytes || data.size,
      width: data.width,
      height: data.height,
      source: data.source,
      storage_provider: data.source || 'local',
      metadata: {
        embedded: data.embedded,
        model: data.model,
        context: data.context,
        fileIdentifier: data.fileIdentifier,
        temp_file_id: data.temp_file_id,
      },
      usage_count: 0,
      expires_at: disableTTL ? null : new Date(Date.now() + 3600 * 1000).toISOString(),
    };

    // Upsert: insert or update if file_id exists
    const { data: result, error } = await supabaseAdmin
      .from('files')
      .upsert(fileData, { onConflict: 'file_id' })
      .select()
      .single();

    if (error) throw error;
    return result;
  } catch (error) {
    logger.error('[createFile] Error creating file:', error);
    throw new Error('Error creating file');
  }
};

/**
 * Updates a file and removes the TTL
 * @param {Object} data - The data to update
 * @returns {Promise<Object>}
 */
const updateFile = async (data) => {
  try {
    const { file_id, ...updateData } = data;

    const update = {
      ...(updateData.filename && { filename: updateData.filename }),
      ...(updateData.filepath && { filepath: updateData.filepath }),
      ...(updateData.type && { type: updateData.type }),
      ...(updateData.bytes && { bytes: updateData.bytes }),
      ...(updateData.source && { storage_provider: updateData.source }),
      expires_at: null, // Remove TTL
      updated_at: new Date().toISOString(),
    };

    // Merge metadata if provided
    if (updateData.embedded !== undefined || updateData.model || updateData.context) {
      const { data: existing } = await supabaseAdmin
        .from('files')
        .select('metadata')
        .eq('file_id', file_id)
        .single();

      update.metadata = {
        ...(existing?.metadata || {}),
        ...(updateData.embedded !== undefined && { embedded: updateData.embedded }),
        ...(updateData.model && { model: updateData.model }),
        ...(updateData.context && { context: updateData.context }),
      };
    }

    const { data: result, error } = await supabaseAdmin
      .from('files')
      .update(update)
      .eq('file_id', file_id)
      .select()
      .single();

    if (error) throw error;
    return result;
  } catch (error) {
    logger.error('[updateFile] Error updating file:', error);
    throw new Error('Error updating file');
  }
};

/**
 * Increments the usage of a file
 * @param {Object} data - Must contain file_id and optional inc value
 * @returns {Promise<Object>}
 */
const updateFileUsage = async (data) => {
  try {
    const { file_id, inc = 1 } = data;

    // Get current usage
    const { data: file } = await supabaseAdmin
      .from('files')
      .select('usage_count')
      .eq('file_id', file_id)
      .single();

    const newUsage = (file?.usage_count || 0) + inc;

    const { data: result, error } = await supabaseAdmin
      .from('files')
      .update({
        usage_count: newUsage,
        expires_at: null, // Remove TTL
        updated_at: new Date().toISOString(),
      })
      .eq('file_id', file_id)
      .select()
      .single();

    if (error) throw error;

    // Also remove temp_file_id from metadata if it exists
    if (result?.metadata?.temp_file_id) {
      const updatedMetadata = { ...result.metadata };
      delete updatedMetadata.temp_file_id;
      
      await supabaseAdmin
        .from('files')
        .update({ metadata: updatedMetadata })
        .eq('file_id', file_id);
    }

    return result;
  } catch (error) {
    logger.error('[updateFileUsage] Error updating file usage:', error);
    throw new Error('Error updating file usage');
  }
};

/**
 * Deletes a file by file_id
 * @param {string} file_id - The unique identifier of the file
 * @returns {Promise<Object>}
 */
const deleteFile = async (file_id) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('files')
      .delete()
      .eq('file_id', file_id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    logger.error('[deleteFile] Error deleting file:', error);
    return null;
  }
};

/**
 * Deletes a file by filter
 * @param {object} filter - The filter criteria
 * @returns {Promise<Object>}
 */
const deleteFileByFilter = async (filter) => {
  try {
    let query = supabaseAdmin.from('files').delete();

    if (filter.file_id) {
      query = query.eq('file_id', filter.file_id);
    }
    if (filter.user_id) {
      query = query.eq('user_id', filter.user_id);
    }

    const { data, error } = await query.select().single();

    if (error) throw error;
    return data;
  } catch (error) {
    logger.error('[deleteFileByFilter] Error deleting file:', error);
    return null;
  }
};

/**
 * Deletes multiple files by file_ids or user
 * @param {Array<string>} file_ids - The unique identifiers of files to delete
 * @param {string} user - Optional user_id to delete all files for a user
 * @returns {Promise<Object>}
 */
const deleteFiles = async (file_ids, user) => {
  try {
    let query = supabaseAdmin.from('files').delete();

    if (user) {
      query = query.eq('user_id', user);
    } else if (file_ids && file_ids.length > 0) {
      query = query.in('file_id', file_ids);
    } else {
      throw new Error('Must provide either file_ids or user');
    }

    const { data, error, count } = await query.select();

    if (error) throw error;

    return { deletedCount: data?.length || count || 0 };
  } catch (error) {
    logger.error('[deleteFiles] Error deleting files:', error);
    return { deletedCount: 0 };
  }
};

/**
 * Batch updates files with new signed URLs
 * @param {Array} updates - Array of updates in format { file_id, filepath }
 * @returns {Promise<void>}
 */
async function batchUpdateFiles(updates) {
  if (!updates || updates.length === 0) {
    return;
  }

  try {
    // Supabase doesn't have bulkWrite, so we do individual updates
    // For better performance, we could use Promise.all
    const promises = updates.map((update) =>
      supabaseAdmin
        .from('files')
        .update({
          filepath: update.filepath,
          storage_url: update.filepath,
          updated_at: new Date().toISOString(),
        })
        .eq('file_id', update.file_id),
    );

    const results = await Promise.all(promises);
    
    const successCount = results.filter((r) => !r.error).length;
    logger.info(`Updated ${successCount}/${updates.length} files with new URLs`);
  } catch (error) {
    logger.error('[batchUpdateFiles] Error batch updating files:', error);
    throw error;
  }
}

module.exports = {
  findFileById,
  getFiles,
  getToolFilesByIds,
  createFile,
  updateFile,
  updateFileUsage,
  deleteFile,
  deleteFiles,
  deleteFileByFilter,
  batchUpdateFiles,
};


