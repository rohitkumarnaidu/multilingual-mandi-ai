const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Placeholder routes - will be implemented in later tasks
router.get(
  '/range',
  asyncHandler(async (req, res) => {
    res.json({ message: 'Price range endpoint - to be implemented' });
  })
);

router.get(
  '/trends',
  asyncHandler(async (req, res) => {
    res.json({ message: 'Price trends endpoint - to be implemented' });
  })
);

module.exports = router;
