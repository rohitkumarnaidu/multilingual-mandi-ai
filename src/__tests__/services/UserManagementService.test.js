const UserManagementService = require('../../services/UserManagementService');
const { query, withTransaction } = require('../../config/database');
const localStorageSync = require('../../utils/localStorageSync');

// Mock dependencies
jest.mock('../../config/database');
jest.mock('../../utils/localStorageSync');
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-123')
}));

describe('UserManagementService', () => {
  let userService;
  let mockQuery;
  let mockWithTransaction;

  beforeEach(() => {
    userService = new UserManagementService();
    mockQuery = query;
    mockWithTransaction = withTransaction;
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock successful database responses
    mockQuery.mockResolvedValue({
      rows: [{
        user_id: 'test-uuid-123',
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
      }],
      rowCount: 1
    });
  });

  describe('createUserProfile', () => {
    it('should create a user profile with valid inputs', async () => {
      const result = await userService.createUserProfile('hi', 'vendor', {
        state: 'Maharashtra',
        district: 'Mumbai',
        market: 'Crawford Market'
      });

      expect(result).toHaveProperty('userId', 'test-uuid-123');
      expect(result).toHaveProperty('preferredLanguage', 'hi');
      expect(result).toHaveProperty('role', 'vendor');
      expect(result.location).toEqual({
        state: 'Maharashtra',
        district: 'Mumbai',
        market: 'Crawford Market'
      });
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        expect.arrayContaining(['test-uuid-123', 'hi', 'vendor'])
      );
    });

    it('should reject unsupported language', async () => {
      await expect(
        userService.createUserProfile('fr', 'vendor')
      ).rejects.toThrow('Unsupported language: fr');
    });

    it('should reject invalid role', async () => {
      await expect(
        userService.createUserProfile('hi', 'invalid_role')
      ).rejects.toThrow('Invalid role: invalid_role');
    });

    it('should accept all supported languages', async () => {
      const supportedLanguages = ['hi', 'te', 'ta', 'kn', 'bn', 'mr', 'en'];
      
      for (const lang of supportedLanguages) {
        // Mock database response for each language
        mockQuery.mockResolvedValueOnce({
          rows: [{
            user_id: 'test-uuid-123',
            preferred_language: lang,
            role: 'vendor',
            location_state: null,
            location_district: null,
            location_market: null,
            voice_enabled: true,
            negotiation_style: 'balanced',
            price_alerts: true,
            created_at: new Date(),
            last_active: new Date(),
            updated_at: new Date()
          }],
          rowCount: 1
        });

        await expect(
          userService.createUserProfile(lang, 'vendor')
        ).resolves.toHaveProperty('preferredLanguage', lang);
      }
    });

    it('should accept all supported roles', async () => {
      const supportedRoles = ['vendor', 'buyer', 'farmer', 'trader'];
      
      for (const role of supportedRoles) {
        // Mock database response for each role
        mockQuery.mockResolvedValueOnce({
          rows: [{
            user_id: 'test-uuid-123',
            preferred_language: 'hi',
            role: role,
            location_state: null,
            location_district: null,
            location_market: null,
            voice_enabled: true,
            negotiation_style: 'balanced',
            price_alerts: true,
            created_at: new Date(),
            last_active: new Date(),
            updated_at: new Date()
          }],
          rowCount: 1
        });

        await expect(
          userService.createUserProfile('hi', role)
        ).resolves.toHaveProperty('role', role);
      }
    });
  });

  describe('updatePreferences', () => {
    it('should update user preferences successfully', async () => {
      const preferences = {
        language: 'te',
        voiceEnabled: false,
        negotiationStyle: 'assertive'
      };

      const result = await userService.updatePreferences('test-user-id', preferences);

      expect(result).toHaveProperty('preferredLanguage', 'hi'); // From mock response
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        expect.arrayContaining(['te', false, 'assertive'])
      );
    });

    it('should reject invalid language in preferences', async () => {
      await expect(
        userService.updatePreferences('test-user-id', { language: 'invalid' })
      ).rejects.toThrow('Unsupported language: invalid');
    });

    it('should reject invalid role in preferences', async () => {
      await expect(
        userService.updatePreferences('test-user-id', { role: 'invalid' })
      ).rejects.toThrow('Invalid role: invalid');
    });

    it('should reject invalid negotiation style', async () => {
      await expect(
        userService.updatePreferences('test-user-id', { negotiationStyle: 'invalid' })
      ).rejects.toThrow('Invalid negotiation style: invalid');
    });

    it('should throw error when no valid preferences provided', async () => {
      await expect(
        userService.updatePreferences('test-user-id', {})
      ).rejects.toThrow('No valid preferences provided for update');
    });

    it('should throw error when user not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(
        userService.updatePreferences('nonexistent-user', { voiceEnabled: false })
      ).rejects.toThrow('User not found: nonexistent-user');
    });
  });

  describe('getUserSession', () => {
    it('should return session data for valid session', async () => {
      const mockSessionData = {
        session_id: 'session-123',
        user_id: 'user-123',
        session_token: 'token-123',
        expires_at: new Date(Date.now() + 3600000), // 1 hour from now
        created_at: new Date(),
        last_accessed: new Date(),
        preferred_language: 'hi',
        role: 'vendor',
        location_state: 'Maharashtra',
        location_district: 'Mumbai',
        location_market: 'Crawford Market',
        voice_enabled: true,
        negotiation_style: 'balanced',
        price_alerts: true
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockSessionData], rowCount: 1 })
        .mockResolvedValueOnce({ rowCount: 1 }) // Update last_accessed
        .mockResolvedValueOnce({ rowCount: 1 }); // Update user last_active

      const result = await userService.getUserSession('session-123');

      expect(result).toHaveProperty('sessionId', 'session-123');
      expect(result).toHaveProperty('userId', 'user-123');
      expect(result.user).toHaveProperty('preferredLanguage', 'hi');
      expect(result.user).toHaveProperty('role', 'vendor');
    });

    it('should return null for expired or invalid session', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await userService.getUserSession('invalid-session');

      expect(result).toBeNull();
    });
  });

  describe('createUserSession', () => {
    it('should create a new session successfully', async () => {
      const expiresAt = new Date(Date.now() + 3600000);
      
      mockQuery.mockResolvedValueOnce({
        rows: [{
          session_id: 'test-uuid-123',
          user_id: 'user-123',
          session_token: 'token-123',
          expires_at: expiresAt,
          created_at: new Date(),
          last_accessed: new Date()
        }],
        rowCount: 1
      });

      const result = await userService.createUserSession('user-123', 'token-123', expiresAt);

      expect(result).toHaveProperty('sessionId', 'test-uuid-123');
      expect(result).toHaveProperty('userId', 'user-123');
      expect(result).toHaveProperty('sessionToken', 'token-123');
    });
  });

  describe('syncOfflineData', () => {
    beforeEach(() => {
      mockWithTransaction.mockImplementation(async (callback) => {
        const mockClient = { query: jest.fn().mockResolvedValue({ rowCount: 1 }) };
        return await callback(mockClient);
      });
    });

    it('should sync preferences successfully', async () => {
      const localData = {
        preferences: {
          voiceEnabled: false,
          negotiationStyle: 'polite'
        }
      };

      // Mock updatePreferences to return updated user
      const updatedUser = { userId: 'user-123', preferences: localData.preferences };
      jest.spyOn(userService, 'updatePreferences').mockResolvedValue(updatedUser);

      const result = await userService.syncOfflineData('user-123', localData);

      expect(result.preferences).toEqual(updatedUser);
      expect(result.errors).toHaveLength(0);
      expect(userService.updatePreferences).toHaveBeenCalledWith('user-123', localData.preferences);
    });

    it('should handle sync errors gracefully', async () => {
      const localData = {
        preferences: {
          language: 'invalid'
        }
      };

      jest.spyOn(userService, 'updatePreferences').mockRejectedValue(new Error('Invalid language'));

      const result = await userService.syncOfflineData('user-123', localData);

      expect(result.preferences).toBeNull();
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({
        type: 'preferences',
        error: 'Invalid language'
      });
    });

    it('should sync pending data from local storage when no localData provided', async () => {
      // Mock browser environment
      global.window = {};
      
      const pendingData = [
        {
          data: { preferences: { voiceEnabled: false } },
          timestamp: '2023-01-01T00:00:00.000Z'
        },
        {
          data: { preferences: { negotiationStyle: 'polite' } },
          timestamp: '2023-01-01T01:00:00.000Z'
        }
      ];

      localStorageSync.getPendingSyncData.mockReturnValue(pendingData);
      localStorageSync.storeUserData.mockReturnValue(true);
      localStorageSync.markSyncCompleted.mockReturnValue(true);

      const updatedUser = { userId: 'user-123', preferences: { voiceEnabled: false, negotiationStyle: 'polite' } };
      jest.spyOn(userService, 'updatePreferences').mockResolvedValue(updatedUser);

      const result = await userService.syncOfflineData('user-123');

      expect(result.preferences).toEqual(updatedUser);
      expect(result.syncedItems).toHaveLength(2);
      expect(localStorageSync.storeUserData).toHaveBeenCalledWith('user-123', updatedUser);
      expect(localStorageSync.markSyncCompleted).toHaveBeenCalledWith('user-123', result.syncedItems);

      // Cleanup
      delete global.window;
    });
  });

  describe('validateUserRole', () => {
    it('should return true for valid user role', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ role: 'vendor' }],
        rowCount: 1
      });

      const result = await userService.validateUserRole('user-123', 'vendor');

      expect(result).toBe(true);
    });

    it('should return false for invalid user role', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ role: 'vendor' }],
        rowCount: 1
      });

      const result = await userService.validateUserRole('user-123', 'buyer');

      expect(result).toBe(false);
    });

    it('should return false for nonexistent user', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      });

      const result = await userService.validateUserRole('nonexistent-user', 'vendor');

      expect(result).toBe(false);
    });
  });

  describe('validateLanguageSupport', () => {
    it('should return true for supported languages', () => {
      const supportedLanguages = ['hi', 'te', 'ta', 'kn', 'bn', 'mr', 'en'];
      
      supportedLanguages.forEach(lang => {
        expect(userService.validateLanguageSupport(lang)).toBe(true);
      });
    });

    it('should return false for unsupported languages', () => {
      const unsupportedLanguages = ['fr', 'de', 'es', 'zh', 'ja'];
      
      unsupportedLanguages.forEach(lang => {
        expect(userService.validateLanguageSupport(lang)).toBe(false);
      });
    });
  });

  describe('Local Storage Integration', () => {
    beforeEach(() => {
      global.window = {};
    });

    afterEach(() => {
      delete global.window;
    });

    it('should store user data locally', () => {
      const userData = { userId: 'user-123', preferredLanguage: 'hi' };
      localStorageSync.storeUserData.mockReturnValue(true);

      const result = userService.storeUserDataLocally('user-123', userData);

      expect(result).toBe(true);
      expect(localStorageSync.storeUserData).toHaveBeenCalledWith('user-123', userData);
    });

    it('should get user data from local storage', () => {
      const userData = { userId: 'user-123', preferredLanguage: 'hi' };
      localStorageSync.getUserData.mockReturnValue(userData);

      const result = userService.getUserDataFromLocal('user-123');

      expect(result).toEqual(userData);
      expect(localStorageSync.getUserData).toHaveBeenCalledWith('user-123');
    });

    it('should update preferences locally', () => {
      const preferences = { voiceEnabled: false };
      localStorageSync.updateUserPreferences.mockReturnValue(true);

      const result = userService.updatePreferencesLocally('user-123', preferences);

      expect(result).toBe(true);
      expect(localStorageSync.updateUserPreferences).toHaveBeenCalledWith('user-123', preferences);
    });

    it('should check for pending sync data', () => {
      const pendingData = [{ data: { preferences: {} }, timestamp: '2023-01-01' }];
      localStorageSync.getPendingSyncData.mockReturnValue(pendingData);

      const result = userService.hasPendingSyncData('user-123');

      expect(result).toBe(true);
      expect(localStorageSync.getPendingSyncData).toHaveBeenCalledWith('user-123');
    });

    it('should return false for pending sync data when no data exists', () => {
      localStorageSync.getPendingSyncData.mockReturnValue([]);

      const result = userService.hasPendingSyncData('user-123');

      expect(result).toBe(false);
    });

    it('should get local storage info', () => {
      const storageInfo = { available: true, userDataSize: 1024 };
      localStorageSync.getStorageInfo.mockReturnValue(storageInfo);

      const result = userService.getLocalStorageInfo();

      expect(result).toEqual(storageInfo);
      expect(localStorageSync.getStorageInfo).toHaveBeenCalled();
    });

    it('should clear local storage data', () => {
      localStorageSync.clearAllData.mockReturnValue(undefined);

      const result = userService.clearLocalStorageData();

      expect(result).toBe(true);
      expect(localStorageSync.clearAllData).toHaveBeenCalled();
    });

    it('should cleanup local sync queue', () => {
      localStorageSync.cleanupSyncQueue.mockReturnValue(undefined);

      userService.cleanupLocalSyncQueue();

      expect(localStorageSync.cleanupSyncQueue).toHaveBeenCalled();
    });
  });

  describe('Server Environment Handling', () => {
    it('should handle local storage operations gracefully in server environment', () => {
      // Ensure window is not defined (server environment)
      delete global.window;

      expect(userService.storeUserDataLocally('user-123', {})).toBe(false);
      expect(userService.getUserDataFromLocal('user-123')).toBeNull();
      expect(userService.updatePreferencesLocally('user-123', {})).toBe(false);
      expect(userService.hasPendingSyncData('user-123')).toBe(false);
      expect(userService.getLocalStorageInfo()).toEqual({ 
        available: false, 
        reason: 'Server environment' 
      });
      expect(userService.clearLocalStorageData()).toBe(false);
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should cleanup expired sessions successfully', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 5 });

      const result = await userService.cleanupExpiredSessions();

      expect(result).toBe(5);
      expect(mockQuery).toHaveBeenCalledWith(
        'DELETE FROM user_sessions WHERE expires_at < NOW()'
      );
    });

    it('should return 0 when no expired sessions found', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 0 });

      const result = await userService.cleanupExpiredSessions();

      expect(result).toBe(0);
    });
  });

  describe('getUserProfile', () => {
    it('should return user profile for valid user ID', async () => {
      const result = await userService.getUserProfile('test-user-id');

      expect(result).toHaveProperty('userId', 'test-uuid-123');
      expect(result).toHaveProperty('preferredLanguage', 'hi');
      expect(result).toHaveProperty('role', 'vendor');
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE user_id = $1',
        ['test-user-id']
      );
    });

    it('should return null for nonexistent user', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await userService.getUserProfile('nonexistent-user');

      expect(result).toBeNull();
    });
  });
});