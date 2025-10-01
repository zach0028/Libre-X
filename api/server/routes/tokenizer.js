const express = require('express');
const router = express.Router();
const requireAuth = require('~/server/middleware/authMiddleware'); // Universal auth
const { countTokens } = require('~/server/utils');
const { logger } = require('~/config');

router.post('/', requireAuth, async (req, res) => {
  try {
    const { arg } = req.body;
    const count = await countTokens(arg?.text ?? arg);
    res.send({ count });
  } catch (e) {
    logger.error('[/tokenizer] Error counting tokens', e);
    res.status(500).json('Error counting tokens');
  }
});

module.exports = router;
