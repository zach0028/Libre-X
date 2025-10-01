const express = require('express');
const router = express.Router();
const controller = require('../controllers/Balance');
const { requireJwtAuth } = require('../middleware/');

router.get('/', requireAuth, controller);

module.exports = router;
