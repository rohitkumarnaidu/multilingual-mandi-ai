const express = require('express');
const { body, validationResult } = require('express-validator');
const TranslationService = require('../services/TranslationService');
const logger = require('../utils/logger');

const router = express.Router();
const translationService = new TranslationService();

/**
 * @route POST /api/translation/translate
 * @desc Translate text from one language to another
 * @access Public
 */
router.post('/translate', [
  body('text')
    .notEmpty()
    .withMessage('Text is required')
    .isLength({ max: 5000 })
    .withMessage('Text must be less than 5000 characters'),
  body('fromLang')
    .notEmpty()
    .withMessage('Source language is required')
    .isIn(['hi', 'te', 'ta', 'kn', 'bn', 'mr', 'en'])
    .withMessage('Invalid source language'),
  body('toLang')
    .notEmpty()
    .withMessage('Target language is required')
    .isIn(['hi', 'te', 'ta', 'kn', 'bn', 'mr', 'en'])
    .withMessage('Invalid target language'),
  body('context')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Context must be less than 500 characters')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { text, fromLang, toLang, context } = req.body;

    // Perform translation
    const result = await translationService.translateText(text, fromLang, toLang, context);

    // Log successful translation
    logger.info('Translation API request completed', {
      fromLang,
      toLang,
      textLength: text.length,
      confidence: result.confidence,
      cached: result.cached,
      fallback: result.fallback || false
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Translation API error:', error);
    res.status(500).json({
      success: false,
      error: 'Translation service temporarily unavailable'
    });
  }
});

/**
 * @route POST /api/translation/batch
 * @desc Translate multiple texts in batch
 * @access Public
 */
router.post('/batch', [
  body('texts')
    .isArray({ min: 1, max: 50 })
    .withMessage('Texts must be an array with 1-50 items'),
  body('texts.*')
    .notEmpty()
    .withMessage('Each text item is required')
    .isLength({ max: 1000 })
    .withMessage('Each text must be less than 1000 characters'),
  body('fromLang')
    .notEmpty()
    .withMessage('Source language is required')
    .isIn(['hi', 'te', 'ta', 'kn', 'bn', 'mr', 'en'])
    .withMessage('Invalid source language'),
  body('toLang')
    .notEmpty()
    .withMessage('Target language is required')
    .isIn(['hi', 'te', 'ta', 'kn', 'bn', 'mr', 'en'])
    .withMessage('Invalid target language')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { texts, fromLang, toLang } = req.body;

    // Perform batch translation
    const results = await translationService.translateBatch(texts, fromLang, toLang);

    // Log batch translation
    logger.info('Batch translation API request completed', {
      fromLang,
      toLang,
      textCount: texts.length,
      successCount: results.filter(r => !r.error).length,
      errorCount: results.filter(r => r.error).length
    });

    res.json({
      success: true,
      data: results
    });

  } catch (error) {
    logger.error('Batch translation API error:', error);
    res.status(500).json({
      success: false,
      error: 'Translation service temporarily unavailable'
    });
  }
});

/**
 * @route POST /api/translation/detect
 * @desc Detect the language of given text
 * @access Public
 */
router.post('/detect', [
  body('text')
    .notEmpty()
    .withMessage('Text is required')
    .isLength({ max: 1000 })
    .withMessage('Text must be less than 1000 characters')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { text } = req.body;

    // Detect language
    const result = await translationService.detectLanguage(text);

    logger.info('Language detection API request completed', {
      textLength: text.length,
      detectedLanguage: result.language,
      confidence: result.confidence
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Language detection API error:', error);
    res.status(500).json({
      success: false,
      error: 'Language detection service temporarily unavailable'
    });
  }
});

/**
 * @route GET /api/translation/languages
 * @desc Get supported languages
 * @access Public
 */
router.get('/languages', (req, res) => {
  try {
    const languages = translationService.getSupportedLanguages();
    
    res.json({
      success: true,
      data: languages
    });

  } catch (error) {
    logger.error('Get languages API error:', error);
    res.status(500).json({
      success: false,
      error: 'Unable to retrieve supported languages'
    });
  }
});

/**
 * @route GET /api/translation/health
 * @desc Get translation service health status
 * @access Public
 */
router.get('/health', async (req, res) => {
  try {
    const health = await translationService.getServiceHealth();
    
    // Set appropriate HTTP status based on health
    let statusCode = 200;
    if (health.status === 'degraded') {
      statusCode = 206; // Partial Content
    } else if (health.status === 'unhealthy') {
      statusCode = 503; // Service Unavailable
    }

    res.status(statusCode).json({
      success: true,
      data: health
    });

  } catch (error) {
    logger.error('Translation health check API error:', error);
    res.status(500).json({
      success: false,
      error: 'Health check failed'
    });
  }
});

/**
 * @route GET /api/translation/cache/:text/:fromLang/:toLang
 * @desc Get cached translation if available
 * @access Public
 */
router.get('/cache/:text/:fromLang/:toLang', async (req, res) => {
  try {
    const { text, fromLang, toLang } = req.params;

    // Validate language codes
    const supportedLangs = ['hi', 'te', 'ta', 'kn', 'bn', 'mr', 'en'];
    if (!supportedLangs.includes(fromLang) || !supportedLangs.includes(toLang)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid language codes'
      });
    }

    // Decode URL-encoded text
    const decodedText = decodeURIComponent(text);

    // Get cached translation
    const cached = await translationService.getCachedTranslation(decodedText, fromLang, toLang);

    if (cached) {
      res.json({
        success: true,
        data: cached,
        cached: true
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'No cached translation found'
      });
    }

  } catch (error) {
    logger.error('Get cached translation API error:', error);
    res.status(500).json({
      success: false,
      error: 'Unable to retrieve cached translation'
    });
  }
});

module.exports = router;