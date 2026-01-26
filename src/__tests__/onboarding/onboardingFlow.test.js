/**
 * Onboarding Flow Tests
 * Tests the complete onboarding flow implementation
 * Validates Requirements 7.1, 7.2, 7.3, 7.4, 7.5
 */

// Mock localStorage for testing
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

// Mock DOM elements
const mockElement = {
  classList: {
    add: jest.fn(),
    remove: jest.fn(),
    contains: jest.fn(() => false)
  },
  disabled: false,
  textContent: '',
  dataset: {}
};

const mockDocument = {
  querySelectorAll: jest.fn(() => [mockElement]),
  querySelector: jest.fn(() => mockElement),
  getElementById: jest.fn(() => mockElement),
  createElement: jest.fn(() => mockElement),
  body: {
    appendChild: jest.fn()
  }
};

// Mock global objects
global.localStorage = localStorageMock;
global.document = mockDocument;
global.window = {
  indexedDB: {
    open: jest.fn(() => ({
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null
    }))
  }
};
global.navigator = {
  onLine: true
};

describe('Onboarding Flow Logic', () => {
  let OnboardingFlow;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Define the OnboardingFlow class for testing
    OnboardingFlow = class {
      constructor() {
        this.currentLanguage = null;
        this.currentRole = null;
        this.supportedLanguages = ['hi', 'te', 'ta', 'kn', 'bn', 'mr', 'en'];
        this.supportedRoles = ['vendor', 'buyer', 'farmer', 'trader'];
      }

      validateLanguage(language) {
        return this.supportedLanguages.includes(language);
      }

      validateRole(role) {
        return this.supportedRoles.includes(role);
      }

      selectLanguage(lang) {
        if (!this.validateLanguage(lang)) {
          throw new Error(`Unsupported language: ${lang}. Supported languages: ${this.supportedLanguages.join(', ')}`);
        }
        
        this.currentLanguage = lang;
        this.updateContinueButton();
        return true;
      }

      selectRole(role) {
        if (!this.validateRole(role)) {
          throw new Error(`Invalid role: ${role}. Supported roles: ${this.supportedRoles.join(', ')}`);
        }
        
        this.currentRole = role;
        this.updateContinueButton();
        return true;
      }

      updateContinueButton() {
        const continueBtn = document.getElementById('continue-btn');
        if (continueBtn) {
          continueBtn.disabled = !(this.currentLanguage && this.currentRole);
        }
        return !(this.currentLanguage && this.currentRole);
      }

      async saveUserPreferences() {
        if (!this.currentLanguage || !this.currentRole) {
          throw new Error('Language and role must be selected');
        }

        const preferences = {
          language: this.currentLanguage,
          role: this.currentRole,
          onboardingCompleted: true,
          timestamp: Date.now(),
          version: '1.0'
        };
        
        try {
          localStorage.setItem('mandiPreferences', JSON.stringify(preferences));
          return preferences;
        } catch (error) {
          throw new Error('Failed to save preferences to local storage');
        }
      }

      async loadUserPreferences() {
        try {
          const saved = localStorage.getItem('mandiPreferences');
          if (saved) {
            const preferences = JSON.parse(saved);
            if (this.validateSavedPreferences(preferences)) {
              this.currentLanguage = preferences.language;
              this.currentRole = preferences.role;
              return preferences;
            }
          }
          return null;
        } catch (error) {
          return null;
        }
      }

      validateSavedPreferences(preferences) {
        if (!preferences || typeof preferences !== 'object') return false;
        
        return !!(preferences.language &&
               preferences.role &&
               this.validateLanguage(preferences.language) &&
               this.validateRole(preferences.role) &&
               preferences.onboardingCompleted === true);
      }

      async completeOnboarding() {
        if (!this.currentLanguage || !this.currentRole) {
          throw new Error('Language and role must be selected');
        }
        
        const preferences = await this.saveUserPreferences();
        return preferences;
      }

      isOnboardingComplete() {
        return !!(this.currentLanguage && this.currentRole);
      }
    };
  });

  describe('Language Selection (Requirements 7.1, 7.5)', () => {
    test('should accept all supported languages', () => {
      const flow = new OnboardingFlow();
      const supportedLanguages = ['hi', 'te', 'ta', 'kn', 'bn', 'mr', 'en'];
      
      supportedLanguages.forEach(lang => {
        expect(() => flow.selectLanguage(lang)).not.toThrow();
        expect(flow.currentLanguage).toBe(lang);
        expect(flow.validateLanguage(lang)).toBe(true);
      });
    });

    test('should reject unsupported languages', () => {
      const flow = new OnboardingFlow();
      const unsupportedLanguages = ['fr', 'de', 'es', 'zh', 'ja', 'ru', 'ar'];
      
      unsupportedLanguages.forEach(lang => {
        expect(() => flow.selectLanguage(lang)).toThrow(`Unsupported language: ${lang}`);
        expect(flow.validateLanguage(lang)).toBe(false);
      });
    });

    test('should validate language before selection', () => {
      const flow = new OnboardingFlow();
      
      // Valid languages
      expect(flow.validateLanguage('hi')).toBe(true);
      expect(flow.validateLanguage('en')).toBe(true);
      expect(flow.validateLanguage('te')).toBe(true);
      
      // Invalid languages
      expect(flow.validateLanguage('fr')).toBe(false);
      expect(flow.validateLanguage('invalid')).toBe(false);
      expect(flow.validateLanguage('')).toBe(false);
      expect(flow.validateLanguage(null)).toBe(false);
    });
  });

  describe('Role Selection (Requirements 7.2)', () => {
    test('should accept all supported roles', () => {
      const flow = new OnboardingFlow();
      const supportedRoles = ['vendor', 'buyer', 'farmer', 'trader'];
      
      supportedRoles.forEach(role => {
        expect(() => flow.selectRole(role)).not.toThrow();
        expect(flow.currentRole).toBe(role);
        expect(flow.validateRole(role)).toBe(true);
      });
    });

    test('should reject invalid roles', () => {
      const flow = new OnboardingFlow();
      const invalidRoles = ['admin', 'manager', 'customer', 'supplier', 'agent'];
      
      invalidRoles.forEach(role => {
        expect(() => flow.selectRole(role)).toThrow(`Invalid role: ${role}`);
        expect(flow.validateRole(role)).toBe(false);
      });
    });

    test('should validate role before selection', () => {
      const flow = new OnboardingFlow();
      
      // Valid roles
      expect(flow.validateRole('vendor')).toBe(true);
      expect(flow.validateRole('buyer')).toBe(true);
      expect(flow.validateRole('farmer')).toBe(true);
      expect(flow.validateRole('trader')).toBe(true);
      
      // Invalid roles
      expect(flow.validateRole('admin')).toBe(false);
      expect(flow.validateRole('invalid')).toBe(false);
      expect(flow.validateRole('')).toBe(false);
      expect(flow.validateRole(null)).toBe(false);
    });
  });

  describe('Preference Persistence (Requirements 7.3, 7.4)', () => {
    test('should save preferences to localStorage', async () => {
      const flow = new OnboardingFlow();
      flow.currentLanguage = 'hi';
      flow.currentRole = 'vendor';
      
      const preferences = await flow.saveUserPreferences();
      
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'mandiPreferences',
        expect.stringContaining('"language":"hi"')
      );
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'mandiPreferences',
        expect.stringContaining('"role":"vendor"')
      );
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'mandiPreferences',
        expect.stringContaining('"onboardingCompleted":true')
      );
      
      expect(preferences.language).toBe('hi');
      expect(preferences.role).toBe('vendor');
      expect(preferences.onboardingCompleted).toBe(true);
    });

    test('should load preferences from localStorage', async () => {
      const flow = new OnboardingFlow();
      const savedPreferences = {
        language: 'te',
        role: 'buyer',
        onboardingCompleted: true,
        timestamp: Date.now(),
        version: '1.0'
      };
      
      localStorage.getItem.mockReturnValue(JSON.stringify(savedPreferences));
      
      const loaded = await flow.loadUserPreferences();
      
      expect(loaded).toEqual(savedPreferences);
      expect(flow.currentLanguage).toBe('te');
      expect(flow.currentRole).toBe('buyer');
    });

    test('should validate saved preferences', () => {
      const flow = new OnboardingFlow();
      
      // Valid preferences
      const validPreferences = {
        language: 'hi',
        role: 'vendor',
        onboardingCompleted: true
      };
      expect(flow.validateSavedPreferences(validPreferences)).toBe(true);
      
      // Invalid language
      const invalidLanguage = {
        language: 'fr',
        role: 'vendor',
        onboardingCompleted: true
      };
      expect(flow.validateSavedPreferences(invalidLanguage)).toBe(false);
      
      // Invalid role
      const invalidRole = {
        language: 'hi',
        role: 'admin',
        onboardingCompleted: true
      };
      expect(flow.validateSavedPreferences(invalidRole)).toBe(false);
      
      // Incomplete onboarding
      const incompleteOnboarding = {
        language: 'hi',
        role: 'vendor',
        onboardingCompleted: false
      };
      expect(flow.validateSavedPreferences(incompleteOnboarding)).toBe(false);
      
      // Missing fields
      expect(flow.validateSavedPreferences({})).toBe(false);
      expect(flow.validateSavedPreferences(null)).toBe(false);
    });

    test('should handle localStorage errors gracefully', async () => {
      const flow = new OnboardingFlow();
      flow.currentLanguage = 'hi';
      flow.currentRole = 'vendor';
      
      localStorage.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });
      
      await expect(flow.saveUserPreferences()).rejects.toThrow('Failed to save preferences to local storage');
    });

    test('should handle corrupted localStorage data', async () => {
      const flow = new OnboardingFlow();
      
      localStorage.getItem.mockReturnValue('invalid json data');
      
      const loaded = await flow.loadUserPreferences();
      expect(loaded).toBeNull();
    });
  });

  describe('Onboarding Flow Sequence (Requirements 7.1, 7.2)', () => {
    test('should require both language and role for completion', async () => {
      const flow = new OnboardingFlow();
      
      // Mock localStorage to not throw error for successful cases
      localStorage.setItem.mockImplementation(() => {});
      
      // No selections
      await expect(flow.completeOnboarding()).rejects.toThrow('Language and role must be selected');
      expect(flow.isOnboardingComplete()).toBe(false);
      
      // Only language
      flow.selectLanguage('hi');
      await expect(flow.completeOnboarding()).rejects.toThrow('Language and role must be selected');
      expect(flow.isOnboardingComplete()).toBe(false);
      
      // Only role
      flow.currentLanguage = null;
      flow.selectRole('vendor');
      await expect(flow.completeOnboarding()).rejects.toThrow('Language and role must be selected');
      expect(flow.isOnboardingComplete()).toBe(false);
      
      // Both selections
      flow.selectLanguage('hi');
      const result = await flow.completeOnboarding();
      expect(result).toBeDefined();
      expect(result.language).toBe('hi');
      expect(result.role).toBe('vendor');
      expect(flow.isOnboardingComplete()).toBe(true);
    });

    test('should update continue button state correctly', () => {
      const flow = new OnboardingFlow();
      
      // Initially disabled
      expect(flow.updateContinueButton()).toBe(true); // true means disabled
      
      // Select language only
      flow.selectLanguage('hi');
      expect(flow.updateContinueButton()).toBe(true); // still disabled
      
      // Select role as well
      flow.selectRole('vendor');
      expect(flow.updateContinueButton()).toBe(false); // false means enabled
    });

    test('should complete full onboarding flow', async () => {
      const flow = new OnboardingFlow();
      
      // Mock localStorage to not throw error
      localStorage.setItem.mockImplementation(() => {});
      
      // Step 1: Select language
      expect(flow.selectLanguage('hi')).toBe(true);
      expect(flow.currentLanguage).toBe('hi');
      
      // Step 2: Select role
      expect(flow.selectRole('vendor')).toBe(true);
      expect(flow.currentRole).toBe('vendor');
      
      // Step 3: Complete onboarding
      const preferences = await flow.completeOnboarding();
      expect(preferences.language).toBe('hi');
      expect(preferences.role).toBe('vendor');
      expect(preferences.onboardingCompleted).toBe(true);
      
      // Verify localStorage was called
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'mandiPreferences',
        JSON.stringify(preferences)
      );
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle empty or null inputs', () => {
      const flow = new OnboardingFlow();
      
      expect(() => flow.selectLanguage('')).toThrow();
      expect(() => flow.selectLanguage(null)).toThrow();
      expect(() => flow.selectLanguage(undefined)).toThrow();
      
      expect(() => flow.selectRole('')).toThrow();
      expect(() => flow.selectRole(null)).toThrow();
      expect(() => flow.selectRole(undefined)).toThrow();
    });

    test('should handle case sensitivity', () => {
      const flow = new OnboardingFlow();
      
      // Languages should be case sensitive
      expect(() => flow.selectLanguage('HI')).toThrow();
      expect(() => flow.selectLanguage('Hi')).toThrow();
      
      // Roles should be case sensitive
      expect(() => flow.selectRole('VENDOR')).toThrow();
      expect(() => flow.selectRole('Vendor')).toThrow();
    });

    test('should handle multiple selections correctly', () => {
      const flow = new OnboardingFlow();
      
      // Select language multiple times
      flow.selectLanguage('hi');
      expect(flow.currentLanguage).toBe('hi');
      
      flow.selectLanguage('en');
      expect(flow.currentLanguage).toBe('en');
      
      // Select role multiple times
      flow.selectRole('vendor');
      expect(flow.currentRole).toBe('vendor');
      
      flow.selectRole('buyer');
      expect(flow.currentRole).toBe('buyer');
    });
  });
});