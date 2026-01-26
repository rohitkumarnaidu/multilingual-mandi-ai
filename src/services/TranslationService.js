const { HfInference } = require('@huggingface/inference');
const axios = require('axios');
const logger = require('../utils/logger');
const { setCachedTranslation, getCachedTranslation } = require('../config/redis');

/**
 * Translation Service
 * Provides real-time bidirectional translation between supported Indian languages
 * Implements Requirements 1.1, 1.2, 1.4, 1.5
 */
class TranslationService {
  constructor() {
    this.supportedLanguages = ['hi', 'te', 'ta', 'kn', 'bn', 'mr', 'en'];
    this.languageNames = {
      'hi': 'Hindi',
      'te': 'Telugu', 
      'ta': 'Tamil',
      'kn': 'Kannada',
      'bn': 'Bengali',
      'mr': 'Marathi',
      'en': 'English'
    };
    
    // Initialize Hugging Face client if API key is available
    this.hfClient = null;
    if (process.env.HUGGINGFACE_API_KEY) {
      this.hfClient = new HfInference(process.env.HUGGINGFACE_API_KEY);
    }
    
    // Sarvam-Translate API configuration
    this.sarvamApiUrl = process.env.SARVAM_API_URL || 'https://api.sarvam.ai/translate';
    this.sarvamApiKey = process.env.SARVAM_API_KEY;
    
    // Translation timeout (3 seconds as per Requirement 1.2)
    this.translationTimeout = 3000;
    
    // Cache TTL from environment or default to 24 hours
    this.cacheTtl = parseInt(process.env.CACHE_TTL_TRANSLATION, 10) || 86400;
    
    logger.info('TranslationService initialized with supported languages:', this.supportedLanguages);
  }

  /**
   * Translate text from one language to another
   * @param {string} text - Text to translate
   * @param {string} fromLang - Source language code
   * @param {string} toLang - Target language code
   * @param {string|null} context - Optional context for better translation
   * @returns {Promise<Object>} Translation result with text, confidence, and metadata
   */
  async translateText(text, fromLang, toLang, context = null) {
    try {
      // Validate input parameters
      this._validateLanguages(fromLang, toLang);
      
      if (!text || typeof text !== 'string' || text.trim().length === 0) {
        throw new Error('Text to translate cannot be empty');
      }

      // If source and target languages are the same, return original text
      if (fromLang === toLang) {
        return {
          originalText: text,
          translatedText: text,
          fromLanguage: fromLang,
          toLanguage: toLang,
          confidence: 1.0,
          cached: false,
          timestamp: new Date().toISOString(),
          context: context
        };
      }

      // Check cache first
      const cachedResult = await this._getCachedTranslation(text, fromLang, toLang, context);
      if (cachedResult) {
        logger.debug(`Cache hit for translation: ${fromLang} -> ${toLang}`);
        return {
          ...cachedResult,
          cached: true,
          timestamp: new Date().toISOString()
        };
      }

      // Perform translation with timeout
      const translationPromise = this._performTranslation(text, fromLang, toLang, context);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Translation timeout')), this.translationTimeout);
      });

      const result = await Promise.race([translationPromise, timeoutPromise]);

      // Cache the successful translation
      await this._setCachedTranslation(text, fromLang, toLang, result, context);

      logger.info(`Translation completed: ${fromLang} -> ${toLang}, confidence: ${result.confidence}`);
      
