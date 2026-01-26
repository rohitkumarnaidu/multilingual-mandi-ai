# Translation Service Documentation

## Overview

The Translation Service provides real-time bidirectional translation between supported Indian languages and English. It implements Requirements 1.1, 1.2, 1.4, and 1.5 from the Multilingual Mandi platform specification.

## Supported Languages

- **Hindi (hi)** - हिंदी
- **Telugu (te)** - తెలుగు
- **Tamil (ta)** - தமிழ்
- **Kannada (kn)** - ಕನ್ನಡ
- **Bengali (bn)** - বাংলা
- **Marathi (mr)** - मराठी
- **English (en)** - English

## Features

### Core Functionality
- **Real-time Translation**: Translates text within 3 seconds (Requirement 1.2)
- **Bidirectional Support**: Translate between any two supported languages (Requirement 1.5)
- **Context-aware Translation**: Maintains cultural context and meaning (Requirement 1.3)
- **Error Handling**: Graceful fallback mechanisms (Requirement 1.4)
- **Caching Layer**: Redis-based caching for improved performance
- **Language Detection**: Automatic language detection using heuristic patterns

### Translation Services
1. **Sarvam-Translate API**: Primary service optimized for Indian languages
2. **Hugging Face Transformers**: Fallback service using Helsinki-NLP models
3. **Caching**: Redis-based translation cache with configurable TTL

## API Endpoints

### POST /api/translation/translate
Translate text from one language to another.

**Request Body:**
```json
{
  "text": "Hello world",
  "fromLang": "en",
  "toLang": "hi",
  "context": "greeting" // optional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "originalText": "Hello world",
    "translatedText": "नमस्ते दुनिया",
    "fromLanguage": "en",
    "toLanguage": "hi",
    "confidence": 0.9,
    "cached": false,
    "timestamp": "2024-01-01T00:00:00.000Z",
    "context": "greeting"
  }
}
```

### POST /api/translation/batch
Translate multiple texts in batch (up to 50 texts).

**Request Body:**
```json
{
  "texts": ["Hello", "Thank you", "Goodbye"],
  "fromLang": "en",
  "toLang": "hi"
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "originalText": "Hello",
      "translatedText": "नमस्ते",
      "fromLanguage": "en",
      "toLanguage": "hi",
      "confidence": 0.9,
      "cached": false,
      "timestamp": "2024-01-01T00:00:00.000Z"
    }
    // ... more results
  ]
}
```

### POST /api/translation/detect
Detect the language of given text.

**Request Body:**
```json
{
  "text": "नमस्ते दुनिया"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "language": "hi",
    "confidence": 0.95,
    "method": "heuristic",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

### GET /api/translation/languages
Get list of supported languages.

**Response:**
```json
{
  "success": true,
  "data": {
    "languages": ["hi", "te", "ta", "kn", "bn", "mr", "en"],
    "languageNames": {
      "hi": "Hindi",
      "te": "Telugu",
      "ta": "Tamil",
      "kn": "Kannada",
      "bn": "Bengali",
      "mr": "Marathi",
      "en": "English"
    },
    "count": 7
  }
}
```

### GET /api/translation/health
Get translation service health status.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy", // "healthy", "degraded", or "unhealthy"
    "services": {
      "huggingFace": true,
      "sarvam": true,
      "cache": true
    },
    "supportedLanguages": 7,
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

### GET /api/translation/cache/:text/:fromLang/:toLang
Get cached translation if available.

**Example:** `/api/translation/cache/Hello/en/hi`

**Response:**
```json
{
  "success": true,
  "data": {
    "originalText": "Hello",
    "translatedText": "नमस्ते",
    "fromLanguage": "en",
    "toLanguage": "hi",
    "confidence": 0.9,
    "method": "sarvam"
  },
  "cached": true
}
```

## Environment Configuration

Add these environment variables to your `.env` file:

```bash
# Translation Service Configuration
HUGGINGFACE_API_KEY=your-huggingface-api-key
SARVAM_API_KEY=your-sarvam-api-key
SARVAM_API_URL=https://api.sarvam.ai/translate

# Cache Configuration
CACHE_TTL_TRANSLATION=86400  # 24 hours in seconds
```

## Usage Examples

### JavaScript/Node.js
```javascript
const TranslationService = require('./src/services/TranslationService');

const translationService = new TranslationService();

// Translate text
const result = await translationService.translateText('Hello', 'en', 'hi');
console.log(result.translatedText); // "नमस्ते"

// Batch translation
const results = await translationService.translateBatch(['Hello', 'World'], 'en', 'hi');

// Language detection
const detection = await translationService.detectLanguage('नमस्ते');
console.log(detection.language); // "hi"
```

### Frontend/JavaScript (using fetch)
```javascript
// Translate text
const response = await fetch('/api/translation/translate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    text: 'Hello world',
    fromLang: 'en',
    toLang: 'hi'
  })
});

const result = await response.json();
console.log(result.data.translatedText); // "नमस्ते दुनिया"
```

## Error Handling

The service implements graceful error handling with fallback mechanisms:

1. **Primary Service Failure**: Falls back to secondary translation service
2. **All Services Fail**: Returns original text with error information
3. **Network Timeout**: 3-second timeout with fallback to cached results
4. **Invalid Input**: Returns validation errors with specific messages

### Error Response Format
```json
{
  "success": false,
  "error": "Translation service temporarily unavailable",
  "details": "Specific error details when available"
}
```

## Performance Considerations

- **Caching**: Translations are cached in Redis for 24 hours by default
- **Batch Processing**: Use batch endpoint for multiple translations to improve performance
- **Timeout**: 3-second timeout ensures responsive user experience
- **Concurrency**: Batch requests are processed with concurrency limits to prevent overload

## Language Detection

The service uses heuristic-based language detection for Indian languages:

- **Devanagari Script**: Detects Hindi and Marathi
- **Telugu Script**: Detects Telugu text
- **Tamil Script**: Detects Tamil text
- **Kannada Script**: Detects Kannada text
- **Bengali Script**: Detects Bengali text
- **Latin Script**: Detects English text

## Testing

The service includes comprehensive test coverage:

- **Unit Tests**: Test individual service methods
- **Integration Tests**: Test API endpoints
- **Error Handling Tests**: Test fallback mechanisms
- **Performance Tests**: Test timeout and caching behavior

Run tests with:
```bash
npm test -- src/__tests__/services/TranslationService.test.js
npm test -- src/__tests__/routes/translationRoutes.test.js
```

## Monitoring and Health Checks

Use the health endpoint to monitor service status:
- **Healthy**: All services operational
- **Degraded**: Some services unavailable but core functionality works
- **Unhealthy**: Critical services unavailable

## Future Enhancements

1. **Voice Integration**: Connect with Voice Processing Service for speech translation
2. **Offline Support**: Local translation models for basic functionality
3. **Custom Models**: Fine-tuned models for agricultural and trading terminology
4. **Analytics**: Translation usage analytics and quality metrics
5. **Rate Limiting**: Per-user rate limiting for API endpoints

## Support

For issues or questions about the Translation Service:
1. Check the health endpoint for service status
2. Review error logs for detailed error information
3. Verify environment configuration
4. Test with simple translations first before complex use cases