const { query, withTransaction } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const localStorageSync = require('../utils/localStorageSync');

/**
 * User Management Service
 * Handles user authentication, preferences, and session management
 * Implements Requirements 7.1, 7.2, 7.3, 7.4
 */
class UserManagementService {
  /**
   * Create a new user profile
   * @param {string} language - User's preferred language (ISO code)
   * @param {string} role - User's role (vendor, buyer, farmer, trader)
   * @param {Object} location - User's location information
   * @param {Object} preferences - Additional user preferences
   * @returns {Promise<Object>} Created user profile
   */
  async createUserProfile(language, role, location = {}, preferences = {}) {
    try {
      // Validate language support (Requirements 7.5)
      const supportedLanguages = ['hi', 'te', 'ta', 'kn', 'bn', 'mr', 'en'];
      if (!supportedLanguages.includes(language)) {
        throw new Error(`Unsupported language: ${language}. Supported languages: ${supportedLanguages.join(', ')}`);
      }

      // Validate role
      const supportedRoles = ['vendor', 'buyer', 'farmer', 'trader'];
      if (!supportedRoles.includes(role)) {
        throw new Error(`Invalid role: ${role}. Supported roles: ${supportedRoles.join(', ')}`);
      }

      const userId = uuidv4();
      const now = new Date();

      const insertQuery = `
        INSERT INTO users (
          user_id, preferred_language, role, 
          location_state, location_district, location_market,
          voice_enabled, negotiation_style, price_alerts,
          created_at, last_active, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `;

      const values = [
        userId,
        language,
        role,
        location.state || null,
        location.district || null,
        location.market || null,
        preferences.voiceEnabled !== undefined ? preferences.voiceEnabled : true,
        preferences.negotiationStyle || 'balanced',
        preferences.priceAlerts !== undefined ? preferences.priceAlerts : true,
        now,
        now,
        now
      ];

      const result = await query(insertQuery, values);
      const user = result.rows[0];

      logger.info(`Created user profile: ${userId} with language: ${language}, role: ${role}`);
      
      return {
        userId: user.user_id,
        preferredLanguage: user.preferred_language,
        role: user.role,
        location: {
          state: user.location_state,
          district: user.location_district,
          market: user.location_market
        },
        preferences: {
          voiceEnabled: user.voice_enabled,
          negotiationStyle: user.negotiation_style,
          priceAlerts: user.price_alerts
        },
        createdAt: user.created_at,
        lastActive: user.last_active
      };
    } catch (error) {
      logger.error('Error creating user profile:', error);
      throw error;
    }
  }

