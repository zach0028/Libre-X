const express = require('express');

const { getBanner } = require('~/models/Banner');
const { optionalAuth } = require('~/server/middleware/authMiddleware');
const router = express.Router();

router.get('/', optionalAuth, async (req, res) => {
  try {
    res.status(200).send(await getBanner(req.user));
  } catch (error) {
    res.status(500).json({ message: 'Error getting banner' });
  }
});

module.exports = router;
