const redis = require('redis');
const logger = require('../utils/logger');

let client;

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: process.env.REDIS_DB || 0,
  retryDelayOnFailover: 100,
  enableReadyCheck: true,
  maxRetriesPerRequest: 3,
};

async function connectRedis() {
  try {
    client = redis.createClient({
      socket: {
        host: redisConfig.host,
        port: redisConfig.port,
      },
      password: redisConfig.password,
      database: redisConfig.db,
    });

    client.on('error', err => {
      logger.error('Redis client error:', err);
    });

    client.on('connect', () => {
      logger.info('Redis client connected');
    });

    client.on('ready', () => {
      logger.info('Redis client ready');
    });

    client.on('end', () => {
      logger.info('Redis client disconnected');
    });

    await client.connect();

    // Test the connection
    await client.ping();
    logger.info('Redis connection established successfully');

    return client;
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    throw error;
  }
}

async function disconnectRedis() {
  if (client) {
    await client.quit();
    logger.info('Redis disconnected');
  }
}

function getRedisClient() {
  if (!client) {
    throw new Error('Redis not connected. Call connectRedis() first.');
  }
  return client;
}

// Cache helper functions
async function setCache(key, value, ttl = 3600) {
  try {
    const serializedValue = JSON.stringify(value);
    await client.setEx(key, ttl, serializedValue);
    logger.debug(`Cache set: ${key} (TTL: ${ttl}s)`);
  } catch (error) {
    logger.error('Cache set error:', { key, error: error.message });
    throw error;
  }
}

async function getCache(key) {
  try {
    const value = await client.get(key);
    if (value) {
      logger.debug(`Cache hit: ${key}`);
      return JSON.parse(value);
    }
    logger.debug(`Cache miss: ${key}`);
    return null;
  } catch (error) {
    logger.error('Cache get error:', { key, error: error.message });
    return null; // Return null on error to allow fallback to database
  }
}

async function deleteCache(key) {
  try {
    await client.del(key);
    logger.debug(`Cache deleted: ${key}`);
  } catch (error) {
    logger.error('Cache delete error:', { key, error: error.message });
  }
}

async function deleteCachePattern(pattern) {
  try {
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(keys);
      logger.debug(`Cache pattern deleted: ${pattern} (${keys.length} keys)`);
    }
  } catch (error) {
    logger.error('Cache pattern delete error:', { pattern, error: error.message });
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
  return getCache(key);
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