  /**
   * Update user preferences
   * @param {string} userId - User ID
   * @param {Object} preferences - Updated preferences
   * @returns {Promise<Object>} Updated user profile
   */
  async updatePreferences(userId, preferences) {
    try {
      const updates = [];
      const values = [];
      let paramIndex = 1;

      // Build dynamic update query based on provided preferences
      if (preferences.language !== undefined) {
        const supportedLanguages = ['hi', 'te', 'ta', 'kn', 'bn', 'mr', 'en'];
        if (!supportedLanguages.includes(preferences.language)) {
          throw new Error(`Unsupported language: ${preferences.language}`);
        }
        updates.push(`preferred_language = $${paramIndex++}`);
        values.push(preferences.language);
      }

      if (preferences.role !== undefined) {
        const supportedRoles = ['vendor', 'buyer', 'farmer', 'trader'];
        if (!supportedRoles.includes(preferences.role)) {
          throw new Error(`Invalid role: ${preferences.role}`);
        }
        updates.push(`role = $${paramIndex++}`);
        values.push(preferences.role);
      }

      if (preferences.location !== undefined) {
        if (preferences.location.state !== undefined) {
          updates.push(`location_state = $${paramIndex++}`);
          values.push(preferences.location.state);
        }
        if (preferences.location.district !== undefined) {
          updates.push(`location_district = $${paramIndex++}`);
          values.push(preferences.location.district);
        }
        if (preferences.location.market !== undefined) {
          updates.push(`location_market = $${paramIndex++}`);
          values.push(preferences.location.market);
        }
      }

      if (preferences.voiceEnabled !== undefined) {
        updates.push(`voice_enabled = $${paramIndex++}`);
        values.push(preferences.voiceEnabled);
      }

      if (preferences.negotiationStyle !== undefined) {
        const supportedStyles = ['polite', 'assertive', 'balanced'];
        if (!supportedStyles.includes(preferences.negotiationStyle)) {
          throw new Error(`Invalid negotiation style: ${preferences.negotiationStyle}`);
        }
        updates.push(`negotiation_style = $${paramIndex++}`);
        values.push(preferences.negotiationStyle);
      }

      if (preferences.priceAlerts !== undefined) {
        updates.push(`price_alerts = $${paramIndex++}`);
        values.push(preferences.priceAlerts);
      }

      if (updates.length === 0) {
        throw new Error('No valid preferences provided for update');
      }

      // Add updated_at timestamp
      updates.push(`updated_at = $${paramIndex++}`);
      values.push(new Date());

      // Add userId for WHERE clause
      values.push(userId);

      const updateQuery = `
        UPDATE users 
        SET ${updates.join(', ')}
        WHERE user_id = $${paramIndex}
        RETURNING *
      `;

      const result = await query(updateQuery, values);
      
      if (result.rows.length === 0) {
        throw new Error(`User not found: ${userId}`);
      }

      const user = result.rows[0];
      logger.info(`Updated preferences for user: ${userId}`);

      return {
        userId: user.user_id,
        preferredLanguage: user.preferred_language,
        role: user.role,
        location: {
          state: user.location_state,
          district: user.location_district,
          market: user.location_market
        },
        preferences: {
          voiceEnabled: user.voice_enabled,
          negotiationStyle: user.negotiation_style,
          priceAlerts: user.price_alerts
        },
        createdAt: user.created_at,
        lastActive: user.last_active,
        updatedAt: user.updated_at
      };
    } catch (error) {
      logger.error('Error updating user preferences:', error);
      throw error;
    }
  }

