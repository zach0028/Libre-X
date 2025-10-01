const { logger } = require('@librechat/data-schemas');
const { mergeAppTools, getAppConfig } = require('./Config');
const { createMCPManager } = require('~/config');

/**
 * Initialize MCP servers
 */
async function initializeMCPs() {
  const DB_MODE = process.env.DB_MODE || 'mongodb';

  // Skip MCP initialization in Supabase mode (requires MongoDB Project collection)
  if (DB_MODE === 'supabase') {
    logger.info('🔵 [Supabase Mode] Skipping MCP server initialization');
    return;
  }

  const appConfig = await getAppConfig();
  const mcpServers = appConfig.mcpConfig;
  if (!mcpServers) {
    return;
  }

  const mcpManager = await createMCPManager(mcpServers);

  try {
    const mcpTools = mcpManager.getAppToolFunctions() || {};
    await mergeAppTools(mcpTools);

    logger.info(
      `MCP servers initialized successfully. Added ${Object.keys(mcpTools).length} MCP tools.`,
    );
  } catch (error) {
    logger.error('Failed to initialize MCP servers:', error);
  }
}

module.exports = initializeMCPs;
