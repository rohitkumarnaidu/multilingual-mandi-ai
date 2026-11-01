const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateUser, authorizeSelfOrAdmin } = require('../middleware/auth');
const UserManagementService = require('../services/UserManagementService');

const router = express.Router();
const userService = new UserManagementService();

// Create user profile (Requirements 7.1, 7.2) - Public registration
router.post(
  '/profile',
  asyncHandler(async (req, res) => {
    const { language, role, location, preferences } = req.body;
    
    // Validate required fields
    if (!language || !role) {
      return res.status(400).json({
        error: 'Language and role are required',
        message: 'भाषा और भूमिका आवश्यक हैं'
      });
    }
    
    try {
      const userProfile = await userService.createUserProfile(
        language,
        role,
        location || {},
        preferences || {}
      );
      
      res.status(201).json({
        success: true,
        message: 'User profile created successfully',
        data: userProfile
      });
    } catch (error) {
      if (error.message.includes('Unsupported language') || error.message.includes('Invalid role')) {
        return res.status(400).json({
          error: error.message,
          message: 'अमान्य भाषा या भूमिका'
        });
      }
      throw error;
    }
  })
);

// Get user profile (Protected: Authenticated & Self-or-Admin only)
router.get(
  '/profile/:userId',
  authenticateUser,
  authorizeSelfOrAdmin,
  asyncHandler(async (req, res) => {
    const { userId } = req.params;
    
    const userProfile = await userService.getUserProfile(userId);
    
    if (!userProfile) {
      return res.status(404).json({
        error: 'User not found',
        message: 'उपयोगकर्ता नहीं मिला'
      });
    }
    
    res.json({
      success: true,
      data: userProfile
    });
  })
);

// Update user preferences (Protected: Authenticated & Self-or-Admin only)
router.put(
  '/preferences/:userId',
  authenticateUser,
  authorizeSelfOrAdmin,
  asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const preferences = req.body;
    
    try {
      const updatedProfile = await userService.updatePreferences(userId, preferences);
      
      res.json({
        success: true,
        message: 'Preferences updated successfully',
        data: updatedProfile
      });
    } catch (error) {
      if (error.message.includes('User not found')) {
        return res.status(404).json({
          error: error.message,
          message: 'उपयोगकर्ता नहीं मिला'
        });
      }
      if (error.message.includes('Unsupported language') || 
          error.message.includes('Invalid role') ||
          error.message.includes('Invalid negotiation style')) {
        return res.status(400).json({
          error: error.message,
          message: 'अमान्य प्राथमिकताएं'
        });
      }
      throw error;
    }
  })
);

// Validate language support (Requirements 7.5) - Public utility
router.get(
  '/validate/language/:language',
  asyncHandler(async (req, res) => {
    const { language } = req.params;
    
    const isSupported = userService.validateLanguageSupport(language);
    
    res.json({
      success: true,
      supported: isSupported,
      language: language,
      supportedLanguages: ['hi', 'te', 'ta', 'kn', 'bn', 'mr', 'en']
    });
  })
);

// Sync offline data (Protected: Authenticated & Self-or-Admin only)
router.post(
  '/sync/:userId',
  authenticateUser,
  authorizeSelfOrAdmin,
  asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { localData } = req.body;
    
    const syncResult = await userService.syncOfflineData(userId, localData);
    
    res.json({
      success: true,
      message: 'Data synced successfully',
      data: syncResult
    });
  })
);

// Get user session (Protected: Authenticated only)
router.get(
  '/session/:sessionId',
  authenticateUser,
  asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    
    const session = await userService.getUserSession(sessionId);
    
    if (!session) {
      return res.status(404).json({
        error: 'Session not found or expired',
        message: 'सत्र नहीं मिला या समाप्त हो गया'
      });
    }
    
    res.json({
      success: true,
      data: session
    });
  })
);

// Health check for user service
router.get(
  '/health',
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      service: 'UserManagementService',
      status: 'healthy',
      timestamp: new Date().toISOString()
    });
  })
);

module.exports = router;
