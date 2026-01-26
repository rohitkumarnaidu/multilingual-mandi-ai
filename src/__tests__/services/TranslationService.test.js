const TranslationService = require('../../services/TranslationService');
const { setCachedTranslation, getCachedTranslation } = require('../../config/redis');
const axios = require('axios');

// Mock dependencies
jest.mock('../../config/redis');
jest.mock('axios');
jest.mock('@huggingface/inference', () => ({
  HfInference: jest.fn().mockImplementation(() => ({
    translation: jest.fn()
  }))
}));

describe('TranslationService', () => {
  let translationService;
  let mockHfClient;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset environment variables
    process.env.HUGGINGFACE_API_KEY = 'test-hf-key';
    process.env.SARVAM_API_KEY = 'test-sarvam-key';
    process.env.SARVAM_API_URL = 'https://api.sarvam.ai/translate';
    process.env.CACHE_TTL_TRANSLATION = '86400';
    
    translationService = new TranslationService();
    mockHfClient = translationService.hfClient;
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.HUGGINGFACE_API_KEY;
    delete process.env.SARVAM_API_KEY;
    delete process.env.SARVAM_API_URL;
    delete process.env.CACHE_TTL_TRANSLATION;
  });

  describe('Constructor', () => {
    test('should initialize with correct supported languages', () => {
      const expectedLanguages = ['hi', 'te', 'ta', 'kn', 'bn', 'mr', 'en'];
      expect(translationService.supportedLanguages).toEqual(expectedLanguages);
    });

    test('should initialize HuggingFace client when API key is provided', () => {
      expect(translationService.hfClient).toBeDefined();
    });

    test('should not initialize HuggingFace client when API key is missing', () => {
      delete process.env.HUGGINGFACE_API_KEY;
      const service = new TranslationService();
      expect(service.hfClient).toBeNull();
    });
  });

  describe('translateText', () => {
    test('should return original text when source and target languages are the same', async () => {
      const result = await translationService.translateText('Hello', 'en', 'en');
      
      expect(result).toEqual({
        originalText: 'Hello',
        translatedText: 'Hello',
        fromLanguage: 'en',
        toLanguage: 'en',
        confidence: 1.0,
        cached: false,
        timestamp: expect.any(String),
        context: null
      });
    });

    test('should return fallback response for unsupported source language', async () => {
      const result = await translationService.translateText('Hello', 'fr', 'en');
      
      expect(result.fallback).toBe(true);
      expect(result.error).toContain('Unsupported source language: fr');
      expect(result.translatedText).toBe('Hello'); // Returns original text
      expect(result.confidence).toBe(0.0);
    });

    test('should return fallback response for unsupported target language', async () => {
      const result = await translationService.translateText('Hello', 'en', 'fr');
      
      expect(result.fallback).toBe(true);
      expect(result.error).toContain('Unsupported target language: fr');
      expect(result.translatedText).toBe('Hello'); // Returns original text
      expect(result.confidence).toBe(0.0);
    });

    test('should return fallback response for empty text', async () => {
      const result = await translationService.translateText('', 'en', 'hi');
      
      expect(result.fallback).toBe(true);
      expect(result.error).toContain('Text to translate cannot be empty');
      expect(result.translatedText).toBe(''); // Returns original empty text
      expect(result.confidence).toBe(0.0);
    });

    test('should return cached translation when available', async () => {
      const cachedResult = {
        originalText: 'Hello',
        translatedText: 'नमस्ते',
        fromLanguage: 'en',
        toLanguage: 'hi',
        confidence: 0.9,
        method: 'sarvam'
      };

      getCachedTranslation.mockResolvedValue(cachedResult);

      const result = await translationService.translateText('Hello', 'en', 'hi');

      expect(result).toEqual({
        ...cachedResult,
        cached: true,
        timestamp: expect.any(String)
      });
      expect(getCachedTranslation).toHaveBeenCalledWith('Hello', 'en', 'hi');
    });

    test('should use Sarvam API for Indian language translation', async () => {
      getCachedTranslation.mockResolvedValue(null);
      axios.post.mockResolvedValue({
        data: {
          translated_text: 'नमस्ते'
        }
      });

      const result = await translationService.translateText('Hello', 'en', 'hi');

      expect(axios.post).toHaveBeenCalledWith(
        'https://api.sarvam.ai/translate',
        expect.objectContaining({
          input: 'Hello',
          source_language_code: 'en',
          target_language_code: 'hi'
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-sarvam-key'
          })
        })
      );

      expect(result).toEqual({
        originalText: 'Hello',
        translatedText: 'नमस्ते',
        fromLanguage: 'en',
        toLanguage: 'hi',
        confidence: 0.9,
        method: 'sarvam',
        context: null,
        cached: false,
        timestamp: expect.any(String)
      });
    });

    test('should fallback to HuggingFace when Sarvam fails', async () => {
      getCachedTranslation.mockResolvedValue(null);
      axios.post.mockRejectedValue(new Error('Sarvam API error'));
      mockHfClient.translation.mockResolvedValue({
        translation_text: 'नमस्ते'
      });

      const result = await translationService.translateText('Hello', 'en', 'hi');

      expect(mockHfClient.translation).toHaveBeenCalledWith({
        model: 'Helsinki-NLP/opus-mt-en-hi',
        inputs: 'Hello'
      });

      expect(result).toEqual({
        originalText: 'Hello',
        translatedText: 'नमस्ते',
        fromLanguage: 'en',
        toLanguage: 'hi',
        confidence: 0.8,
        method: 'huggingface',
        model: 'Helsinki-NLP/opus-mt-en-hi',
        context: null,
        cached: false,
        timestamp: expect.any(String)
      });
    });

    test('should return original text as fallback when all services fail', async () => {
      getCachedTranslation.mockResolvedValue(null);
      axios.post.mockRejectedValue(new Error('Sarvam API error'));
      mockHfClient.translation.mockRejectedValue(new Error('HF API error'));

      const result = await translationService.translateText('Hello', 'en', 'hi');

      expect(result).toEqual({
        originalText: 'Hello',
        translatedText: 'Hello',
        fromLanguage: 'en',
        toLanguage: 'hi',
        confidence: 0.0,
        cached: false,
        fallback: true,
        error: expect.stringContaining('All translation services failed'),
        timestamp: expect.any(String),
        context: null
      });
    });

    test('should handle translation timeout', async () => {
      getCachedTranslation.mockResolvedValue(null);
      
      // Mock a slow API response
      axios.post.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          data: { translated_text: 'नमस्ते' }
        }), 5000))
      );

      const result = await translationService.translateText('Hello', 'en', 'hi');

      expect(result.fallback).toBe(true);
      expect(result.translatedText).toBe('Hello'); // Should return original text
    });

    test('should cache successful translations', async () => {
      getCachedTranslation.mockResolvedValue(null);
      axios.post.mockResolvedValue({
        data: {
          translated_text: 'नमस्ते'
        }
      });

      await translationService.translateText('Hello', 'en', 'hi');

      expect(setCachedTranslation).toHaveBeenCalledWith(
        'Hello',
        'en',
        'hi',
        expect.objectContaining({
          originalText: 'Hello',
          translatedText: 'नमस्ते',
          fromLanguage: 'en',
          toLanguage: 'hi'
        }),
        86400
      );
    });
  });

  describe('translateBatch', () => {
    test('should translate multiple texts', async () => {
      getCachedTranslation.mockResolvedValue(null);
      axios.post
        .mockResolvedValueOnce({ data: { translated_text: 'नमस्ते' } })
        .mockResolvedValueOnce({ data: { translated_text: 'धन्यवाद' } });

      const result = await translationService.translateBatch(['Hello', 'Thank you'], 'en', 'hi');

      expect(result).toHaveLength(2);
      expect(result[0].translatedText).toBe('नमस्ते');
      expect(result[1].translatedText).toBe('धन्यवाद');
    });

    test('should handle individual translation failures in batch', async () => {
      getCachedTranslation.mockResolvedValue(null);
      axios.post
        .mockResolvedValueOnce({ data: { translated_text: 'नमस्ते' } })
        .mockRejectedValueOnce(new Error('Translation failed'));
      
      mockHfClient.translation.mockRejectedValue(new Error('HF failed'));

      const result = await translationService.translateBatch(['Hello', 'Fail'], 'en', 'hi');

      expect(result).toHaveLength(2);
      expect(result[0].translatedText).toBe('नमस्ते');
      expect(result[1].error).toBeDefined();
      expect(result[1].translatedText).toBe('Fail'); // Fallback to original
    });

    test('should throw error for empty array', async () => {
      await expect(
        translationService.translateBatch([], 'en', 'hi')
      ).rejects.toThrow('Text array cannot be empty');
    });
  });

  describe('detectLanguage', () => {
    test('should detect Hindi text using Devanagari script', async () => {
      const result = await translationService.detectLanguage('नमस्ते');
      
      expect(result.language).toBe('hi');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.method).toBe('heuristic');
    });

    test('should detect English text', async () => {
      const result = await translationService.detectLanguage('Hello world');
      
      expect(result.language).toBe('en');
      expect(result.confidence).toBeGreaterThan(0);
    });

    test('should detect Telugu text', async () => {
      const result = await translationService.detectLanguage('నమస్కారం');
      
      expect(result.language).toBe('te');
      expect(result.confidence).toBeGreaterThan(0);
    });

    test('should return English as fallback for empty text', async () => {
      const result = await translationService.detectLanguage('');
      
      expect(result.language).toBe('en');
      expect(result.confidence).toBe(0.1);
      expect(result.method).toBe('fallback');
    });
  });

  describe('getSupportedLanguages', () => {
    test('should return supported languages with names', () => {
      const result = translationService.getSupportedLanguages();
      
      expect(result).toEqual({
        languages: ['hi', 'te', 'ta', 'kn', 'bn', 'mr', 'en'],
        languageNames: {
          'hi': 'Hindi',
          'te': 'Telugu',
          'ta': 'Tamil',
          'kn': 'Kannada',
          'bn': 'Bengali',
          'mr': 'Marathi',
          'en': 'English'
        },
        count: 7
      });
    });
  });

  describe('isLanguageSupported', () => {
    test('should return true for supported languages', () => {
      expect(translationService.isLanguageSupported('hi')).toBe(true);
      expect(translationService.isLanguageSupported('en')).toBe(true);
    });

    test('should return false for unsupported languages', () => {
      expect(translationService.isLanguageSupported('fr')).toBe(false);
      expect(translationService.isLanguageSupported('de')).toBe(false);
    });
  });

  describe('getServiceHealth', () => {
    test('should return health status', async () => {
      // Mock successful health checks
      mockHfClient.translation.mockResolvedValue({ translation_text: 'test' });
      axios.get.mockResolvedValue({ status: 200 });
      getCachedTranslation.mockResolvedValue(null);

      const health = await translationService.getServiceHealth();

      expect(health).toEqual({
        status: 'healthy',
        services: {
          huggingFace: true,
          sarvam: true,
          cache: true
        },
        supportedLanguages: 7,
        timestamp: expect.any(String)
      });
    });

    test('should return degraded status when some services fail', async () => {
      // Mock partial failures
      mockHfClient.translation.mockRejectedValue(new Error('HF failed'));
      axios.get.mockResolvedValue({ status: 200 });
      getCachedTranslation.mockResolvedValue(null);

      const health = await translationService.getServiceHealth();

      expect(health.status).toBe('degraded');
      expect(health.services.huggingFace).toBe(false);
      expect(health.services.sarvam).toBe(true);
      expect(health.services.cache).toBe(true);
    });
  });

  describe('Cache methods', () => {
    test('should get cached translation', async () => {
      const cachedResult = { translatedText: 'नमस्ते' };
      getCachedTranslation.mockResolvedValue(cachedResult);

      const result = await translationService.getCachedTranslation('Hello', 'en', 'hi');

      expect(result).toEqual(cachedResult);
      expect(getCachedTranslation).toHaveBeenCalledWith('Hello', 'en', 'hi');
    });

    test('should set cached translation', async () => {
      setCachedTranslation.mockResolvedValue(true);

      const result = await translationService.setCachedTranslation('Hello', 'en', 'hi', 'नमस्ते');

      expect(result).toBe(true);
      expect(setCachedTranslation).toHaveBeenCalled();
    });

    test('should handle cache errors gracefully', async () => {
      getCachedTranslation.mockRejectedValue(new Error('Cache error'));

      const result = await translationService.getCachedTranslation('Hello', 'en', 'hi');

      expect(result).toBeNull();
    });
  });

  describe('Language validation', () => {
    test('should validate supported languages correctly', () => {
      expect(() => translationService._validateLanguages('en', 'hi')).not.toThrow();
      expect(() => translationService._validateLanguages('hi', 'te')).not.toThrow();
    });

    test('should throw error for unsupported languages', () => {
      expect(() => translationService._validateLanguages('fr', 'hi')).toThrow();
      expect(() => translationService._validateLanguages('en', 'de')).toThrow();
    });
  });

  describe('HuggingFace model selection', () => {
    test('should select correct model for language pairs', () => {
      expect(translationService._getHuggingFaceModel('en', 'hi')).toBe('Helsinki-NLP/opus-mt-en-hi');
      expect(translationService._getHuggingFaceModel('hi', 'en')).toBe('Helsinki-NLP/opus-mt-hi-en');
      expect(translationService._getHuggingFaceModel('en', 'ta')).toBe('Helsinki-NLP/opus-mt-en-ta');
    });

    test('should fallback to multilingual model for unsupported pairs', () => {
      expect(translationService._getHuggingFaceModel('hi', 'ta')).toBe('Helsinki-NLP/opus-mt-mul-en');
    });
  });
});