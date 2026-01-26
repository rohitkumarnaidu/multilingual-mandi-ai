/**
 * Mock Database for Development
 * Provides in-memory storage when PostgreSQL is not available
 */

const logger = require('../utils/logger');

// In-memory storage
const storage = {
  users: new Map(),
  sessions: new Map(),
  commodities: new Map(),
  prices: new Map(),
  translations: new Map(),
  communications: new Map(),
  negotiations: new Map()
};

// Mock query results structure
function createMockResult(rows = [], rowCount = 0) {
  return {
    rows,
    rowCount: rowCount || rows.length
  };
}

// Mock database connection
async function connectDatabase() {
  logger.info('Using mock database for development (PostgreSQL not available)');
  
  // Initialize with some sample data
  initializeSampleData();
  
  return true;
}

async function disconnectDatabase() {
  logger.info('Mock database disconnected');
}

function getPool() {
  return {
    query: mockQuery,
    connect: () => ({ query: mockQuery, release: () => {} })
  };
}

// Mock query function
async function mockQuery(text, params = []) {
  logger.debug('Mock query executed:', { text: text.substring(0, 100), params });
  
  // Simple query parsing for basic operations
  const queryLower = text.toLowerCase().trim();
  
  if (queryLower.includes('select now()')) {
    return createMockResult([{ now: new Date() }]);
  }
  
  if (queryLower.includes('select * from users')) {
    const users = Array.from(storage.users.values());
    return createMockResult(users);
  }
  
  if (queryLower.includes('insert into users')) {
    // Mock user insertion
    const userId = params[0] || `user-${Date.now()}`;
    const user = {
      user_id: userId,
      preferred_language: params[1] || 'hi',
      role: params[2] || 'vendor',
      location_state: params[3],
      location_district: params[4],
      location_market: params[5],
      voice_enabled: params[6] !== undefined ? params[6] : true,
      negotiation_style: params[7] || 'balanced',
      price_alerts: params[8] !== undefined ? params[8] : true,
      created_at: new Date(),
      last_active: new Date(),
      updated_at: new Date()
    };
    storage.users.set(userId, user);
    return createMockResult([user]);
  }
  
  if (queryLower.includes('select') && queryLower.includes('user_sessions')) {
    const sessions = Array.from(storage.sessions.values());
    return createMockResult(sessions);
  }
  
  // Default empty result
  return createMockResult([]);
}

// Mock transaction helper
async function withTransaction(callback) {
  const mockClient = {
    query: mockQuery,
    release: () => {}
  };
  
  try {
    return await callback(mockClient);
  } catch (error) {
    throw error;
  }
}

// Initialize sample data
function initializeSampleData() {
  // Sample user
  const sampleUser = {
    user_id: 'sample-user-1',
    preferred_language: 'hi',
    role: 'vendor',
    location_state: 'Maharashtra',
    location_district: 'Mumbai',
    location_market: 'Crawford Market',
    voice_enabled: true,
    negotiation_style: 'balanced',
    price_alerts: true,
    created_at: new Date(),
    last_active: new Date(),
    updated_at: new Date()
  };
  
  storage.users.set(sampleUser.user_id, sampleUser);
  
  logger.info('Mock database initialized with sample data');
}

module.exports = {
  connectDatabase,
  disconnectDatabase,
  getPool,
  query: mockQuery,
  withTransaction,
  storage // Export for testing
};