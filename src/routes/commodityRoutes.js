const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Placeholder routes - will be implemented in later tasks
router.get(
  '/search',
  asyncHandler(async (req, res) => {
    res.json({ message: 'Commodity search endpoint - to be implemented' });
  })
);

router.post(
  '/process-input',
  asyncHandler(async (req, res) => {
    res.json({ message: 'Commodity input processing endpoint - to be implemented' });
  })
);

module.exports = router;
