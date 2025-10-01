const express = require('express');
const { getAvailablePluginsController } = require('~/server/controllers/PluginController');
const { requireAuth } = require('~/server/middleware');

const router = express.Router();

router.get('/', requireAuth, getAvailablePluginsController);

module.exports = router;
