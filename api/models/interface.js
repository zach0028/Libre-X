const { logger } = require('@librechat/data-schemas');
const { updateInterfacePermissions: updateInterfacePerms } = require('@librechat/api');
const { getRoleByName, updateAccessPermissions } = require('./Role');

/**
 * Update interface permissions based on app configuration.
 * Must be done independently from loading the app config.
 * @param {AppConfig} appConfig
 */
async function updateInterfacePermissions(appConfig) {
  const DB_MODE = process.env.DB_MODE || 'mongodb';

  // Skip MongoDB-based permission updates in Supabase mode
  if (DB_MODE === 'supabase') {
    logger.info('🔵 [Supabase Mode] Skipping MongoDB interface permissions update');
    return;
  }

  try {
    await updateInterfacePerms({
      appConfig,
      getRoleByName,
      updateAccessPermissions,
    });
  } catch (error) {
    logger.error('Error updating interface permissions:', error);
  }
}

module.exports = {
  updateInterfacePermissions,
};
