const request = require('supertest');
const app = require('../../server');

// Mock the TranslationService to avoid external API calls during testing
jest.mock('../../services/TranslationService', () => {
  return jest.fn().mockImplementation(() => ({
    translateText: jest.fn().mockResolvedValue({
      originalText: 'Hello',
      translatedText: 'नमस्ते',
      fromLanguage: 'en',
      toLanguage: 'hi',
      confidence: 0.9,
      cached: false,
      timestamp: '2024-01-01T00:00:00.000Z'
    }),
    translateBatch: jest.fn().mockResolvedValue([
      {
        originalText: 'Hello',
        translatedText: 'नमस्ते',
        fromLanguage: 'en',
        toLanguage: 'hi',
        confidence: 0.9,
        cached: false,
        timestamp: '2024-01-01T00:00:00.000Z'
      }
    ]),
    detectLanguage: jest.fn().mockResolvedValue({
      language: 'en',
      confidence: 0.95,
      method: 'heuristic',
      timestamp: '2024-01-01T00:00:00.000Z'
    }),
    getSupportedLanguages: jest.fn().mockReturnValue({
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
    }),
    getServiceHealth: jest.fn().mockResolvedValue({
      status: 'healthy',
      services: {
        huggingFace: true,
        sarvam: true,
        cache: true
      },
      supportedLanguages: 7,
      timestamp: '2024-01-01T00:00:00.000Z'
    }),
    getCachedTranslation: jest.fn().mockResolvedValue({
      originalText: 'Hello',
      translatedText: 'नमस्ते',
      fromLanguage: 'en',
      toLanguage: 'hi',
      confidence: 0.9,
      method: 'sarvam'
    })
  }));
});

describe('Translation Routes', () => {
  describe('POST /api/translation/translate', () => {
    test('should translate text successfully', async () => {
      const response = await request(app)
        .post('/api/translation/translate')
        .send({
          text: 'Hello',
          fromLang: 'en',
          toLang: 'hi'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({
        originalText: 'Hello',
        translatedText: 'नमस्ते',
        fromLanguage: 'en',
        toLanguage: 'hi',
        confidence: 0.9,
        cached: false,
        timestamp: '2024-01-01T00:00:00.000Z'
      });
    });

    test('should return validation error for missing text', async () => {
      const response = await request(app)
        .post('/api/translation/translate')
        .send({
          fromLang: 'en',
          toLang: 'hi'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: 'Text is required'
          })
        ])
      );
    });

    test('should return validation error for invalid language', async () => {
      const response = await request(app)
        .post('/api/translation/translate')
        .send({
          text: 'Hello',
          fromLang: 'invalid',
          toLang: 'hi'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: 'Invalid source language'
          })
        ])
      );
    });

    test('should return validation error for text too long', async () => {
      const longText = 'a'.repeat(5001);
      const response = await request(app)
        .post('/api/translation/translate')
        .send({
          text: longText,
          fromLang: 'en',
          toLang: 'hi'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: 'Text must be less than 5000 characters'
          })
        ])
      );
    });

    test('should handle translation with context', async () => {
      const response = await request(app)
        .post('/api/translation/translate')
        .send({
          text: 'Hello',
          fromLang: 'en',
          toLang: 'hi',
          context: 'greeting'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/translation/batch', () => {
    test('should translate multiple texts successfully', async () => {
      const response = await request(app)
        .post('/api/translation/batch')
        .send({
          texts: ['Hello'],
          fromLang: 'en',
          toLang: 'hi'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].translatedText).toBe('नमस्ते');
    });

    test('should return validation error for empty texts array', async () => {
      const response = await request(app)
        .post('/api/translation/batch')
        .send({
          texts: [],
          fromLang: 'en',
          toLang: 'hi'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: 'Texts must be an array with 1-50 items'
          })
        ])
      );
    });

    test('should return validation error for too many texts', async () => {
      const manyTexts = Array(51).fill('Hello');
      const response = await request(app)
        .post('/api/translation/batch')
        .send({
          texts: manyTexts,
          fromLang: 'en',
          toLang: 'hi'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: 'Texts must be an array with 1-50 items'
          })
        ])
      );
    });
  });

  describe('POST /api/translation/detect', () => {
    test('should detect language successfully', async () => {
      const response = await request(app)
        .post('/api/translation/detect')
        .send({
          text: 'Hello world'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({
        language: 'en',
        confidence: 0.95,
        method: 'heuristic',
        timestamp: '2024-01-01T00:00:00.000Z'
      });
    });

    test('should return validation error for missing text', async () => {
      const response = await request(app)
        .post('/api/translation/detect')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: 'Text is required'
          })
        ])
      );
    });

    test('should return validation error for text too long', async () => {
      const longText = 'a'.repeat(1001);
      const response = await request(app)
        .post('/api/translation/detect')
        .send({
          text: longText
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: 'Text must be less than 1000 characters'
          })
        ])
      );
    });
  });

  describe('GET /api/translation/languages', () => {
    test('should return supported languages', async () => {
      const response = await request(app)
        .get('/api/translation/languages');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({
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

  describe('GET /api/translation/health', () => {
    test('should return service health status', async () => {
      const response = await request(app)
        .get('/api/translation/health');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({
        status: 'healthy',
        services: {
          huggingFace: true,
          sarvam: true,
          cache: true
        },
        supportedLanguages: 7,
        timestamp: '2024-01-01T00:00:00.000Z'
      });
    });
  });

  describe('GET /api/translation/cache/:text/:fromLang/:toLang', () => {
    test('should return cached translation if available', async () => {
      const response = await request(app)
        .get('/api/translation/cache/Hello/en/hi');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.cached).toBe(true);
      expect(response.body.data.translatedText).toBe('नमस्ते');
    });

    test('should return validation error for invalid language codes', async () => {
      const response = await request(app)
        .get('/api/translation/cache/Hello/invalid/hi');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid language codes');
    });

    test('should handle URL-encoded text', async () => {
      const encodedText = encodeURIComponent('Hello world');
      const response = await request(app)
        .get(`/api/translation/cache/${encodedText}/en/hi`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});