/**
 * Scoring Template Model - Supabase Implementation
 * Replaces MongoDB Preset model (migrated to scoring templates)
 *
 * Original: api/models/Preset.js
 * Migration: MongoDB presets → Supabase scoring_templates table
 *
 * Note: "Preset" in MongoDB is now "ScoringTemplate" in Supabase
 * to better reflect the AI comparison & scoring use case
 */

const { logger } = require('@librechat/data-schemas');
const { supabaseAdmin } = require('../../db/supabase');

/**
 * Get a single scoring template
 * @param {string} userId - User UUID
 * @param {string} templateId - Template UUID or preset_id (for backward compatibility)
 * @returns {Promise<Object|null>}
 */
const getTemplate = async (userId, templateId) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('scoring_templates')
      .select('*')
      .eq('user_id', userId)
      .or(`id.eq.${templateId},preset_id.eq.${templateId}`)
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
    logger.error('[getTemplate] Error getting template:', error);
    return { message: 'Error getting template' };
  }
};

/**
 * Get all scoring templates for a user
 * @param {string} userId - User UUID
 * @param {Object} filter - Additional filters
 * @returns {Promise<Array>}
 */
const getTemplates = async (userId, filter = {}) => {
  try {
    let query = supabaseAdmin
      .from('scoring_templates')
      .select('*')
      .eq('user_id', userId);

    // Apply filters
    if (filter.category) {
      query = query.eq('category', filter.category);
    }
    if (filter.is_public !== undefined) {
      query = query.eq('is_public', filter.is_public);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Sort by order and updatedAt (mimicking MongoDB behavior)
    const templates = data || [];
    const defaultValue = 10000;

    templates.sort((a, b) => {
      let orderA = a.order !== undefined ? a.order : defaultValue;
      let orderB = b.order !== undefined ? b.order : defaultValue;

      if (orderA !== orderB) {
        return orderA - orderB;
      }

      return new Date(b.updated_at) - new Date(a.updated_at);
    });

    return templates;
  } catch (error) {
    logger.error('[getTemplates] Error getting templates:', error);
    return { message: 'Error retrieving templates' };
  }
};

/**
 * Save (create or update) a scoring template
 * @param {string} userId - User UUID
 * @param {Object} templateData - Template data
 * @returns {Promise<Object>}
 */
const saveTemplate = async (userId, templateData) => {
  try {
    const {
      presetId,
      templateId,
      newPresetId,
      defaultPreset,
      user: _,
      ...template
    } = templateData;

    // Determine the ID to use
    const idToUse = templateId || presetId;

    // Prepare update data
    const updateData = {
      user_id: userId,
      preset_id: newPresetId || idToUse, // Keep preset_id for backward compatibility
      name: template.name || template.title || 'Untitled Template',
      description: template.description,
      criteria: template.criteria || template.tools || [],
      category: template.category || template.endpoint || 'general',
      is_public: template.is_public || false,
      order: template.order,
      metadata: {
        // Store additional preset data in metadata for backward compatibility
        model: template.model,
        chatGptLabel: template.chatGptLabel,
        promptPrefix: template.promptPrefix,
        temperature: template.temperature,
        top_p: template.top_p,
        top_k: template.top_k,
        frequency_penalty: template.frequency_penalty,
        presence_penalty: template.presence_penalty,
        resendFiles: template.resendFiles,
        imageDetail: template.imageDetail,
        iconURL: template.iconURL,
        greeting: template.greeting,
        spec: template.spec,
        maxContextTokens: template.maxContextTokens,
        max_tokens: template.max_tokens,
      },
    };

    // Handle default template
    if (defaultPreset) {
      updateData.is_default = true;
      updateData.order = 0;

      // Unset other default templates
      await supabaseAdmin
        .from('scoring_templates')
        .update({ is_default: false, order: null })
        .eq('user_id', userId)
        .eq('is_default', true)
        .neq('preset_id', idToUse);
    } else if (defaultPreset === false) {
      updateData.is_default = false;
      updateData.order = null;
    }

    // Upsert (insert or update)
    let result;
    if (idToUse) {
      // Try to update existing
      const { data: existing } = await supabaseAdmin
        .from('scoring_templates')
        .select('id')
        .eq('user_id', userId)
        .or(`id.eq.${idToUse},preset_id.eq.${idToUse}`)
        .single();

      if (existing) {
        // Update existing
        const { data, error } = await supabaseAdmin
          .from('scoring_templates')
          .update(updateData)
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        result = data;
      } else {
        // Create new with specific preset_id
        const { data, error } = await supabaseAdmin
          .from('scoring_templates')
          .insert(updateData)
          .select()
          .single();

        if (error) throw error;
        result = data;
      }
    } else {
      // Create new
      const { data, error } = await supabaseAdmin
        .from('scoring_templates')
        .insert(updateData)
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    return result;
  } catch (error) {
    logger.error('[saveTemplate] Error saving template:', error);
    return { message: 'Error saving template' };
  }
};

/**
 * Delete scoring templates
 * @param {string} userId - User UUID
 * @param {Object} filter - Filter criteria
 * @returns {Promise<Object>}
 */
const deleteTemplates = async (userId, filter = {}) => {
  try {
    let query = supabaseAdmin
      .from('scoring_templates')
      .delete()
      .eq('user_id', userId);

    // Apply filters
    if (filter.id) {
      query = query.eq('id', filter.id);
    }
    if (filter.preset_id || filter.presetId) {
      query = query.eq('preset_id', filter.preset_id || filter.presetId);
    }
    if (filter.category) {
      query = query.eq('category', filter.category);
    }

    const { data, error, count } = await query.select();

    if (error) throw error;

    return {
      deletedCount: data?.length || count || 0,
    };
  } catch (error) {
    logger.error('[deleteTemplates] Error deleting templates:', error);
    return { deletedCount: 0 };
  }
};

/**
 * Get public scoring templates (for sharing/marketplace)
 * @param {Object} filter - Filter criteria
 * @param {number} limit - Max results
 * @returns {Promise<Array>}
 */
const getPublicTemplates = async (filter = {}, limit = 50) => {
  try {
    let query = supabaseAdmin
      .from('scoring_templates')
      .select('id, name, description, criteria, category, usage_count, created_at')
      .eq('is_public', true);

    if (filter.category) {
      query = query.eq('category', filter.category);
    }

    query = query.order('usage_count', { ascending: false }).limit(limit);

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    logger.error('[getPublicTemplates] Error getting public templates:', error);
    return [];
  }
};

/**
 * Increment usage count for a template
 * @param {string} templateId - Template UUID
 * @returns {Promise<void>}
 */
const incrementUsage = async (templateId) => {
  try {
    const { data: template } = await supabaseAdmin
      .from('scoring_templates')
      .select('usage_count')
      .eq('id', templateId)
      .single();

    const newCount = (template?.usage_count || 0) + 1;

    await supabaseAdmin
      .from('scoring_templates')
      .update({ usage_count: newCount })
      .eq('id', templateId);
  } catch (error) {
    logger.error('[incrementUsage] Error incrementing usage:', error);
  }
};

// Export with both naming conventions for backward compatibility
module.exports = {
  // New naming (ScoringTemplate)
  getTemplate,
  getTemplates,
  saveTemplate,
  deleteTemplates,
  getPublicTemplates,
  incrementUsage,

  // Legacy naming (Preset) - for backward compatibility
  getPreset: getTemplate,
  getPresets: getTemplates,
  savePreset: saveTemplate,
  deletePresets: deleteTemplates,
};

