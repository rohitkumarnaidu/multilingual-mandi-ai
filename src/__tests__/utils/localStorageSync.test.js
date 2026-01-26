const localStorageSync = require('../../utils/localStorageSync');

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: jest.fn((index) => Object.keys(store)[index] || null)
  };
})();

// Mock console methods
const consoleMock = {
  warn: jest.fn(),
  error: jest.fn()
};

describe('LocalStorageSync', () => {
  beforeEach(() => {
    // Reset localStorage mock
    localStorageMock.clear();
    jest.clearAllMocks();
    
    // Mock global objects
    global.localStorage = localStorageMock;
    global.console = { ...console, ...consoleMock };
    global.Blob = jest.fn().mockImplementation((content) => ({
      size: JSON.stringify(content).length
    }));
  });

  afterEach(() => {
    delete global.localStorage;
    delete global.Blob;
  });

  describe('isLocalStorageAvailable', () => {
    it('should return true when localStorage is available', () => {
      expect(localStorageSync.isLocalStorageAvailable()).toBe(true);
    });

    it('should return false when localStorage throws error', () => {
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('localStorage not available');
      });

      expect(localStorageSync.isLocalStorageAvailable()).toBe(false);
    });
  });

  describe('storeUserData', () => {
    it('should store user data successfully', () => {
      const userData = {
        userId: 'user-123',
        preferredLanguage: 'hi',
        role: 'vendor'
      };

      const result = localStorageSync.storeUserData('user-123', userData);

      expect(result).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'multilingual_mandi_user_data',
        expect.stringContaining('"user-123"')
      );
    });

    it('should return false when localStorage is not available', () => {
      delete global.localStorage;

      const result = localStorageSync.storeUserData('user-123', {});

      expect(result).toBe(false);
      expect(consoleMock.warn).toHaveBeenCalledWith(
        'localStorage not available, cannot store user data offline'
      );
    });

    it('should handle storage errors gracefully', () => {
      // Mock getAllUserData to throw an error
      const originalGetAllUserData = localStorageSync.getAllUserData;
      localStorageSync.getAllUserData = jest.fn(() => {
        throw new Error('Storage quota exceeded');
      });

      const result = localStorageSync.storeUserData('user-123', {});

      expect(result).toBe(false);
      expect(consoleMock.error).toHaveBeenCalledWith(
        'Error storing user data locally:',
        expect.any(Error)
      );

      // Restore original method
      localStorageSync.getAllUserData = originalGetAllUserData;
    });
  });

  describe('getUserData', () => {
    it('should retrieve user data successfully', () => {
      const userData = {
        userId: 'user-123',
        preferredLanguage: 'hi'
      };

      // Store data first
      localStorageSync.storeUserData('user-123', userData);

      const result = localStorageSync.getUserData('user-123');

      expect(result).toMatchObject(userData);
      expect(result).toHaveProperty('lastUpdated');
      expect(result).toHaveProperty('synced', true);
    });

    it('should return null for non-existent user', () => {
      const result = localStorageSync.getUserData('non-existent');

      expect(result).toBeNull();
    });

    it('should return null when localStorage is not available', () => {
      delete global.localStorage;

      const result = localStorageSync.getUserData('user-123');

      expect(result).toBeNull();
    });

    it('should handle parsing errors gracefully', () => {
      localStorageMock.getItem.mockReturnValueOnce('invalid json');

      const result = localStorageSync.getUserData('user-123');

      expect(result).toBeNull();
      expect(consoleMock.error).toHaveBeenCalledWith(
        'Error parsing user data from local storage:',
        expect.any(Error)
      );
    });
  });

  describe('updateUserPreferences', () => {
    it('should update user preferences successfully', () => {
      // Store initial data
      const initialData = {
        userId: 'user-123',
        preferences: { voiceEnabled: true }
      };
      localStorageSync.storeUserData('user-123', initialData);

      const newPreferences = { negotiationStyle: 'polite' };
      const result = localStorageSync.updateUserPreferences('user-123', newPreferences);

      expect(result).toBe(true);

      const updatedData = localStorageSync.getUserData('user-123');
      expect(updatedData.preferences).toEqual({
        voiceEnabled: true,
        negotiationStyle: 'polite'
      });
      expect(updatedData.synced).toBe(false);
    });

    it('should create new user data if user does not exist', () => {
      const preferences = { voiceEnabled: false };
      const result = localStorageSync.updateUserPreferences('new-user', preferences);

      expect(result).toBe(true);

      const userData = localStorageSync.getUserData('new-user');
      expect(userData.preferences).toEqual(preferences);
      expect(userData.synced).toBe(false);
    });

    it('should add to sync queue', () => {
      const preferences = { voiceEnabled: false };
      localStorageSync.updateUserPreferences('user-123', preferences);

      const syncQueue = localStorageSync.getSyncQueue();
      expect(syncQueue['user-123']).toHaveLength(1);
      expect(syncQueue['user-123'][0].data).toEqual({ preferences });
      expect(syncQueue['user-123'][0].synced).toBe(false);
    });
  });

  describe('getSyncQueue', () => {
    it('should return empty object when no sync queue exists', () => {
      const result = localStorageSync.getSyncQueue();

      expect(result).toEqual({});
    });

    it('should return sync queue data', () => {
      const queueData = {
        'user-123': [
          {
            data: { preferences: { voiceEnabled: false } },
            timestamp: '2023-01-01T00:00:00.000Z',
            synced: false
          }
        ]
      };

      localStorageMock.setItem('multilingual_mandi_sync_queue', JSON.stringify(queueData));

      const result = localStorageSync.getSyncQueue();

      expect(result).toEqual(queueData);
    });
  });

  describe('getPendingSyncData', () => {
    it('should return pending sync items for user', () => {
      const queueData = {
        'user-123': [
          {
            data: { preferences: { voiceEnabled: false } },
            timestamp: '2023-01-01T00:00:00.000Z',
            synced: false
          },
          {
            data: { preferences: { negotiationStyle: 'polite' } },
            timestamp: '2023-01-01T01:00:00.000Z',
            synced: true
          }
        ]
      };

      localStorageMock.setItem('multilingual_mandi_sync_queue', JSON.stringify(queueData));

      const result = localStorageSync.getPendingSyncData('user-123');

      expect(result).toHaveLength(1);
      expect(result[0].synced).toBe(false);
    });

    it('should return empty array for user with no pending data', () => {
      const result = localStorageSync.getPendingSyncData('user-123');

      expect(result).toEqual([]);
    });
  });

  describe('markSyncCompleted', () => {
    it('should mark specific sync items as completed', () => {
      const queueData = {
        'user-123': [
          {
            data: { preferences: { voiceEnabled: false } },
            timestamp: '2023-01-01T00:00:00.000Z',
            synced: false
          },
          {
            data: { preferences: { negotiationStyle: 'polite' } },
            timestamp: '2023-01-01T01:00:00.000Z',
            synced: false
          }
        ]
      };

      localStorageMock.setItem('multilingual_mandi_sync_queue', JSON.stringify(queueData));

      localStorageSync.markSyncCompleted('user-123', ['2023-01-01T00:00:00.000Z']);

      const updatedQueue = localStorageSync.getSyncQueue();
      expect(updatedQueue['user-123'][0].synced).toBe(true);
      expect(updatedQueue['user-123'][1].synced).toBe(false);
    });

    it('should mark all items as completed when no specific items provided', () => {
      const queueData = {
        'user-123': [
          {
            data: { preferences: { voiceEnabled: false } },
            timestamp: '2023-01-01T00:00:00.000Z',
            synced: false
          }
        ]
      };

      localStorageMock.setItem('multilingual_mandi_sync_queue', JSON.stringify(queueData));
      
      // Store user data
      localStorageSync.storeUserData('user-123', { userId: 'user-123' });

      localStorageSync.markSyncCompleted('user-123');

      const updatedQueue = localStorageSync.getSyncQueue();
      expect(updatedQueue['user-123'][0].synced).toBe(true);

      const userData = localStorageSync.getUserData('user-123');
      expect(userData.synced).toBe(true);
    });
  });

  describe('cleanupSyncQueue', () => {
    it('should remove old sync queue items', () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10); // 10 days ago

      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 1); // 1 day ago

      const queueData = {
        'user-123': [
          {
            data: { preferences: { voiceEnabled: false } },
            timestamp: oldDate.toISOString(),
            synced: true
          },
          {
            data: { preferences: { negotiationStyle: 'polite' } },
            timestamp: recentDate.toISOString(),
            synced: false
          }
        ],
        'user-456': [
          {
            data: { preferences: { priceAlerts: false } },
            timestamp: oldDate.toISOString(),
            synced: true
          }
        ]
      };

      localStorageMock.setItem('multilingual_mandi_sync_queue', JSON.stringify(queueData));

      localStorageSync.cleanupSyncQueue();

      const cleanedQueue = localStorageSync.getSyncQueue();
      expect(cleanedQueue['user-123']).toHaveLength(1);
      expect(cleanedQueue['user-123'][0].timestamp).toBe(recentDate.toISOString());
      expect(cleanedQueue['user-456']).toBeUndefined(); // Should be removed as it's empty
    });
  });

  describe('clearAllData', () => {
    it('should clear all local storage data', () => {
      localStorageSync.storeUserData('user-123', { userId: 'user-123' });
      localStorageSync.updateUserPreferences('user-123', { voiceEnabled: false });

      localStorageSync.clearAllData();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('multilingual_mandi_user_data');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('multilingual_mandi_sync_queue');
    });
  });

  describe('getStorageInfo', () => {
    it('should return storage information', () => {
      localStorageSync.storeUserData('user-123', { userId: 'user-123' });
      localStorageSync.updateUserPreferences('user-123', { voiceEnabled: false });

      const result = localStorageSync.getStorageInfo();

      expect(result).toHaveProperty('available', true);
      expect(result).toHaveProperty('userDataSize');
      expect(result).toHaveProperty('syncQueueSize');
      expect(result).toHaveProperty('totalSize');
      expect(result).toHaveProperty('userCount', 1);
      expect(result).toHaveProperty('pendingSyncCount', 1);
    });

    it('should return not available when localStorage is not available', () => {
      delete global.localStorage;

      const result = localStorageSync.getStorageInfo();

      expect(result).toEqual({ available: false });
    });

    it('should handle errors gracefully', () => {
      localStorageMock.getItem.mockImplementationOnce(() => {
        throw new Error('Storage error');
      });

      const result = localStorageSync.getStorageInfo();

      expect(result).toHaveProperty('available', true);
      expect(result).toHaveProperty('error', 'Storage error');
    });
  });

  describe('addToSyncQueue', () => {
    it('should add data to sync queue', () => {
      const data = { preferences: { voiceEnabled: false } };
      
      localStorageSync.addToSyncQueue('user-123', data);

      const syncQueue = localStorageSync.getSyncQueue();
      expect(syncQueue['user-123']).toHaveLength(1);
      expect(syncQueue['user-123'][0].data).toEqual(data);
      expect(syncQueue['user-123'][0].synced).toBe(false);
      expect(syncQueue['user-123'][0]).toHaveProperty('timestamp');
    });

    it('should append to existing queue', () => {
      localStorageSync.addToSyncQueue('user-123', { preferences: { voiceEnabled: false } });
      localStorageSync.addToSyncQueue('user-123', { preferences: { negotiationStyle: 'polite' } });

      const syncQueue = localStorageSync.getSyncQueue();
      expect(syncQueue['user-123']).toHaveLength(2);
    });
  });
});