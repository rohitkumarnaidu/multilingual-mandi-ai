/**
 * User Data Models
 * Defines the structure and validation for user-related data
 * Implements Requirements 7.1, 7.2, 7.3
 */

/**
 * User Profile Model
 */
class UserProfile {
  constructor(data) {
    this.userId = data.userId;
    this.preferredLanguage = data.preferredLanguage;
    this.role = data.role;
    this.location = new UserLocation(data.location || {});
    this.preferences = new UserPreferences(data.preferences || {});
    this.createdAt = data.createdAt;
    this.lastActive = data.lastActive;
    this.updatedAt = data.updatedAt;
  }

  /**
   * Validate user profile data
   * @returns {Object} Validation result
   */
  validate() {
    const errors = [];

    // Validate language
    const supportedLanguages = ['hi', 'te', 'ta', 'kn', 'bn', 'mr', 'en'];
    if (!supportedLanguages.includes(this.preferredLanguage)) {
      errors.push(`Invalid language: ${this.preferredLanguage}. Supported: ${supportedLanguages.join(', ')}`);
    }

    // Validate role
    const supportedRoles = ['vendor', 'buyer', 'farmer', 'trader'];
    if (!supportedRoles.includes(this.role)) {
      errors.push(`Invalid role: ${this.role}. Supported: ${supportedRoles.join(', ')}`);
    }

    // Validate preferences
    const prefValidation = this.preferences.validate();
    if (!prefValidation.isValid) {
      errors.push(...prefValidation.errors);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Convert to plain object for API responses
   * @returns {Object} Plain object representation
   */
  toJSON() {
    return {
      userId: this.userId,
      preferredLanguage: this.preferredLanguage,
      role: this.role,
      location: this.location.toJSON(),
      preferences: this.preferences.toJSON(),
      createdAt: this.createdAt,
      lastActive: this.lastActive,
      updatedAt: this.updatedAt
    };
  }
}

/**
 * User Location Model
 */
class UserLocation {
  constructor(data) {
    this.state = data.state || null;
    this.district = data.district || null;
    this.market = data.market || null;
  }

  /**
   * Check if location is complete
   * @returns {boolean} True if all location fields are provided
   */
  isComplete() {
    return !!(this.state && this.district && this.market);
  }

  /**
   * Convert to plain object
   * @returns {Object} Plain object representation
   */
  toJSON() {
    return {
      state: this.state,
      district: this.district,
      market: this.market
    };
  }
}

/**
 * User Preferences Model
 */
class UserPreferences {
  constructor(data) {
    this.voiceEnabled = data.voiceEnabled !== undefined ? data.voiceEnabled : true;
    this.negotiationStyle = data.negotiationStyle || 'balanced';
    this.priceAlerts = data.priceAlerts !== undefined ? data.priceAlerts : true;
  }

  /**
   * Validate preferences
   * @returns {Object} Validation result
   */
  validate() {
    const errors = [];

    // Validate negotiation style
    const supportedStyles = ['polite', 'assertive', 'balanced'];
    if (!supportedStyles.includes(this.negotiationStyle)) {
      errors.push(`Invalid negotiation style: ${this.negotiationStyle}. Supported: ${supportedStyles.join(', ')}`);
    }

    // Validate boolean fields
    if (typeof this.voiceEnabled !== 'boolean') {
      errors.push('voiceEnabled must be a boolean');
    }

    if (typeof this.priceAlerts !== 'boolean') {
      errors.push('priceAlerts must be a boolean');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Convert to plain object
   * @returns {Object} Plain object representation
   */
  toJSON() {
    return {
      voiceEnabled: this.voiceEnabled,
      negotiationStyle: this.negotiationStyle,
      priceAlerts: this.priceAlerts
    };
  }
}

/**
 * User Session Model
 */
class UserSession {
  constructor(data) {
    this.sessionId = data.sessionId;
    this.userId = data.userId;
    this.sessionToken = data.sessionToken;
    this.expiresAt = data.expiresAt;
    this.createdAt = data.createdAt;
    this.lastAccessed = data.lastAccessed;
    this.user = data.user ? new UserProfile(data.user) : null;
  }

  /**
   * Check if session is expired
   * @returns {boolean} True if session is expired
   */
  isExpired() {
    return new Date() > new Date(this.expiresAt);
  }

  /**
   * Check if session is valid
   * @returns {boolean} True if session is valid and not expired
   */
  isValid() {
    return this.sessionId && this.userId && this.sessionToken && !this.isExpired();
  }

  /**
   * Convert to plain object
   * @returns {Object} Plain object representation
   */
  toJSON() {
    return {
      sessionId: this.sessionId,
      userId: this.userId,
      sessionToken: this.sessionToken,
      expiresAt: this.expiresAt,
      createdAt: this.createdAt,
      lastAccessed: this.lastAccessed,
      user: this.user ? this.user.toJSON() : null
    };
  }
}

/**
 * Supported Languages Enum
 */
const SUPPORTED_LANGUAGES = {
  HINDI: 'hi',
  TELUGU: 'te',
  TAMIL: 'ta',
  KANNADA: 'kn',
  BENGALI: 'bn',
  MARATHI: 'mr',
  ENGLISH: 'en'
};

/**
 * Supported Roles Enum
 */
const SUPPORTED_ROLES = {
  VENDOR: 'vendor',
  BUYER: 'buyer',
  FARMER: 'farmer',
  TRADER: 'trader'
};

/**
 * Negotiation Styles Enum
 */
const NEGOTIATION_STYLES = {
  POLITE: 'polite',
  ASSERTIVE: 'assertive',
  BALANCED: 'balanced'
};

/**
 * Utility functions for validation
 */
const UserValidation = {
  /**
   * Validate language code
   * @param {string} language - Language code to validate
   * @returns {boolean} True if language is supported
   */
  isValidLanguage(language) {
    return Object.values(SUPPORTED_LANGUAGES).includes(language);
  },

  /**
   * Validate user role
   * @param {string} role - Role to validate
   * @returns {boolean} True if role is supported
   */
  isValidRole(role) {
    return Object.values(SUPPORTED_ROLES).includes(role);
  },

  /**
   * Validate negotiation style
   * @param {string} style - Negotiation style to validate
   * @returns {boolean} True if style is supported
   */
  isValidNegotiationStyle(style) {
    return Object.values(NEGOTIATION_STYLES).includes(style);
  },

  /**
   * Get all supported languages
   * @returns {string[]} Array of supported language codes
   */
  getSupportedLanguages() {
    return Object.values(SUPPORTED_LANGUAGES);
  },

  /**
   * Get all supported roles
   * @returns {string[]} Array of supported roles
   */
  getSupportedRoles() {
    return Object.values(SUPPORTED_ROLES);
  },

  /**
   * Get all negotiation styles
   * @returns {string[]} Array of supported negotiation styles
   */
  getNegotiationStyles() {
    return Object.values(NEGOTIATION_STYLES);
  }
};

module.exports = {
  UserProfile,
  UserLocation,
  UserPreferences,
  UserSession,
  SUPPORTED_LANGUAGES,
  SUPPORTED_ROLES,
  NEGOTIATION_STYLES,
  UserValidation
};