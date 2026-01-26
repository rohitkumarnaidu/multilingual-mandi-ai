/**
 * Mock Redis for Development
 * Provides in-memory caching when Redis is not available
 */

const logger = require('../utils/logger');

// In-memory cache storage
const cache = new Map();
const sessions = new Map();
const translations = new Map();

// Mock Redis client
const mockClient = {
  connected: true,
  
  async connect() {
    logger.info('Using mock Redis for development (Redis not available)');
    return true;
  },
  
  async ping() {
    return 'PONG';
  },
  
  async quit() {
    cache.clear();
    sessions.clear();
    translations.clear();
    logger.info('Mock Redis disconnected');
  },
  
  async setEx(key, ttl, value) {
    cache.set(key, { value, expires: Date.now() + (ttl * 1000) });
    logger.debug(`Mock cache set: ${key} (TTL: ${ttl}s)`);
  },
  
  async get(key) {
    const item = cache.get(key);
    if (item) {
      if (Date.now() > item.expires) {
        cache.delete(key);
        return null;
      }
      return item.value;
    }
    return null;
  },
  
  async del(key) {
    const deleted = cache.delete(key);
    logger.debug(`Mock cache deleted: ${key}`);
    return deleted ? 1 : 0;
  },
  
  async keys(pattern) {
    const keys = Array.from(cache.keys());
    if (pattern === '*') {
      return keys;
    }
    // Simple pattern matching
    const regex = new RegExp(pattern.replace('*', '.*'));
    return keys.filter(key => regex.test(key));
  }
};

let client = mockClient;

async function connectRedis() {
  try {
    await client.connect();
    return client;
  } catch (error) {
    logger.error('Failed to connect to mock Redis:', error);
    throw error;
  }
}

async function disconnectRedis() {
  if (client) {
    await client.quit();
  }
}

function getRedisClient() {
  return client;
}

// Cache helper functions
async function setCache(key, value, ttl = 3600) {
  try {
    const serializedValue = JSON.stringify(value);
    await client.setEx(key, ttl, serializedValue);
    logger.debug(`Mock cache set: ${key} (TTL: ${ttl}s)`);
  } catch (error) {
    logger.error('Mock cache set error:', { key, error: error.message });
    throw error;
  }
}

async function getCache(key) {
  try {
    const value = await client.get(key);
    if (value) {
      logger.debug(`Mock cache hit: ${key}`);
      return JSON.parse(value);
    }
    logger.debug(`Mock cache miss: ${key}`);
    return null;
  } catch (error) {
    logger.error('Mock cache get error:', { key, error: error.message });
    return null;
  }
}

async function deleteCache(key) {
  try {
    await client.del(key);
    logger.debug(`Mock cache deleted: ${key}`);
  } catch (error) {
    logger.error('Mock cache delete error:', { key, error: error.message });
  }
}

async function deleteCachePattern(pattern) {
  try {
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await Promise.all(keys.map(key => client.del(key)));
      logger.debug(`Mock cache pattern deleted: ${pattern} (${keys.length} keys)`);
    }
  } catch (error) {
    logger.error('Mock cache pattern delete error:', { pattern, error: error.message });
  }
}

// Session management helpers
async function setSession(sessionId, sessionData, ttl = 86400) {
  const key = `session:${sessionId}`;
  await setCache(key, sessionData, ttl);
}

async function getSession(sessionId) {
  const key = `session:${sessionId}`;
  return getCache(key);
}

async function deleteSession(sessionId) {
  const key = `session:${sessionId}`;
  await deleteCache(key);
}

// Translation cache helpers
async function setCachedTranslation(sourceText, sourceLang, targetLang, translation, ttl = 86400) {
  const key = `translation:${sourceLang}:${targetLang}:${Buffer.from(sourceText).toString('base64')}`;
  await setCache(key, { translation, timestamp: Date.now() }, ttl);
}

async function getCachedTranslation(sourceText, sourceLang, targetLang) {
  const key = `translation:${sourceLang}:${targetLang}:${Buffer.from(sourceText).toString('base64')}`;
  const cached = await getCache(key);
  return cached ? cached.translation : null;
}

module.exports = {
  connectRedis,
  disconnectRedis,
  getRedisClient,
  setCache,
  getCache,
  deleteCache,
  deleteCachePattern,
  setSession,
  getSession,
  deleteSession,
  setCachedTranslation,
  getCachedTranslation,
};