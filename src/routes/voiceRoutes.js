const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Placeholder routes - will be implemented in later tasks
router.post(
  '/speech-to-text',
  asyncHandler(async (req, res) => {
    res.json({ message: 'Speech-to-text endpoint - to be implemented' });
  })
);

router.post(
  '/text-to-speech',
  asyncHandler(async (req, res) => {
    res.json({ message: 'Text-to-speech endpoint - to be implemented' });
  })
);

module.exports = router;
