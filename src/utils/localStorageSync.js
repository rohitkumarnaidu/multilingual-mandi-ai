/**
 * Local Storage Sync Utility
 * Handles offline data storage and synchronization for user preferences
 * Implements Requirements 7.3, 7.4, 10.4
 */

class LocalStorageSync {
  constructor() {
    this.storageKey = 'multilingual_mandi_user_data';
    this.syncQueueKey = 'multilingual_mandi_sync_queue';
  }

  /**
   * Check if localStorage is available
   * @returns {boolean} True if localStorage is available
   */
  isLocalStorageAvailable() {
    try {
      const test = '__localStorage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Store user data locally
   * @param {string} userId - User ID
   * @param {Object} userData - User data to store
   * @returns {boolean} True if stored successfully
   */
  storeUserData(userId, userData) {
    if (!this.isLocalStorageAvailable()) {
      console.warn('localStorage not available, cannot store user data offline');
      return false;
    }

    try {
      const existingData = this.getAllUserData();
      existingData[userId] = {
        ...userData,
        lastUpdated: new Date().toISOString(),
        synced: true
      };

      localStorage.setItem(this.storageKey, JSON.stringify(existingData));
      return true;
    } catch (error) {
      console.error('Error storing user data locally:', error);
      return false;
    }
  }

  /**
   * Get user data from local storage
   * @param {string} userId - User ID
   * @returns {Object|null} User data or null if not found
   */
  getUserData(userId) {
    if (!this.isLocalStorageAvailable()) {
      return null;
    }

    try {
      const allData = this.getAllUserData();
      return allData[userId] || null;
    } catch (error) {
      console.error('Error retrieving user data from local storage:', error);
      return null;
    }
  }

  /**
   * Get all user data from local storage
   * @returns {Object} All user data
   */
  getAllUserData() {
    if (!this.isLocalStorageAvailable()) {
      return {};
    }

    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Error parsing user data from local storage:', error);
      return {};
    }
  }

  /**
   * Update user preferences locally
   * @param {string} userId - User ID
   * @param {Object} preferences - Updated preferences
   * @returns {boolean} True if updated successfully
   */
  updateUserPreferences(userId, preferences) {
    if (!this.isLocalStorageAvailable()) {
      return false;
    }

    try {
      const existingData = this.getAllUserData();
      const userData = existingData[userId] || {};

      // Merge preferences
      userData.preferences = {
        ...userData.preferences,
        ...preferences
      };

      userData.lastUpdated = new Date().toISOString();
      userData.synced = false; // Mark as needing sync

      existingData[userId] = userData;
      localStorage.setItem(this.storageKey, JSON.stringify(existingData));

      // Add to sync queue
      this.addToSyncQueue(userId, { preferences });

      return true;
    } catch (error) {
      console.error('Error updating user preferences locally:', error);
      return false;
    }
  }

  /**
   * Add data to sync queue for later synchronization
   * @param {string} userId - User ID
   * @param {Object} data - Data to sync
   */
  addToSyncQueue(userId, data) {
    if (!this.isLocalStorageAvailable()) {
      return;
    }

    try {
      const syncQueue = this.getSyncQueue();
      const timestamp = new Date().toISOString();

      if (!syncQueue[userId]) {
        syncQueue[userId] = [];
      }

      syncQueue[userId].push({
        data,
        timestamp,
        synced: false
      });

      localStorage.setItem(this.syncQueueKey, JSON.stringify(syncQueue));
    } catch (error) {
      console.error('Error adding to sync queue:', error);
    }
  }

  /**
   * Get sync queue
   * @returns {Object} Sync queue data
   */
  getSyncQueue() {
    if (!this.isLocalStorageAvailable()) {
      return {};
    }

    try {
      const data = localStorage.getItem(this.syncQueueKey);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Error getting sync queue:', error);
      return {};
    }
  }

  /**
   * Get pending sync data for a user
   * @param {string} userId - User ID
   * @returns {Array} Array of pending sync items
   */
  getPendingSyncData(userId) {
    const syncQueue = this.getSyncQueue();
    const userQueue = syncQueue[userId] || [];
    return userQueue.filter(item => !item.synced);
  }

  /**
   * Mark sync items as completed
   * @param {string} userId - User ID
   * @param {Array} syncedItems - Array of synced item timestamps
   */
  markSyncCompleted(userId, syncedItems = []) {
    if (!this.isLocalStorageAvailable()) {
      return;
    }

    try {
      const syncQueue = this.getSyncQueue();
      const userQueue = syncQueue[userId] || [];

      // Mark items as synced
      userQueue.forEach(item => {
        if (syncedItems.length === 0 || syncedItems.includes(item.timestamp)) {
          item.synced = true;
        }
      });

      syncQueue[userId] = userQueue;
      localStorage.setItem(this.syncQueueKey, JSON.stringify(syncQueue));

      // Update user data sync status
      const allUserData = this.getAllUserData();
      if (allUserData[userId]) {
        allUserData[userId].synced = true;
        localStorage.setItem(this.storageKey, JSON.stringify(allUserData));
      }
    } catch (error) {
      console.error('Error marking sync as completed:', error);
    }
  }

  /**
   * Clear old sync queue items (older than 7 days)
   */
  cleanupSyncQueue() {
    if (!this.isLocalStorageAvailable()) {
      return;
    }

    try {
      const syncQueue = this.getSyncQueue();
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      Object.keys(syncQueue).forEach(userId => {
        syncQueue[userId] = syncQueue[userId].filter(item => {
          const itemDate = new Date(item.timestamp);
          return itemDate > sevenDaysAgo;
        });

        // Remove empty user queues
        if (syncQueue[userId].length === 0) {
          delete syncQueue[userId];
        }
      });

      localStorage.setItem(this.syncQueueKey, JSON.stringify(syncQueue));
    } catch (error) {
      console.error('Error cleaning up sync queue:', error);
    }
  }

  /**
   * Clear all local storage data
   */
  clearAllData() {
    if (!this.isLocalStorageAvailable()) {
      return;
    }

    try {
      localStorage.removeItem(this.storageKey);
      localStorage.removeItem(this.syncQueueKey);
    } catch (error) {
      console.error('Error clearing local storage data:', error);
    }
  }

  /**
   * Get storage usage information
   * @returns {Object} Storage usage stats
   */
  getStorageInfo() {
    if (!this.isLocalStorageAvailable()) {
      return { available: false };
    }

    try {
      const userData = localStorage.getItem(this.storageKey) || '{}';
      const syncQueue = localStorage.getItem(this.syncQueueKey) || '{}';

      return {
        available: true,
        userDataSize: new Blob([userData]).size,
        syncQueueSize: new Blob([syncQueue]).size,
        totalSize: new Blob([userData + syncQueue]).size,
        userCount: Object.keys(JSON.parse(userData)).length,
        pendingSyncCount: Object.keys(JSON.parse(syncQueue)).length
      };
    } catch (error) {
      console.error('Error getting storage info:', error);
      return { available: true, error: error.message };
    }
  }
}

// Export singleton instance
module.exports = new LocalStorageSync();