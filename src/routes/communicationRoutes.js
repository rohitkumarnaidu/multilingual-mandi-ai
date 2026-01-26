const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Placeholder routes - will be implemented in later tasks
router.post(
  '/session',
  asyncHandler(async (req, res) => {
    res.json({ message: 'Communication session endpoint - to be implemented' });
  })
);

router.post(
  '/message',
  asyncHandler(async (req, res) => {
    res.json({ message: 'Message handling endpoint - to be implemented' });
  })
);

module.exports = router;
