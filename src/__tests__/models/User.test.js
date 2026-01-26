/**
 * User Model Tests
 * Tests for user profile data models and validation
 * Validates Requirements 7.1, 7.2, 7.3
 */

const fc = require('fast-check');
const {
  UserProfile,
  UserLocation,
  UserPreferences,
  UserSession,
  SUPPORTED_LANGUAGES,
  SUPPORTED_ROLES,
  NEGOTIATION_STYLES,
  UserValidation
} = require('../../models/User');

describe('User Models', () => {
  describe('UserProfile', () => {
    test('should create valid user profile with all required fields', () => {
      const userData = {
        userId: 'test-user-id',
        preferredLanguage: 'hi',
        role: 'vendor',
        location: {
          state: 'Maharashtra',
          district: 'Pune',
          market: 'Hadapsar Mandi'
        },
        preferences: {
          voiceEnabled: true,
          negotiationStyle: 'balanced',
          priceAlerts: true
        },
        createdAt: new Date(),
        lastActive: new Date(),
        updatedAt: new Date()
      };

      const user = new UserProfile(userData);
      expect(user.userId).toBe(userData.userId);
      expect(user.preferredLanguage).toBe(userData.preferredLanguage);
      expect(user.role).toBe(userData.role);
      expect(user.location).toBeInstanceOf(UserLocation);
      expect(user.preferences).toBeInstanceOf(UserPreferences);
    });

    test('should validate supported languages correctly', () => {
      const validLanguages = Object.values(SUPPORTED_LANGUAGES);
      
      validLanguages.forEach(language => {
        const userData = {
          userId: 'test-user-id',
          preferredLanguage: language,
          role: 'vendor'
        };
        
        const user = new UserProfile(userData);
        const validation = user.validate();
        
        expect(validation.isValid).toBe(true);
        expect(validation.errors).toHaveLength(0);
      });
    });

    test('should reject unsupported languages', () => {
      const invalidLanguages = ['fr', 'de', 'es', 'invalid'];
      
      invalidLanguages.forEach(language => {
        const userData = {
          userId: 'test-user-id',
          preferredLanguage: language,
          role: 'vendor'
        };
        
        const user = new UserProfile(userData);
        const validation = user.validate();
        
        expect(validation.isValid).toBe(false);
        expect(validation.errors.some(error => error.includes('Invalid language'))).toBe(true);
      });
    });

    test('should validate supported roles correctly', () => {
      const validRoles = Object.values(SUPPORTED_ROLES);
      
      validRoles.forEach(role => {
        const userData = {
          userId: 'test-user-id',
          preferredLanguage: 'hi',
          role: role
        };
        
        const user = new UserProfile(userData);
        const validation = user.validate();
        
        expect(validation.isValid).toBe(true);
        expect(validation.errors).toHaveLength(0);
      });
    });

    test('should reject unsupported roles', () => {
      const invalidRoles = ['admin', 'moderator', 'invalid'];
      
      invalidRoles.forEach(role => {
        const userData = {
          userId: 'test-user-id',
          preferredLanguage: 'hi',
          role: role
        };
        
        const user = new UserProfile(userData);
        const validation = user.validate();
        
        expect(validation.isValid).toBe(false);
        expect(validation.errors.some(error => error.includes('Invalid role'))).toBe(true);
      });
    });

    test('should convert to JSON correctly', () => {
      const userData = {
        userId: 'test-user-id',
        preferredLanguage: 'hi',
        role: 'vendor',
        location: {
          state: 'Maharashtra',
          district: 'Pune',
          market: 'Hadapsar Mandi'
        },
        preferences: {
          voiceEnabled: true,
          negotiationStyle: 'balanced',
          priceAlerts: true
        },
        createdAt: new Date(),
        lastActive: new Date(),
        updatedAt: new Date()
      };

      const user = new UserProfile(userData);
      const json = user.toJSON();
      
      expect(json).toHaveProperty('userId', userData.userId);
      expect(json).toHaveProperty('preferredLanguage', userData.preferredLanguage);
      expect(json).toHaveProperty('role', userData.role);
      expect(json).toHaveProperty('location');
      expect(json).toHaveProperty('preferences');
      expect(json.location).toHaveProperty('state', userData.location.state);
      expect(json.preferences).toHaveProperty('voiceEnabled', userData.preferences.voiceEnabled);
    });
  });

  describe('UserLocation', () => {
    test('should create location with all fields', () => {
      const locationData = {
        state: 'Maharashtra',
        district: 'Pune',
        market: 'Hadapsar Mandi'
      };

      const location = new UserLocation(locationData);
      expect(location.state).toBe(locationData.state);
      expect(location.district).toBe(locationData.district);
      expect(location.market).toBe(locationData.market);
    });

    test('should handle partial location data', () => {
      const location = new UserLocation({ state: 'Maharashtra' });
      expect(location.state).toBe('Maharashtra');
      expect(location.district).toBeNull();
      expect(location.market).toBeNull();
    });

    test('should detect complete location', () => {
      const completeLocation = new UserLocation({
        state: 'Maharashtra',
        district: 'Pune',
        market: 'Hadapsar Mandi'
      });
      expect(completeLocation.isComplete()).toBe(true);

      const incompleteLocation = new UserLocation({
        state: 'Maharashtra',
        district: 'Pune'
      });
      expect(incompleteLocation.isComplete()).toBe(false);

      const emptyLocation = new UserLocation({});
      expect(emptyLocation.isComplete()).toBe(false);
    });
  });

  describe('UserPreferences', () => {
    test('should create preferences with default values', () => {
      const preferences = new UserPreferences({});
      expect(preferences.voiceEnabled).toBe(true);
      expect(preferences.negotiationStyle).toBe('balanced');
      expect(preferences.priceAlerts).toBe(true);
    });

    test('should validate negotiation styles', () => {
      const validStyles = Object.values(NEGOTIATION_STYLES);
      
      validStyles.forEach(style => {
        const preferences = new UserPreferences({ negotiationStyle: style });
        const validation = preferences.validate();
        
        expect(validation.isValid).toBe(true);
        expect(validation.errors).toHaveLength(0);
      });
    });

    test('should reject invalid negotiation styles', () => {
      const invalidStyles = ['aggressive', 'passive', 'invalid'];
      
      invalidStyles.forEach(style => {
        const preferences = new UserPreferences({ negotiationStyle: style });
        const validation = preferences.validate();
        
        expect(validation.isValid).toBe(false);
        expect(validation.errors.some(error => error.includes('Invalid negotiation style'))).toBe(true);
      });
    });

    test('should validate boolean fields', () => {
      const preferences = new UserPreferences({
        voiceEnabled: 'not-boolean',
        priceAlerts: 'also-not-boolean'
      });
      
      const validation = preferences.validate();
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(error => error.includes('voiceEnabled must be a boolean'))).toBe(true);
      expect(validation.errors.some(error => error.includes('priceAlerts must be a boolean'))).toBe(true);
    });
  });

  describe('UserSession', () => {
    test('should create valid session', () => {
      const sessionData = {
        sessionId: 'session-123',
        userId: 'user-123',
        sessionToken: 'token-123',
        expiresAt: new Date(Date.now() + 86400000), // 24 hours from now
        createdAt: new Date(),
        lastAccessed: new Date()
      };

      const session = new UserSession(sessionData);
      expect(session.sessionId).toBe(sessionData.sessionId);
      expect(session.userId).toBe(sessionData.userId);
      expect(session.sessionToken).toBe(sessionData.sessionToken);
      expect(session.isExpired()).toBe(false);
      expect(session.isValid()).toBe(true);
    });

    test('should detect expired sessions', () => {
      const expiredSessionData = {
        sessionId: 'session-123',
        userId: 'user-123',
        sessionToken: 'token-123',
        expiresAt: new Date(Date.now() - 1000), // 1 second ago
        createdAt: new Date(),
        lastAccessed: new Date()
      };

      const session = new UserSession(expiredSessionData);
      expect(session.isExpired()).toBe(true);
      expect(session.isValid()).toBe(false);
    });
  });

  describe('UserValidation', () => {
    test('should validate supported languages', () => {
      const supportedLanguages = ['hi', 'te', 'ta', 'kn', 'bn', 'mr', 'en'];
      const unsupportedLanguages = ['fr', 'de', 'es'];

      supportedLanguages.forEach(lang => {
        expect(UserValidation.isValidLanguage(lang)).toBe(true);
      });

      unsupportedLanguages.forEach(lang => {
        expect(UserValidation.isValidLanguage(lang)).toBe(false);
      });
    });

    test('should validate supported roles', () => {
      const supportedRoles = ['vendor', 'buyer', 'farmer', 'trader'];
      const unsupportedRoles = ['admin', 'moderator'];

      supportedRoles.forEach(role => {
        expect(UserValidation.isValidRole(role)).toBe(true);
      });

      unsupportedRoles.forEach(role => {
        expect(UserValidation.isValidRole(role)).toBe(false);
      });
    });

    test('should validate negotiation styles', () => {
      const supportedStyles = ['polite', 'assertive', 'balanced'];
      const unsupportedStyles = ['aggressive', 'passive'];

      supportedStyles.forEach(style => {
        expect(UserValidation.isValidNegotiationStyle(style)).toBe(true);
      });

      unsupportedStyles.forEach(style => {
        expect(UserValidation.isValidNegotiationStyle(style)).toBe(false);
      });
    });

    test('should return correct supported values', () => {
      expect(UserValidation.getSupportedLanguages()).toEqual(['hi', 'te', 'ta', 'kn', 'bn', 'mr', 'en']);
      expect(UserValidation.getSupportedRoles()).toEqual(['vendor', 'buyer', 'farmer', 'trader']);
      expect(UserValidation.getNegotiationStyles()).toEqual(['polite', 'assertive', 'balanced']);
    });
  });
});

