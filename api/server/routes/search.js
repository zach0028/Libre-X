const express = require('express');
const { MeiliSearch } = require('meilisearch');
const requireAuth = require('~/server/middleware/authMiddleware'); // Universal auth
const { isEnabled } = require('~/server/utils');

const router = express.Router();

router.use(requireAuth); // Works with both Supabase and Passport

router.get('/enable', async function (req, res) {
  if (!isEnabled(process.env.SEARCH)) {
    return res.send(false);
  }

  try {
    const client = new MeiliSearch({
      host: process.env.MEILI_HOST,
      apiKey: process.env.MEILI_MASTER_KEY,
    });

    const { status } = await client.health();
    return res.send(status === 'available');
  } catch (error) {
    return res.send(false);
  }
});

module.exports = router;
