const express = require('express');
const router = express.Router();
const { requireAuth } = require('~/server/middleware'); // Universal auth (Supabase or Passport)
const { getCategories } = require('~/models/Categories');

router.get('/', requireAuth, async (req, res) => {
  try {
    const categories = await getCategories();
    res.status(200).send(categories);
  } catch (error) {
    res.status(500).send({ message: 'Failed to retrieve categories', error: error.message });
  }
});

module.exports = router;