/**
 * Property-Based Tests for User Models
 * **Validates: Requirements 7.1, 7.2, 7.3**
 */
describe('User Models Property-Based Tests', () => {
  // Generator for valid languages
  const validLanguageArb = fc.constantFrom(...Object.values(SUPPORTED_LANGUAGES));
  
  // Generator for valid roles
  const validRoleArb = fc.constantFrom(...Object.values(SUPPORTED_ROLES));
  
  // Generator for valid negotiation styles
  const validNegotiationStyleArb = fc.constantFrom(...Object.values(NEGOTIATION_STYLES));

  test('Property: Valid user profiles should always pass validation', () => {
    fc.assert(
      fc.property(
        validLanguageArb,
        validRoleArb,
        validNegotiationStyleArb,
        fc.boolean(),
        fc.boolean(),
        (language, role, negotiationStyle, voiceEnabled, priceAlerts) => {
          const userData = {
            userId: 'test-user-id',
            preferredLanguage: language,
            role: role,
            preferences: {
              voiceEnabled: voiceEnabled,
              negotiationStyle: negotiationStyle,
              priceAlerts: priceAlerts
            }
          };

          const user = new UserProfile(userData);
          const validation = user.validate();
          
          return validation.isValid === true && validation.errors.length === 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property: Invalid languages should always fail validation', () => {
    const invalidLanguageArb = fc.string().filter(str => 
      !Object.values(SUPPORTED_LANGUAGES).includes(str) && str.length > 0
    );

    fc.assert(
      fc.property(
        invalidLanguageArb,
        validRoleArb,
        (invalidLanguage, role) => {
          const userData = {
            userId: 'test-user-id',
            preferredLanguage: invalidLanguage,
            role: role
          };

          const user = new UserProfile(userData);
          const validation = user.validate();
          
          return validation.isValid === false && 
                 validation.errors.some(error => error.includes('Invalid language'));
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Property: Invalid roles should always fail validation', () => {
    const invalidRoleArb = fc.string().filter(str => 
      !Object.values(SUPPORTED_ROLES).includes(str) && str.length > 0
    );

    fc.assert(
      fc.property(
        validLanguageArb,
        invalidRoleArb,
        (language, invalidRole) => {
          const userData = {
            userId: 'test-user-id',
            preferredLanguage: language,
            role: invalidRole
          };

          const user = new UserProfile(userData);
          const validation = user.validate();
          
          return validation.isValid === false && 
                 validation.errors.some(error => error.includes('Invalid role'));
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Property: User sessions should be valid when not expired', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        fc.integer({ min: 1, max: 86400000 }), // 1ms to 24 hours in future
        (sessionId, userId, sessionToken, futureMs) => {
          const sessionData = {
            sessionId: sessionId,
            userId: userId,
            sessionToken: sessionToken,
            expiresAt: new Date(Date.now() + futureMs),
            createdAt: new Date(),
            lastAccessed: new Date()
          };

          const session = new UserSession(sessionData);
          
          return session.isValid() === true && session.isExpired() === false;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property: User sessions should be invalid when expired', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        fc.integer({ min: 1, max: 86400000 }), // 1ms to 24 hours in past
        (sessionId, userId, sessionToken, pastMs) => {
          const sessionData = {
            sessionId: sessionId,
            userId: userId,
            sessionToken: sessionToken,
            expiresAt: new Date(Date.now() - pastMs),
            createdAt: new Date(),
            lastAccessed: new Date()
          };

          const session = new UserSession(sessionData);
          
          return session.isValid() === false && session.isExpired() === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property: UserLocation should be complete only when all fields are present', () => {
    fc.assert(
      fc.property(
        fc.option(fc.string({ minLength: 1 })),
        fc.option(fc.string({ minLength: 1 })),
        fc.option(fc.string({ minLength: 1 })),
        (state, district, market) => {
          const location = new UserLocation({
            state: state,
            district: district,
            market: market
          });

          const expectedComplete = state !== null && district !== null && market !== null;
          return location.isComplete() === expectedComplete;
        }
      ),
      { numRuns: 100 }
    );
  });
});