      return {
        ...result,
        cached: false,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Translation error:', {
        text: text?.substring(0, 100),
        fromLang,
        toLang,
        context,
        error: error.message
      });

      // Try fallback mechanisms
      return await this._handleTranslationError(text, fromLang, toLang, context, error);
    }
  }

  /**
   * Translate multiple texts in batch
   * @param {string[]} textArray - Array of texts to translate
   * @param {string} fromLang - Source language code
   * @param {string} toLang - Target language code
   * @returns {Promise<Object[]>} Array of translation results
   */
  async translateBatch(textArray, fromLang, toLang) {
    try {
      this._validateLanguages(fromLang, toLang);
      
      if (!Array.isArray(textArray) || textArray.length === 0) {
        throw new Error('Text array cannot be empty');
      }

      // Process translations in parallel with concurrency limit
      const concurrencyLimit = 5;
      const results = [];
      
      for (let i = 0; i < textArray.length; i += concurrencyLimit) {
        const batch = textArray.slice(i, i + concurrencyLimit);
        const batchPromises = batch.map(text => 
          this.translateText(text, fromLang, toLang).catch(error => ({
            error: error.message,
            originalText: text,
            translatedText: text, // Fallback to original
            fromLanguage: fromLang,
            toLanguage: toLang,
            confidence: 0.0,
            cached: false,
            timestamp: new Date().toISOString()
          }))
        );
        
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      }

      logger.info(`Batch translation completed: ${textArray.length} texts, ${fromLang} -> ${toLang}`);
      return results;

    } catch (error) {
      logger.error('Batch translation error:', error);
      throw error;
    }
  }

  /**
   * Detect the language of given text
   * @param {string} text - Text to analyze
   * @returns {Promise<Object>} Detected language with confidence
   */
  async detectLanguage(text) {
    try {
      if (!text || typeof text !== 'string' || text.trim().length === 0) {
        throw new Error('Text for language detection cannot be empty');
      }

      // Simple heuristic-based detection for Indian languages
      // This is a basic implementation - in production, you'd use a proper language detection service
      const detectionResult = this._heuristicLanguageDetection(text);
      
      // If we have Hugging Face API, try to use it for better detection
      if (this.hfClient && detectionResult.confidence < 0.8) {
        try {
          // Use a language detection model if available
          const hfResult = await this._detectLanguageWithHF(text);
          if (hfResult && hfResult.confidence > detectionResult.confidence) {
            return hfResult;
          }
        } catch (hfError) {
          logger.warn('HF language detection failed, using heuristic result:', hfError.message);
        }
      }

      logger.debug(`Language detected: ${detectionResult.language} (confidence: ${detectionResult.confidence})`);
      return detectionResult;

    } catch (error) {
      logger.error('Language detection error:', error);
      // Return English as fallback
      return {
        language: 'en',
        confidence: 0.1,
        method: 'fallback',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get cached translation if available
   * @param {string} text - Original text
   * @param {string} fromLang - Source language
   * @param {string} toLang - Target language
   * @returns {Object|null} Cached translation or null
   */
  async getCachedTranslation(text, fromLang, toLang) {
    try {
      return await this._getCachedTranslation(text, fromLang, toLang);
    } catch (error) {
      logger.error('Error retrieving cached translation:', error);
      return null;
    }
  }

  /**
   * Set cached translation
   * @param {string} text - Original text
   * @param {string} fromLang - Source language
   * @param {string} toLang - Target language
   * @param {string} translation - Translated text
   * @returns {Promise<boolean>} Success status
   */
  async setCachedTranslation(text, fromLang, toLang, translation) {
    try {
      const result = {
        originalText: text,
        translatedText: translation,
        fromLanguage: fromLang,
        toLanguage: toLang,
        confidence: 0.9, // Assume high confidence for manually cached translations
        method: 'manual_cache'
      };
      
      await this._setCachedTranslation(text, fromLang, toLang, result);
      return true;
    } catch (error) {
      logger.error('Error setting cached translation:', error);
      return false;
    }
  }

  /**
   * Get supported languages
   * @returns {Object} Supported languages with names
   */
  getSupportedLanguages() {
    return {
      languages: this.supportedLanguages,
      languageNames: this.languageNames,
      count: this.supportedLanguages.length
    };
  }

  /**
   * Check if language is supported
   * @param {string} languageCode - Language code to check
   * @returns {boolean} True if supported
   */
  isLanguageSupported(languageCode) {
    return this.supportedLanguages.includes(languageCode);
  }

  /**
   * Get translation service health status
   * @returns {Promise<Object>} Service health information
   */
  async getServiceHealth() {
    const health = {
      status: 'healthy',
      services: {
        huggingFace: false,
        sarvam: false,
        cache: false
      },
      supportedLanguages: this.supportedLanguages.length,
      timestamp: new Date().toISOString()
    };

    try {
      // Test Hugging Face connection
      if (this.hfClient) {
        try {
          // Simple test translation
          await Promise.race([
            this.hfClient.translation({
              model: 'Helsinki-NLP/opus-mt-en-hi',
              inputs: 'test'
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
          ]);
          health.services.huggingFace = true;
        } catch (error) {
          logger.warn('HuggingFace health check failed:', error.message);
        }
      }

      // Test Sarvam API connection
      if (this.sarvamApiKey) {
        try {
          const response = await axios.get(`${this.sarvamApiUrl}/health`, {
            headers: { 'Authorization': `Bearer ${this.sarvamApiKey}` },
            timeout: 2000
          });
          health.services.sarvam = response.status === 200;
        } catch (error) {
          logger.warn('Sarvam API health check failed:', error.message);
        }
      }

      // Test cache connection
      try {
        await getCachedTranslation('health_check', 'en', 'hi');
        health.services.cache = true;
      } catch (error) {
        logger.warn('Cache health check failed:', error.message);
      }

      // Determine overall health
      const activeServices = Object.values(health.services).filter(Boolean).length;
      const totalServices = Object.keys(health.services).length;
      
      if (activeServices === 0) {
        health.status = 'unhealthy';
      } else if (activeServices < totalServices) {
        health.status = 'degraded';
      }

    } catch (error) {
      logger.error('Health check error:', error);
      health.status = 'error';
      health.error = error.message;
    }

    return health;
  }

  // Private methods

  /**
   * Validate language codes
   * @private
   */
  _validateLanguages(fromLang, toLang) {
    if (!this.supportedLanguages.includes(fromLang)) {
      throw new Error(`Unsupported source language: ${fromLang}. Supported: ${this.supportedLanguages.join(', ')}`);
    }
    if (!this.supportedLanguages.includes(toLang)) {
      throw new Error(`Unsupported target language: ${toLang}. Supported: ${this.supportedLanguages.join(', ')}`);
    }
  }

  /**
   * Perform the actual translation using available services
   * @private
   */
  async _performTranslation(text, fromLang, toLang, context) {
    const errors = [];

    // Try Sarvam-Translate API first (optimized for Indian languages)
    if (this.sarvamApiKey && (fromLang !== 'en' || toLang !== 'en')) {
      try {
        const result = await this._translateWithSarvam(text, fromLang, toLang, context);
        if (result) {
          return result;
        }
      } catch (error) {
        errors.push(`Sarvam API: ${error.message}`);
        logger.warn('Sarvam translation failed:', error.message);
      }
    }

    // Try Hugging Face as fallback
    if (this.hfClient) {
      try {
        const result = await this._translateWithHuggingFace(text, fromLang, toLang, context);
        if (result) {
          return result;
        }
      } catch (error) {
        errors.push(`HuggingFace: ${error.message}`);
        logger.warn('HuggingFace translation failed:', error.message);
      }
    }

    // If all services fail, throw error with all attempts
    throw new Error(`All translation services failed: ${errors.join('; ')}`);
  }

  /**
   * Translate using Sarvam-Translate API
   * @private
   */
  async _translateWithSarvam(text, fromLang, toLang, context) {
    if (!this.sarvamApiKey) {
      throw new Error('Sarvam API key not configured');
    }

    const requestData = {
      input: text,
      source_language_code: fromLang,
      target_language_code: toLang,
      speaker_gender: 'Male', // Default, could be made configurable
      mode: 'formal', // Default mode
      model: 'mayura:v1',
      enable_preprocessing: true
    };

    if (context) {
      requestData.context = context;
    }

    const response = await axios.post(this.sarvamApiUrl, requestData, {
      headers: {
        'Authorization': `Bearer ${this.sarvamApiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: this.translationTimeout - 500 // Leave some buffer for processing
    });

    if (response.data && response.data.translated_text) {
      return {
        originalText: text,
        translatedText: response.data.translated_text,
        fromLanguage: fromLang,
        toLanguage: toLang,
        confidence: 0.9, // Sarvam typically has high confidence for Indian languages
        method: 'sarvam',
        context: context
      };
    }

    throw new Error('Invalid response from Sarvam API');
  }

  /**
   * Translate using Hugging Face
   * @private
   */
  async _translateWithHuggingFace(text, fromLang, toLang, context) {
    if (!this.hfClient) {
      throw new Error('HuggingFace client not initialized');
    }

    // Map language codes to HuggingFace model names
    const modelName = this._getHuggingFaceModel(fromLang, toLang);
    
    const response = await this.hfClient.translation({
      model: modelName,
      inputs: text
    });

    if (response && response.translation_text) {
      return {
        originalText: text,
        translatedText: response.translation_text,
        fromLanguage: fromLang,
        toLanguage: toLang,
        confidence: 0.8, // Generally good confidence for HF models
        method: 'huggingface',
        model: modelName,
        context: context
      };
    }

    throw new Error('Invalid response from HuggingFace API');
  }

  /**
   * Get appropriate HuggingFace model for language pair
   * @private
   */
  _getHuggingFaceModel(fromLang, toLang) {
    // Use Helsinki-NLP OPUS models which support many language pairs
    const langPair = `${fromLang}-${toLang}`;
    
    // Common models for Indian languages
    const modelMap = {
      'en-hi': 'Helsinki-NLP/opus-mt-en-hi',
      'hi-en': 'Helsinki-NLP/opus-mt-hi-en',
      'en-ta': 'Helsinki-NLP/opus-mt-en-ta',
      'ta-en': 'Helsinki-NLP/opus-mt-ta-en',
      'en-te': 'Helsinki-NLP/opus-mt-en-te',
      'te-en': 'Helsinki-NLP/opus-mt-te-en',
      'en-bn': 'Helsinki-NLP/opus-mt-en-bn',
      'bn-en': 'Helsinki-NLP/opus-mt-bn-en',
      'en-mr': 'Helsinki-NLP/opus-mt-en-mr',
      'mr-en': 'Helsinki-NLP/opus-mt-mr-en',
      'en-kn': 'Helsinki-NLP/opus-mt-en-kn',
      'kn-en': 'Helsinki-NLP/opus-mt-kn-en'
    };

    // Return specific model if available, otherwise use multilingual model
    return modelMap[langPair] || 'Helsinki-NLP/opus-mt-mul-en';
  }

  /**
   * Handle translation errors with fallback mechanisms
   * @private
   */
  async _handleTranslationError(text, fromLang, toLang, context, originalError) {
    logger.warn('Attempting translation fallback mechanisms');

    // Try to get cached translation from any previous successful attempt
    try {
      const cachedResult = await this._getCachedTranslation(text, fromLang, toLang, context);
      if (cachedResult) {
        logger.info('Using cached translation as fallback');
        return {
          ...cachedResult,
          cached: true,
          fallback: true,
          originalError: originalError.message,
          timestamp: new Date().toISOString()
        };
      }
    } catch (cacheError) {
      logger.error('Cache fallback failed:', cacheError);
    }

    // If no cache available, return original text with error information
    logger.error('All translation fallbacks failed, returning original text');
    
    return {
      originalText: text,
      translatedText: text, // Return original text as last resort
      fromLanguage: fromLang,
      toLanguage: toLang,
      confidence: 0.0,
      cached: false,
      fallback: true,
      error: originalError.message,
      timestamp: new Date().toISOString(),
      context: context
    };
  }

  /**
   * Get cached translation with context consideration
   * @private
   */
  async _getCachedTranslation(text, fromLang, toLang, context = null) {
    try {
      // Create cache key that includes context if provided
      const contextSuffix = context ? `:${Buffer.from(context).toString('base64').substring(0, 10)}` : '';
      const cacheKey = `${fromLang}:${toLang}:${Buffer.from(text).toString('base64')}${contextSuffix}`;
      
      const cached = await getCachedTranslation(text, fromLang, toLang);
      return cached;
    } catch (error) {
      logger.error('Cache retrieval error:', error);
      return null;
    }
  }

  /**
   * Set cached translation with metadata
   * @private
   */
  async _setCachedTranslation(text, fromLang, toLang, result, context = null) {
    try {
      const cacheData = {
        ...result,
        cachedAt: new Date().toISOString(),
        context: context
      };
      
      await setCachedTranslation(text, fromLang, toLang, cacheData, this.cacheTtl);
      logger.debug(`Translation cached: ${fromLang} -> ${toLang}`);
    } catch (error) {
      logger.error('Cache storage error:', error);
      // Don't throw - caching failure shouldn't break translation
    }
  }

  /**
   * Simple heuristic language detection
   * @private
   */
  _heuristicLanguageDetection(text) {
    // Basic character-based detection for Indian languages
    const patterns = {
      'hi': /[\u0900-\u097F]/, // Devanagari script (Hindi)
      'te': /[\u0C00-\u0C7F]/, // Telugu script
      'ta': /[\u0B80-\u0BFF]/, // Tamil script
      'kn': /[\u0C80-\u0CFF]/, // Kannada script
      'bn': /[\u0980-\u09FF]/, // Bengali script
      'mr': /[\u0900-\u097F]/, // Marathi also uses Devanagari
      'en': /^[a-zA-Z0-9\s.,!?;:'"()-]+$/ // Basic English pattern
    };

    let bestMatch = { language: 'en', confidence: 0.1 };

    for (const [lang, pattern] of Object.entries(patterns)) {
      if (pattern.test(text)) {
        const matches = text.match(pattern);
        const confidence = matches ? Math.min(matches.length / text.length, 0.95) : 0;
        
        if (confidence > bestMatch.confidence) {
          bestMatch = { language: lang, confidence };
        }
      }
    }

    return {
      ...bestMatch,
      method: 'heuristic',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Detect language using HuggingFace (if available)
   * @private
   */
  async _detectLanguageWithHF(text) {
    // This would use a language detection model from HuggingFace
    // For now, return null to indicate not implemented
    return null;
  }
}

module.exports = TranslationService;