/**
 * User Management Service Demo
 * Demonstrates offline capability and session handling
 */

const UserManagementService = require('../src/services/UserManagementService');

// Example usage of UserManagementService with offline capability
async function demonstrateUserManagement() {
  const userService = new UserManagementService();

  try {
    console.log('=== User Management Service Demo ===\n');

    // 1. Create a new user profile
    console.log('1. Creating user profile...');
    const newUser = await userService.createUserProfile('hi', 'vendor', {
      state: 'Maharashtra',
      district: 'Mumbai',
      market: 'Crawford Market'
    }, {
      voiceEnabled: true,
      negotiationStyle: 'balanced',
      priceAlerts: true
    });
    
    console.log('Created user:', {
      userId: newUser.userId,
      language: newUser.preferredLanguage,
      role: newUser.role,
      location: newUser.location
    });

    // 2. Store user data locally for offline access
    console.log('\n2. Storing user data locally...');
    const stored = userService.storeUserDataLocally(newUser.userId, newUser);
    console.log('Stored locally:', stored);

    // 3. Update preferences locally (simulating offline mode)
    console.log('\n3. Updating preferences offline...');
    const offlineUpdate = userService.updatePreferencesLocally(newUser.userId, {
      voiceEnabled: false,
      negotiationStyle: 'polite'
    });
    console.log('Updated offline:', offlineUpdate);

    // 4. Check for pending sync data
    console.log('\n4. Checking pending sync data...');
    const hasPending = userService.hasPendingSyncData(newUser.userId);
    console.log('Has pending sync data:', hasPending);

    // 5. Simulate coming back online and syncing
    console.log('\n5. Syncing offline data...');
    const syncResult = await userService.syncOfflineData(newUser.userId);
    console.log('Sync result:', {
      success: syncResult.preferences !== null,
      errors: syncResult.errors.length,
      syncedItems: syncResult.syncedItems?.length || 0
    });

    // 6. Create and manage session
    console.log('\n6. Creating user session...');
    const sessionToken = 'demo-session-token-' + Date.now();
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now
    
    const session = await userService.createUserSession(
      newUser.userId, 
      sessionToken, 
      expiresAt
    );
    console.log('Created session:', {
      sessionId: session.sessionId,
      userId: session.userId,
      expiresAt: session.expiresAt
    });

    // 7. Retrieve session
    console.log('\n7. Retrieving session...');
    const retrievedSession = await userService.getUserSession(session.sessionId);
    console.log('Retrieved session:', {
      sessionId: retrievedSession?.sessionId,
      userLanguage: retrievedSession?.user.preferredLanguage,
      userRole: retrievedSession?.user.role
    });

    // 8. Validate user role
    console.log('\n8. Validating user role...');
    const isVendor = await userService.validateUserRole(newUser.userId, 'vendor');
    const isBuyer = await userService.validateUserRole(newUser.userId, 'buyer');
    console.log('Is vendor:', isVendor);
    console.log('Is buyer:', isBuyer);

    // 9. Language validation
    console.log('\n9. Language validation...');
    console.log('Hindi supported:', userService.validateLanguageSupport('hi'));
    console.log('French supported:', userService.validateLanguageSupport('fr'));

    // 10. Get local storage info
    console.log('\n10. Local storage information...');
    const storageInfo = userService.getLocalStorageInfo();
    console.log('Storage info:', {
      available: storageInfo.available,
      userCount: storageInfo.userCount,
      pendingSyncCount: storageInfo.pendingSyncCount
    });

    console.log('\n=== Demo completed successfully! ===');

  } catch (error) {
    console.error('Demo failed:', error.message);
  }
}

// Run demo if this file is executed directly
if (require.main === module) {
  demonstrateUserManagement();
}

module.exports = { demonstrateUserManagement };