  /**
   * Get user session information
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object|null>} Session information or null if not found
   */
  async getUserSession(sessionId) {
    try {
      const sessionQuery = `
        SELECT 
          us.session_id,
          us.user_id,
          us.session_token,
          us.expires_at,
          us.created_at,
          us.last_accessed,
          u.preferred_language,
          u.role,
          u.location_state,
          u.location_district,
          u.location_market,
          u.voice_enabled,
          u.negotiation_style,
          u.price_alerts
        FROM user_sessions us
        JOIN users u ON us.user_id = u.user_id
        WHERE us.session_id = $1 AND us.expires_at > NOW()
      `;

      const result = await query(sessionQuery, [sessionId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const session = result.rows[0];

      // Update last accessed timestamp
      await query(
        'UPDATE user_sessions SET last_accessed = NOW() WHERE session_id = $1',
        [sessionId]
      );

      // Update user last active timestamp
      await query(
        'UPDATE users SET last_active = NOW() WHERE user_id = $1',
        [session.user_id]
      );

      return {
        sessionId: session.session_id,
        userId: session.user_id,
        sessionToken: session.session_token,
        expiresAt: session.expires_at,
        createdAt: session.created_at,
        lastAccessed: session.last_accessed,
        user: {
          preferredLanguage: session.preferred_language,
          role: session.role,
          location: {
            state: session.location_state,
            district: session.location_district,
            market: session.location_market
          },
          preferences: {
            voiceEnabled: session.voice_enabled,
            negotiationStyle: session.negotiation_style,
            priceAlerts: session.price_alerts
          }
        }
      };
    } catch (error) {
      logger.error('Error getting user session:', error);
      throw error;
    }
  }

  /**
   * Create a new user session
   * @param {string} userId - User ID
   * @param {string} sessionToken - Session token
   * @param {Date} expiresAt - Session expiration date
   * @returns {Promise<Object>} Created session
   */
  async createUserSession(userId, sessionToken, expiresAt) {
    try {
      const sessionId = uuidv4();
      const now = new Date();

      const insertQuery = `
        INSERT INTO user_sessions (
          session_id, user_id, session_token, expires_at, created_at, last_accessed
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;

      const values = [sessionId, userId, sessionToken, expiresAt, now, now];
      const result = await query(insertQuery, values);
      const session = result.rows[0];

      logger.info(`Created session for user: ${userId}`);

      return {
        sessionId: session.session_id,
        userId: session.user_id,
        sessionToken: session.session_token,
        expiresAt: session.expires_at,
        createdAt: session.created_at,
        lastAccessed: session.last_accessed
      };
    } catch (error) {
      logger.error('Error creating user session:', error);
      throw error;
    }
  }

  /**
   * Sync offline data when user comes back online
   * @param {string} userId - User ID
   * @param {Object} localData - Local data to sync
   * @returns {Promise<Object>} Sync result
   */
  async syncOfflineData(userId, localData) {
    try {
      return await withTransaction(async (client) => {
        const syncResults = {
          preferences: null,
          errors: [],
          syncedItems: []
        };

        // Get pending sync data from local storage if no localData provided
        if (!localData && typeof window !== 'undefined') {
          const pendingData = localStorageSync.getPendingSyncData(userId);
          if (pendingData.length > 0) {
            // Merge all pending preference updates
            const mergedPreferences = {};
            pendingData.forEach(item => {
              if (item.data.preferences) {
                Object.assign(mergedPreferences, item.data.preferences);
              }
              syncResults.syncedItems.push(item.timestamp);
            });
            
            if (Object.keys(mergedPreferences).length > 0) {
              localData = { preferences: mergedPreferences };
            }
          }
        }

        // Sync user preferences if provided
        if (localData && localData.preferences) {
          try {
            const updatedUser = await this.updatePreferences(userId, localData.preferences);
            syncResults.preferences = updatedUser;
            
            // Update local storage with synced data
            if (typeof window !== 'undefined') {
              localStorageSync.storeUserData(userId, updatedUser);
              localStorageSync.markSyncCompleted(userId, syncResults.syncedItems);
            }
            
            logger.info(`Synced preferences for user: ${userId}`);
          } catch (error) {
            syncResults.errors.push({
              type: 'preferences',
              error: error.message
            });
            logger.error(`Error syncing preferences for user ${userId}:`, error);
          }
        }

        // Update last active timestamp
        await client.query(
          'UPDATE users SET last_active = NOW() WHERE user_id = $1',
          [userId]
        );

        logger.info(`Completed offline data sync for user: ${userId}`);
        return syncResults;
      });
    } catch (error) {
      logger.error('Error syncing offline data:', error);
      throw error;
    }
  }

  /**
   * Validate user role
   * @param {string} userId - User ID
   * @param {string} requiredRole - Required role
   * @returns {Promise<boolean>} True if user has required role
   */
  async validateUserRole(userId, requiredRole) {
    try {
      const result = await query(
        'SELECT role FROM users WHERE user_id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        return false;
      }

      return result.rows[0].role === requiredRole;
    } catch (error) {
      logger.error('Error validating user role:', error);
      throw error;
    }
  }

  /**
   * Validate language support
   * @param {string} language - Language code to validate
   * @returns {boolean} True if language is supported
   */
  validateLanguageSupport(language) {
    const supportedLanguages = ['hi', 'te', 'ta', 'kn', 'bn', 'mr', 'en'];
    return supportedLanguages.includes(language);
  }

  /**
   * Get user profile by ID
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} User profile or null if not found
   */
  async getUserProfile(userId) {
    try {
      const result = await query(
        'SELECT * FROM users WHERE user_id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const user = result.rows[0];
      return {
        userId: user.user_id,
        preferredLanguage: user.preferred_language,
        role: user.role,
        location: {
          state: user.location_state,
          district: user.location_district,
          market: user.location_market
        },
        preferences: {
          voiceEnabled: user.voice_enabled,
          negotiationStyle: user.negotiation_style,
          priceAlerts: user.price_alerts
        },
        createdAt: user.created_at,
        lastActive: user.last_active,
        updatedAt: user.updated_at
      };
    } catch (error) {
      logger.error('Error getting user profile:', error);
      throw error;
    }
  }

  /**
   * Delete expired sessions (cleanup utility)
   * @returns {Promise<number>} Number of deleted sessions
   */
  async cleanupExpiredSessions() {
    try {
      const result = await query(
        'DELETE FROM user_sessions WHERE expires_at < NOW()'
      );
      
      const deletedCount = result.rowCount;
      if (deletedCount > 0) {
        logger.info(`Cleaned up ${deletedCount} expired sessions`);
      }
      
      return deletedCount;
    } catch (error) {
      logger.error('Error cleaning up expired sessions:', error);
      throw error;
    }
  }

  /**
   * Store user data locally for offline access
   * @param {string} userId - User ID
   * @param {Object} userData - User data to store
   * @returns {boolean} True if stored successfully
   */
  storeUserDataLocally(userId, userData) {
    if (typeof window === 'undefined') {
      logger.warn('Local storage not available in server environment');
      return false;
    }

    try {
      return localStorageSync.storeUserData(userId, userData);
    } catch (error) {
      logger.error('Error storing user data locally:', error);
      return false;
    }
  }

  /**
   * Get user data from local storage
   * @param {string} userId - User ID
   * @returns {Object|null} User data or null if not found
   */
  getUserDataFromLocal(userId) {
    if (typeof window === 'undefined') {
      return null;
    }

    try {
      return localStorageSync.getUserData(userId);
    } catch (error) {
      logger.error('Error getting user data from local storage:', error);
      return null;
    }
  }

  /**
   * Update user preferences locally (for offline use)
   * @param {string} userId - User ID
   * @param {Object} preferences - Updated preferences
   * @returns {boolean} True if updated successfully
   */
  updatePreferencesLocally(userId, preferences) {
    if (typeof window === 'undefined') {
      logger.warn('Local storage not available in server environment');
      return false;
    }

    try {
      return localStorageSync.updateUserPreferences(userId, preferences);
    } catch (error) {
      logger.error('Error updating preferences locally:', error);
      return false;
    }
  }

  /**
   * Check if user has pending sync data
   * @param {string} userId - User ID
   * @returns {boolean} True if user has pending sync data
   */
  hasPendingSyncData(userId) {
    if (typeof window === 'undefined') {
      return false;
    }

    try {
      const pendingData = localStorageSync.getPendingSyncData(userId);
      return pendingData.length > 0;
    } catch (error) {
      logger.error('Error checking pending sync data:', error);
      return false;
    }
  }

  /**
   * Get local storage information
   * @returns {Object} Storage information
   */
  getLocalStorageInfo() {
    if (typeof window === 'undefined') {
      return { available: false, reason: 'Server environment' };
    }

    try {
      return localStorageSync.getStorageInfo();
    } catch (error) {
      logger.error('Error getting local storage info:', error);
      return { available: false, error: error.message };
    }
  }

  /**
   * Clear all local storage data
   * @returns {boolean} True if cleared successfully
   */
  clearLocalStorageData() {
    if (typeof window === 'undefined') {
      logger.warn('Local storage not available in server environment');
      return false;
    }

    try {
      localStorageSync.clearAllData();
      logger.info('Cleared all local storage data');
      return true;
    } catch (error) {
      logger.error('Error clearing local storage data:', error);
      return false;
    }
  }

  /**
   * Cleanup old sync queue items
   */
  cleanupLocalSyncQueue() {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      localStorageSync.cleanupSyncQueue();
      logger.info('Cleaned up old sync queue items');
    } catch (error) {
      logger.error('Error cleaning up sync queue:', error);
    }
  }
}

module.exports = UserManagementService;